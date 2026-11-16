export type CsvValue = string | number | null | undefined;

function csvCell(value: CsvValue) {
  const text = value == null ? "" : String(value);
  const safe =
    typeof value === "string" && /^\s*[=+@\-]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function serializeReportCsv(rows: CsvValue[][]) {
  const width = rows.reduce((maximum, row) => Math.max(maximum, row.length), 0);
  const lines = rows.map((row) =>
    Array.from({ length: width }, (_, index) => csvCell(row[index])).join(","),
  );
  // BOM preserves Vietnamese; Excel's delimiter directive avoids depending on
  // Windows regional list separators. All report rows have the same width.
  return "\uFEFFsep=,\r\n" + lines.join("\r\n");
}

export function formatCsvDate(value: string) {
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (day) return `${day[3]}/${day[2]}/${day[1]}`;
  const month = /^(\d{4})-(\d{2})$/.exec(value);
  return month ? `${month[2]}/${month[1]}` : value;
}

export function formatCsvDateTime(value: string, timezone: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Chưa có dữ liệu";
  const parts = new Intl.DateTimeFormat("vi-VN", {
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
    parts.find((item) => item.type === type)?.value ?? "";
  const milliseconds = date.getUTCMilliseconds();
  const fraction = milliseconds
    ? `.${String(milliseconds).padStart(3, "0")}`
    : "";
  return `${part("day")}/${part("month")}/${part("year")} ${part("hour")}:${part("minute")}:${part("second")}${fraction}`;
}

export function formatCsvMoney(value: number | null) {
  return value == null
    ? "Chưa có dữ liệu"
    : `${value.toLocaleString("vi-VN")} đ`;
}
