import { apiRequest, apiClient } from './client';
import type { ContractDraft, DraftCatalog, DraftChanges, DraftList, TemplateCode } from '@/types/contract-drafts';

const base = '/contract-drafts';
export const contractDraftsApi = {
  catalog: () => apiRequest<DraftCatalog>({ url: `${base}/templates` }),
  list: (page: number) => apiRequest<DraftList>({ url: base, params: { page } }),
  get: (id: string) => apiRequest<ContractDraft>({ url: `${base}/${id}` }),
  create: (input: { templateCode: TemplateCode; title: string; ourParty: string; input: Record<string, string> }) => apiRequest<ContractDraft>({ url: base, method: 'POST', data: input }),
  save: (id: string, revision: number, input: DraftChanges) => apiRequest<ContractDraft>({ url: `${base}/${id}`, method: 'PATCH', data: { ...input, revision } }),
  generate: (id: string, revision: number) => apiRequest<ContractDraft>({ url: `${base}/${id}/generate`, method: 'POST', data: { revision }, timeout: 110_000 }),
  copyLatest: (id: string, revision: number) => apiRequest<ContractDraft>({ url: `${base}/${id}/copy-latest`, method: 'POST', data: { revision } }),
  decide: (id: string, revision: number, action: 'submit' | 'approve' | 'return', note: string) => apiRequest<ContractDraft>({ url: `${base}/${id}/decision`, method: 'POST', data: { revision, action, note } }),
  publish: (id: string, revision: number) => apiRequest<{ contractId: string }>({ url: `${base}/${id}/publish`, method: 'POST', data: { revision }, timeout: 100_000 }),
  async download(id: string) {
    const response = await apiClient.get(`${base}/${id}/export`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a'); link.href = url; link.download = `hop-dong-${id}.docx`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
