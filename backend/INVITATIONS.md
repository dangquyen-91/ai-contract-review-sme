# Mời thành viên vào tổ chức

> Subscription: tổ chức phải có gói Business còn hiệu lực và còn chỗ để gửi/nhận
> lời mời. Owner được tính vào số thành viên. Nếu có lịch hạ cấp, áp dụng giới hạn
> gói đích ngay cho lời mời. Xem `SUBSCRIPTIONS.md` để biết API và quy tắc mới.

Backend giữ mô hình **một tài khoản chỉ thuộc một tổ chức** (`User.orgId`, `User.roleId`).
Chỉ owner của tổ chức được gửi/thu hồi/xem lời mời và xem thành viên. Vai trò được mời:
`manager`, `staff`, `reviewer`. Không thêm chức năng xóa thành viên trong thay đổi này.

## Cấu hình

Thêm các biến SMTP và `INVITATION_ACCEPT_URL` từ `.env.example` vào môi trường chạy.
`INVITATION_ACCEPT_URL` là trang frontend tiếp nhận lời mời. Backend thêm `?token=...`
(hoặc `&token=...` nếu URL đã có query). Trang này cần được frontend triển khai riêng.
Không ghi token vào log, analytics hoặc gửi trong referrer tới website khác.

SMTP thật cần `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`; dùng `SMTP_USER` và `SMTP_PASSWORD`
nếu máy chủ yêu cầu đăng nhập. `SMTP_SECURE=true` dùng cho TLS trực tiếp (thường cổng 465);
cổng 587 thường dùng `false` để nâng cấp STARTTLS. SMTP nhận thư không đồng nghĩa thư chắc
chắn đã đến inbox; cần cấu hình domain/sender hợp lệ với nhà cung cấp email.

Chạy local trong thư mục `backend`:

```sh
docker compose up -d
```

- MongoDB phải là replica set hoặc Atlas vì nhận lời mời và xóa tổ chức dùng transaction.
- Compose tự khởi tạo replica set `rs0`; không cần xóa volume MongoDB hiện có.
- Backend chạy trên máy host dùng `MONGODB_URI=mongodb://localhost:27017/ai_contract_review?replicaSet=rs0`.
- Compose này quảng bá MongoDB ở `localhost:27017`, dành cho backend chạy trên host.
  Nếu backend chạy container, cần cấu hình lại hostname replica set phù hợp.
- Mailpit local: `SMTP_HOST=localhost`, `SMTP_PORT=1025`, `SMTP_SECURE=false`,
  không cần username/password. Xem email tại `http://localhost:8025`.
- `INVITATION_ACCEPT_URL=http://localhost:3000/loi-moi` là giá trị mẫu, chưa phải trang đã triển khai.

## API

Tất cả endpoint bên dưới có prefix `/api/v1`. API bảo vệ nhận header
`Authorization: Bearer <accessToken>`.

| Method | Endpoint | Quyền / body |
| --- | --- | --- |
| POST | `/organizations/:id/invitations` | Owner; `{ "email": "member@example.com", "role": "staff" }` |
| GET | `/organizations/:id/invitations?page=1&limit=20` | Owner; phân trang, tối đa 100/trang |
| DELETE | `/organizations/:id/invitations/:invitationId` | Owner; thu hồi lời mời pending |
| GET | `/organizations/:id/members?page=1&limit=20` | Owner; danh sách thành viên, không có password/token |
| POST | `/invitations/preview` | Công khai; `{ "token": "<token từ email>" }` |
| POST | `/invitations/accept` | Đăng nhập đúng email; `{ "token": "<token từ email>" }` |

Tạo lời mời trả 201 và metadata (id, orgId, email, role, status, expiresAt, createdAt).
Token chỉ gửi qua email; DB chỉ lưu SHA-256. Lời mời có hạn 7 ngày. Mỗi owner được gửi
tối đa 20 yêu cầu mời/giờ. Lời mời pending trùng cùng tổ chức/email trả 409; để gửi lại,
thu hồi lời mời cũ rồi tạo mới. Lời mời hết hạn hoặc gửi email thất bại có thể tạo lại.

Preview trả `{ success: true, data: { organizationName, email, role, expiresAt } }`.
Accept trả cùng dạng session như đăng nhập:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "name": "...",
      "email": "member@example.com",
      "role": "staff",
      "orgId": "...",
      "hasCompletedOnboarding": true
    },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

## Luồng frontend cần nối

1. Owner gửi POST tạo lời mời. Email chứa link tới `INVITATION_ACCEPT_URL`.
2. Người nhận mở link, gọi POST preview bằng token trong body.
3. Nếu chưa đăng nhập, gọi `/auth/register` hoặc `/auth/login` với các trường cũ
   và thêm `invitationToken`. Email phải trùng email lời mời (không phân biệt hoa/thường).
4. Giữ token mời trong luồng auth. Nếu cần `/auth/refresh` trước khi nhận lời mời,
   cũng gửi `invitationToken` cùng `refreshToken`.
5. **Không gọi `/auth/onboarding/complete` trước khi nhận lời mời**: endpoint đó vẫn tạo
   workspace cá nhân theo luồng cũ. Chuyển trực tiếp tới màn hình xác nhận lời mời.
6. Sau khi người dùng xác nhận, POST accept với bearer token và token mời.
7. Lưu user, accessToken và refreshToken mới trả về; chuyển tới trang của tổ chức.

Việc đăng ký/đăng nhập không tự nhận lời mời; cần bước accept rõ ràng. Nếu đã thuộc tổ chức
khác (kể cả cá nhân), trả 409 và giữ nguyên tài khoản/hợp đồng. Sai email trả 403;
token hết hạn/thu hồi/đã dùng/không tồn tại trả 400. Nếu phản hồi accept bị mất, đăng nhập
hoặc refresh bình thường để lấy session hiện tại; không cần tạo lại membership.

Middleware xác thực kiểm tra user đang active và org/role hiện tại trong DB. Token chứa
quyền cũ trả 401 và yêu cầu refresh (bao gồm sau khi tạo/xóa tổ chức hoặc nhận lời mời).
Không dùng JWT cũ để giữ quyền đã thay đổi.

## Kiểm thử

```sh
npm test
npm run lint
```

Integration tests tự khởi tạo MongoDB replica set tạm, không dùng DB từ `.env`, không
gửi email thật. Lần chạy đầu cần tải MongoDB binary. Kiểm tra cả auth, phân quyền,
email lỗi, lời mời trùng/hết hạn/thu hồi, nhận đồng thời và tranh chấp xóa tổ chức.
Test dịch vụ email riêng giả lập Nodemailer để xác nhận nội dung và lỗi gửi; chưa xác nhận
khả năng chuyển thư của nhà cung cấp SMTP thật.
