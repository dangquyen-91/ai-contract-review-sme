# Kiểm thử luồng review và khôi phục

Phạm vi: frontend, giữ nguyên form và cách upload hiện tại. Không sửa API/backend.

## Chuẩn bị

1. Khởi động Docker Desktop, sau đó trong `backend` chạy `docker compose up -d redis`.
2. Chạy `npm run dev` ở backend và frontend trong hai terminal riêng.
3. Backend cần kết nối database, dịch vụ lưu file và AI như cấu hình của dự án. Nếu backend đặt `START_WORKERS=false`, chạy thêm `npm run dev:worker` trong một terminal backend riêng.
4. Dùng tài khoản User có quyền review và lượt AI còn lại. Vào `/dashboard/user/review`. Các vai trò Owner, Manager, Staff, Reviewer dùng cùng bộ xử lý khôi phục; quyền thực tế vẫn do backend quyết định.
5. Mở DevTools → Network, bật **Preserve log**. Chọn file bằng form hiện tại, xác nhận bắt đầu phân tích.

## Các tình huống cần thử

| Tình huống | Thao tác | Kết quả cần thấy |
| --- | --- | --- |
| Luồng bình thường | Upload và xác nhận review | POST tạo lượt chạy, GET theo dõi, sau đó hiển thị kết quả |
| F5 khi đang chạy | F5 sau khi POST trả review ID | URL giữ ID hợp đồng; tiếp tục GET cùng review ID, không tạo lượt AI khác |
| Mất mạng ngắn | Chọn Offline ở Network trong 5–10 giây, rồi về Online | Thông báo kết nối; tiếp tục cùng lượt chạy |
| Mất phản hồi POST | Ngắt mạng ngay khi gửi POST rồi kết nối lại | Có thể gửi lại POST, nhưng **Idempotency-Key và nội dung giữ nguyên**; backend chỉ tạo một lượt |
| Không tải được kết quả | Chặn GET `/api/contracts/<id>/review` bằng Request blocking sau khi AI hoàn tất; bỏ chặn và bấm **Tải lại kết quả** | Chỉ GET kết quả, không POST chạy AI |
| Kết quả đã có | Mở hợp đồng đã review, chặn GET kết quả, rồi bỏ chặn và thử lại | Nút tải lại kết quả hoạt động, không tạo lượt mới |
| Rời trang | Khi đang chạy, chuyển trang/tab dashboard | FE ngừng theo dõi; công việc BE tiếp tục. Mở lại URL review để khôi phục |
| Lượt AI thất bại | Khi lượt chạy báo failed, F5 | Hiển thị lỗi của lượt cũ; không tự chạy lại. Chỉ thử lại khi người dùng bấm nút |
| Mất sessionStorage | Xóa `lawscan_review_<id>` rồi F5 tại URL có `reviewMode=resume` | Tìm lượt trong lịch sử, không tự POST lượt mới |

Trong Application → Session Storage, `lawscan_review_<id>` được lưu **trước POST**, bổ sung `reviewId` khi BE trả lời, và xóa khi tải kết quả thành công. Mất mạng hoặc lỗi tải kết quả giữ bản ghi để khôi phục. Khi lỗi dài hơn khoảng thời gian tự kết nối lại, người dùng có thể bấm tiếp tục.

Lưu ý: chủ động thử lại một lượt AI đã failed có thể tạo lượt mới theo quy tắc tính lượt của backend. Tải lại kết quả và khôi phục lượt đang chạy không phải yêu cầu AI mới.

## Kiểm tra tự động

Chạy trong `frontend`:

```powershell
node --test scripts/review-recovery.test.mjs
npx tsc --noEmit
```

Các bài kiểm tra tự động mô phỏng API và storage để xác nhận hành vi khôi phục; không thay thế kiểm thử trình duyệt với BE/AI thật.
