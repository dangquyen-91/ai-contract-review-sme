import type { ExcelExportSource } from "@/types/report-export";
import { insightExcel } from "./insight-excel";
import { reportExcel } from "./report-excel";

export async function downloadExcelReport(source: ExcelExportSource) {
  const workbook =
    source.kind === "insights"
      ? insightExcel(source.data)
      : reportExcel(source.data);
  const bytes = await workbook.xlsx.writeBuffer();
  const blob = new Blob([new Uint8Array(bytes)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const prefix = source.kind === "insights" ? source.data.role : "bao-cao";
  link.href = url;
  link.download = `lawscan-${prefix}-${source.data.period.startDate}-${source.data.period.endDate}.xlsx`;
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
