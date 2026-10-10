# Subscription và hạn mức (backend)

Nhánh này triển khai gói, quyền lợi, chu kỳ, hạn mức và lịch hạ cấp. **Chưa tích hợp
đơn mua hoặc payOS.** Không có endpoint công khai để tự kích hoạt gói trả phí.
Frontend chưa được chỉnh sửa trong nhánh này.

## Danh mục

| Code | Gói | Giá VND/tháng | Phân tích | Chat | Thành viên gồm Owner |
| --- | --- | ---: | ---: | ---: | ---: |
| personal_free | Personal Free | 0 | 3 | 10 | 1 |
| personal_pro | Personal Pro | 99000 | 30 | 200 | 1 |
| business_starter | Business Starter | 499000 | 200 | 500 | 5 |
| business_pro | Business Pro | 999000 | 600 | 1500 | 15 |

Plan được seed khi khởi động server bằng `$setOnInsert`, không ghi đè giá đã lưu.
Quyền lợi của kỳ trả phí được chụp lại để cập nhật catalog sau này không làm đổi
quyền lợi kỳ đã thanh toán. Giá hiện tại cố định theo bảng trên; chưa có API sửa giá.

Subscription gắn với Organization. Workspace `isPersonal=true` chỉ dành cho một
tài khoản và dùng Personal; tổ chức doanh nghiệp dùng Business. Giữ nguyên mô hình
1 user thuộc 1 tổ chức. Không cho dùng gói Personal để hưởng quyền lợi Business.

## Chu kỳ và thay đổi gói

- Personal Free: 00:00 ngày 1 hàng tháng giờ Việt Nam; lưu thời gian UTC (17:00 UTC
  ngày cuối tháng trước). Người bắt đầu giữa tháng vẫn được 3 phân tích/10 chat.
- Gói trả phí: một tháng dương lịch từ thời điểm kích hoạt, giữ giờ Việt Nam;
  nếu tháng sau thiếu ngày tương ứng thì dùng ngày cuối tháng. Không mặc định 30 ngày.
- Cùng gói: tạo kỳ kế tiếp từ cuối kỳ đã thanh toán cuối cùng. Không reset ngay.
- Nâng cấp: thu đủ giá gói đích, tạo kỳ mới ngay, huỷ quyền lợi các kỳ cũ còn lại
  (kể cả kỳ gia hạn đã trả trước), không hoàn hoặc bảo lưu. Phải hiển thị trước khi mua.
- Hạ cấp: lên lịch ở cuối thời gian đã thanh toán. Số thành viên phải vừa gói đích
  trước khi đặt lịch; từ đó gửi và nhận lời mời đều theo giới hạn gói đích.
- Có thể huỷ lịch hạ cấp trước khi kỳ hạ cấp được thanh toán. Lịch đã được thanh toán
  không được huỷ/đổi qua API này để tránh bỏ mất quyền lợi đã mua.
- Gói hạ cấp trả phí chỉ có hiệu lực khi kỳ đó đã thanh toán. Nếu chưa thanh toán,
  tổ chức hết quyền AI khi kỳ cũ hết hạn. Không tự thu tiền hoặc tự cấp gói trả phí.
- Personal Pro hết hạn quay về quyền lợi Personal Free của tháng hiện tại.
- Business chưa mua/hết hạn: không được phân tích/chat mới hoặc thêm thành viên;
  giới hạn mặc định 1 gồm Owner. Giữ nguyên thành viên hiện có, hợp đồng và lịch sử.
- Các kỳ được chọn theo thời gian mỗi khi gọi API, không cần cron để reset.

## API Swagger

Prefix `/api/v1`; các API tổ chức/AI dùng Bearer token.

| Method | Endpoint | Chức năng |
| --- | --- | --- |
| GET | `/plans` | Catalog, công khai |
| GET | `/organizations/:id/subscription` | Gói, kỳ hiện tại, các kỳ trả trước, lịch hạ cấp, hạn mức |
| GET | `/organizations/:id/usage` | Cùng dữ liệu hạn mức hiện tại |
| POST | `/organizations/:id/subscription/downgrade` | Owner đặt lịch, body `{ "planCode": "business_starter" }` |
| DELETE | `/organizations/:id/subscription/downgrade` | Owner huỷ lịch chưa trả tiền |
| POST | `/contracts/:id/analysis` | Phân tích đầy đủ và tính đúng một lượt |
| POST | `/contracts/:id/analysis/stream` | Phân tích đầy đủ qua SSE (progress, done, error) |
| POST | `/contracts/:id/chat` | Một câu hỏi, tính hạn mức chat riêng |
| POST | `/contracts/:id/chat/stream` | Như trên, trả token/done/error qua SSE |

