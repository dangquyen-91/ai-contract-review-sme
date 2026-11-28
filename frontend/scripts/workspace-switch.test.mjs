import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { NextRequest, NextResponse } from "next/server.js";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { Building2, Check, ChevronDown, LoaderCircle, LogOut, UserRound } from "lucide-react";
import * as React from "react";
import * as radix from "radix-ui";
import { withBackendHelper } from './fixtures/inline-backend.mjs';

function load(file, dependencies, globals = {}) {
  const exports = {};
  const source = withBackendHelper(ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText);
  vm.runInNewContext(source, { exports, Buffer, process: { env: {} },
    require: name => { if (!(name in dependencies)) throw new Error(`Unexpected module ${name}`); return dependencies[name]; }, ...globals });
  return exports;
}

function routeHarness() {
  const calls = [];
  let denied = false;
  const user = { id: "a".repeat(24), role: "user", orgId: null, workspace: "personal", organizationMembership: { orgId: "b".repeat(24), role: "staff" } };
  const route = load("../app/api/auth/[action]/route.ts", {
    "next/server": { NextRequest, NextResponse }, "node:crypto": {},
    "@/lib/auth/auth-session": { userSessionCookie: "lawscan_user", encodeSessionUser: value => Buffer.from(JSON.stringify(value)).toString("base64url") },
    "@/lib/auth/token-expiry": { tokenMaxAge: () => 900, rememberedCookieAge: () => ({ maxAge: 3600 }) },
    "@/lib/api/request-origin": { isSameOriginRequest: request => request.headers.get("origin") === "http://localhost" },
    "@/lib/auth/email-verification-session": {},
    "@/lib/auth/api-session": { getApiSession: async () => ({ user, accessToken: "verified" }) },
  }, { fetch: async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
    return { ok: !denied, status: denied ? 403 : 200, json: async () => denied
      ? { success: false, error: { message: "Membership revoked" } }
      : { success: true, data: { user, accessToken: "access", refreshToken: "refresh" } } };
  } });
  const context = action => ({ params: Promise.resolve({ action }) });
  return { calls, deny: () => { denied = true; },
    get: () => route.GET(new NextRequest("http://localhost/api/auth/workspace"), context("workspace")),
    post: (body, origin = "http://localhost", cookie = "lawscan_refresh=old; lawscan_remember=1") => route.POST(new NextRequest("http://localhost/api/auth/workspace", {
      method: "POST", headers: { origin, cookie }, body: JSON.stringify(body),
    }), context("workspace")),
  };
}

test("only Owner and Staff use organization dashboards; Manager navigation remains at system scope", () => {
  const organization = load("../lib/routing/organization-dashboard-route.ts", { "@/config/routes": { routes: {} } });
  for (const role of ["owner", "staff"]) assert.equal(organization.isOrganizationDashboardRole(role), true);
  for (const role of ["administrator", "manager", "expert", "user"]) assert.equal(organization.isOrganizationDashboardRole(role), false);
  const { permissions } = load("../config/permissions.ts", {});
  assert.equal(permissions.management("manager"), true);
  assert.equal(permissions.members("manager"), false);
  assert.equal(permissions.contracts("manager"), false);
  assert.equal(permissions.members("owner"), true);
  assert.equal(permissions.members("staff"), false);
});

test("workspace metadata comes from the verified backend session", async () => {
  const ctx = routeHarness();
  const response = await ctx.get();
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal((await response.json()).data.organizationMembership.role, "staff");
});

test("switch rotates HttpOnly cookies, preserves remember and never trusts a submitted role or organization", async () => {
  const ctx = routeHarness();
  const response = await ctx.post({ workspace: "personal", orgId: "other", role: "administrator", refreshToken: "forged" });
  assert.equal(response.status, 200);
  assert.deepEqual(ctx.calls[0].body, { refreshToken: "old", workspace: "personal" });
  assert.ok(ctx.calls[0].url.endsWith("/auth/refresh"));
  for (const name of ["lawscan_access", "lawscan_refresh", "lawscan_remember", "lawscan_user"]) {
    assert.equal(response.cookies.get(name).httpOnly, true);
    assert.ok(response.cookies.get(name).value);
  }
  assert.equal(response.cookies.get("lawscan_remember").value, "1");
  assert.equal((await response.json()).data.user.workspace, "personal");
});

