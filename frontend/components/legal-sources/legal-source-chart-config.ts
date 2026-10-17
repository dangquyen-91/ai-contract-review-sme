import type { ChartConfig } from "@/components/ui/chart";
import { ingestionStatuses, legalSourceTypes } from "@/config/legal-source-display";

export const sourceTypeChartConfig = {
  law: { label: legalSourceTypes.law, color: "#2563eb" },
  decree: { label: legalSourceTypes.decree, color: "#10b981" },
  circular: { label: legalSourceTypes.circular, color: "#8b5cf6" },
  resolution: { label: legalSourceTypes.resolution, color: "#f59e0b" },
  standard_template: { label: legalSourceTypes.standard_template, color: "#ec4899" },
} satisfies ChartConfig;

export const processingChartConfig = {
  queued: { label: ingestionStatuses.queued, color: "#94a3b8" },
  running: { label: ingestionStatuses.running, color: "#3b82f6" },
  paused: { label: ingestionStatuses.paused, color: "#f59e0b" },
  completed: { label: ingestionStatuses.completed, color: "#10b981" },
  failed: { label: ingestionStatuses.failed, color: "#f43f5e" },
  unknown: { label: "Chưa có trạng thái", color: "#64748b" },
} satisfies ChartConfig;

export type LegalSourceChartItem = { key: string; label: string; count: number };
