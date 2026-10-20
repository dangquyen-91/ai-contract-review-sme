# Kiểm thử UI admin — 10/10/2026

## Phạm vi

- Chrome headless, bản build production của FE, backend giả lập riêng; không dùng cơ sở dữ liệu dự án.
- Desktop 1440 × 900 và mobile 390 × 844.
- Kiểm tra tổng quan, menu mobile, trang báo cáo, popup chi tiết tổ chức và thao tác Escape.
- Chưa có người dùng thật tham gia; kết quả dưới đây là kiểm thử trình duyệt và đánh giá chuyên môn.

## Kết quả xác nhận

| Kiểm tra | Kết quả |
| --- | --- |
| Trang admin desktop/mobile hiển thị | Đạt |
| Hai biểu đồ hiện diện, không có nút “Vẽ lại” | Đạt |
| Tràn ngang toàn trang ở mobile 390 px | Không thấy; scrollWidth 390 px |
| Menu mobile mở và hiển thị 7 liên kết | Đạt |
| Bộ lọc và nút tải CSV mẫu trên Báo cáo mobile | Hiển thị; chưa xác minh tải file và thay đổi dữ liệu qua tương tác |
| Popup tổ chức căn giữa desktop | Đạt; tâm popup x = 720 px, bằng tâm viewport |
| Popup tổ chức nằm trong mobile | Đạt; lề trái/phải 16 px, cao khoảng 726 px trong viewport 844 px |
| Đóng popup bằng Escape | Đạt |

## Vấn đề ưu tiên

1. **Cao — Nội dung cần xử lý bị đẩy quá sâu trên mobile.** Hero chiếm hơn nửa màn hình đầu; sau đó là các KPI xếp dọc. Người quản trị phải cuộn nhiều mới tới cảnh báo. Đưa hàng chờ xử lý lên trước KPI và thu gọn hero mobile.
2. **Cao — Dữ liệu mẫu và dữ liệu API cạnh nhau với trọng lượng thị giác tương đương.** Cần tách vùng “Đang hoạt động” và “Dữ liệu minh họa”; tránh làm người thử tưởng KPI, cảnh báo và nhật ký là số liệu thật.
3. **Trung bình — CTA chính trong hero dẫn đến báo cáo minh họa.** Ưu tiên kho pháp lý đã kết nối hoặc tác vụ thực sự dùng được.
4. **Trung bình — Trang dài và nhiều card đồng cấp.** Chiều cao tổng quan ở mobile khoảng 4.910 px; nên giảm lặp lại tiêu đề/mô tả, thu gọn khoảng trống và chuyển phần phân tích sâu sang trang Báo cáo.

## Kịch bản cần chạy với người dùng thật

Mời ít nhất 3 người chưa tham gia thiết kế, ưu tiên người từng quản trị phần mềm. Cho họ làm tác vụ mà không hướng dẫn vị trí nút:

1. Trong 10 giây, chỉ ra việc nào cần xử lý trước và tại sao.
2. Tìm tổ chức “An Phát Logistics”, xem trạng thái và đóng popup.
3. Chỉ ra số liệu nào là thật, số liệu nào là minh họa.
4. Tìm báo cáo 14 ngày và quay lại tổng quan.

Ghi số tác vụ hoàn thành, thời gian từng tác vụ, số lần cần gợi ý và lời giải thích của người tham gia. Chưa được coi là hoàn thành kiểm thử người dùng cho tới khi có người tham gia và phản hồi thực tế.

## Ảnh chụp

- [Desktop](admin-desktop.png)
- [Mobile](admin-mobile.png)
- [Menu mobile](admin-mobile-menu.png)
- [Popup tổ chức](admin-popup.png)

Kết quả đo máy đọc được ở [results.json](results.json).
