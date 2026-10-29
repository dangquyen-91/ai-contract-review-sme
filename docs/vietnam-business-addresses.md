# Địa chỉ khi tạo doanh nghiệp

Tên, mã số thuế, ngành kinh doanh và địa chỉ đều bắt buộc. Địa chỉ gồm:

- Tỉnh/thành phố.
- Xã/phường/đặc khu thuộc tỉnh/thành phố đã chọn.
- Địa chỉ chi tiết: số nhà, tên đường, tòa nhà/tầng/phòng, thôn/ấp/tổ dân phố phù hợp thực tế.

Không yêu cầu quận/huyện vì danh mục hành chính hiện hành dùng hai cấp. Thôn/ấp và đường không được giả lập thành danh mục toàn quốc; người dùng nhập thông tin thực tế trong ô chi tiết.

Frontend hiển thị địa chỉ đầy đủ trước khi gửi. Đổi tỉnh làm trống xã/phường đã chọn. Backend kiểm tra mã và quan hệ tỉnh–xã, lấy tên từ danh mục rồi tạo chuỗi `address` để các màn hình và mẫu hợp đồng hiện có tiếp tục sử dụng. `addressDetails` lưu riêng mã, tên và phần chi tiết; tên do client tự gửi không được tin cậy. Nếu địa chỉ được sửa thủ công qua form quản trị cũ, bộ mã cũ bị xóa để tránh lệch dữ liệu.

## Nguồn và cập nhật

- Căn cứ danh mục: [Quyết định 19/2025/QĐ-TTg và danh mục 34 tỉnh, 3.321 đơn vị cấp xã](https://cms.baochinhphu.vn/bang-danh-muc-va-ma-so-cua-34-tinh-thanh-moi-3321-don-vi-hanh-chinh-cap-xa-moi-102250704153652947.htm).
- Dữ liệu máy đọc: [Vietnam Provinces API v2](https://provinces.open-api.vn/), danh mục sau sắp xếp tháng 7/2025; tải ngày 30/10/2026.
- Bản chụp: `backend/src/data/vietnam-addresses.json`, gồm đủ 34 tỉnh và 3.321 xã/phường/đặc khu. Không chứa dữ liệu cá nhân.
- Cập nhật: chạy `node scripts/update-vietnam-addresses.cjs` trong `backend`, xem thay đổi và chạy kiểm thử trước khi triển khai. Script dừng nếu số lượng khác danh mục đã kiểm tra để yêu cầu rà soát thay đổi hành chính.
- Ứng dụng đọc bản dữ liệu đi kèm qua API của chính hệ thống; không gọi dịch vụ bên ngoài hoặc gửi địa chỉ người dùng tới nhà cung cấp danh mục.

Các tổ chức cũ vẫn xem được địa chỉ văn bản hiện có; quy tắc bắt buộc áp dụng cho thao tác tạo mới.