test("invalid, cross-origin or unauthenticated workspace switches do not reach the backend", async () => {
  const ctx = routeHarness();
  assert.equal((await ctx.post({ workspace: "personal" }, "https://untrusted.example")).status, 403);
  assert.equal((await ctx.post({ workspace: "admin" })).status, 400);
  assert.equal((await ctx.post(null)).status, 400);
  assert.equal((await ctx.post({ workspace: "personal" }, "http://localhost", "")).status, 401);
  assert.equal(ctx.calls.length, 0);
});

test("revoked membership leaves the existing session cookies unchanged", async () => {
  const ctx = routeHarness(); ctx.deny();
  const response = await ctx.post({ workspace: "organization" });
  assert.equal(response.status, 403);
  assert.equal(response.headers.get("set-cookie"), null);
});

const quotaLabel = load("../lib/workspace/quota-label.ts", {});

test("switcher shows the current workspace by name only for an organization member", () => {
  let user = { workspace: "personal", organizationMembership: { orgId: "b", role: "staff" } };
  let workspaces = [];
  const { WorkspaceSwitcher } = load("../components/layouts/dashboard/workspace-switcher.tsx", {
    react: React,
    "react/jsx-runtime": jsxRuntime,
    "radix-ui": radix,
    "lucide-react": { Building2, Check, ChevronDown, LoaderCircle, LogOut, UserRound },
    "@/components/ui/button": { Button: () => null },
    "@/components/ui/dialog": Object.fromEntries(["Dialog", "DialogContent", "DialogDescription", "DialogFooter", "DialogHeader", "DialogTitle"].map(name => [name, () => null])),
    "@/hooks/dashboard/use-workspace-switcher": { useWorkspaceSwitcher: () => ({ user, workspaces, switching: false, switchWorkspace() {} }) },
    "@/lib/workspace/quota-label": quotaLabel,
  });
  const render = () => renderToStaticMarkup(jsxRuntime.jsx(WorkspaceSwitcher, {}));
  let html = render();
  assert.match(html, /aria-label="Không gian làm việc: Cá nhân. Chuyển không gian"/);
  assert.match(html, /Đang xem dữ liệu cá nhân/);
  user = { workspace: "organization", organizationMembership: { orgId: "b", role: "staff" } };
  workspaces = [{ key: "organization", id: "b", name: "Công ty Minh Tâm", role: "staff", status: "active", plan: { code: "business_starter", name: "Starter" }, analysis: { available: 18, limit: 30 } }];
  html = render();
  assert.match(html, /Công ty Minh Tâm/);
  assert.match(html, /Đang xem dữ liệu tổ chức/);
  user = { workspace: "personal", organizationMembership: null };
  assert.equal(render(), "");
});

test("switch cancels old queries before changing cookies and clears old data before navigation", async () => {
  const events = [], handlers = {};
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  const { useWorkspaceSwitcher } = load("../hooks/dashboard/use-workspace-switcher.ts", {
    react: { useState: () => [false, () => {}], useRef: () => ({ current: false }), useEffect: fn => fn() },
    "@tanstack/react-query": {
      useQuery: () => ({ data: { workspace: "personal" } }),
      useQueryClient: () => ({ cancelQueries: async () => events.push("cancel"), clear: () => events.push("clear") }),
    },
    sonner: { toast: { error: message => events.push(message) } },
    "@/lib/api/auth": { authApi: { workspaceSession() {}, workspaces() {}, switchWorkspace: async () => { events.push("switch"); await pending; } } },
    "@/lib/api/invitations": { invitationsApi: {} },
    "@/lib/query-keys/auth": { authQueryKeys: { workspaceSession: ["workspace-session"], workspaces: ["workspace-session", "workspaces"] } },
  }, { window: { location: { pathname: "/subscription", assign: path => events.push(path) },
    localStorage: { setItem: key => events.push(key) },
    addEventListener: (key, fn) => { handlers[key] = fn; }, removeEventListener() {} } });
  const hook = useWorkspaceSwitcher();
  const first = hook.switchWorkspace("organization");
  await hook.switchWorkspace("organization");
  release(); await first;
  assert.deepEqual(events, ["cancel", "switch", "clear", "lawscan_workspace_changed", "/dashboard"]);
  handlers.storage({ key: "lawscan_workspace_changed" });
  assert.equal(events.at(-1), "/review");
});

