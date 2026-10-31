# Thiết lập tải hợp đồng Word

LibreOffice là phần mềm hệ thống để chuyển DOCX sang PDF và đếm trang thực tế.
Dependency npm không kèm chương trình này. Cài trên máy chạy backend/worker,
không cần cài trên máy chỉ mở trình duyệt.

## Máy Windows chạy backend trực tiếp

Trong thư mục `backend`:

```powershell
npm install
npm run setup:word:windows
npm run check:word
```

Lệnh setup kiểm tra trước; nếu LibreOffice đã chạy được thì không cài lại.
Nếu chưa có, lệnh gọi WinGet với ID `TheDocumentFoundation.LibreOffice`.
Windows có thể yêu cầu quyền quản trị. Nếu chưa có WinGet, dùng trình cài từ
https://www.libreoffice.org/download/download-libreoffice/.

Backend mặc định dùng `C:\Program Files\LibreOffice\program\soffice.exe`.
Nếu cài ở thư mục khác, đặt trong `backend/.env`:

```dotenv
LIBREOFFICE_PATH="C:/Program Files/LibreOffice/program/soffice.exe"
```

Biến môi trường của tiến trình được ưu tiên hơn `.env`.
Lệnh kiểm tra chỉ xác nhận gọi được LibreOffice, không xác nhận mọi file DOCX đều chuyển đổi được.
Không tự cài phần mềm hệ thống trong `postinstall`; người thiết lập chủ động chạy lệnh setup.

## Docker và server

`backend/Dockerfile` đã cài `libreoffice-writer` và font chữ.
Khi deploy, build và sử dụng image này cho cả API và worker nếu chạy riêng.
Trên Linux, giữ `LIBREOFFICE_PATH=soffice` hoặc không đặt biến để dùng mặc định.
Không đưa đường dẫn Windows sang biến môi trường của container Linux.

## Sau khi thiết lập

Khởi động lại backend và worker. Xóa tệp có trạng thái lỗi và tải lại bản `.docx`.
Tệp đã lỗi không tự được xử lý lại chỉ nhờ cài phần mềm.
Luồng tải hợp đồng hiện hỗ trợ `.docx` tối đa 20 MB, không hỗ trợ `.doc` cũ.

Tham khảo cú pháp WinGet: https://learn.microsoft.com/en-us/windows/package-manager/winget/install.
