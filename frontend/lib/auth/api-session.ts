import "server-only";
import { NextResponse } from "next/server";
import { getSession } from "./session";

type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>;
type ApiSession = (Session & { error?: never }) | {
  error: NextResponse;
  user?: never;
  accessToken?: never;
};

// The same verified identity as server pages, with HTTP errors for API callers.
export async function getApiSession(): Promise<ApiSession> {
  try {
    const session = await getSession();
    if (session) return session;
    return { error: NextResponse.json(
      { success: false, error: { message: "Phiên đăng nhập đã hết hạn." } },
      { status: 401 },
    ) };
  } catch {
    return { error: NextResponse.json(
      { success: false, error: { message: "Không thể xác minh phiên đăng nhập. Vui lòng thử lại." } },
      { status: 503 },
    ) };
  }
}
