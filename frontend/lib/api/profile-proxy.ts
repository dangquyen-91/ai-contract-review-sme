import { NextRequest, NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/request-origin';
import { encodeSessionUser, userSessionCookie } from '@/lib/auth-session';
import { rememberedCookieAge } from '@/lib/token-expiry';
import { emailVerificationCookie } from '@/lib/email-verification-session';
import { getApiSession } from '@/lib/auth/api-session';

export async function proxyProfile(request: NextRequest, action: '' | 'avatar' | 'password' = '') {
  if (request.method !== 'GET' && !isSameOriginRequest(request)) return NextResponse.json({ success: false }, { status: 403 });
  const session = await getApiSession();
  if (session.error) return session.error;
  const token = session.accessToken;
  try {
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    let body: BodyInit | undefined;
    if (request.method !== 'GET' && request.method !== 'DELETE') {
      if (action === 'avatar') {
        // Reject oversized requests before buffering the multipart body.
        const length = Number(request.headers.get('content-length'));
        if (length > 2 * 1024 * 1024 + 65536) return NextResponse.json({ success: false, error: { message: 'Ảnh đại diện không được vượt quá 2 MB.' } }, { status: 413 });
        const incoming = await request.formData();
        const file = incoming.get('avatar');
        if (!file || typeof file === 'string' || file.size > 2 * 1024 * 1024) return NextResponse.json({ success: false, error: { message: 'Vui lòng chọn ảnh không quá 2 MB.' } }, { status: 400 });
        const form = new FormData(); form.set('avatar', file);
        body = form;
      } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(await request.json());
      }
    }
    const upstream = await fetch(`${process.env.API_BASE_URL ?? 'http://localhost:4000'}/api/v1/profile${action ? `/${action}` : ''}`, {
      method: request.method, headers, body, cache: 'no-store', signal: AbortSignal.timeout(30_000),
    });
    const payload = await upstream.json();
    const response = NextResponse.json(payload, { status: upstream.status, headers: { 'Cache-Control': 'no-store' } });
    if (!upstream.ok) return response;
    const options = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/' };
    if (action === 'password') {
      for (const cookie of ['lawscan_access', 'lawscan_refresh', 'lawscan_remember', userSessionCookie, emailVerificationCookie]) response.cookies.set(cookie, '', { ...options, maxAge: 0 });
    } else if (request.method !== 'GET' && payload.data?.user) {
      const refresh = request.cookies.get('lawscan_refresh')?.value;
      const remember = request.cookies.get('lawscan_remember')?.value === '1';
      response.cookies.set(userSessionCookie, encodeSessionUser(payload.data.user), { ...options, ...rememberedCookieAge(remember, refresh) });
    }
    return response;
  } catch {
    return NextResponse.json({ success: false, error: { message: 'Không thể cập nhật hồ sơ. Vui lòng thử lại.' } }, { status: 503 });
  }
}
