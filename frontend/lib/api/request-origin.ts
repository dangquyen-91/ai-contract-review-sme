import type { NextRequest } from "next/server";

export function isSameOriginRequest(request: NextRequest) {
  try {
    const origin = new URL(request.headers.get("origin") ?? "");
    // Next may normalize nextUrl.hostname to localhost when accessed via 127.0.0.1.
    // Host reflects the browser-facing request; do not trust an arbitrary forwarded host.
    const host = request.headers.get("host") ?? request.nextUrl.host;
    return origin.host === host && origin.protocol === request.nextUrl.protocol && !origin.username && !origin.password;
  } catch { return false; }
}
