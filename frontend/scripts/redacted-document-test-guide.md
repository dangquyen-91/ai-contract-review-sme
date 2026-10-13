# Kiểm thử văn bản đã che trong kết quả review

Phạm vi: FE sử dụng API BE hiện có, không thêm chính sách quyền hoặc chia sẻ.

1. Đăng nhập bằng tài khoản có quyền đọc hợp đồng và mở kết quả review đã lưu. Không cần chạy AI mới.
2. Khung nội dung mặc định chọn **Ẩn một phần**. Trong Network kiểm tra `GET /api/contracts/<id>/text?redacted=true&redactionMode=partial`, phản hồi có `data.redacted: true` và `data.redactionMode: partial`. Khởi động lại BE nếu đang dùng phiên bản cũ.
3. Dùng hợp đồng mẫu trong `frontend/output/review-fixtures/hop-dong-dich-vu-test-lawscan.docx` hoặc hợp đồng có nhãn CCCD, số điện thoại, số tài khoản. Dữ liệu được BE nhận diện theo cấu hình sẽ hiển thị dấu chấm: tài khoản giữ 4 số cuối, điện thoại giữ 3 số cuối, tên dùng nhãn Cá nhân 1, email giữ ký tự đầu và tên miền như m•••@gmail.com, CCCD/ngày sinh/địa chỉ che toàn bộ. Khi số cuối trùng nhau, các giá trị khác nhau có nhãn Tài khoản/Điện thoại để phân biệt. Không còn mã token hoặc ô xanh trong bản đối chiếu. UI không tải bản đầy đủ để tự tạo các giá trị này.
4. Chọn **Văn bản đầy đủ**, rồi quay lại bản đã che. Vị trí đọc được giữ gần vị trí cũ theo tỷ lệ cuộn. Chọn **File gốc** để đối chiếu file đầy đủ.
5. Chặn request `*/text?redacted=true*` bằng DevTools Request blocking và F5/mở lại kết quả. Phải hiện lỗi tải bản ẩn, không tự hiện văn bản đầy đủ. Bỏ chặn, bấm **Tải lại bản ẩn một phần**; không có POST chạy AI. BE cũ chưa hỗ trợ partial phải hiện lỗi, không tự chuyển chế độ.
6. Thử hợp đồng không có dữ liệu được thay thế: UI nêu rõ không có thay đổi theo cấu hình, không khẳng định hợp đồng không có dữ liệu nhạy cảm. Văn bản trích xuất rỗng có trạng thái riêng.
7. Bấm liên kết vị trí của một rủi ro: liên kết ghi rõ sẽ mở **văn bản đầy đủ** hoặc **file gốc**, và chuyển đến điều khoản tương ứng như luồng hiện có.

Chế độ này áp dụng cho khung văn bản đối chiếu nội bộ, không che toàn bộ tóm tắt, rủi ro, file gốc hoặc chat. Quyền đọc đầy đủ hiện do API BE kiểm soát theo hợp đồng/tổ chức; chưa có quyền riêng chỉ xem bản đã che. Chưa có bản chia sẻ hoặc bản xuất đã che trong thay đổi này. API token mặc định và cơ chế bảo vệ dữ liệu gửi AI giữ nguyên.

Kiểm tra tự động trong `frontend`:

```powershell
node --test scripts/redacted-document.test.mjs scripts/review-recovery.test.mjs scripts/contract-file.test.mjs
npm run lint
npm run build
```
