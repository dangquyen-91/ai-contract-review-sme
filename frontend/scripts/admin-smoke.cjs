// Run after `npm run build`: node scripts/admin-smoke.cjs
// Uses an isolated backend fixture; never connects to the project database.
const assert = require("node:assert/strict");
const http = require("node:http");
const { spawn } = require("node:child_process");
const path = require("node:path");

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
let child;
let log = "";

const backend = http.createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
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
  if (req.url === "/api/v1/kb/legal-sources") {
    sourceRequests++;
    if (req.method === "POST") {
      for await (const chunk of req) uploadedBody += chunk;
      res.writeHead(201);
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

  const anonymous = await get("/dashboard/admin");
  assert.equal(anonymous.status, 307);
  assert.equal(anonymous.headers.get("location"), "/dang-nhap");
  for (const route of [
    "/dashboard/admin",
    "/dashboard/admin/organizations",
    "/dashboard/admin/users",
    "/dashboard/admin/ai-jobs",
    "/dashboard/admin/audit-log",
    "/dashboard/admin/legal-sources",
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
  assert.equal(uploaded.status, 201);
  assert(uploadedBody.includes("Test legal document"));
  assert(uploadedBody.includes('name="citationLabel"'));
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
    "PASS: 6 admin pages, 5 redirects, anonymous/expired sessions, forged-role denial and legal-source proxy.",
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
