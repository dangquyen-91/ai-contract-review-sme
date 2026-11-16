# Rà soát validation — 11/11/2026

Phạm vi: schema frontend/backend, middleware, route/controller và kiểm tra tại service của đăng nhập/đăng ký/OTP/quên mật khẩu, hồ sơ, doanh nghiệp, thành viên/lời mời, hợp đồng tải lên, bản nháp theo mẫu, kho luật, xác minh chuyên gia, thanh toán/gói và báo cáo.

Đây là rà soát code và kiểm thử chọn lọc, không phải chứng nhận mọi đầu vào đều đã được kiểm thử. Phần phát hiện bên dưới lưu lại trạng thái trước sửa. Các payload thử schema chạy cục bộ, không ghi DB thật, không gửi email hoặc gọi AI/thanh toán thật.

## Trạng thái sau sửa

| Mục | Kết quả |
| --- | --- |
| VAL-01 | Đồng bộ danh sách mật khẩu phổ biến FE/BE; BE kiểm tra giới hạn 72 byte khi login; không trim mật khẩu và không áp dụng danh sách chặn mới cho đăng nhập tài khoản cũ |
| VAL-02 | Trim tên đăng ký, tên nguồn luật và nhãn trích dẫn trước min/max |
| VAL-03 | Kiểm tra ngày lịch trước chuyển Date; FE kiểm tra cả tạo và sửa metadata luật |
| VAL-04 | Không cho xóa trường doanh nghiệp bắt buộc; sửa địa chỉ bằng addressDetails đã kiểm tra tỉnh/phường; form chỉnh sửa dùng chung schema và bộ chọn địa chỉ với tạo mới |
| VAL-05 | Page hợp đồng/lời mời từ 1 đến 10.000, search hợp đồng tối đa 300 ký tự |
| VAL-06 | Multipart một tệp, tối đa 20 field, 21 part, 16 KiB/field; kiểm tra chữ ký tệp; DOCX tối đa 2.000 entry và 50 MiB thực tế sau giải nén bằng stream; tài liệu tham khảo giữ mức 500 entry/10 MiB |
| VAL-07 | Response giữ fieldErrors và formErrors, đồng thời có thông báo hữu ích cho FE |
| VAL-08 | Auth proxy trả 400 cho JSON lỗi/null/array thay vì báo 503; không gọi upstream cho đầu vào đó |
| VAL-09 | FE/BE nhận 10 chữ số hoặc 10 chữ số + 3 chữ số chi nhánh, có thể có dấu gạch nối; chỉ kiểm tra định dạng, không xác minh cơ quan thuế/checksum |

Không tự thay dữ liệu doanh nghiệp cũ trong DB. Dữ liệu thiếu trường hoặc mã số thuế sai định dạng phải được người dùng bổ sung/sửa khi cập nhật đầy đủ thông tin.

Kiểm tra sau sửa: **177 test backend đạt trong 10 suite**, **55 test frontend đạt trong 7 tệp**; lint các phần sửa và build BE/FE đạt. Chrome fixture kiểm tra chỉnh sửa doanh nghiệp ở 1440/390/320 px: giá trị tỉnh/phường/ngành có sẵn hiển thị sau khi tải danh sách, mã số thuế lỗi bị chặn trước API, đổi tỉnh xóa phường cũ và lưu lại địa chỉ chuẩn hóa.

Đã cập nhật test FE trỏ đến hook theo thư mục chức năng và các import/mock mới. Kiểm thử OTP tích hợp vẫn cần Redis hoạt động; môi trường hiện chưa có Redis/Docker daemon chạy. Không thay kho OTP thật bằng fallback bộ nhớ hoặc bỏ kiểm tra OTP để làm test xanh.

Chạy lại: backend build rồi `npx jest --runInBand tests/validation-boundaries.test.js`; frontend `npm run test:validation` (cần backend dist đã build). Kiểm tra trình duyệt sau frontend production build: `node scripts/contract-drafts-browser-check.mjs --organization-validation`.

## Phát hiện cần xử lý

### VAL-01 — P2: Chính sách mật khẩu FE và BE không đồng bộ

- FE `frontend/schemas/auth.schema.ts` chặn một danh sách mật khẩu phổ biến; BE `backend/src/validations/auth.validation.ts` chỉ kiểm tra độ dài/72 byte khi tạo mật khẩu.
- Đã tái hiện: `registerSchema.safeParse` nhận `password="123456789012"` mặc dù giao diện chặn.
- Schema đăng nhập BE cũng nhận mật khẩu 100 byte, trong khi FE chặn quá 72 byte.
- Hướng sửa: xác định một chính sách thống nhất; bắt buộc kiểm tra tại BE, đồng bộ FE. Không trim mật khẩu.

