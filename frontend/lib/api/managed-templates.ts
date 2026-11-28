import { apiRequest } from "./client";
import type {
  ManagedTemplate,
  ManagedTemplateList,
  TemplateDefinition,
  TemplatePreview,
} from "@/types/managed-templates";
const base = "/manager/contract-templates";

/** Only the parts a Manager edits are sent; the server fills in the rest. */
const editable = ({ code, name, description, legalBasis, fields, sections, reviewNotes, category }: TemplateDefinition) =>
  ({ code, name, description, legalBasis, fields, sections, reviewNotes, category });
export const managedTemplatesApi = {
  list: (page: number, q: string) =>
    apiRequest<ManagedTemplateList>({ url: base, params: { page, q } }),
  get: (id: string) => apiRequest<ManagedTemplate>({ url: `${base}/${id}` }),
  create: (code: string, name: string) =>
    apiRequest<ManagedTemplate>({
      url: base,
      method: "POST",
      data: { code, name },
    }),
  save: (id: string, revision: number, definition: TemplateDefinition) =>
    apiRequest<ManagedTemplate>({
      url: `${base}/${id}`,
      method: "PATCH",
      data: { revision, definition: editable(definition) },
    }),
  /** The contract users would open from these unsaved edits; nothing is stored. */
  preview: (definition: TemplateDefinition, signal?: AbortSignal) =>
    apiRequest<TemplatePreview>({
      url: `${base}/preview`,
      method: "POST",
      data: { definition: editable(definition) },
      signal,
    }),
  action: (id: string, revision: number, action: "publish" | "retire") =>
    apiRequest<ManagedTemplate>({
      url: `${base}/${id}/${action}`,
      method: "POST",
      data: { revision },
    }),
  remove: (id: string, revision: number) =>
    apiRequest<{ id: string }>({
      url: `${base}/${id}`,
      method: "DELETE",
      data: { revision },
    }),
};
