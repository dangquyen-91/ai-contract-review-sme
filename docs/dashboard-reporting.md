# Dashboard và reporting theo vai trò

## Phạm vi triển khai

| Vai trò | Trang tổng quan | Nội dung | Trang báo cáo |
| --- | --- | --- | --- |
| Administrator | `/admin` | Tổ chức, tài khoản chưa xóa, xử lý AI, tiền đã nhận, top không gian | `/admin/reports` |
| Owner | `/dashboard` | Hiện trạng hợp đồng, hoạt động trong kỳ, rủi ro, hạn mức tổ chức | `/reports`, giới hạn tổ chức của mình |
| Staff | `/dashboard` | Công việc, hợp đồng chung và lượt AI đã dùng trong tổ chức | `/reports`, chỉ xem thống kê công việc tổ chức, không xuất file |
| Expert | `/expert-verification/overview` | Hàng đợi chung, công việc cá nhân và lịch sử các lần xác minh | `/expert-verification/reports`, kết quả xác minh cá nhân, CSV/Excel |
| Manager | `/management` | Tổ chức, hiệu lực nguồn và tình trạng nạp kho pháp lý | `/management/reports`, kho pháp lý, CSV/Excel |
| User | `/dashboard` | Hoạt động, hạn mức và hợp đồng cá nhân gần đây | `/reports`, sử dụng cá nhân, CSV/Excel |

Luồng đăng nhập cá nhân tiếp tục đưa đến trang rà soát. Mục Tổng quan trong menu mở `/dashboard`.

`config/report-profiles.ts` xác định tiêu đề, mô tả, đường dẫn và các phần báo cáo theo quyền tính năng trong `config/permissions.ts`. Admin có báo cáo hiệu suất AI, thanh toán và xếp hạng không gian; không hiển thị phần đánh giá rủi ro hợp đồng. Owner có báo cáo hợp đồng, rủi ro và hạn mức AI của tổ chức; không có bộ lọc toàn hệ thống, thanh toán hay bảng xếp hạng không gian. Bộ chỉ số, biểu đồ, bảng chi tiết, CSV và Excel áp dụng cùng quy tắc.

Trang báo cáo của Staff/User/Manager/Expert dùng `/dashboard/insights` với phạm vi do phiên xác thực quyết định. API backend `/reports` tiếp tục chỉ cho Admin/Owner. Response báo cáo vận hành có `role` do backend lấy từ actor; lọc một tổ chức không đổi báo cáo Admin thành báo cáo Owner. Hook báo cáo tách cache theo role, workspace và bộ lọc, kiểm tra role/scope trả về và không dùng dữ liệu tạm từ workspace khác.

## Thiết kế giao diện

Áp dụng `frontend/.agents/skills/redesign-existing-projects/SKILL.md` trên Tailwind 4, shadcn/ui và Recharts hiện có.

Các vấn đề được xử lý: KPI Admin dùng dữ liệu minh họa; Expert đếm trên danh sách bị giới hạn 100 bản ghi; Manager thiếu tổng quan; tài khoản cá nhân thiếu trang tổng hợp; biểu đồ báo cáo dùng cùng một dạng cột cho cả xu hướng và thời gian xử lý.

Giao diện dùng dải KPI với chữ số thẳng cột, bộ lọc kỳ rõ ràng, biểu đồ đường cho xu hướng, cột ngang cho phân bố, bảng số liệu thay thế cho biểu đồ, trạng thái tải/rỗng/lỗi và nút thử lại. Giữ font, màu và hệ thống điều hướng của LawScan. Owner tiếp tục có thao tác tải hợp đồng và quản lý thành viên.

## Cấu trúc gọi API

1. `components/overview/` chỉ hiển thị, gọi hook theo chức năng.
2. `hooks/dashboard/use-dashboard-insights.ts` dùng TanStack Query, nhận AbortSignal, kiểm tra role/scope trả về và đặt thời gian cập nhật.
3. `lib/query-keys/dashboard.ts` tách cache theo role, scope và kỳ; giữ nguyên key dashboard cũ.
4. `lib/api/dashboard.ts` gọi axios client chung tại `/api/dashboard/insights`.
5. `app/api/dashboard/insights/route.ts` lấy phiên từ cookie, kiểm tra query và chuyển tiếp token đã xác thực.
6. Backend `routes/dashboard.routes.ts` xác thực và validate, `controllers/dashboard.controller.ts` trả envelope chung, `services/reporting/dashboard.service.ts` tổng hợp MongoDB.

