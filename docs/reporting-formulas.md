# Công thức báo cáo LawScan

Trang `/admin/reports` và trang Owner `/reports` lấy dữ liệu thật từ GET `/api/v1/reports`. Các phần minh họa khác trên trang tổng quan Admin chưa được thay thế trong thay đổi này.

## Phạm vi và thời gian

- Admin xem toàn hệ thống hoặc lọc một tổ chức. API cũng hỗ trợ Owner nhưng luôn giới hạn về tổ chức của Owner; Staff, User, Manager và Expert không được gọi báo cáo vận hành này.
- Chọn tuần/tháng/quý/năm hoặc khoảng ngày tùy chọn tối đa 366 ngày; mặc định tháng hiện tại và so với tháng trước. `anchor=YYYY-MM-DD` chọn một ngày thuộc kỳ cần xem. Với kỳ tùy chọn, truyền `start` và `end` (bao gồm cả ngày cuối).
- Backend xác định kỳ theo `Asia/Ho_Chi_Minh`: tuần từ thứ Hai, tháng từ ngày 1, quý từ tháng 1/4/7/10, năm từ ngày 1/1. Khoảng truy vấn là `[from, toExclusive)`. Kỳ hiện tại kết thúc ở thời điểm truy vấn, không ở một ngày tương lai. Không dùng đồng hồ máy người xem để tính kỳ.
- `comparison=previous|year|none`: kỳ trước, cùng kỳ năm trước hoặc không so sánh. Kỳ tùy chọn so với khoảng liền trước có cùng số ngày. Cùng tuần năm trước dùng số tuần ISO; tuần 53 dùng tuần 52 nếu năm trước không có tuần 53.
- Kỳ chưa hoàn tất: kỳ trước được cắt theo thời gian đã trôi qua và giới hạn tại cuối kỳ trước nếu kỳ đó ngắn hơn; cùng kỳ năm trước giữ ngày/tháng và giờ Việt Nam, ngày 29/2 chuyển thành 28/2 khi cần. API trả chính xác khoảng ngày và mốc kết thúc cho cả hai kỳ, giao diện và CSV hiển thị các khoảng này.
- `granularity=auto|day|week|month`: nhóm biểu đồ do backend thực hiện. Tự động chọn ngày nếu kỳ có tối đa 31 ngày, tuần nếu tối đa 120 ngày, còn lại theo tháng. Nhóm tuần bắt đầu thứ Hai nên nhóm đầu/cuối tháng có thể không đủ 7 ngày. So sánh biểu đồ ghép nhóm theo thứ tự; tooltip và bảng ghi rõ ngày của từng nhóm, không ngụ ý ngày lịch giống nhau. Nhóm vắng ở một kỳ trả null, không gán thành số 0.
- API vẫn nhận `days=1..90` cho khách cũ, theo khoảng ngày trượt; không kết hợp `days` với bộ lọc kỳ lịch. Giao diện mới dùng kỳ lịch.
- Số liệu dựa trên các bản ghi hiện còn lưu, không phải sổ lịch sử bất biến. Các phép tổng hợp chạy khi tải báo cáo; số liệu có thể thay đổi khi có tác vụ hoặc thanh toán mới.

## Công thức

