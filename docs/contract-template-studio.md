# Soạn hợp đồng trực tiếp trên mẫu

Nhánh triển khai: `feature/contract-template-studio`.

Mẫu lao động phiên bản 4 trình bày theo ảnh tham khảo: quốc hiệu, tiêu ngữ, số hợp đồng `/HĐLĐ-`, danh sách căn cứ, thông tin hai bên, 12 điều khoản và chữ ký người lao động ở bên trái. Các ô trống dùng tên gợi nhớ như `[TenNguoiLaoDong]`; ngày ký, ngày bắt đầu, kết thúc và hiệu lực được tách thành các ô ngày/tháng/năm liên kết với cùng giá trị ngày tương ứng. Có liên hệ công ty, quốc tịch, địa chỉ liên hệ, điện thoại, chức danh, lịch cuối tuần và tiền lương bằng chữ. Đổi lương sẽ xóa tiền lương bằng chữ để nhập lại cho khớp.

Phiên bản 4 chép lại nội dung các điều khoản trong ảnh do người dùng cung cấp, gồm cả căn cứ 2013, cam kết không cạnh tranh và bồi thường như nguồn tham khảo. Ghi chú rà soát pháp lý nằm ở mục **Luật áp dụng**, không được chèn vào văn bản hay file xuất. Bản nháp cũ có nút **Dùng mẫu mới** để tạo bản mới mang theo thông tin đã điền; phần chỉnh câu chữ ở bản cũ được giữ nguyên tại bản cũ.

## Cách sử dụng

1. Owner hoặc Staff vào **Soạn hợp đồng**, chọn mẫu lao động, dịch vụ hoặc mua bán và vai trò doanh nghiệp.
2. Bấm **Mở mẫu**. Văn bản xuất hiện ngay, không gọi AI và không trừ lượt.
3. Nhấp ô được tô màu để điền thông tin. Một thông tin xuất hiện nhiều nơi được cập nhật đồng thời. Có thể sửa câu chữ, định dạng, thêm bảng và hoàn tác ngay trên trang.
   Cuối văn bản có **Thêm phụ lục**. Mỗi phụ lục bắt đầu bằng dấu **TÁCH TRANG**, tiêu đề và vùng nhập nội dung; Word và bản in giữ ngắt trang này.
4. Nhập yêu cầu trong khung chat hoặc bấm micro để chuyển giọng nói tiếng Việt thành chữ. Kiểm tra chữ rồi chủ động gửi.
5. AI trả đề xuất trước/sau. Bấm **Áp dụng** để sửa văn bản hoặc **Bỏ qua** để giữ nguyên. Nếu văn bản đã thay đổi, cần yêu cầu đề xuất mới.
   Thanh chat có **Đính kèm tài liệu** (PDF có chữ, DOCX, TXT UTF-8; tối đa 3 tệp, 2 MB/tệp, 12.000 ký tự/tệp và 24.000 ký tự tổng cộng) và **Luật áp dụng** để xem căn cứ của mẫu. Tệp được trích chữ làm ngữ cảnh cho yêu cầu; không tự thay đổi hợp đồng. PDF ảnh chưa được nhận dạng chữ trong luồng này.
6. Kiểm tra bảng thông tin còn thiếu, gửi Owner duyệt. Sau khi duyệt, Owner và Staff đã tạo bản nháp có thể tải Word hoặc in/lưu PDF. Owner có thể chuyển sang kho hợp đồng để rà soát.

Màn điền biểu mẫu theo bước cũ đã được thay thế. Dữ liệu cũ được giữ; nút **Mở trình soạn mới** chuyển bản nháp sang trình soạn trực tiếp. Bản đã duyệt mở ở chế độ chỉ đọc.

## Lưu và tính lượt

Danh sách bản nháp có menu ba chấm để **Ghim lên đầu / Bỏ ghim** và **Xóa bản nháp**. Thứ tự ghim được lưu chung trong tổ chức; Staff chỉ thao tác bản do mình tạo. Chỉ xóa bản đang soạn, chưa gửi duyệt và không có yêu cầu AI đang xử lý. Xóa yêu cầu xác nhận, kiểm tra phiên bản và ẩn bản đó khỏi toàn bộ API bản nháp bằng dấu xóa trong dữ liệu. Hợp đồng đã chuyển vào kho và lịch sử tính lượt không bị xóa. Ghim không đổi phiên bản văn bản hay thời điểm sửa nội dung.

- Tự lưu sau khoảng 1,2 giây ngừng chỉnh sửa. Thanh trên cùng và chân trang phản ánh trạng thái lưu; khi lỗi có nút thử lưu lại.
- Mỗi yêu cầu trợ lý hoàn tất và lưu đề xuất thành công dùng một lượt soạn AI, kể cả khi người dùng bỏ qua. Yêu cầu AI thất bại được hoàn lượt đã giữ.
- Mở mẫu, chỉnh tay, lưu, áp dụng đề xuất và tải file không trừ lượt soạn.
- Gửi lại cùng mã yêu cầu đã thành công trả đề xuất cũ và không tính thêm lượt. Khóa xử lý và số phiên bản ngăn ghi đè từ nhiều yêu cầu.
- Hết lượt AI vẫn có thể soạn và lưu thủ công. Hạn mức rà soát theo trang hoạt động riêng.

## Dữ liệu và quyền

- Văn bản JSON có cấu trúc là nguồn chung cho trình soạn, nội dung chữ, Word và bản in. Chỉ cho phép đoạn văn, tiêu đề, danh sách, bảng và ô thông tin của mẫu; không nhận HTML/script tùy ý.
- Văn bản và hội thoại được mã hóa khi lưu. Các thông tin định danh đã biết và dữ liệu nhạy cảm được che trước khi gửi AI.
- Staff chỉ truy cập bản nháp của mình. Owner truy cập các bản trong doanh nghiệp. Tài khoản cá nhân chưa được mở tính năng này.
- Chỉ bản đang soạn mới được sửa. Gửi duyệt và áp dụng đề xuất đều kiểm tra phiên bản phía server. Xóa ô thông tin khỏi văn bản cũng xóa giá trị liên quan để tránh duyệt với dữ liệu cũ.
- Giọng nói dùng khả năng nhận dạng của trình duyệt; trình duyệt có thể gửi âm thanh tới dịch vụ của nhà cung cấp. Ứng dụng không gửi âm thanh tới backend. Cần cấp quyền micro và dùng trình duyệt hỗ trợ; luôn có thể nhập bàn phím.
- Bản xem trước có chiều rộng A4, cuộn liên tục. Phân trang thực tế do Word hoặc trình duyệt khi in quyết định.

## Kiểm tra cục bộ

```powershell
cd backend
npm run build
npx jest --runInBand tests/templateStudio.test.js tests/contractDrafts.test.js
cd ../frontend
npm run test:contract-drafts
npm run build
npm run test:contract-drafts:browser
```

Kiểm thử backend dùng MongoDB tạm và AI giả lập. Kiểm thử trình duyệt dùng backend giả lập, Chrome và micro giả lập, không gọi AI, thanh toán hay dữ liệu thật. Cần build backend trước khi chạy kiểm thử trình duyệt.
