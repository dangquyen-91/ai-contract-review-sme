export const dashboardKeys = {
  all: ["dashboard"] as const,
  overview: ["dashboard", "overview"] as const,
  insights: (role: string, period: string, scopeId?: string) => ["dashboard", "insights", role, scopeId ?? "session", period] as const,
};
