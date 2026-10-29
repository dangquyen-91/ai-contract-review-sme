<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Quy ước frontend LawScan

- Giữ cấu trúc theo chức năng hiện có, không tự đổi tên hoặc di chuyển thư mục diện rộng.
- `app/`: khai báo route, layout và kiểm tra phiên trên server. `app/api/`: xác thực và chuyển tiếp yêu cầu đến backend qua proxy có sẵn.
- `components/<chức năng>/`: giao diện và tương tác hiển thị; dùng lại thành phần trong `components/ui/` trước khi tạo mới.
- `hooks/<chức năng>/`: quản lý state, query, mutation và luồng thao tác. Trang chỉ đọc dữ liệu dùng hook query; không cần khởi tạo mutation.
- `lib/api/`: hàm gọi API; `lib/<chức năng>/`: xử lý dữ liệu dùng chung; `lib/query-keys/`: khóa cache. Giữ khóa cache tương thích khi tách hook.
- `schemas/`, `types/`, `config/`: validation, kiểu dữ liệu và cấu hình route/quyền. Dùng lại nguồn hiện có thay vì chép quy tắc sang component.
- Viết JSX nhiều dòng, tách các nhánh hiển thị phức tạp cho dễ đọc. Không dùng số dòng ít để đánh giá component đã nhỏ.
- Giữ tiếng Việt ở UTF-8. Không sửa hàng loạt encoding chỉ vì terminal PowerShell hiển thị sai dấu.
- Khi sửa UI dùng chung, kiểm tra cả trang công khai, dashboard, desktop và mobile liên quan. Không commit/push nếu người dùng chỉ yêu cầu hướng dẫn commit.
