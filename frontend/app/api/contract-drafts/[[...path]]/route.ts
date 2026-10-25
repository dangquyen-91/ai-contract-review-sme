import { NextRequest } from 'next/server';
import { proxyContractDraft } from '@/lib/api/contract-draft-proxy';
export const maxDuration = 120;
async function handle(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return proxyContractDraft(request, (await context.params).path ?? []);
}
export { handle as GET, handle as POST, handle as PATCH };