| Chỉ số | Công thức và dữ liệu |
| --- | --- |
| Hợp đồng tải lên | Đếm Contract theo `createdAt` trong kỳ |
| Thành công / thất bại / hủy | Đếm Review theo trạng thái và `finishedAt` trong kỳ |
| Tỷ lệ thành công | completed / (completed + failed) × 100; loại queued, running và cancelled khỏi mẫu số |
| Rủi ro cao | Trong các Review completed kết thúc trong kỳ, chọn bản cuối cùng của mỗi contractId; high / (high + medium + low + none) × 100 |
| Kết quả rủi ro thiếu/không hợp lệ | Tính riêng unknown, không coi như none hoặc low, không cộng vào mẫu số |
| Thời gian xử lý trung bình | Trung bình `finishedAt − startedAt` của Review completed có đủ ngày hợp lệ và finishedAt >= startedAt; không tính thời gian chờ |
| Tiền đã nhận | Tổng amount VND của Payment status=paid theo paidAt; không đếm sự kiện webhook để tránh cộng lặp; đơn chờ kích hoạt được ghi riêng |
| Lượt đã dùng | Tổng units của UsageRun status=succeeded theo updatedAt và kind; không cộng reserved/failed |
| Lượt cần cho tệp | ceil(pageCount / 5); tiếp tục dùng `reviewCost`, không thêm cơ chế trừ lượt mới |
| Hạn mức khả dụng | max(0, limit − used − reserved); tiếp tục dùng `readUsageCounter` |
| Chênh lệch | current − previous |
| Tăng/giảm (%) | (current − previous) / previous × 100; previous=0 trả null và no_baseline |
| Chênh lệch tỷ lệ | currentRate − previousRate, đơn vị điểm phần trăm; không phải tăng trưởng tương đối |
| Biểu đồ | Hợp đồng tải lên, kết quả rà soát, tiền đã nhận, hạn mức từng loại và thời gian trung bình; ngày không có sự kiện là 0, thiếu thời gian hợp lệ là null |
| Trung bình theo nhóm | Tổng durationSumMs / tổng timedReviews của nhóm; không lấy trung bình các trung bình ngày |
| Mức sử dụng không gian | completed + failed, tối đa 10 không gian nhiều nhất trong kỳ này |

Mẫu số bằng 0 hoặc không có thời gian hợp lệ trả về null, giao diện hiển thị “Chưa có dữ liệu”. Giữ độ chính xác trong phép tính; chỉ làm tròn lúc hiển thị.

Một hợp đồng rà soát 3 lần vẫn là 1 hợp đồng trong phân bố rủi ro, nhưng là 3 lượt trong thống kê tác vụ. Một lần thành công cho file 6 trang có thể dùng 2 đơn vị hạn mức. Do đó các chỉ số này không được cộng gộp hoặc coi là cùng một loại số đếm.

CSV xuất cùng dữ liệu đã lọc, có kỳ báo cáo và múi giờ. Không xuất nội dung hợp đồng, email cá nhân; tên không gian được bảo vệ khỏi công thức spreadsheet.

## Quyền và hiệu năng

Owner dùng cùng giao diện bộ lọc và biểu đồ, chỉ có tổ chức của mình. Tiền thu toàn hệ thống không được trả về cho Owner (`payments=null` và giá trị tiền trong nhóm cũng null). Staff, User, Manager và Expert không có menu báo cáo vận hành và bị chặn tại API. Các biểu đồ Owner vẫn phản ánh hoạt động toàn tổ chức, không phải chỉ hợp đồng cá nhân của Owner.

Các phép tổng hợp dùng MongoDB aggregation, lọc khoảng ngày trước khi nhóm; có chỉ mục cho Contract.createdAt, Review.finishedAt/createdAt, Payment.paidAt và UsageRun.updatedAt. Hai kỳ chạy độc lập, song song và dùng chung mốc `now`; kết quả không phải snapshot giao dịch nguyên tử nếu dữ liệu đang thay đổi trong lúc đọc. Không cache công khai báo cáo.

## Kiểm tra

- Backend: build rồi chạy `npx jest --runInBand tests/reports.test.js tests/report-periods.test.js`. Kiểm tra kỳ lịch, năm nhuận, tuần ISO 53, kỳ đang chạy, mốc nửa mở, mẫu số 0, trung bình có trọng số, tổng biểu đồ khớp chỉ số và cách ly tổ chức.
- Frontend: `npm run test:reports`; sau production build, `node scripts/contract-drafts-browser-check.mjs --reports` dùng API giả lập cục bộ để kiểm tra biểu đồ, bộ lọc và CSV trên desktop/mobile, không gọi AI hoặc thanh toán thật.
