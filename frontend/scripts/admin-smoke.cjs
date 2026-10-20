// Run after `npm run build`: node scripts/admin-smoke.cjs
// Uses an isolated backend fixture; never connects to the project database.
const assert = require("node:assert/strict");
const http = require("node:http");
const { spawn } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const planSource = fs.readFileSync(path.resolve(__dirname, "../../backend/src/services/billing/subscription.service.ts"), "utf8");
const fixturePlans = new Function(`return (${planSource.match(/export const DEFAULT_PLANS = ([\s\S]*?) as const;/)[1]});`)();
let plansAvailable = true;

const listen = (server) =>
  new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve(server.address().port)),
  );
const close = (server) => new Promise((resolve) => server.close(resolve));
const displayCookie = (role) =>
  Buffer.from(
    JSON.stringify({
      id: "test-user",
      name: "Test administrator",
      email: "test@example.invalid",
      role,
      orgId: null,
      hasCompletedOnboarding: false,
    }),
  ).toString("base64url");
const headers = (role = "administrator", displayRole = role) => ({
  Cookie: `lawscan_refresh=${role}; lawscan_user=${displayCookie(displayRole)}`,
});
let sourceRequests = 0;
let uploadedBody = "";
let deleted = false;
let healthAvailable = true;
let healthRequests = 0;
const legalActions = [];
const workspaceActions = [];
let organizationBlocked = false;
let child;
let log = "";

const backend = http.createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  if (/^\/api\/v1\/(organizations|contracts|reviews)\/0123456789abcdef01234567/.test(req.url)) {
    let body = "";
    for await (const chunk of req) body += chunk;
    workspaceActions.push({ url: req.url, method: req.method, body, authorization: req.headers.authorization });
    if (req.headers.authorization !== "Bearer workspace-owner") {
      res.writeHead(403); return res.end(JSON.stringify({ success: false, error: { message: "Forbidden by backend" } }));
    }
    if (req.url.includes("/reviews/") && req.url.endsWith("/events")) {
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      return res.end('event: review\ndata: {"status":"completed"}\n\nevent: done\ndata: {"status":"completed"}\n\n');
    }
    if (req.method === "DELETE") {
      if (organizationBlocked && /\/organizations\/[a-f\d]+$/.test(req.url)) { res.writeHead(409); return res.end(JSON.stringify({ success: false, error: { message: "Organization still has contracts" } })); }
      res.writeHead(204); return res.end();
    }
    return res.end(JSON.stringify({ success: true, data: { name: "Updated", planCode: "business_starter" } }));
  }
  if (req.url === "/api/v1/plans") {
    assert.equal(req.headers.authorization, undefined, "Public plan listing does not require an account");
    res.writeHead(plansAvailable ? 200 : 503);
    return res.end(JSON.stringify(plansAvailable ? { success: true, data: fixturePlans } : { success: false, error: { message: "Plan service unavailable" } }));
  }
  if (req.url === "/api/v1/health") {
    healthRequests++;
    res.writeHead(healthAvailable ? 200 : 503);
    return res.end(
      JSON.stringify({
        success: healthAvailable,
        data: { status: healthAvailable ? "ok" : "unavailable" },
      }),
    );
  }
  if (req.url === "/api/v1/auth/refresh") {
    let body = "";
    for await (const chunk of req) body += chunk;
    const role = JSON.parse(body).refreshToken;
    if (role === "expired") {
      res.writeHead(401);
      return res.end("{}");
    }
    const claims = Buffer.from(
      JSON.stringify({ sub: "test-user", role }),
    ).toString("base64url");
    return res.end(
      JSON.stringify({ data: { accessToken: `test.${claims}.test` } }),
    );
  }
  if (["/api/v1/kb/legal-sources/preview", "/api/v1/kb/legal-sources/0123456789abcdef01234567", "/api/v1/kb/legal-sources/0123456789abcdef01234567/parts", "/api/v1/kb/legal-sources/0123456789abcdef01234567/resume"].includes(req.url) && req.method !== "DELETE") {
    let body = "";
    for await (const chunk of req) body += chunk;
    legalActions.push({ url: req.url, method: req.method, body, authorization: req.headers.authorization });
    const status = req.url.endsWith("/resume") ? 409 : req.url.endsWith("/parts") ? 202 : 200;
    res.writeHead(status);
    return res.end(JSON.stringify(status === 409 ? { success: false, error: { message: "Already running" } } : { success: true, data: { _id: "0123456789abcdef01234567", ingestion: { status: "queued" } } }));
  }
  if (req.url === "/api/v1/kb/legal-sources") {
    sourceRequests++;
    if (req.method === "POST") {
      for await (const chunk of req) uploadedBody += chunk;
      res.writeHead(202);
      return res.end(
        JSON.stringify({
          success: true,
          data: { _id: "0123456789abcdef01234567" },
        }),
      );
    }
    return res.end(JSON.stringify({ success: true, data: [] }));
  }
  if (
    req.url === "/api/v1/kb/legal-sources/0123456789abcdef01234567" &&
    req.method === "DELETE"
  ) {
    deleted = true;
    res.writeHead(204);
    return res.end();
  }
  res.writeHead(404);
  res.end("{}");
});

