export type SectionConfig = {
  title: string;
  columns: readonly string[];
  rows: readonly (readonly string[])[];
  statusIndex: number;
};

export type ManagementSectionId = "organizations" | "users" | "ai-jobs" | "audit-log";
