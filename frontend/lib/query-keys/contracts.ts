import type { DashboardContractFilter } from "@/types/dashboard";

export const contractKeys = {
  all: ["contracts"] as const,
  profiles: ["contract-profiles"] as const,
  lists: ["contracts", "list"] as const,
  list: (filter: DashboardContractFilter & { page?: number; search?: string }, scope = "session") => ["contracts", "list", scope, { ...filter, page: filter.page ?? 1, search: filter.search || undefined }] as const,
  detail: (id: string) => ["contracts", id, "detail"] as const,
  text: (id: string) => ["contracts", id, "text"] as const,
  textView: (id: string, redacted: boolean, mode: "token" | "partial", version?: string) => ["contracts", id, "text", redacted ? "redacted" : "full", ...(redacted ? [mode] : []), version] as const,
  file: (id: string, version?: string) => ["contracts", id, "file", version] as const,
  redactedFile: (id: string, version?: string) => ["contracts", id, "file", "redacted", version] as const,
  fileBase: (id: string) => ["contracts", id, "file"] as const,
  result: (id: string) => ["contracts", id, "review-result"] as const,
  clauses: (id: string) => ["contracts", id, "clauses"] as const,
  keyTerms: (id: string) => ["contracts", id, "key-terms"] as const,
  findings: (id: string) => ["contracts", id, "findings"] as const,
  chat: (id: string) => ["contracts", id, "chat"] as const,
};

export const contractMutationKeys = {
  upload: ["contracts", "upload"] as const,
  review: ["contracts", "review"] as const,
};
