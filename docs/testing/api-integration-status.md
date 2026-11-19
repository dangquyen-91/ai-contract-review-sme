# Trạng thái tích hợp API FE

## Cập nhật 18/11/2026

Phần ghi chép ngày 17/10 bên dưới được giữ để tra cứu lịch sử. Một số nhận định trong đó không còn đúng với code hiện tại (nhánh `fix/contract-template`, đã gộp `dev`):

| Nhận định ngày 17/10 | Hiện trạng |
| --- | --- |
| Manager được xóa hợp đồng; manager và expert được rà soát. | Tải lên, rà soát và xóa hợp đồng chỉ dành cho Owner, Staff, User. Manager quản lý nguồn pháp lý và mẫu hợp đồng; Expert xác minh kết quả AI qua hàng chờ riêng. |
| Administrator sửa/xóa tổ chức của chính tài khoản. | Administrator, Manager, Expert là tài khoản hệ thống (`platformRole`), không thuộc tổ chức nào. Vai trò tổ chức (Owner/Staff) nằm ở `Membership`. Administrator quản lý người dùng qua `/admin/users`. |
| Xóa tổ chức chuyển Owner về role User và bỏ `orgId`. | Xóa tổ chức xóa membership của Owner (thu hồi lời mời đang chờ); tài khoản tiếp tục dùng không gian cá nhân. Không còn ghi `orgId`/`roleId` trên User. |
| Sửa tổ chức: xóa mã số thuế/địa chỉ gửi `null`. | Tên, mã số thuế, ngành nghề và địa chỉ (tỉnh/phường, số nhà) là bắt buộc khi tạo và sửa. |
| Chưa có checkout/payment API. | Đã có thanh toán payOS: `POST/GET /organizations/:id/payments`, xem/đồng bộ/hủy theo `orderCode`, webhook. Backend tự quyết định hành động và số tiền (`GET .../subscription/quote`): mua, gia hạn (7 ngày cuối hoặc 3 ngày ân hạn), nâng gói có trừ phần thời gian chưa dùng, hạ gói trả như gia hạn. Có mua thêm lượt (`/top-up-packs`) và mua lượt rà soát lẻ theo hợp đồng (kèm lượt chat). Không có hoàn tiền và không tự động trừ tiền định kỳ. |
| Chưa có API danh sách người dùng toàn hệ thống. | Đã có `/admin/users` (Administrator). Mục "Giám sát AI" và "Nhật ký quản trị" ở `/admin` vẫn là dữ liệu mẫu. |
| 150/150 bài kiểm tra đạt. | Xem kết quả mới nhất ở mục dưới. |

Các chức năng FE mới từ sau 17/10 (đều đi qua proxy `app/api/**`): quên/đặt lại mật khẩu, hồ sơ và ảnh đại diện, đổi mật khẩu, xóa thành viên, nhận/từ chối lời mời trong dashboard, phiên bản hợp đồng, xác minh và trao đổi với chuyên gia, soạn thảo hợp đồng (studio), quản lý mẫu (Manager), lịch sử/phân tích lại nguồn pháp lý, thanh toán, gia hạn, mua thêm lượt, dùng thử 7 ngày cho tổ chức mới, báo cáo theo vai trò (tài khoản cá nhân xem số liệu ở trang tổng quan).

Lưu ý khi thêm endpoint mới ở backend: phải thêm route proxy tương ứng trong `app/api`, nếu không trình duyệt nhận 404 từ Next.

Kiểm tra ngày 18/11/2026:

```sh
# frontend
npm run lint
node --test scripts/*.test.mjs
npm run build
# backend
npm run build && npm run lint && npm test
```

Kết quả: frontend lint đạt, 302 bài kiểm tra đạt, production build đạt; backend 37 bộ / 389 bài kiểm tra đạt (Redis được thay bằng bản giả lập trong bộ test). Các kiểm tra này chưa thay thế kiểm thử tích hợp với payOS sandbox, Gemini và database thật.

---

## Ghi chép 17/10/2026 (lịch sử)

## Các chức năng đã nối trong đợt này

| Chức năng | API backend | Giao diện / vai trò |
| --- | --- | --- |
| Chỉnh sửa tổ chức | `PATCH /api/v1/organizations/:id` | Owner: `/settings`, popup chỉnh sửa tên, mã số thuế, địa chỉ. |
| Xóa hợp đồng | `DELETE /api/v1/contracts/:id` | Danh sách hợp đồng của owner, manager, staff, user; popup xác nhận trước khi xóa. Expert không có nút xóa. |
| Đặt lịch hạ gói | `POST /api/v1/organizations/:id/subscription/downgrade` | Owner: trang quản trị tổ chức; user cá nhân: `/subscription`. |
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
- Xóa tổ chức bị backend từ chối nếu còn hợp đồng hoặc thành viên khác. Lỗi giữ nguyên phiên đăng nhập và hộp xác nhận. Sau khi thành công, backend chuyển Owner về role User, bỏ `orgId`, giữ trạng thái đã thiết lập và tăng phiên bản quyền để chặn token tổ chức cũ. FE giữ cookie phiên, xóa cache và dữ liệu theo dõi rà soát rồi mở `/review` bằng tài khoản cá nhân; không đăng nhập hoặc chọn thiết lập lại. Phiên làm mới cũng khôi phục tài khoản Owner không có `orgId` do luồng xóa cũ.
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
