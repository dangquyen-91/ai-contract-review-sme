import { roleLabels } from "@/config/dashboard-roles";
import type { AuditEvent, AuditGroup } from "@/types/admin-operations";

export const auditGroupLabels: Record<AuditGroup, string> = {
  user: "Tài khoản người dùng",
  template: "Mẫu hợp đồng",
  legal_source: "Văn bản pháp luật",
  invitation: "Lời mời",
  member: "Thành viên",
  organization: "Tổ chức",
  subscription: "Gói dịch vụ",
  payment: "Thanh toán",
  account: "Bảo mật tài khoản",
  ai_job: "Tác vụ AI",
};

const actionLabels: Record<string, string> = {
  "user.create": "Tạo tài khoản",
  "user.update": "Cập nhật tài khoản",
  "user.delete": "Xóa tài khoản",
  "template.create": "Tạo mẫu hợp đồng",
  "template.publish": "Xuất bản mẫu hợp đồng",
  "template.retire": "Ngừng dùng mẫu hợp đồng",
  "template.delete": "Xóa mẫu hợp đồng",
  "legal_source.create": "Thêm văn bản pháp luật",
  "legal_source.update": "Sửa thông tin văn bản pháp luật",
  "legal_source.delete": "Xóa văn bản pháp luật",
  "legal_source.reparse": "Phân tích lại văn bản pháp luật",
  "legal_source.replace": "Thay tệp văn bản pháp luật",
  "invitation.create": "Gửi lời mời",
  "invitation.revoke": "Thu hồi lời mời",
  "member.remove": "Xóa thành viên",
  "organization.delete": "Xóa tổ chức",
  "subscription.schedule_downgrade": "Đặt lịch hạ gói",
  "subscription.cancel_downgrade": "Hủy lịch hạ gói",
  "payment.fulfilled": "Kích hoạt thanh toán",
  "payment.activation_failed": "Kích hoạt thanh toán thất bại",
  "account.password_change": "Đổi mật khẩu",
  "ai_job.cancel": "Hủy tác vụ AI",
};

export const auditActionLabel = (action: string) => actionLabels[action] ?? action;
export const auditGroupOf = (action: string) => action.split(".")[0] as AuditGroup;

const targetTypeLabels: Record<string, string> = {
  user: "Tài khoản",
  template: "Mẫu hợp đồng",
  legal_source: "Văn bản pháp luật",
  invitation: "Lời mời",
  organization: "Tổ chức",
  subscription: "Gói dịch vụ",
  payment: "Đơn thanh toán",
  review: "Tác vụ rà soát",
};
export const auditTargetTypeLabel = (type: string) => targetTypeLabels[type] ?? type;

/** Actions that remove or break something stand out in the log. */
export function auditTone(action: string) {
  if (/\.(delete|remove|revoke|activation_failed|cancel)$/.test(action)) return "danger" as const;
  if (action === "account.password_change" || action.endsWith("_downgrade")) return "warning" as const;
  return "neutral" as const;
}

export const actorLabel = (actor: AuditEvent["actor"]) =>
  actor.role === "system" ? "Hệ thống" : `${actor.name} · ${roleLabels[actor.role] ?? actor.role}`;

const fieldLabels: Record<string, string> = {
  name: "Họ tên",
  email: "Email",
  role: "Vai trò",
  isActive: "Trạng thái",
  version: "Phiên bản",
  code: "Mã mẫu",
  file: "Tệp mới",
  fields: "Trường đã sửa",
  planCode: "Gói",
  effectiveAt: "Hiệu lực từ",
  amount: "Số tiền",
  purpose: "Loại giao dịch",
  action: "Hành động",
  reason: "Lý do",
  status: "Trạng thái tác vụ",
  refunded: "Hoàn lượt",
};
// Fields a Manager can edit on a legal source, listed under "Trường đã sửa".
const legalSourceFieldLabels: Record<string, string> = {
  title: "Tên văn bản",
  documentNumber: "Số hiệu",
  sourceType: "Loại văn bản",
  status: "Tình trạng hiệu lực",
  citationLabel: "Nhãn trích dẫn",
  issuingBody: "Cơ quan ban hành",
  signer: "Người ký",
  legalField: "Lĩnh vực",
  issuingPlace: "Nơi ban hành",
  gazette: "Công báo",
  origin: "Nguồn",
  textKind: "Dạng văn bản",
  consolidatedThrough: "Hợp nhất đến",
  issuedDate: "Ngày ban hành",
  effectiveDate: "Ngày hiệu lực",
  expiryDate: "Ngày hết hiệu lực",
  expectedArticleCount: "Số điều dự kiến",
};
const reviewStatusLabels: Record<string, string> = {
  queued: "Đang chờ",
  running: "Đang xử lý",
  completed: "Hoàn tất",
  failed: "Thất bại",
  cancelled: "Đã hủy",
};
const purposeLabels: Record<string, string> = { subscription: "Gói dịch vụ", top_up: "Mua thêm lượt", contract_review: "Rà soát theo hợp đồng" };
const paymentActionLabels: Record<string, string> = { purchase: "Mua mới", renew: "Gia hạn", upgrade: "Nâng cấp", downgrade: "Hạ gói" };

function formatValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field === "isActive") return value ? "Đang hoạt động" : "Đã khóa";
  if (field === "role") return roleLabels[String(value)] ?? String(value);
  if (field === "status") return reviewStatusLabels[String(value)] ?? String(value);
  if (field === "refunded") return value ? "Đã hoàn lại cho tài khoản" : "Chưa hoàn";
  if (field === "amount" && typeof value === "number") return `${value.toLocaleString("vi-VN")} ₫`;
  if (field === "purpose") return purposeLabels[String(value)] ?? String(value);
  if (field === "action") return paymentActionLabels[String(value)] ?? String(value);
  if (field === "effectiveAt") {
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  }
  if (Array.isArray(value)) return value.map((item) => legalSourceFieldLabels[String(item)] ?? String(item)).join(", ") || "—";
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

const isChange = (value: unknown): value is { from: unknown; to: unknown } =>
  typeof value === "object" && value !== null && "from" in value && "to" in value;

/**
 * The recorded details of an event as readable rows. An edit keeps `before` and
 * `after` apart; `value` is the one-line form, `from → to` for edits.
 */
export function describeAuditChanges(changes: AuditEvent["changes"]) {
  return Object.entries(changes ?? {}).map(([field, value]) => {
    const edit = isChange(value) ? { before: formatValue(field, value.from), after: formatValue(field, value.to) } : null;
    return {
      field,
      label: fieldLabels[field] ?? field,
      before: edit?.before ?? null,
      after: edit?.after ?? formatValue(field, value),
      value: edit ? `${edit.before} → ${edit.after}` : formatValue(field, value),
    };
  });
}
