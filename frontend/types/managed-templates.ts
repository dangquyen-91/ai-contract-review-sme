import type { ContractTemplate } from "./contract-drafts";
export type TemplateDefinition = Pick<
  ContractTemplate,
  "code" | "name" | "description" | "legalBasis" | "fields" | "reviewNotes"
> & {
  sections: { key: string; title: string; body: string; guidance?: string }[];
};
export type ManagedTemplateSummary = {
  id: string;
  code: ContractTemplate["code"];
  name: string;
  description: string;
  status: "draft" | "published" | "retired";
  revision: number;
  publishedVersion: number;
  hasUnpublishedChanges: boolean;
  updatedAt: string;
};
export type ManagedTemplate = ManagedTemplateSummary & {
  definition: TemplateDefinition;
  publishedDefinition: TemplateDefinition | null;
  versions: { version: number; publishedAt: string }[];
};
export type ManagedTemplateList = {
  items: ManagedTemplateSummary[];
  total: number;
  page: number;
  pages: number;
};
