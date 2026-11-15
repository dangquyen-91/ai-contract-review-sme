import type { DashboardInsights } from "./dashboard-insights";
import type { OperationalReport } from "./reports";

export type ExcelExportSource =
  | { kind: "insights"; data: DashboardInsights }
  | { kind: "operational"; data: OperationalReport };