`GET /api/v1/dashboard/insights?period=week|month|quarter|year`, mặc định `month`. Query được kiểm tra strict: không chấp nhận `role`, `organizationId`, `userId` hay scope do trình duyệt gửi. Scope luôn suy ra từ phiên đã xác thực. Response và upstream fetch dùng `private, no-store` / `no-store`.

DTO gồm `role`, `scope`, `computedAt`, `timezone`, `period`, `metrics`, `distribution`, `trend`. Backend trả số liệu; nhãn, định dạng và liên kết điều hướng nằm ở `config/dashboard-insights.ts`. ID của phân bố tổ chức được giữ riêng với tên hiển thị để xử lý các tổ chức trùng tên.

Hạn mức tiếp tục dùng `hooks/subscription/use-subscription.ts` → `lib/api/billing.ts` → proxy subscription hiện có. Không tạo công thức hạn mức hay cơ chế trừ lượt mới.

## Quy tắc số liệu

- Kỳ theo `Asia/Ho_Chi_Minh`, tuần bắt đầu thứ Hai, dùng cùng `resolveReportPeriods` với reporting. Khoảng truy vấn `[from, toExclusive)`, chặn ở thời điểm hiện tại.
- Admin/Owner dùng lại `getComparedReports`, giữ nguyên công thức rủi ro, tỷ lệ thành công, thời gian xử lý và thanh toán ở `reporting-formulas.md`.
- Chỉ số ghi **Hiện tại** (hàng đợi, tổng tổ chức, trạng thái hợp đồng, hiệu lực pháp lý) không bị lọc theo kỳ. Các chỉ số khác tính trong kỳ đã chọn.
- Staff xem toàn bộ tổ chức được cấp quyền. Personal dùng ID tài khoản làm scope; chuyển workspace không trộn dữ liệu hoặc hạn mức.
- Expert: hàng đợi `requested` là chung; `in_progress` thuộc expert hiện tại. Kết quả đã kết thúc hợp nhất ExpertReview và ExpertWorkRecord, loại trùng theo `(expertReviewId, attempt)`, ưu tiên bản lưu. Các lần xác minh trước khi gửi lại yêu cầu vẫn được tính cho người đã xử lý.
- Thời gian xác minh tính `completedAt - assignedAt` của lần có hai mốc hợp lệ; bao gồm thời gian người dùng ngưng thao tác. Thiếu mẫu trả `null`.
- Manager: hiệu lực là trạng thái đã lưu; nguồn có cập nhật được đếm theo `updatedAt` gần nhất, không phải lịch sử từng thao tác chỉnh sửa.
- Usage chỉ cộng `UsageRun.status=succeeded`, tách analysis/chat/drafting; số lượt rà soát khác số đơn vị hạn mức.
- Dữ liệu được tổng hợp từ các bản ghi còn lưu, không phải snapshot giao dịch hay sổ lịch sử bất biến.

Trang thống kê dùng kỳ hiện tại tuần/tháng/quý/năm. Báo cáo Admin/Owner tiếp tục hỗ trợ kỳ tùy chọn, ngày neo, so sánh kỳ trước/cùng kỳ và bảng chi tiết. Staff không có nút xuất báo cáo. CSV của các role khác chứa số liệu đã lọc, thời gian, phạm vi và múi giờ; bảo vệ nhãn khỏi công thức spreadsheet và không xuất nội dung hợp đồng.

