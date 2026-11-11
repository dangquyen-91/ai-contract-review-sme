# Phạm vi vai trò

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
- Khi `seedDefaultRoles` chạy lúc khởi động backend, dữ liệu cũ của Admin/Manager/Expert có `orgId` được gỡ liên kết, tăng phiên bản quyền và hoàn tất onboarding. Vai trò được giữ nguyên, không xóa tài khoản, tổ chức, hợp đồng hay lịch sử thanh toán. Chạy lại không tăng phiên bản lần nữa. Lời mời đang chờ có vai trò khác Staff được thu hồi.
- Chưa thực hiện thao tác migration trực tiếp lên cơ sở dữ liệu triển khai trong phiên sửa code này.