### VAL-02 — P2: Chuỗi chỉ có khoảng trắng vẫn qua schema

- `registerSchema.name` thiếu trim trước min(2).
- `legalSourceFields.title` và `citationLabel` thiếu trim trước kiểm tra độ dài.
- Đã tái hiện: tên đăng ký `"  "`, tên nguồn luật `"  "` và nhãn trích dẫn `" "` đều qua schema.
- Tên đăng ký có thể đi đến bước phát hành OTP trước khi gặp lỗi lưu tài khoản; validation nên chặn ngay từ đầu.
- Hướng sửa: trim rồi kiểm tra min/max tại BE; kiểm tra tương ứng tại FE.

### VAL-03 — P2: Ngày không tồn tại của văn bản luật bị tự đổi

- `backend/src/validations/legalSource.validation.ts`: issuedDate/effectiveDate/expiryDate dùng `z.coerce.date()`.
- Đã tái hiện: issuedDate `2026-02-30` được nhận và chuyển thành `2026-03-02T00:00:00.000Z`.
- Service đã kiểm tra ngày hết hiệu lực sau ngày hiệu lực khi ghép bản cập nhật với dữ liệu cũ; kiểm tra đó không giải quyết ngày lịch không tồn tại.
- Hướng sửa: kiểm tra định dạng ngày và round-trip ngày/tháng/năm trước khi chuyển Date. Giữ riêng quy tắc so sánh các mốc ngày.

### VAL-04 — P2: Cập nhật doanh nghiệp bỏ qua ràng buộc khi tạo

- Tạo mới yêu cầu taxCode, industry và addressDetails tỉnh/phường hợp lệ.
- `updateOrganizationSchema` lại cho phép taxCode/address/industry bằng null và nhận address tự do.
- Đã tái hiện: `{taxCode:null,address:null,industry:null}` qua schema; service ghi các giá trị này và xóa addressDetails nếu cập nhật address.
- Không phù hợp yêu cầu trước đây của dự án rằng các trường doanh nghiệp đều bắt buộc.
- Hướng sửa: thống nhất invariant tạo/sửa; sửa địa chỉ qua addressDetails, kiểm tra quan hệ tỉnh/phường như tạo mới. Cân nhắc dữ liệu doanh nghiệp cũ khi siết quy tắc.

### VAL-05 — P2: Phân trang hợp đồng/lời mời chưa có giới hạn an toàn

- `listContractsQuerySchema.page` và `invitationPaginationSchema.page` chỉ int/positive, không có max/safe integer.
- Đã tái hiện: `page=1e100` qua cả hai schema. Giá trị skip tính từ page vượt giới hạn số nguyên của MongoDB; lỗi có thể đi xuống DB thay vì trả 400 ở validation.
- `listContractsQuerySchema.search` cũng chưa giới hạn độ dài.
- Hướng sửa: giới hạn page phù hợp, kiểm tra số nguyên an toàn và giới hạn search; dùng nhất quán các API danh sách. Các danh sách user, doanh nghiệp, bản nháp và thanh toán đã có giới hạn page.

### VAL-06 — P2, hardening: Upload chính chưa giới hạn tổng cấu trúc multipart/Word giải nén

- `backend/src/middlewares/upload.middleware.ts` giới hạn 20 MB/tệp và MIME do client khai báo, chưa đặt giới hạn fields/parts/fieldSize riêng theo nhu cầu nghiệp vụ.
- Hợp đồng DOCX gọi Mammoth trước khi đếm trang. Luồng tài liệu tham khảo studio đã có kiểm tra số entry và dung lượng giải nén, nhưng luồng hợp đồng/kho luật chưa có kiểm tra tương đương trong code ứng dụng đã đọc.
- Hướng sửa: giới hạn số trường/parts, kiểm tra chữ ký/cấu trúc tệp và ngân sách giải nén trước khi đọc Word.
- Chưa chạy tệp độc hại hoặc kiểm thử làm cạn tài nguyên; đây là thiếu kiểm soát ở mức code, không khẳng định đã chứng minh tấn công làm sập hệ thống. Tệp đọc lỗi hiện vẫn có trạng thái failed; không đồng nghĩa được đưa vào AI hoặc bị trừ lượt.

### VAL-07 — P3: Mất thông báo validation ở cấp toàn form

