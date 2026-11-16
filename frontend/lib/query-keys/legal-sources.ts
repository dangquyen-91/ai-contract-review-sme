export const legalSourceKeys = {
  list: ["admin", "legal-sources"] as const,
  detail: (id: string) => ["admin", "legal-sources", "detail", id] as const,
  catalog: ["admin", "legal-sources", "catalog"] as const,
  health: ["admin", "health"] as const,
};