test("switching from a page can return to that page, but never to another site", async () => {
  const events = [];
  const { useWorkspaceSwitcher } = load("../hooks/dashboard/use-workspace-switcher.ts", {
    react: { useState: () => [false, () => {}], useRef: () => ({ current: false }), useEffect: () => {} },
    "@tanstack/react-query": {
      useQuery: () => ({ data: { workspace: "personal" } }),
      useQueryClient: () => ({ cancelQueries: async () => {}, clear: () => {} }),
    },
    sonner: { toast: { error: message => events.push(message) } },
    "@/lib/api/auth": { authApi: { workspaceSession() {}, workspaces() {}, switchWorkspace: async () => {} } },
    "@/lib/api/invitations": { invitationsApi: {} },
    "@/lib/query-keys/auth": { authQueryKeys: { workspaceSession: ["workspace-session"], workspaces: ["workspace-session", "workspaces"] } },
  }, { window: { location: { assign: path => events.push(path) }, localStorage: { setItem() {} }, addEventListener() {}, removeEventListener() {} } });
  const freshSwitcher = useWorkspaceSwitcher;
  for (const [returnTo, expected] of [["/contract-drafts", "/contract-drafts"], ["//evil.example", "/dashboard"], ["/\\evil.example", "/dashboard"], ["https://evil.example", "/dashboard"]]) {
    // Each attempt is a fresh page load, so it gets a fresh switcher.
    await freshSwitcher().switchWorkspace("organization", returnTo);
    assert.equal(events.at(-1), expected);
  }
});

test("the quota picker shows both places with their units and is hidden without an organization", () => {
  let user = { workspace: "personal", organizationMembership: { orgId: "b", role: "staff" } };
  const switches = [];
  const workspaces = [
    { key: "personal", id: "a", name: "Lê Thu Hà", role: null, status: "active", plan: { code: "personal_free", name: "Miễn phí" }, analysis: { available: 2, limit: 3 }, drafting: { available: 1, limit: 1 } },
    { key: "organization", id: "b", name: "Công ty Minh Tâm", role: "staff", status: "active", plan: { code: "business_starter", name: "Starter" }, analysis: { available: 18, limit: 30 }, drafting: { available: 9, limit: 10 } },
  ];
  const { QuotaScopePicker } = load("../components/workspace/quota-scope-picker.tsx", {
    "react/jsx-runtime": jsxRuntime,
    "next/navigation": { usePathname: () => "/review" },
    "@/components/layouts/dashboard/workspace-switcher": { WorkspaceIcon: () => null },
    "@/hooks/dashboard/use-workspace-switcher": { useWorkspaceSwitcher: () => ({ user, workspaces, switching: false, switchWorkspace: (...args) => switches.push(args) }) },
    "@/lib/workspace/quota-label": quotaLabel,
  });
  const html = renderToStaticMarkup(jsxRuntime.jsx(QuotaScopePicker, { kind: "analysis" }));
  assert.match(html, /Lưu vào và tính hạn mức của/);
  assert.match(html, /aria-checked="true"[^>]*>.*Cá nhân/);
  assert.match(html, /Miễn phí · còn 2\/3 lượt rà soát/);
  assert.match(html, /Công ty Minh Tâm/);
  assert.match(html, /Starter · còn 18\/30 lượt rà soát/);
  assert.match(renderToStaticMarkup(jsxRuntime.jsx(QuotaScopePicker, { kind: "drafting" })), /Starter · còn 9\/10 lượt soạn thảo/);
  user = { workspace: "personal", organizationMembership: null };
  assert.equal(renderToStaticMarkup(jsxRuntime.jsx(QuotaScopePicker, { kind: "analysis" })), "");
});
