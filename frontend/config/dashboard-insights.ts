import type { DashboardRole } from "./dashboard-roles";

type Metric = {
  key: string;
  label: string;
  current?: boolean;
  format?: "percent" | "money" | "duration";
};
type Series = { key: string; label: string; color: string };
type Action = { key: string; label: string; href: string };
type InsightConfig = {
  title: string;
  description: string;
  metrics: Metric[];
  series: Series[];
  trendNote?: string;
  distributionTitle: string;
  distributionNote: string;
  labels: Record<string, string>;
  actions: Action[];
};
const reviewSeries = [
  { key: "uploads", label: "Hợp đồng tải lên", color: "#2563eb" },
  { key: "completed", label: "Rà soát thành công", color: "#059669" },
  { key: "failed", label: "Rà soát thất bại", color: "#be123c" },
];
const contractLabels = {
  uploaded: "Đã tải lên",
  processing: "Đang xử lý",
  reviewed: "Đã rà soát",
  archived: "Đã lưu trữ",
  unsupported: "Không hỗ trợ",
};
const workspaceMetrics: Metric[] = [
  { key: "uploads", label: "Hợp đồng tải lên" },
  { key: "completed", label: "Rà soát thành công" },
  { key: "failed", label: "Rà soát thất bại" },
  { key: "openVerification", label: "Chờ / đang xác minh", current: true },
];
const workspaceConfig: InsightConfig = {
  title: "Hoạt động trong kỳ",
  description:
    "Theo dõi lượt rà soát và sử dụng AI trong không gian đang chọn.",
  metrics: workspaceMetrics,
  series: reviewSeries,
  distributionTitle: "Trạng thái hợp đồng hiện tại",
  distributionNote:
    "Toàn bộ hợp đồng trong không gian, tại thời điểm cập nhật.",
  labels: contractLabels,
  actions: [
    {
      key: "processing",
      label: "Hợp đồng đang xử lý",
      href: "/contract?status=processing",
    },
  ],
};

export const dashboardInsightConfig: Record<DashboardRole, InsightConfig> = {
  administrator: {
    title: "Trung tâm điều hành",
    description: "Theo dõi hoạt động LawScan và các vấn đề cần xử lý.",
    metrics: [
      { key: "organizations", label: "Tổ chức", current: true },
      { key: "users", label: "Tài khoản chưa xóa", current: true },
      { key: "completed", label: "Rà soát thành công" },
      { key: "successRate", label: "Tỷ lệ thành công", format: "percent" },
      { key: "receivedAmount", label: "Thanh toán đã nhận", format: "money" },
      {
        key: "averageDurationMs",
        label: "Thời gian xử lý AI",
        format: "duration",
      },
    ],
    series: reviewSeries,
    distributionTitle: "Không gian sử dụng nhiều nhất",
    distributionNote:
      "Tối đa 10 không gian, theo lượt rà soát thành công + thất bại trong kỳ.",
    labels: {},
    actions: [
      { key: "queued", label: "Tác vụ AI đang chờ", href: "/admin/reports" },
      { key: "running", label: "Tác vụ AI đang chạy", href: "/admin/reports" },
      {
        key: "unfulfilled",
        label: "Thanh toán chờ hoàn tất kích hoạt",
        href: "/admin/reports",
      },
    ],
  },
  owner: {
    title: "Hoạt động tổ chức trong kỳ",
    description: "Số liệu toàn tổ chức, tách biệt với không gian cá nhân.",
    metrics: [
      { key: "uploads", label: "Hợp đồng tải lên" },
      { key: "completed", label: "Rà soát thành công" },
      { key: "highRisk", label: "Hợp đồng rủi ro cao" },
      { key: "successRate", label: "Tỷ lệ thành công", format: "percent" },
    ],
    series: reviewSeries,
    distributionTitle: "Phân bố rủi ro trong kỳ",
    distributionNote:
      "Mỗi hợp đồng lấy kết quả thành công mới nhất trong kỳ; thiếu kết quả được ghi riêng.",
    labels: {
      high: "Rủi ro cao",
      medium: "Trung bình",
      low: "Rủi ro thấp",
      none: "Không phát hiện rủi ro",
      unknown: "Thiếu kết quả",
    },
    actions: [
      {
        key: "running",
        label: "Rà soát AI đang chạy",
        href: "/contract?status=processing",
      },
      {
        key: "openVerification",
        label: "Chờ / đang xác minh",
        href: "/contract",
      },
    ],
  },
  staff: workspaceConfig,
  user: {
    ...workspaceConfig,
    title: "Tổng quan cá nhân",
    description:
      "Hợp đồng, lượt sử dụng và công việc trong không gian cá nhân của bạn.",
  },
  expert: {
    title: "Thống kê xác minh",
    description:
      "Hàng đợi hiện tại và kết quả những lần xác minh do bạn xử lý.",
    metrics: [
      { key: "waiting", label: "Chờ tiếp nhận", current: true },
      { key: "inProgress", label: "Tôi đang xử lý", current: true },
      { key: "approved", label: "Đã duyệt" },
      { key: "returned", label: "Đã trả lại" },
      {
        key: "averageDurationMs",
        label: "Thời gian xác minh",
        format: "duration",
      },
    ],
    series: [
      { key: "approved", label: "Đã duyệt", color: "#2563eb" },
      { key: "returned", label: "Đã trả lại", color: "#b45309" },
    ],
    trendNote:
      "Kết quả những lần xác minh của bạn, theo ngày kết thúc; kỳ dài được gộp theo tháng.",
    distributionTitle: "Kết quả công việc của tôi",
    distributionNote:
      "Đếm theo lần xác minh kết thúc trong kỳ, bao gồm lịch sử trước khi gửi lại yêu cầu.",
    labels: { approved: "Đã duyệt", returned: "Đã trả lại" },
    actions: [
      {
        key: "inProgress",
        label: "Tiếp tục công việc của tôi",
        href: "/expert-verification?status=in_progress",
      },
      {
        key: "waiting",
        label: "Tiếp nhận yêu cầu",
        href: "/expert-verification?status=requested",
      },
    ],
  },
  manager: {
    title: "Tổng quan quản lý",
    description: "Theo dõi tổ chức và tình trạng kho pháp lý của LawScan.",
    metrics: [
      { key: "organizations", label: "Tổ chức", current: true },
      { key: "legalSources", label: "Nguồn pháp lý", current: true },
      { key: "inForce", label: "Nguồn đang hiệu lực", current: true },
      { key: "updated", label: "Nguồn có cập nhật trong kỳ" },
    ],
    series: [{ key: "updated", label: "Nguồn có cập nhật", color: "#2563eb" }],
    trendNote:
      "Số nguồn có lần cập nhật gần nhất trong từng nhóm thời gian; kỳ dài được gộp theo tháng.",
    distributionTitle: "Hiệu lực nguồn pháp lý hiện tại",
    distributionNote:
      "Theo trạng thái đã lưu của nguồn pháp lý tại thời điểm cập nhật.",
    labels: {
      in_force: "Đang hiệu lực",
      amended: "Đã sửa đổi",
      repealed: "Hết hiệu lực",
      not_yet_effective: "Chưa hiệu lực",
    },
    actions: [
      {
        key: "ingestionFailed",
        label: "Nguồn nạp dữ liệu thất bại",
        href: "/management/legal-sources",
      },
      {
        key: "ingestionPending",
        label: "Nguồn đang chờ / xử lý / tạm dừng",
        href: "/management/legal-sources",
      },
    ],
  },
};
