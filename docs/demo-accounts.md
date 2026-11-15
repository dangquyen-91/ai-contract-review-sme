# Tài khoản demo theo vai trò

Chạy từ thư mục `backend`:

```powershell
npm run seed:demo
```

Lệnh dùng DB trong `backend/.env`, seed catalog vai trò qua service có sẵn và tạo bộ tài khoản riêng:

| Vai trò | Email |
| --- | --- |
| Administrator | `admin@demo.lawscan.test` |
| Owner | `owner@demo.lawscan.test` |
| Staff | `staff@demo.lawscan.test` |
| Expert | `expert@demo.lawscan.test` |
| Manager | `manager@demo.lawscan.test` |
| User | `user@demo.lawscan.test` |

Mật khẩu được sinh ngẫu nhiên khi chạy và chỉ in cho tài khoản mới tạo. Có thể truyền `DEMO_SEED_PASSWORD` qua biến môi trường để dùng mật khẩu tự chọn theo chính sách hiện tại. Không lưu mật khẩu thật vào source hoặc tài liệu.

Owner và Staff thuộc cùng tổ chức **LawScan Demo**, được gán qua Membership. Các role Administrator/Manager/Expert dùng `platformRole`, không có membership tổ chức. User là tài khoản cá nhân. Tài khoản mới được xác minh email và hoàn tất onboarding để đăng nhập thử ngay; domain `.test` không nhận thư xác minh/khôi phục mật khẩu thực tế.

Script kiểm tra đăng nhập và role/workspace của tất cả tài khoản mới sau khi seed. Việc tạo tài khoản, tổ chức và membership nằm trong một transaction. Chạy lại giữ nguyên mật khẩu và ID; script dừng khi email demo trùng tài khoản ngoài bộ seed hoặc tài khoản seed đã được đổi quyền/trạng thái. Không sửa mật khẩu, membership hay dữ liệu của tài khoản đang có ngoài bộ demo này.

Kiểm thử trước khi chạy seed:

```powershell
npm run build
npx jest --runInBand tests/demo-accounts-seed.test.js
```

Các ca kiểm thử xác nhận đăng nhập đủ sáu role, scope Owner/Staff, chạy lại không tạo trùng hoặc đổi mật khẩu, giữ nguyên người dùng khác và rollback khi gặp xung đột email.
