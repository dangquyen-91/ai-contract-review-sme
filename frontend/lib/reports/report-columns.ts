// Keep chart/table/CSV field order and labels consistent. Calculations stay in the backend.
export const reportValueColumns = [
  { key: "uploads", label: "Tải lên" },
  { key: "completed", label: "Thành công" },
  { key: "failed", label: "Thất bại" },
  { key: "cancelled", label: "Đã hủy" },
  { key: "receivedAmount", label: "Tiền nhận (VND)" },
  { key: "analysis", label: "Lượt rà soát" },
  { key: "chat", label: "Chat" },
  { key: "drafting", label: "Soạn AI" },
] as const;

export const reportSeriesKeys = [
  ...reportValueColumns.map((column) => column.key),
  "averageDurationMs",
] as const;
