# Thanh toán riêng cho hợp đồng cá nhân

- Giữ gói Personal Free và Personal Pro hiện tại. Tải file, đọc file và báo phí không thu tiền.
- Nếu lượt gói không đủ cho toàn bộ hợp đồng, user được chọn trả riêng hoặc mua Pro.
- Giá mặc định: 10.000đ cho mỗi 5 trang, làm tròn lên theo từng tài liệu. Cấu hình bằng `PERSONAL_REVIEW_PRICE_PER_UNIT` ở backend.
- Ví dụ: 1–5 trang = 10.000đ; 6–10 trang = 20.000đ. Số trang phải được xác định đầy đủ; không ước lượng theo số ký tự hoặc thuộc tính Word.
- Trả riêng cho toàn bộ hợp đồng, giữ nguyên lượt gói còn lại; không trộn Free và tiền trong cùng một lượt rà soát.
- Một đơn cấp quyền cho một lần rà soát thành công của đúng phiên bản file. Chỉ xác nhận của payOS qua backend mới cấp quyền; chuyển hướng trình duyệt không đủ để xác nhận thanh toán.
- Lỗi AI, hủy hoặc hết thời gian xử lý trả lại quyền rà soát đã mua. Worker cũ không được tiêu thụ quyền của lần thử mới.
- Kết quả đã lưu được xem lại miễn phí. Quyền đã dùng không cho phép chạy AI mới hoặc mua lại cùng phiên bản.
- Tải phiên bản mới khi lượt rà soát đã trả **chưa dùng**: lượt đó chuyển sang phiên bản mới nhất. Nếu phiên bản mới cần số lượt không nhiều hơn số đã trả thì rà soát luôn, không trả thêm; nếu cần nhiều hơn thì chỉ trả **phần lượt chênh lệch** (báo giá có `paidUnits` và `carryPurchaseId`). Giá của đơn đã tạo không thay đổi theo các lần cập nhật cấu hình sau đó.
- Lượt trả riêng đã dùng không chặn rà soát lại: lần rà soát sau dùng lượt của gói như bình thường.
- Một đơn chưa thanh toán đã có link payOS (ví dụ đóng tab payOS) không chặn đơn mới: khi tạo đơn mới, server hủy đơn cũ với payOS trước; nếu payOS báo đơn cũ vừa được trả thì kích hoạt đơn đó và từ chối đơn mới (`PREVIOUS_ORDER_PAID`). Đơn chưa xác nhận được link, đã trả nhưng chưa kích hoạt, hoặc trả thiếu vẫn phải xử lý trước.
- Mỗi đơn trả riêng kèm **20 câu hỏi chat về chính hợp đồng đó** (cấu hình bằng `PERSONAL_REVIEW_CHAT_ALLOWANCE`). Câu hỏi trên hợp đồng đã trả tiền dùng phần kèm theo trước, giữ hạn mức chat của gói cho hợp đồng khác; hết phần kèm theo thì dùng hạn mức gói. Câu hỏi lỗi, bị hủy hoặc hết thời gian xử lý được hoàn lại. Phần chat kèm theo không hết hạn theo kỳ gói.
- Đơn mua trước khi có quyền lợi này giữ đúng điều kiện đã bán: chat dùng hạn mức gói.
- Khi lượt gói không đủ, màn hình hiển thị song song phí trả riêng và gói Personal Pro (giá, lượt rà soát, chat, soạn) để người dùng so sánh. Không bán gói mua thêm lượt cho tài khoản Free.
- Đơn đang chờ hoặc quyền đã mua chưa dùng chặn xóa hợp đồng để tránh mất quyền lợi. Đơn chưa trả tiền có thể hủy.

## API

- `GET /contracts/:id/review-payment`: báo số trang, đơn vị, đơn giá, phí, lượt gói còn lại, quyền đã mua, đơn đang chờ, số câu chat kèm theo đơn mới (`includedChat`) và phần chat đã mua còn lại cho hợp đồng (`contractChat`).
- `POST /organizations/:billingAccountId/payments`: giữ cơ chế xác thực, chống gửi lặp, đồng bộ và webhook hiện tại. Đơn hợp đồng gửi `purpose=contract_review`, `action=purchase`, `contractId`, `versionId`, `expectedAmount`; không gửi `planCode`.
- Backend kiểm tra quyền sở hữu, phiên bản và số tiền; không lấy đơn giá từ trình duyệt.
- User cá nhân không được tự gán `orgId`. Khóa phạm vi lưu trữ và thanh toán sử dụng tài khoản cá nhân theo cơ chế hiện tại.
