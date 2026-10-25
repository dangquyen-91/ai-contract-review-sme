import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/auth/api-session';
import { isSameOriginRequest } from '@/lib/request-origin';

export async function proxyContractDraft(request: NextRequest, path: string[]) {
  if (request.method !== 'GET' && !isSameOriginRequest(request)) return NextResponse.json({ success: false }, { status: 403 });
  const session = await getApiSession();
  if (session.error) return session.error;
  if (!session.user.orgId || !['owner', 'staff'].includes(session.user.role)) return NextResponse.json({ success: false, error: { message: 'Chức năng chỉ dành cho doanh nghiệp.' } }, { status: 403 });
  const validId = /^[a-f\d]{24}$/i.test(path[0] ?? '');
  const allowed = path.length === 0 ? ['GET', 'POST'] : path.length === 1 && path[0] === 'templates' ? ['GET'] : path.length === 1 && validId ? ['GET', 'PATCH'] : path.length === 2 && validId && ['generate', 'decision', 'publish', 'copy-latest'].includes(path[1]) ? ['POST'] : path.length === 2 && validId && path[1] === 'export' ? ['GET'] : [];
  if (!allowed.includes(request.method)) return NextResponse.json({ success: false }, { status: 404 });
  const query = new URLSearchParams();
  if (!path.length) query.set('page', request.nextUrl.searchParams.get('page') ?? '1');
  if (path[1] === 'export') query.set('format', request.nextUrl.searchParams.get('format') ?? 'docx');
  try {
    const response = await fetch(`${process.env.API_BASE_URL ?? 'http://localhost:4000'}/api/v1/contract-drafts${path.length ? '/' + path.join('/') : ''}?${query}`, {
      method: request.method, headers: { Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json' },
      ...(request.method !== 'GET' ? { body: await request.text() } : {}), cache: 'no-store', signal: AbortSignal.timeout(path[1] === 'generate' ? 100_000 : path[1] === 'publish' ? 90_000 : 30_000),
    });
    if (response.ok && path[1] === 'export' && query.get('format') === 'docx') return new Response(response.body, { status: 200, headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Content-Disposition': `attachment; filename="hop-dong-${path[0]}.docx"`, 'Cache-Control': 'no-store' } });
    return NextResponse.json(await response.json(), { status: response.status, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ success: false, error: { message: 'Chưa thể hoàn tất yêu cầu. Vui lòng tải lại bản nháp trước khi thử lại.' } }, { status: 503 });
  }
}
