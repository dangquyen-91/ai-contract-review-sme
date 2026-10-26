import { apiRequest, apiClient } from './client';
import type { ContractDraft, DraftCatalog, DraftList, DraftSummary, TemplateCode } from '@/types/contract-drafts';
import type { StudioDocument, StudioProposal, StudioReference } from '@/types/template-studio';

const base = '/contract-drafts';
export const contractDraftsApi = {
  catalog: () => apiRequest<DraftCatalog>({ url: `${base}/templates` }),
  list: (page: number) => apiRequest<DraftList>({ url: base, params: { page } }),
  get: (id: string) => apiRequest<ContractDraft>({ url: `${base}/${id}` }),
  pin: (id: string, pinned: boolean) => apiRequest<DraftSummary>({ url: `${base}/${id}/pin`, method: 'PATCH', data: { pinned } }),
  remove: (id: string, revision: number) => apiRequest<{ id: string }>({ url: `${base}/${id}`, method: 'DELETE', data: { revision } }),
  create: (input: { templateCode: TemplateCode; title: string; ourParty: string; input: Record<string, string>; editorMode?: 'studio' }) => apiRequest<ContractDraft>({ url: base, method: 'POST', data: input }),
  openStudio: (id: string, revision: number) => apiRequest<ContractDraft>({ url: `${base}/${id}/studio`, method: 'POST', data: { revision } }),
  copyLatest: (id: string, revision: number) => apiRequest<ContractDraft>({ url: `${base}/${id}/copy-latest`, method: 'POST', data: { revision } }),
  saveStudio: (id: string, revision: number, input: { title: string; ourParty: string; input: Record<string, string>; document: StudioDocument }) => apiRequest<ContractDraft>({ url: `${base}/${id}`, method: 'PATCH', data: { ...input, content: '', revision } }),
  assistantHistory: (id: string) => apiRequest<StudioProposal[]>({ url: `${base}/${id}/assistant` }),
  askAssistant: (id: string, input: { revision: number; requestId: string; message: string; blockIds: string[]; references: StudioReference[] }) => apiRequest<StudioProposal>({ url: `${base}/${id}/assistant`, method: 'POST', data: input, timeout: 110_000 }),
  uploadReference: (id: string, file: File) => { const data = new FormData(); data.append('file', file); return apiRequest<StudioReference>({ url: `${base}/${id}/reference`, method: 'POST', data, timeout: 35000 }); },
  actOnProposal: (id: string, proposalId: string, revision: number, action: 'apply' | 'dismiss') => apiRequest<ContractDraft>({ url: `${base}/${id}/proposals/${proposalId}`, method: 'POST', data: { revision, action } }),
  decide: (id: string, revision: number, action: 'submit' | 'approve' | 'return', note: string) => apiRequest<ContractDraft>({ url: `${base}/${id}/decision`, method: 'POST', data: { revision, action, note } }),
  publish: (id: string, revision: number) => apiRequest<{ contractId: string }>({ url: `${base}/${id}/publish`, method: 'POST', data: { revision }, timeout: 100_000 }),
  async download(id: string) {
    const response = await apiClient.get(`${base}/${id}/export`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a'); link.href = url; link.download = `hop-dong-${id}.docx`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
