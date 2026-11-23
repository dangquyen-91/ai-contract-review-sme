export const legalSourceTypes = { law: "Luật", decree: "Nghị định", circular: "Thông tư", resolution: "Nghị quyết", standard_template: "Mẫu hợp đồng" } as const;
export const legalSourceStatuses = { in_force: "Còn hiệu lực", amended: "Đã sửa đổi", repealed: "Đã bãi bỏ", not_yet_effective: "Chưa có hiệu lực" } as const;
export const ingestionStatuses = { queued: "Đang chờ", running: "Đang xử lý", paused: "Tạm dừng", completed: "Hoàn tất", failed: "Thất bại" } as const;
export const legalSourcePublishers = { national_database: "Cơ sở dữ liệu quốc gia về văn bản pháp luật", official_gazette: "Công báo", issuing_authority: "Cổng thông tin của cơ quan ban hành", other: "Nguồn khác" } as const;
