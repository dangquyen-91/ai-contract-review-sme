"use client";

import { useRef, useState } from "react";
import type { ExcelExportSource } from "@/types/report-export";

export function useExcelExport(
  source: ExcelExportSource | null,
  ready: boolean,
) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = useRef(false);

  async function download() {
    if (!source || !ready || locked.current) return;
    locked.current = true;
    setExporting(true);
    setError(null);
    try {
      const { downloadExcelReport } =
        await import("@/lib/reports/excel-export");
      await downloadExcelReport(source);
    } catch {
      setError("Không thể xuất Excel. Vui lòng thử lại.");
    } finally {
      locked.current = false;
      setExporting(false);
    }
  }

  return { download, exporting, error };
}
