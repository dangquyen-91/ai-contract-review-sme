import ExcelJS from "exceljs";
import type { Workbook, Worksheet } from "exceljs";
import { formatCsvDate } from "./csv-format";

export const excelFormats = {
  count: "#,##0",
  money: '#,##0 "đ"',
  percent: "0.0%",
  duration: '0.0 "giây"',
  points: '0.0 "điểm %"',
  date: "dd/mm/yyyy",
  month: "mm/yyyy",
  dateTime: "dd/mm/yyyy hh:mm:ss.000",
} as const;
export type ExcelKind = keyof typeof excelFormats | "text";
export type ExportCell = string | number | Date | null;
export type ExportColumn = { label: string; width?: number; kind?: ExcelKind };
export const unknownValue = "Chưa có dữ liệu";

export function excelMetric(
  value: number | null | undefined,
  format?: string,
): ExportCell {
  if (value == null || !Number.isFinite(value)) return unknownValue;
  if (format === "percent") return value / 100;
  if (format === "duration") return value / 1000;
  return value;
}

// Excel dates have no timezone. Encode the displayed civil clock in the report's
// timezone, and keep that timezone explicit in the workbook metadata.
export function excelDate(value: string, timezone?: string): ExportCell {
  if (/^\d{4}-\d{2}$/.test(value)) return new Date(`${value}-01T00:00:00Z`);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00Z`);
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return unknownValue;
  if (!timezone) return date;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((item) => item.type === type)?.value);
  return new Date(
    Date.UTC(
      part("year"),
      part("month") - 1,
      part("day"),
      part("hour"),
      part("minute"),
      part("second"),
      date.getUTCMilliseconds(),
    ),
  );
}

export function createExcelWorkbook(
  title: string,
  start: string,
  end: string,
  timezone: string,
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "LawScan";
  workbook.title = title;
  for (const name of ["Tổng quan", "Xu hướng", "Chi tiết"]) {
    const sheet = workbook.addWorksheet(name, {
      views: [{ showGridLines: false }],
      properties: {
        defaultRowHeight: 22,
        tabColor: { argb: name === "Tổng quan" ? "FF1E40AF" : "FF93C5FD" },
      },
      pageSetup: {
        paperSize: 9,
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
      },
    });
    sheet.columns = [
      { width: 48 },
      { width: 30 },
      { width: 26 },
      { width: 26 },
    ];
    sheet.getCell("A2").value =
      name === "Tổng quan" ? title : `${title} · ${name}`;
    sheet.getCell("A2").font = {
      name: "Arial",
      size: 16,
      bold: true,
      color: { argb: "FF172554" },
    };
    sheet.getRow(2).height = 30;
    sheet.getCell("A3").value =
      `${formatCsvDate(start)} – ${formatCsvDate(end)} · ${timezone}`;
    sheet.getCell("A3").font = {
      name: "Arial",
      size: 10,
      italic: true,
      color: { argb: "FF64748B" },
    };
    sheet.getRow(3).height = 24;
    sheet.headerFooter.oddFooter = "LawScan &C&P / &N";
  }
  return workbook;
}

export function writeExcelTable(
  sheet: Worksheet,
  name: string,
  row: number,
  columns: ExportColumn[],
  rows: ExportCell[][],
) {
  columns.forEach((column, index) => {
    sheet.getColumn(index + 1).width = column.width ?? (index === 0 ? 48 : 25);
  });
  if (rows.length) {
    sheet.addTable({
      name,
      ref: `A${row}`,
      headerRow: true,
      totalsRow: false,
      style: { theme: "TableStyleMedium2", showRowStripes: true },
      columns: columns.map((column) => ({
        name: column.label,
        filterButton: true,
      })),
      rows,
    });
  } else {
    columns.forEach((column, index) => { sheet.getCell(row, index + 1).value = column.label; });
    sheet.getCell(row + 1, 1).value = unknownValue;
  }
  const header = sheet.getRow(row);
  header.height = 38;
  header.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E40AF" },
    };
    cell.font = {
      name: "Arial",
      size: 11,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
  });
  rows.forEach((values, index) => {
    const target = sheet.getRow(row + index + 1);
    target.height = Math.max(
      24,
      ...values.map((value, column) =>
        typeof value === "string"
          ? Math.ceil(value.length / (columns[column]?.width ?? 25)) * 15 + 8
          : 24,
      ),
    );
    target.eachCell((cell) => {
      cell.font = { name: "Arial", size: 11, color: { argb: "FF1E293B" } };
      cell.alignment = {
        horizontal: typeof cell.value === "number" ? "right" : "left",
        vertical: "middle",
        wrapText: typeof cell.value === "string",
      };
    });
    columns.forEach((column, position) => {
      if (column.kind && column.kind !== "text")
        target.getCell(position + 1).numFmt = excelFormats[column.kind];
    });
  });
  return row + Math.max(1, rows.length) + 3;
}

export function writeExcelMetadata(
  workbook: Workbook,
  values: {
    scope: string;
    timezone: string;
    start: string;
    end: string;
    computedAt: string;
    toExclusive: string;
  },
) {
  const sheet = workbook.getWorksheet("Tổng quan")!;
  const rows: [string, ExportCell, ExcelKind][] = [
    ["Phạm vi", values.scope, "text"],
    ["Múi giờ", values.timezone, "text"],
    ["Từ ngày", excelDate(values.start), "date"],
    ["Đến ngày", excelDate(values.end), "date"],
    [
      "Mốc kết thúc (không bao gồm)",
      excelDate(values.toExclusive, values.timezone),
      "dateTime",
    ],
    ["Cập nhật lúc", excelDate(values.computedAt, values.timezone), "dateTime"],
  ];
  rows.forEach(([label, value, kind], index) => {
    const row = sheet.getRow(index + 5);
    row.getCell(1).value = label;
    row.getCell(2).value = value;
    row.eachCell((cell) => {
      cell.font = { name: "Arial", size: 11 };
      cell.alignment = { vertical: "middle" };
    });
    if (kind !== "text") row.getCell(2).numFmt = excelFormats[kind];
  });
}
