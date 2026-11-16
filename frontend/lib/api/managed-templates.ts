import { apiRequest } from "./client";
import type {
  ManagedTemplate,
  ManagedTemplateList,
  TemplateDefinition,
} from "@/types/managed-templates";
const base = "/manager/contract-templates";
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
  save: (id: string, revision: number, definition: TemplateDefinition) => {
    const {
      code,
      name,
      description,
      legalBasis,
      fields,
      sections,
      reviewNotes,
    } = definition;
    return apiRequest<ManagedTemplate>({
      url: `${base}/${id}`,
      method: "PATCH",
      data: {
        revision,
        definition: {
          code,
          name,
          description,
          legalBasis,
          fields,
          sections,
          reviewNotes,
        },
      },
    });
  },
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
