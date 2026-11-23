type MetricDisplay = { accent: string; marker: string };

export const metricDisplay: Record<string, MetricDisplay> = {
  uploads: { accent: "text-[#292c28]", marker: "bg-[#8097ba]" },
  processing: { accent: "text-[#856222]", marker: "bg-[#b69a5b]" },
  success: { accent: "text-[#346538]", marker: "bg-[#91aa8d]" },
  violations: { accent: "text-[#9f2f2d]", marker: "bg-[#b65c52]" },
  duration: { accent: "text-[#292c28]", marker: "bg-[#b4bcb0]" },
  units: { accent: "text-[#292c28]", marker: "bg-[#b4bcb0]" },
  payments: { accent: "text-[#292c28]", marker: "bg-[#b4bcb0]" },
};
