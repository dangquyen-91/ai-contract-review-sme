# Thanh toán riêng cho hợp đồng cá nhân

- Giữ gói Personal Free và Personal Pro hiện tại. Tải file, đọc file và báo phí không thu tiền.
- Nếu lượt gói không đủ cho toàn bộ hợp đồng, user được chọn trả riêng hoặc mua Pro.
- Giá mặc định: 10.000đ cho mỗi 5 trang, làm tròn lên theo từng tài liệu. Cấu hình bằng `PERSONAL_REVIEW_PRICE_PER_UNIT` ở backend.
- Ví dụ: 1–5 trang = 10.000đ; 6–10 trang = 20.000đ. Số trang phải được xác định đầy đủ; không ước lượng theo số ký tự hoặc thuộc tính Word.
- Trả riêng cho toàn bộ hợp đồng, giữ nguyên lượt gói còn lại; không trộn Free và tiền trong cùng một lượt rà soát.
- Một đơn cấp quyền cho một lần rà soát thành công của đúng phiên bản file. Chỉ xác nhận của payOS qua backend mới cấp quyền; chuyển hướng trình duyệt không đủ để xác nhận thanh toán.
- Lỗi AI, hủy hoặc hết thời gian xử lý trả lại quyền rà soát đã mua. Worker cũ không được tiêu thụ quyền của lần thử mới.
- Kết quả đã lưu được xem lại miễn phí. Quyền đã dùng không cho phép chạy AI mới hoặc mua lại cùng phiên bản.
- Đổi phiên bản file phải báo phí lại. Giá của đơn đã tạo không thay đổi theo các lần cập nhật cấu hình sau đó.
- Chat tiếp tục dùng hạn mức chat hiện tại, không cộng lượt chat trong đơn trả riêng.
- Đơn đang chờ hoặc quyền đã mua chưa dùng chặn xóa hợp đồng để tránh mất quyền lợi. Đơn chưa trả tiền có thể hủy.

## API

- `GET /contracts/:id/review-payment`: báo số trang, đơn vị, đơn giá, phí, lượt gói còn lại, quyền đã mua và đơn đang chờ.
- `POST /organizations/:billingAccountId/payments`: giữ cơ chế xác thực, chống gửi lặp, đồng bộ và webhook hiện tại. Đơn hợp đồng gửi `purpose=contract_review`, `action=purchase`, `contractId`, `versionId`, `expectedAmount`; không gửi `planCode`.
- Backend kiểm tra quyền sở hữu, phiên bản và số tiền; không lấy đơn giá từ trình duyệt.
- User cá nhân không được tự gán `orgId`. Khóa phạm vi lưu trữ và thanh toán sử dụng tài khoản cá nhân theo cơ chế hiện tại.