async function main() {
  const backendPort = await listen(backend);
  const reserve = http.createServer();
  const frontendPort = await listen(reserve);
  await close(reserve);
  child = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-p", String(frontendPort)],
    {
      cwd: path.resolve(__dirname, ".."),
      windowsHide: true,
      env: {
        ...process.env,
        API_BASE_URL: `http://127.0.0.1:${backendPort}`,
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  child.stdout.on("data", (data) => {
    log += data;
  });
  child.stderr.on("data", (data) => {
    log += data;
  });
  const base = `http://127.0.0.1:${frontendPort}`;
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      await fetch(`${base}/dang-nhap`);
      ready = true;
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  assert(ready, `Frontend did not start: ${log}`);
  const get = (route, options = {}) =>
    fetch(`${base}${route}`, { redirect: "manual", ...options });

  const id = "0123456789abcdef01234567";
  for (const [route, method, body] of [
    [`/api/organizations/${id}`, "PATCH", { name: "Updated", taxCode: null, address: null }],
    [`/api/contracts/${id}`, "DELETE"],
    [`/api/organizations/${id}/subscription/downgrade`, "POST", { planCode: "business_starter" }],
    [`/api/organizations/${id}/subscription/downgrade`, "DELETE"],
    [`/api/reviews/${id}/events`, "GET"],
    [`/api/organizations/${id}`, "DELETE"],
  ]) {
    const options = { method, ...(body ? { body: JSON.stringify(body) } : {}) };
    assert.equal((await get(route, options)).status, 401);
    const before = workspaceActions.length;
    assert.equal((await get(route.replace(id, "invalid"), { ...options, headers: { Cookie: "lawscan_access=workspace-owner" } })).status, 400);
    assert.equal(workspaceActions.length, before);
    const forbidden = await get(route, { ...options, headers: { Cookie: "lawscan_access=workspace-staff; lawscan_user=" + displayCookie("owner") } });
    assert.equal(forbidden.status, 403, "A display cookie cannot override backend authorization");
    const success = await get(route, { ...options, headers: { Cookie: "lawscan_access=workspace-owner" } });
    assert.equal(success.status, method === "DELETE" ? 204 : 200, route);
    const last = workspaceActions.at(-1);
    assert.equal(last.method, method); assert.equal(last.authorization, "Bearer workspace-owner");
    if (body) assert.deepEqual(JSON.parse(last.body), body);
    if (method === "DELETE") assert.equal(await success.text(), "");
    if (route.endsWith("/events")) { assert.match(success.headers.get("content-type"), /text\/event-stream/); assert.match(await success.text(), /event: done/); }
    if (route === `/api/organizations/${id}` && method === "DELETE") {
      assert.match(success.headers.get("set-cookie"), /lawscan_access=;.*Max-Age=0/);
      assert.match(success.headers.get("set-cookie"), /lawscan_user=;/);
    }
  }
  organizationBlocked = true;
  const blocked = await get(`/api/organizations/${id}`, { method: "DELETE", headers: { Cookie: "lawscan_access=workspace-owner" } });
  assert.equal(blocked.status, 409); assert.equal(blocked.headers.get("set-cookie"), null);
  assert.equal((await blocked.json()).error.message, "Organization still has contracts");

  const plansResponse = await get("/api/plans");
  assert.equal(plansResponse.status, 200);
  assert.deepEqual((await plansResponse.json()).data, fixturePlans);
  plansAvailable = false;
  assert.equal((await get("/api/plans")).status, 503);
  plansAvailable = true;
  for (const route of ["/goi-dich-vu", "/goi-dich-vu/xac-nhan?plan=personal_pro&cycle=monthly", "/goi-dich-vu/xac-nhan?plan=business_starter&cycle=monthly"]) {
    assert.equal((await get(route)).status, 200, route);
  }
  const oldPlan = await (await get("/goi-dich-vu/xac-nhan?plan=basic&cycle=yearly")).text();
  assert.ok(oldPlan.includes("Lựa chọn gói chưa hợp lệ"));

  const anonymous = await get("/dashboard/admin");
  assert.equal((await get("/api/admin/health")).status, 401);
  assert.equal(
    (
      await get("/api/admin/health", {
        headers: headers("owner", "administrator"),
      })
    ).status,
    403,
  );
  assert.equal(healthRequests, 0);
  const health = await get("/api/admin/health", { headers: headers() });
  assert.equal(health.status, 200);
  assert.equal((await health.json()).data.status, "ok");
  healthAvailable = false;
  assert.equal(
    (await get("/api/admin/health", { headers: headers() })).status,
    503,
  );
  healthAvailable = true;
  assert.equal(anonymous.status, 307);
  assert.equal(anonymous.headers.get("location"), "/dang-nhap");
  for (const route of [
    "/dashboard/admin",
    "/dashboard/admin/organizations",
    "/dashboard/admin/users",
    "/dashboard/admin/ai-jobs",
    "/dashboard/admin/audit-log",
    "/dashboard/admin/legal-sources",
    "/dashboard/admin/legal-sources/0123456789abcdef01234567",
    "/dashboard/admin/reports",
  ]) {
    const response = await get(route, { headers: headers() });
    const html = await response.text();
    assert.equal(response.status, 200, route);
    assert(html.includes("admin-content"), `Missing admin shell: ${route}`);
  }
  for (const route of [
    "/dashboard",
    "/dashboard/owner",
    "/dashboard/user",
    "/dashboard/owner/review",
    "/chon-to-chuc",
  ]) {
    const response = await get(route, { headers: headers() });
    assert.equal(response.status, 307, route);
    assert.equal(response.headers.get("location"), "/dashboard/admin", route);
  }
  const denied = await get("/dashboard/admin", {
    headers: headers("owner", "administrator"),
  });
  const deniedHtml = await denied.text();
  assert(
    !deniedHtml.includes('id="admin-content"'),
    "Forged display cookie must not reveal admin shell",
  );
  assert(deniedHtml.includes("Bạn không có quyền truy cập"));
  const forbidden = await get("/api/admin/legal-sources", {
    headers: headers("owner", "administrator"),
  });
  assert.equal(forbidden.status, 403);
  assert.equal(
    sourceRequests,
    0,
    "Forbidden request must not reach data endpoint",
  );
  const expired = await get("/api/admin/legal-sources", {
    headers: headers("expired"),
  });
  assert.equal(expired.status, 401);
  const sources = await get("/api/admin/legal-sources", { headers: headers() });
  assert.equal(sources.status, 200);
  assert.deepEqual((await sources.json()).data, []);
  assert.equal(sourceRequests, 1);
  const sourcePath = "/api/admin/legal-sources";
  for (const method of ["POST", "DELETE"]) {
    const route =
      method === "DELETE"
        ? `${sourcePath}/0123456789abcdef01234567`
        : sourcePath;
    const response = await get(route, {
      method,
      headers: headers("owner", "administrator"),
    });
    assert.equal(response.status, 403);
  }
  assert.equal(sourceRequests, 1);
  assert.equal(deleted, false);
  const form = new FormData();
  form.set("title", "Legal source test");
  form.set("sourceType", "law");
  form.set("citationLabel", "TEST-01");
  form.set(
    "file",
    new Blob(["Test legal document"], { type: "text/plain" }),
    "test.txt",
  );
  const uploaded = await get(sourcePath, {
    method: "POST",
    headers: headers(),
    body: form,
  });
  assert.equal(uploaded.status, 202);
  assert(uploadedBody.includes("Test legal document"));
  assert(uploadedBody.includes('name="citationLabel"'));
  for (const [suffix, method, status] of [["/preview", "POST", 200], ["/0123456789abcdef01234567", "GET", 200], ["/0123456789abcdef01234567/parts", "POST", 202], ["/0123456789abcdef01234567/resume", "POST", 409]]) {
    for (const role of ["owner", "manager", "staff", "reviewer", "user"]) {
      assert.equal((await get(`${sourcePath}${suffix}`, { method, headers: headers(role, "administrator") })).status, 403);
    }
    assert.equal((await get(`${sourcePath}${suffix}`, { method })).status, 401);
    const response = await get(`${sourcePath}${suffix}`, { method, headers: headers(), ...(suffix === "/preview" || suffix.endsWith("/parts") ? { body: form } : {}) });
    assert.equal(response.status, status);
    if (status === 409) assert.equal((await response.json()).error.message, "Already running");
  }
  assert.equal(legalActions.length, 4, "Only authorized requests reach backend");
  assert(legalActions[0].body.includes("Test legal document"));
  assert(legalActions[2].body.includes("Test legal document"));
  assert(legalActions.every((action) => action.authorization.startsWith("Bearer ")));
  assert.equal((await get(`${sourcePath}/invalid/parts`, { method: "POST", headers: headers(), body: form })).status, 400);
  const invalid = await get(`${sourcePath}/invalid`, {
    method: "DELETE",
    headers: headers(),
  });
  assert.equal(invalid.status, 400);
  const removed = await get(`${sourcePath}/0123456789abcdef01234567`, {
    method: "DELETE",
    headers: headers(),
  });
  assert.equal(removed.status, 204);
  assert.equal(await removed.text(), "");
  assert.equal(deleted, true);
  console.log(
    "PASS: admin pages, plans, legal-source and workspace proxies (organization edit/delete, contract delete, downgrade/cancel, review SSE), authentication, backend permission errors, 204 and session cleanup.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (child && child.exitCode === null) {
      await new Promise((resolve) => {
        child.once("exit", resolve);
        child.kill();
      });
    }
    await close(backend);
  });