Mọi thành viên hiện tại được xem subscription/usage của tổ chức mình. Chỉ Owner
quản lý lịch; với workspace cá nhân, tài khoản role `user` được quản lý gói của mình.

AI POST yêu cầu `Idempotency-Key` (8–128 ký tự chữ/số, `-`, `_`; có thể dùng UUID).
Giữ cùng key khi retry cùng request. Request mới hoặc phân tích lại chủ động dùng key mới.
Cùng key + cùng người dùng/hợp đồng/nội dung: kết quả thành công được trả lại và
không gọi AI hoặc trừ lượt lần nữa. Cùng key nhưng nội dung khác, đang chạy hoặc đã
thất bại: 409; sau lỗi, tạo key mới nếu muốn thực hiện lại.

Ví dụ phân tích:

```http
POST /api/v1/contracts/<id>/analysis
Authorization: Bearer <token>
Idempotency-Key: <UUID>
Content-Type: application/json

{ "analysisFocus": "Điều kiện thanh toán" }
```

Response `data`: `{ runId, replayed, result: { contract, findings } }`.
Chat body giữ `{ "message": "..." }`; response thêm `runId`, `replayed` bên cạnh `reply`.
SSE gửi `done` sau khi lưu kết quả và ghi nhận lượt thành công. Lỗi sau khi mở SSE
được gửi bằng event `error` (HTTP kết nối ban đầu vẫn là 200).

## Thay đổi bắt buộc khi frontend tích hợp

Các POST chạy riêng `clauses/segment`, `summary`, `risks/detect`, `risks/detect/stream`
đã dừng với HTTP 410 để không tính một lần review thành ba lượt hoặc cho phép bỏ qua
hạn mức. Frontend phải chuyển sang **một** POST `/analysis` hoặc `/analysis/stream`,
không tiếp tục gọi chuỗi API cũ. API GET kết quả, sửa đề xuất và xem lịch sử không tính lượt.
Giao diện hiện tại vẫn gọi API cũ nên cần cập nhật trước khi dùng tính năng review ở UI.

OCR/trích xuất hiện thực hiện lúc upload theo kiến trúc cũ. Upload không tính lượt AI;
analysis chỉ bắt đầu khi hợp đồng có văn bản đã trích xuất hợp lệ. Một lượt bao gồm
chia/phân loại điều khoản, tóm tắt, đánh giá rủi ro và lưu kết quả báo cáo.

## An toàn hạn mức

- Giữ chỗ trong transaction trước khi gọi AI; `used + reserved` không vượt limit.
- Mỗi hợp đồng chỉ có một lần phân tích đầy đủ đang chạy.
- Thành công: chuyển reserved sang used một lần. Lỗi/huỷ: trả reserved.
- Worker gửi heartbeat 60 giây; reservation bị bỏ dở quá 5 phút được thu hồi khi
  tổ chức đọc subscription hoặc thực hiện thao tác tiếp theo. Không dùng TTL xoá
  bản ghi vì cần hoàn counter cùng transaction.
- Request đang chạy lúc qua kỳ mới ghi nhận vào kỳ đã giữ chỗ ban đầu.
- Chat và phân tích có counter độc lập. Business dùng chung counter giữa thành viên.
- Lời mời pending chưa giữ chỗ thành viên. Luôn kiểm tra lại khi accept trong cùng
  transaction thêm thành viên; hai người nhận chỗ cuối chỉ một người thành công.
- Yêu cầu MongoDB replica set/Atlas như luồng lời mời.

## Nối payOS ở bước sau

`activatePaidSubscription` là hàm nội bộ với `orgId`, `planCode`, `amount`,
`paymentReference`, `action` (`purchase`, `renew`, `upgrade`, `downgrade`). Nó kiểm tra
giá/loại gói và chống áp dụng trùng reference. Không dùng hàm này để xác thực payOS.
Adapter thanh toán tương lai phải xác minh chữ ký, đối chiếu đơn và trạng thái thanh
toán, rồi mới gọi hàm; cần xử lý đơn đã thanh toán nhưng trạng thái gói đã thay đổi.

Chưa có luồng checkout/thu tiền. Kiểm thử tạo kỳ trả phí trực tiếp bằng helper nội bộ
trên DB tạm; không mở API grant giả cho Swagger và không sửa DB thật.

## Kiểm thử

`npm test` build rồi chạy MongoDB replica set tạm; SMTP và AI được mock.
Test bao gồm giá/hạn mức, ranh giới UTC+7, cuối tháng, upgrade/renew/downgrade,
quyền sở hữu, trả lượt khi lỗi, idempotency, chỗ thành viên cuối và lượt AI cuối.
