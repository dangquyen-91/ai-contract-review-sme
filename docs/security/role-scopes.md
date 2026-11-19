# Phạm vi vai trò

Dashboard theo role được mô tả tại [Dashboard và reporting](../dashboard-reporting.md). Endpoint `/dashboard/insights` trả số liệu tổng hợp đúng workspace; quyền báo cáo vận hành `/reports` vẫn chỉ dành cho Administrator và Owner. Manager xem thống kê kho pháp lý, Expert xem công việc của mình và hàng đợi được phép tiếp nhận, User chỉ xem scope cá nhân.

Menu báo cáo riêng được mở cho từng role theo tính năng hiện có. Trang frontend `/reports` của Staff/User dùng API `/dashboard/insights`; Staff chỉ xem thống kê tổ chức, không có quyền xuất file. Manager dùng `/management/reports`, Expert dùng `/expert-verification/reports`. Admin xem vận hành/thanh toán; Owner xem hợp đồng/rủi ro/hạn mức trong tổ chức và không có bảng xếp hạng không gian hay cột thanh toán. Quyền API backend `/reports` không mở rộng sang các role khác.

| Phạm vi | Vai trò | Quyền chính |
| --- | --- | --- |
| Tổ chức | Owner | Quản lý tổ chức, Staff, gói và hợp đồng |
| Tổ chức | Staff | Xem hợp đồng chung, tải, soạn và rà soát hợp đồng |
| Hệ thống | Administrator | Quản lý tài khoản và giám sát hệ thống |
| Hệ thống | Manager | Tra cứu tổ chức và quản lý kho pháp lý |
| Cá nhân | User | Hợp đồng, bản nháp và gói cá nhân |
| Xác minh độc lập | Expert | Nhận và xử lý yêu cầu xác minh được phép |

- Admin/Manager không phải thành viên doanh nghiệp và không có quyền tải, sửa, xóa hay rà soát hợp đồng doanh nghiệp. Expert sử dụng luồng xác minh riêng, không trở thành thành viên qua lời mời tổ chức.
- Chỉ Owner gửi lời mời; vai trò được mời duy nhất là Staff. Chỉ User tạo tổ chức; hệ thống chuyển người tạo thành Owner. Staff không thể tạo thêm tổ chức bằng vai trò Staff.
- Owner/Staff có thể dùng không gian cá nhân theo lựa chọn trong phiên đăng nhập, không chuyển dữ liệu hay hạn mức giữa hai không gian.
- Admin tạo tài khoản User, Admin, Manager hoặc Expert. Không gán Manager cho một thành viên doanh nghiệp; thay đổi tư cách tổ chức đi qua quy trình thành viên.
- Vai trò tổ chức lấy từ `Membership`, vai trò hệ thống từ `User.platformRole`. `seedDefaultRoles` lúc khởi động chỉ tạo danh mục vai trò, **không** chuyển dữ liệu cũ.

## Chuyển dữ liệu trước mô hình membership

Dữ liệu tạo trước ngày 12/11/2026 lưu vai trò ở `User.roleId`/`User.orgId` và có thể còn không gian cá nhân dạng tổ chức (`Organization.isPersonal`). Backend mới bỏ qua các trường này, nên cần chạy migration một lần **trước khi** mở bản mới cho người dùng:

```bash
cd backend
npm run migrate:legacy-accounts            # chạy thử: in báo cáo, không ghi gì
npm run migrate:legacy-accounts -- --apply # ghi thay đổi
```

Script ([legacyAccounts.migration.ts](../../backend/src/migrations/legacyAccounts.migration.ts)):

- Owner/Staff → tạo `Membership` cùng tổ chức. Admin/Manager/Expert (kể cả `reviewer` cũ → Expert) → đặt `platformRole`, không tạo membership.
- Không gian cá nhân `isPersonal` → chuyển hợp đồng, kỳ gói, thanh toán, lượt dùng, kết quả rà soát sang ID người dùng; bản nháp và đề xuất chuyển về `orgId: null`. Bản ghi tổ chức được lưu bản sao trong `legacymigrations` rồi mới xóa.
- Hợp đồng thiếu `ownerType` được bổ sung; lời mời đang chờ có vai trò khác Staff bị thu hồi.
- Mỗi tài khoản chạy trong một transaction. Trường hợp xung đột (tổ chức có hai Owner cũ, không gian cá nhân dùng chung) được bỏ qua, liệt kê trong `skipped` và trả mã thoát 2 để xử lý thủ công. Chạy lại an toàn: tài khoản đã xử lý được đánh dấu `legacyAccountMigratedAt`, trường cũ được giữ nguyên để đối chiếu.
- Nên sao lưu cơ sở dữ liệu trước khi chạy `--apply`.
