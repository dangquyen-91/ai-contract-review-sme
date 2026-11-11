# Không gian cá nhân và tổ chức

- User tham gia tổ chức vẫn giữ hợp đồng, bản nháp, gói đã mua, ngày hết hạn và lịch sử thanh toán cá nhân. Không chuyển dữ liệu hoặc lượt sang tổ chức.
- Owner và Staff có thể chọn Cá nhân / Tổ chức tại đầu trang. Hai không gian dùng hạn mức độc lập; hết lượt không tự lấy lượt từ không gian còn lại.
- Gói cá nhân tiếp tục theo kỳ đã mua, không tự gia hạn thời gian chỉ vì người dùng tham gia tổ chức.
- Trong không gian tổ chức, Staff sử dụng gói chung; chỉ Owner quản lý gói tổ chức. Mỗi người tự quản lý gói cá nhân.
- Không thay đổi cấu trúc thành viên một tổ chức hiện tại. Lựa chọn không gian nằm trong JWT được backend ký, không cập nhật `User.orgId` khi chuyển không gian.
- Backend đối chiếu vai trò, tổ chức và phiên bản quyền thực tế trước khi tạo ngữ cảnh cá nhân (`role=user`, không có `orgId`). Hợp đồng cá nhân tiếp tục dùng ID người dùng làm khóa lưu trữ và tính phí; bản nháp cá nhân dùng `orgId=null` và `createdBy`.
- Refresh token giữ lựa chọn không gian; lựa chọn lại khi đăng nhập mới mặc định theo tư cách thành viên hiện tại. Mỗi trình duyệt dùng chung ngữ cảnh giữa các tab; thông báo storage làm tab đang mở tải lại sau khi chuyển.
- Xóa thành viên vô hiệu hóa quyền tổ chức cũ; refresh quay lại tài khoản cá nhân. Không xóa gói hoặc hợp đồng cá nhân. Không tạo quan hệ thành viên mới khi thanh toán cá nhân được xác nhận sau thời điểm tham gia tổ chức.

## Kiểm tra

`backend/tests/subscription.test.js` kiểm tra tham gia lời mời sau khi mua Personal Pro, dữ liệu và hạn mức độc lập, không truy cập chéo hợp đồng/bản nháp, hết hạn mức không lấy lượt tổ chức, quyền sau khi xóa thành viên, và kích hoạt gói cá nhân cho Staff.

Frontend cung cấp GET/POST `/api/auth/workspace`; POST yêu cầu cùng origin và chỉ chấp nhận `personal` hoặc `organization`. Token giữ trong cookie HttpOnly. Chuyển không gian xóa cache và tải lại giao diện để bỏ trạng thái của không gian trước đó.