- `backend/src/middlewares/errorHandler.ts` chỉ trả `err.flatten().fieldErrors`, bỏ formErrors.
- Đã tái hiện với payload update doanh nghiệp `{}`: thông báo “At least one field is required” nằm trong formErrors, fieldErrors là `{}`.
- Hướng sửa: giữ cả formErrors và fieldErrors trong response; FE hiển thị lỗi toàn form cùng lỗi từng trường.

### VAL-08 — P3: JSON lỗi ở auth proxy bị báo như lỗi kết nối

- `frontend/app/api/auth/[action]/route.ts` đặt `request.json()` trong catch chung trả 503 “Không thể kết nối máy chủ”.
- JSON sai cú pháp là đầu vào lỗi cần trả 400, không phải lỗi dịch vụ 503. Body null ở login cũng có thể chạm truy cập `requestBody.remember` trước khi được BE validate.
- Hướng sửa: tách bước parse/kiểm tra body object khỏi fetch upstream; phân biệt 400/415 với lỗi kết nối thật.
- Kết luận dựa trên đường đi code; chưa thêm kiểm thử HTTP riêng cho phát hiện này.

### VAL-09 — P3 / cần chốt chính sách: Mã số thuế chỉ kiểm tra có nội dung

- Cả schema FE và BE nhận chuỗi như `abc`; chưa có quy tắc định dạng mã số thuế của sản phẩm.
- Hướng xử lý: thống nhất định dạng được phép và dữ liệu cũ trước khi bổ sung kiểm tra. Không tự bổ sung checksum hoặc quy tắc pháp lý chưa được xác nhận.

## Những kiểm soát đã có

- Backend có middleware Zod parse lại request; không chỉ dựa vào validation của trình duyệt.
- Route nghiệp vụ chính kiểm tra ObjectId bằng regex; thanh toán kiểm tra Idempotency-Key, plan/action và số tiền phía server.
- OTP có schema challenge/code, giới hạn thử và thời hạn/cooldown tại service; không kết luận OTP hoạt động end-to-end trong lần chạy này vì Redis không kết nối được.
- Profile kiểm tra tên, điện thoại, mật khẩu; avatar kiểm tra chữ ký PNG/JPEG/WebP trước khi upload.
- Tạo doanh nghiệp kiểm tra mã tỉnh/phường và quan hệ giữa chúng; industry được đối chiếu DB tại service.
- Bản nháp kiểm tra field theo template, số tiền, ngày, ngày bắt đầu/kết thúc, revision và quyền; tài liệu studio giới hạn 4.000 node, độ sâu 16 và chỉ cho các loại node/thuộc tính hỗ trợ.
- Xác minh chuyên gia có schema consent, verdict, lý do khi từ chối, nội dung khi điều chỉnh; có giới hạn độ dài và số ý.
- Báo cáo kiểm tra kỳ/ngày tại backend, khoảng tối đa, enum và phạm vi tổ chức.
- Không coi việc proxy FE chuyển tiếp payload chưa có schema riêng là lỗi bypass nếu BE đã validate đầy đủ.

## Kết quả test ban đầu và giới hạn

- Backend: chạy 8 suite profile, passwordReset, invitations, payments, subscription, organization-access, reports, report-periods: **112 pass / 11 fail**, 6 suite pass / 2 suite fail. Các lỗi quan sát ở passwordReset/invitations trả 503 khi kho OTP Redis không kết nối được. Không dùng kết quả này để tuyên bố toàn BE đạt.
- Jest còn giữ async handle sau khi in kết quả; đã dừng phiên test sau khi có tổng kết.
- Frontend: chạy 6 tệp test password-recovery, profile, payment-workflow, contract-drafts, legal-source-workflow, reports: **40 pass / 11 fail**.
- 11 lỗi FE quan sát là test harness cũ: đường dẫn hooks/use-profile.ts, hooks/use-password-recovery.ts, hooks/use-legal-source-upload.ts đã chuyển vào thư mục chức năng; mock import auth-session/request-origin chưa cập nhật. Các lỗi này làm giảm độ tin cậy của bộ test, không tự chứng minh tính năng ứng dụng bị hỏng.
- Các test không chạy có thể còn lỗi khác. Chưa kiểm thử toàn bộ API qua trình duyệt, mọi payload lồng nhau hoặc tải tệp lớn/độc hại.

Các phát hiện trên đã được xử lý theo bảng trạng thái sau sửa; kết quả test ban đầu được giữ lại để đối chiếu.
