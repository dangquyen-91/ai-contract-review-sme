# Mẫu hợp đồng thuê nhà cho tài khoản cá nhân

- Vào **Tạo hợp đồng**, chọn **Hợp đồng thuê nhà**, chọn vai trò **Bên cho thuê** hoặc **Bên thuê**, rồi **Mở mẫu**.
- Điền trực tiếp trên văn bản: thông tin hai cá nhân, nhà và căn cứ quyền cho thuê, thời hạn, tiền thuê, đặt cọc, chi phí, bàn giao, sửa chữa và kết thúc hợp đồng.
- Tiền thuê hiển thị theo định dạng Việt Nam, ví dụ `10.000.000`; tiền đặt cọc cho phép `0`. Ngày kết thúc phải sau ngày bắt đầu.
- Bản nháp được lưu trong tài khoản cá nhân, không tự tạo tổ chức hoặc gán `orgId`. Chỉ người tạo truy cập được bản nháp.
- Điền đủ thông tin rồi **Hoàn tất hợp đồng** để tải Word hoặc in/lưu PDF; không cần Owner phê duyệt. Các khả năng AI dùng quyền và hạn mức hiện có, không tự cấp thêm lượt.
- Mẫu thuê nhà chưa thuộc luồng rà soát hiện tại: không hiển thị nút chuyển sang rà soát và backend chặn thao tác này. Soạn, lưu và xuất file vẫn hoạt động.
- Mẫu doanh nghiệp và mẫu lao động hiện có giữ nguyên. Mẫu thuê nhà chỉ được cung cấp cho role `user`; backend cũng chặn Owner/Staff tạo mẫu này qua API.

Căn cứ tham khảo: Bộ luật Dân sự 91/2015/QH13 và [Luật Nhà ở 27/2023/QH15](https://vanban.chinhphu.vn/?pageid=27160&docid=209627), cùng các văn bản sửa đổi, bổ sung có liên quan. Không tự điền thời hạn báo trước, mức phạt hay mức thuế cho các bên; nội dung giao dịch cụ thể cần được kiểm tra trước khi ký.

Kiểm tra trình duyệt bằng dữ liệu giả lập: build backend/frontend, chạy `node scripts/contract-drafts-browser-check.mjs --rental` trong `frontend`.
