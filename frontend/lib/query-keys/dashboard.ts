export const dashboardKeys = {
  all: ["dashboard"] as const,
  overview: ["dashboard", "overview"] as const,
  insights: (role: string, period: string, scopeId?: string, mine = false) => ["dashboard", "insights", role, scopeId ?? "session", period, mine ? "mine" : "all"] as const,
};
