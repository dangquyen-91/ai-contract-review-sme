# Mua, gia hạn, nâng cấp và hạ gói

Mỗi tài khoản có **một kỳ gói đang dùng và một ngày hết hạn**. payOS thanh toán bằng QR từng lần nên không tự trừ tiền; ứng dụng nhắc gia hạn thay cho việc tự động thu.

Server quyết định loại thanh toán và số tiền qua `GET /organizations/:id/subscription/quote?planCode=…` (`action`, `needsSchedule`, `listPrice`, `credit`, `amount`, `blockReason`). `POST /organizations/:id/payments` tính lại cùng báo giá; nếu `action` client gửi khác thì trả `PLAN_QUOTE_CHANGED`.

| Thao tác | Quy tắc |
|---|---|
| **Mua** | Khi chưa có gói trả phí còn hạn. Kỳ dài một tháng kể từ lúc thanh toán được xác nhận. |
| **Gia hạn** | Chỉ trong **7 ngày cuối kỳ** hoặc **3 ngày sau khi hết hạn** (ân hạn), và chỉ trả trước **một** kỳ (`RENEWAL_NOT_OPEN`, `ALREADY_RENEWED`). Kỳ mới nối đúng ngày hết hạn; nếu thanh toán sau ngày đó thì bắt đầu từ lúc xác nhận. |
| **Nâng cấp** | Hiệu lực ngay, kỳ mới dài một tháng. Giá = giá gói mới − giá trị phần chưa dùng của gói hiện tại, tính theo thời gian còn lại và số tiền thực trả, cộng toàn bộ kỳ đã gia hạn trước (`credit`); tối thiểu 2.000đ. Các kỳ cũ bị thay thế; lượt mua thêm chưa dùng chuyển sang kỳ mới. Số tiền được chốt lúc báo giá (`Payment.quotedAt`) và kiểm tra lại khi quyết toán. |
| **Hạ gói** | Chỉ chọn gói cho kỳ tới (`POST …/subscription/downgrade`), hủy được trước khi thanh toán. Khi gia hạn, kỳ tới được thanh toán theo gói đã chọn; không còn đơn "thanh toán kỳ hạ gói" riêng (`downgrade` được giữ như bí danh của `renew`). Hạ về Free thì không cần trả: hết kỳ là chuyển về Free. Lịch chưa thanh toán tự hết hiệu lực sau 3 ngày ân hạn. |

`GET /organizations/:id/subscription` trả `renewal` (`status`: `none`, `not_open`, `open`, `grace`, `renewed`; `planCode` của kỳ tới; `dueAt`, `opensAt`, `graceUntil`; `payable`). Trang gói dịch vụ hiển thị một nút "Gia hạn" theo trạng thái này; banner nhắc gia hạn hiện trên dashboard của Owner và tài khoản cá nhân khi đang `open` hoặc `grace`.

Kỳ đã trả trước khi áp dụng quy tắc này (có thể nhiều kỳ chồng nhau) vẫn được giữ nguyên; khi nâng cấp, tất cả đều được tính vào `credit`.

## Dùng thử cho tổ chức

- Tổ chức mới được tạo qua `createOrganization` nhận một kỳ **dùng thử 7 ngày** với **5 lượt rà soát, 30 lượt chat, 5 lượt soạn**, giới hạn 3 thành viên (gói `business_trial`, giá 0, không có trong danh mục `/plans`).
- Mỗi tài khoản owner chỉ nhận **một lần** (khóa kỳ `trial:<userId>`): xóa tổ chức rồi tạo lại không được dùng thử thêm. Tổ chức tạo trước khi có tính năng này không được cấp bù.
- Gói trả phí luôn được ưu tiên: mua gói trong lúc dùng thử thì gói mới có hiệu lực ngay. Không mua thêm lượt và không gia hạn được kỳ dùng thử.
- `GET /organizations/:id/subscription` trả `trial: { endsAt, endingSoon }` khi đang dùng thử; trong 3 ngày cuối dashboard nhắc Owner chọn gói. Hết hạn thì trạng thái về `unsubscribed` và AI yêu cầu gói (`AI_PLAN_REQUIRED`).

## Rà soát dùng lẫn lượt gói và phần trả thêm

Khi lượt gói không đủ cho một hợp đồng (tài khoản cá nhân), báo giá tính `planUnits` (lượt gói còn lại sẽ dùng), `paidUnits` (lượt đã trả trước cho hợp đồng) và `shortfallUnits`; chỉ thu `shortfallUnits × đơn giá`. Lần rà soát giữ cả hai nguồn (`UsageRun.planUnits` cùng `reviewPurchaseId`); thành công thì trừ cả hai, lỗi/hủy/hết thời gian thì hoàn cả hai. Nếu lượt gói bị dùng ở nơi khác trước khi rà soát, báo giá cho trả thêm phần thiếu mới thay vì bị kẹt.
