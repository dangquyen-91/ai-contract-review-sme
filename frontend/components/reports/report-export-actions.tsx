"use client";

import { Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useExcelExport } from "@/hooks/reports/use-excel-export";
import type { ExcelExportSource } from "@/types/report-export";

export function ReportExportActions({
  source,
  ready,
  onCsv,
  csvLabel = "Xuất CSV",
}: {
  source: ExcelExportSource | null;
  ready: boolean;
  onCsv: () => void;
  csvLabel?: string;
}) {
  const excel = useExcelExport(source, ready);
  return (
    <div className="flex max-w-full flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        disabled={!ready || excel.exporting}
        onClick={() => void excel.download()}
      >
        <FileSpreadsheet className="size-4" />
        {excel.exporting ? "Đang xuất Excel…" : "Xuất Excel"}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!ready}
        onClick={onCsv}
      >
        <Download className="size-4" />
        {csvLabel}
      </Button>
      {excel.error && (
        <p role="alert" className="basis-full text-xs text-destructive">
          {excel.error}
        </p>
      )}
    </div>
  );
}
