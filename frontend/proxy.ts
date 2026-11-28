import { NextResponse, type NextRequest } from "next/server";
import { isSameOriginRequest } from "@/lib/api/request-origin";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Every state-changing call to a Next API route must come from this site.
 * Session cookies are SameSite=Lax; this rejects same-site or older-browser
 * cross-origin requests too, so individual routes need not repeat the check.
 */
export function proxy(request: NextRequest) {
  if (safeMethods.has(request.method) || isSameOriginRequest(request)) return NextResponse.next();
  return NextResponse.json(
    { success: false, error: { message: "Yêu cầu không hợp lệ. Vui lòng tải lại trang." } },
    { status: 403 },
  );
}

export const config = {
  matcher: "/api/:path*",
};