CSV dùng chung serializer tại `frontend/lib/reports/csv-format.ts`: UTF-8 BOM, chỉ thị `sep=,` cho Excel và số cột đồng nhất giữa các hàng. Ngày hiển thị `dd/MM/yyyy`, thời điểm được đổi về múi giờ báo cáo và giữ phần mili giây của mốc lọc khi có. Tỷ lệ có `%`, số tiền có đơn vị đồng và thời gian xử lý hiển thị giây/phút. Các mã phạm vi, kỳ và trạng thái so sánh được đổi thành nhãn tiếng Việt. Giá trị thiếu hiển thị “Chưa có dữ liệu”, tách biệt với số 0. CSV là báo cáo để đọc; phần trăm, tiền và thời lượng được xuất theo cách hiển thị, không phải số thô để tính lại.

## Xuất Excel

Nút **Xuất Excel** là hành động chính bên cạnh tùy chọn CSV trên tổng quan và trang báo cáo. File `.xlsx` có ba sheet **Tổng quan**, **Xu hướng**, **Chi tiết**, tiêu đề bảng màu xanh, hàng xen kẽ, độ rộng cột, bảng có bộ lọc và cố định tiêu đề ở sheet xu hướng.

`components/reports/report-export-actions.tsx` dùng `hooks/reports/use-excel-export.ts`. Hook chống bấm lặp, hiển thị trạng thái đang xuất và lỗi có thể thử lại. Nó chỉ tải động `lib/reports/excel-export.ts` khi người dùng bấm nút; module này dùng ExcelJS để ghi file phía trình duyệt. Builder theo chức năng ở `insight-excel.ts`, `report-excel.ts` dùng chung `excel-workbook.ts`. Xuất đúng dữ liệu đã áp dụng bộ lọc và đang hiển thị, không thêm endpoint hoặc gọi lại API. Dữ liệu chưa sẵn sàng hoặc lỗi thì nút xuất bị vô hiệu hóa. Staff tiếp tục không có quyền xuất báo cáo.

Các ô giữ kiểu dữ liệu: số đếm là số nguyên, tiền VND là số với định dạng tiền, tỷ lệ được chuyển từ thang 0–100 của API sang giá trị tỷ lệ Excel và định dạng `0.0%`, thời lượng là số giây với đơn vị hiển thị. Chênh lệch tỷ lệ dùng điểm phần trăm, không chia 100 như một tỷ lệ. Ngày và giờ được lưu dưới dạng ngày Excel theo lịch/đồng hồ của múi giờ báo cáo; múi giờ ghi rõ ở phần thông tin chung. Giá trị thiếu dùng nhãn riêng, không thay bằng số 0. Nhãn do người dùng đặt được ghi dưới kiểu chuỗi, không phải công thức hay hyperlink. Owner không được xuất chỉ số hoặc cột thanh toán khi API trả `payments=null`.

`npm run test:excel` ghi và mở lại các workbook để kiểm tra số liệu, kiểu ô, định dạng, lịch Việt Nam, quyền và các trường hợp thiếu dữ liệu. Browser QA kiểm tra tải thật cả CSV và XLSX từ nút xuất; bài kiểm tra reporting chạy trên production build kiểm tra cả bộ lọc và file tải xuống.

## Kiểm tra

Backend:

```powershell
cd backend
npm run build
npx jest --runInBand tests/dashboard-insights.test.js tests/reports.test.js tests/report-periods.test.js
```

Frontend:

```powershell
cd frontend
npm run test:dashboard
npm run test:dashboard:browser
npm run lint
npm run build
node scripts/contract-drafts-browser-check.mjs --reports
```

Browser QA dùng API giả lập cục bộ và component thật, chụp desktop 1440px/mobile 390px vào `frontend/output/playwright/dashboard/`. Kiểm tra các role, chart, hạn mức, đổi kỳ, rỗng/lỗi/thử lại, bảng và tệp CSV thực tải xuống. Không gọi AI, thanh toán hoặc cơ sở dữ liệu triển khai.

Kiểm thử mở rộng hiện có lỗi fixture ngoài phần dashboard: `scripts/session-workflows.test.mjs` còn đọc `lib/session-cache.ts`, và `scripts/shadcn-ui.test.mjs` còn đọc `components/review/review-blocked-notice.tsx`; hai đường dẫn này không còn tồn tại ở HEAD hiện tại.
