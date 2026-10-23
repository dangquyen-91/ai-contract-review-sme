# Cập nhật tích hợp API FE — 17/10/2026

## Các chức năng đã nối trong đợt này

| Chức năng | API backend | Giao diện / vai trò |
| --- | --- | --- |
| Chỉnh sửa tổ chức | `PATCH /api/v1/organizations/:id` | Owner: `/dashboard/owner/administration`, popup chỉnh sửa tên, mã số thuế, địa chỉ. |
| Xóa hợp đồng | `DELETE /api/v1/contracts/:id` | Danh sách hợp đồng của owner, manager, staff, user; popup xác nhận trước khi xóa. Expert không có nút xóa. |
| Đặt lịch hạ gói | `POST /api/v1/organizations/:id/subscription/downgrade` | Owner: trang quản trị tổ chức; user cá nhân: `/dashboard/user/subscription`. |
| Hủy lịch hạ gói | `DELETE /api/v1/organizations/:id/subscription/downgrade` | Cùng vị trí và vai trò với đặt lịch; hiển thị ngày hiệu lực. |
| Tiến độ rà soát trực tiếp | `GET /api/v1/reviews/:reviewId/events` | Các vai trò được rà soát: owner, manager, staff, expert, user; dùng luồng rà soát hiện có. |
| Xóa tổ chức | `DELETE /api/v1/organizations/:id` | Owner: trang quản trị tổ chức, có xác nhận và giải thích điều kiện xóa. |

Backend cũng cho phép administrator sửa/xóa tổ chức và xóa hợp đồng **trong tổ chức của chính tài khoản**. Đây không phải API quản trị mọi tổ chức; giao diện admin toàn hệ thống chưa có danh sách đối tượng thật để thực hiện các thao tác này.

## Hành vi và ràng buộc

- Các API được gọi qua API client và hook TanStack Query; component tách theo chức năng organizations, contract, subscription. Dialog, Button và Input dùng hệ UI hiện có, định dạng bằng Tailwind.
- Sửa tổ chức bỏ khoảng trắng đầu/cuối; xóa giá trị mã số thuế/địa chỉ gửi `null`; cập nhật lại cache dashboard sau thành công.
- Xóa hợp đồng làm sạch cache chi tiết, chat và kết quả của hợp đồng bị xóa; cập nhật danh sách, tổng quan và trang phân trang nếu vừa xóa dòng cuối.
- Hạ gói chỉ chọn gói cùng nhóm, giá thấp hơn gói hiện tại. Số thành viên không được vượt giới hạn gói đích; backend kiểm tra lại quyền và điều kiện. Việc đặt lịch không kích hoạt ngay gói mới và không thay thế thanh toán.
- SSE theo dõi đúng lượt rà soát đã lưu. Mất kết nối, luồng im lặng quá 45 giây hoặc proxy không hỗ trợ sẽ chuyển sang polling. Hết quyền truy cập không tự tạo lại lượt AI. Khi rời trang, hủy kết nối và giữ thông tin để tiếp tục theo dõi.
- Xóa tổ chức bị backend từ chối nếu còn hợp đồng hoặc thành viên khác. Lỗi giữ nguyên phiên đăng nhập và hộp xác nhận. Sau khi thành công, xóa cookie phiên, cache và dữ liệu theo dõi rà soát của FE, chuyển về đăng nhập; owner chưa có tổ chức được hướng về thiết lập tổ chức qua layout hiện có.
- Các thao tác ghi có trạng thái chờ, chặn gửi lặp và giữ lỗi trong popup để người dùng thử lại.

## Các mục vẫn cần backend hoặc không cần nối trùng

- Admin quản lý danh sách tổ chức/người dùng toàn hệ thống: backend chưa có API danh sách/chi tiết phù hợp. Không dùng API của một tổ chức để giả lập quản trị toàn hệ thống.
- Thanh toán/kích hoạt gói trả phí: chưa có checkout/payment API công khai cho FE. Không giả lập thanh toán thành công.
- `GET /organizations/:id/usage` dùng cùng handler với API subscription đang dùng; không cần gọi thêm để lấy dữ liệu trùng.
- Chat dùng API streaming; API chat thường không cần gắn thêm nút riêng chỉ để bao phủ endpoint.

## Kiểm tra

Các script kiểm tra dùng dữ liệu giả lập, không xóa hợp đồng hoặc tổ chức thật:

```sh
npm run lint
node --test scripts/*.test.mjs
npm run build
node scripts/admin-smoke.cjs
```

Smoke test chạy Next production với backend fixture riêng để kiểm tra proxy của sáu API: xác thực, truyền quyền backend, mã ID không hợp lệ, request body, SSE, phản hồi 204 và cookie khi xóa tổ chức thành công/thất bại. Cần kiểm thử tích hợp thêm trên môi trường có backend/database thật trước khi triển khai.

Kết quả trong workspace: lint đạt; production build đạt; 150/150 bài kiểm tra đạt; production smoke test đạt.
