# Danh mục phép kiểm của playbook 1.3.0

Tài liệu này được sinh tự động từ mã nguồn playbook bằng `npm run docs:playbook` (thư mục `backend`), ngày 2026-11-23. Không sửa tay; sửa playbook rồi chạy lại lệnh.

## Tổng quan

- 170 phép kiểm trong 27 bộ; **167 đang áp dụng**, 3 chưa áp dụng (nháp hoặc bị loại).
- 6 kiểm tra toàn văn bằng code, áp dụng cho mọi hợp đồng.
- **226/226 trích dẫn điều luật** đã được xác minh trong kho luật: văn bản còn hiệu lực, đúng điều, đúng câu neo.
- Một phép kiểm chỉ kết luận "Vi phạm" khi điều luật và điều kiện áp dụng đều đã xác minh; nếu không thì kết quả là "Chưa xác minh được".
- Mỗi loại hợp đồng có bảng **nội dung bắt buộc**: từng nội dung mà điều luật yêu cầu (hoặc thông lệ khuyến nghị) và phép kiểm phủ nội dung đó. Server không khởi động nếu một nội dung không có phép kiểm nào và không ghi lý do.

| Kết quả khi không đạt | Số phép kiểm |
|---|---|
| Chưa rõ ràng | 50 |
| Vi phạm | 35 |
| Nên thương lượng | 8 |
| Thiếu nội dung | 74 |

| Căn cứ | Số phép kiểm |
|---|---|
| Tiêu chí rõ ràng | 35 |
| Thông lệ | 58 |
| Điều luật | 66 |
| Khuyến nghị của hệ thống | 8 |

## Số phép kiểm theo loại hợp đồng

| Loại hợp đồng | Phép kiểm áp dụng | Trong đó dựa trên điều luật | Nội dung bắt buộc được phủ |
|---|---|---|---|
| Mua bán hàng hoá | 43 | 2 | 7/7 |
| Cung ứng dịch vụ | 42 | 2 | 7/7 |
| Thuê văn phòng, mặt bằng | 47 | 2 | 12/14 |
| Hợp đồng lao động | 53 | 39 | 15/15 |
| Đặt cọc, mua bán nhà ở | 52 | 11 | 16/19 |
| Bảo hiểm nhân thọ | 21 | 14 | 11/11 |

## Mua bán hàng hoá

### Nội dung bắt buộc

| Căn cứ | Nội dung | Mức độ | Phép kiểm |
|---|---|---|---|
| điểm a khoản 2 Điều 398 Bộ luật Dân sự 2015 (đã xác minh) | Đối tượng của hợp đồng | Thông lệ | MB-01 |
| điểm b khoản 2 Điều 398 Bộ luật Dân sự 2015 (đã xác minh) | Số lượng, chất lượng | Thông lệ | DT-01, DT-02 |
| điểm c khoản 2 Điều 398 Bộ luật Dân sự 2015 (đã xác minh) | Giá, phương thức thanh toán | Thông lệ | MB-02, TT-01, TT-05 |
| điểm d khoản 2 Điều 398 Bộ luật Dân sự 2015 (đã xác minh) | Thời hạn, địa điểm, phương thức giao hàng | Thông lệ | MB-03, GN-01, GN-02 |
| điểm đ khoản 2 Điều 398 Bộ luật Dân sự 2015 (đã xác minh) | Quyền, nghĩa vụ của các bên | Thông lệ | MB-07 |
| điểm e khoản 2 Điều 398 Bộ luật Dân sự 2015 (đã xác minh) | Trách nhiệm do vi phạm hợp đồng | Thông lệ | MB-08 |
| điểm g khoản 2 Điều 398 Bộ luật Dân sự 2015 (đã xác minh) | Phương thức giải quyết tranh chấp | Thông lệ | MB-06, GQ-01 |

### Phép kiểm

| Mã | Phép kiểm | Khi không đạt | Căn cứ | Điều luật | Áp dụng khi |
|---|---|---|---|---|---|
| TT-01 | Số tiền hoặc cách tính giá phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: Điều 52 Luật Thương mại 2005 (đã xác minh); khi HĐ im lặng: Điều 86 Luật Thương mại 2005 (đã xác minh); khi HĐ im lặng: khoản 2 Điều 473 Bộ luật Dân sự 2015 (đã xác minh); khi HĐ im lặng: khoản 2 Điều 433 Bộ luật Dân sự 2015 (đã xác minh) | — |
| TT-02 | Thời hạn thanh toán phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: Điều 55 Luật Thương mại 2005 (đã xác minh); khi HĐ im lặng: Điều 87 Luật Thương mại 2005 (đã xác minh); khi HĐ im lặng: khoản 1 Điều 481 Bộ luật Dân sự 2015 (đã xác minh); khi HĐ im lặng: khoản 2 Điều 440 Bộ luật Dân sự 2015 (đã xác minh) | — |
| TT-03 | Đồng tiền thanh toán phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| TT-04 | Giá phải ghi rõ đã hay chưa bao gồm thuế GTGT | Chưa rõ ràng | Thông lệ | — | — |
| TT-05 | Phương thức thanh toán phải được nêu rõ | Chưa rõ ràng | Thông lệ | khi HĐ im lặng: khoản 2 Điều 433 Bộ luật Dân sự 2015 (đã xác minh) | — |
| TT-08 | Không ghi giá hoặc thanh toán bằng ngoại tệ | Vi phạm | Điều luật | Điều 22 Pháp lệnh Ngoại hối 2005 (đã xác minh) | Không thuộc trường hợp được dùng ngoại hối |
| TT-09 | Trả trước quá nửa giá trị mà không có bảo đảm hoàn trả | Nên thương lượng | Khuyến nghị của hệ thống | — | người dùng là Bên mua hoặc Bên thuê dịch vụ |
| TT-14 | Giá có thể điều chỉnh thì phải nêu thời điểm và mức điều chỉnh | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| TT-13 | Giá tính theo tỷ lệ phải nêu rõ tỷ lệ đó tính trên khoản nào | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| CD-01 | Các trường hợp được đơn phương chấm dứt phải được nêu rõ | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 1 Điều 428 Bộ luật Dân sự 2015 (đã xác minh) | — |
| CD-02 | Đơn phương chấm dứt phải có thời hạn và cách thông báo | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 2 Điều 428 Bộ luật Dân sự 2015 (đã xác minh) | — |
| CD-03 | Phải nêu rõ cách thanh toán, hoàn trả khi chấm dứt trước hạn | Chưa rõ ràng | Thông lệ | khi HĐ im lặng: khoản 3 Điều 428 Bộ luật Dân sự 2015 (đã xác minh) | — |
| CD-04 | Bên kia được chấm dứt không cần lý do, bên bạn thì không | Nên thương lượng | Khuyến nghị của hệ thống | — | biết người dùng là bên nào |
| PV-01 | Mức phạt phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| PV-02 | Mức phạt theo tỷ lệ phải nêu rõ tính trên giá trị nào | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| PV-03 | Phải nêu rõ vi phạm nào bị phạt | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| PV-04 | Phải nêu rõ ngoài tiền phạt có được đòi bồi thường thiệt hại không | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 2 Điều 307 Luật Thương mại 2005 (đã xác minh); khi HĐ im lặng: khoản 3 Điều 418 Bộ luật Dân sự 2015 (đã xác minh) | — |
| PV-05 | Mức phạt trong hợp đồng thương mại không quá 8% | Vi phạm | Điều luật | Điều 301 Luật Thương mại 2005 (đã xác minh) | Hợp đồng thương mại |
| PV-06 | Chỉ bên bạn bị phạt khi vi phạm | Nên thương lượng | Khuyến nghị của hệ thống | — | biết người dùng là bên nào |
| GN-01 | Thời hạn giao hoặc bàn giao phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 3 Điều 37 Luật Thương mại 2005 (đã xác minh); khi HĐ im lặng: khoản 2 Điều 434 Bộ luật Dân sự 2015 (đã xác minh) | — |
| GN-02 | Địa điểm giao hàng phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 2 Điều 35 Luật Thương mại 2005 (đã xác minh) | — |
| GN-03 | Phải nêu rõ cách kiểm tra, nghiệm thu | Chưa rõ ràng | Thông lệ | — | — |
| GN-05 | Phải nêu thời hạn khiếu nại về số lượng, chất lượng hàng hoá | Chưa rõ ràng | Thông lệ | khi HĐ im lặng: Điều 318 Luật Thương mại 2005 (đã xác minh) | — |
| DT-01 | Số lượng hàng hoá phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | khoản 1 Điều 34 Luật Thương mại 2005 (đã xác minh) | — |
| DT-02 | Chất lượng, quy cách hàng hoá phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | khoản 1 Điều 34 Luật Thương mại 2005 (đã xác minh) | — |
| BHN-01 | Thời hạn bảo hành phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| BHN-02 | Phải nêu rõ phạm vi và điều kiện được bảo hành | Chưa rõ ràng | Thông lệ | — | — |
| BHN-03 | Phải nêu thời hạn sửa chữa, thay thế khi có yêu cầu bảo hành | Chưa rõ ràng | Thông lệ | khi HĐ im lặng: khoản 2 Điều 49 Luật Thương mại 2005 (đã xác minh) | — |
| BHN-04 | Bên mua phải chịu chi phí bảo hành | Nên thương lượng | Khuyến nghị của hệ thống | khoản 3 Điều 49 Luật Thương mại 2005 (đã xác minh) | người dùng là Bên mua |
| BM-01 | Phạm vi thông tin phải bảo mật phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| BM-02 | Thời hạn nghĩa vụ bảo mật phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| BKK-01 | Phải nêu cách và thời hạn thông báo khi gặp sự kiện bất khả kháng | Chưa rõ ràng | Thông lệ | khi HĐ im lặng: khoản 1 Điều 295 Luật Thương mại 2005 (đã xác minh) | — |
| BKK-02 | Phải nêu cách xử lý khi sự kiện bất khả kháng kéo dài | Chưa rõ ràng | Thông lệ | — | — |
| GQ-01 | Phải nêu cơ quan giải quyết tranh chấp | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| GQ-02 | Chọn trọng tài thì phải nêu tên trung tâm trọng tài | Chưa rõ ràng | Thông lệ | — | — |
| MB-07 | Hợp đồng phải có nội dung về quyền và nghĩa vụ của các bên | Thiếu nội dung | Thông lệ | khoản 2 Điều 398 Bộ luật Dân sự 2015 (đã xác minh) | — |
| MB-08 | Hợp đồng phải có nội dung về trách nhiệm do vi phạm hợp đồng | Thiếu nội dung | Thông lệ | khoản 2 Điều 398 Bộ luật Dân sự 2015 (đã xác minh) | — |
| MB-01 | Hợp đồng phải có điều khoản về hàng hoá, số lượng, chất lượng | Thiếu nội dung | Thông lệ | khoản 2 Điều 398 Bộ luật Dân sự 2015 (đã xác minh) | — |
| MB-02 | Hợp đồng phải có điều khoản về giá và thanh toán | Thiếu nội dung | Thông lệ | khoản 2 Điều 398 Bộ luật Dân sự 2015 (đã xác minh) | — |
| MB-03 | Hợp đồng phải có điều khoản về giao nhận hàng hoá | Thiếu nội dung | Thông lệ | khoản 2 Điều 398 Bộ luật Dân sự 2015 (đã xác minh) | — |
| MB-04 | Hợp đồng phải có điều khoản về bảo hành | Thiếu nội dung | Thông lệ | — | — |
| MB-05 | Hợp đồng phải có điều khoản về chấm dứt hợp đồng | Thiếu nội dung | Thông lệ | — | — |
| MB-06 | Hợp đồng phải có điều khoản về giải quyết tranh chấp | Thiếu nội dung | Thông lệ | khoản 2 Điều 398 Bộ luật Dân sự 2015 (đã xác minh) | — |

## Cung ứng dịch vụ

### Nội dung bắt buộc

| Căn cứ | Nội dung | Mức độ | Phép kiểm |
|---|---|---|---|
| điểm a khoản 2 Điều 398 Bộ luật Dân sự 2015 (đã xác minh) | Đối tượng của hợp đồng: công việc, dịch vụ | Thông lệ | DV-01 |
| điểm b khoản 2 Điều 398 Bộ luật Dân sự 2015 (đã xác minh) | Kết quả, tiêu chuẩn của dịch vụ | Thông lệ | DT-03 |
| điểm c khoản 2 Điều 398 Bộ luật Dân sự 2015 (đã xác minh) | Giá, phương thức thanh toán | Thông lệ | DV-02, TT-01, TT-05 |
| điểm d khoản 2 Điều 398 Bộ luật Dân sự 2015 (đã xác minh) | Thời hạn, cách thực hiện và nghiệm thu | Thông lệ | DV-03, DV-04, GN-03 |
| điểm đ khoản 2 Điều 398 Bộ luật Dân sự 2015 (đã xác minh) | Quyền, nghĩa vụ của các bên | Thông lệ | DV-07 |
| điểm e khoản 2 Điều 398 Bộ luật Dân sự 2015 (đã xác minh) | Trách nhiệm do vi phạm hợp đồng | Thông lệ | DV-08 |
| điểm g khoản 2 Điều 398 Bộ luật Dân sự 2015 (đã xác minh) | Phương thức giải quyết tranh chấp | Thông lệ | DV-06, GQ-01 |

### Phép kiểm

| Mã | Phép kiểm | Khi không đạt | Căn cứ | Điều luật | Áp dụng khi |
|---|---|---|---|---|---|
| TT-01 | Số tiền hoặc cách tính giá phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: Điều 52 Luật Thương mại 2005 (đã xác minh); khi HĐ im lặng: Điều 86 Luật Thương mại 2005 (đã xác minh); khi HĐ im lặng: khoản 2 Điều 473 Bộ luật Dân sự 2015 (đã xác minh); khi HĐ im lặng: khoản 2 Điều 433 Bộ luật Dân sự 2015 (đã xác minh) | — |
| TT-02 | Thời hạn thanh toán phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: Điều 55 Luật Thương mại 2005 (đã xác minh); khi HĐ im lặng: Điều 87 Luật Thương mại 2005 (đã xác minh); khi HĐ im lặng: khoản 1 Điều 481 Bộ luật Dân sự 2015 (đã xác minh); khi HĐ im lặng: khoản 2 Điều 440 Bộ luật Dân sự 2015 (đã xác minh) | — |
| TT-03 | Đồng tiền thanh toán phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| TT-04 | Giá phải ghi rõ đã hay chưa bao gồm thuế GTGT | Chưa rõ ràng | Thông lệ | — | — |
| TT-05 | Phương thức thanh toán phải được nêu rõ | Chưa rõ ràng | Thông lệ | khi HĐ im lặng: khoản 2 Điều 433 Bộ luật Dân sự 2015 (đã xác minh) | — |
| TT-08 | Không ghi giá hoặc thanh toán bằng ngoại tệ | Vi phạm | Điều luật | Điều 22 Pháp lệnh Ngoại hối 2005 (đã xác minh) | Không thuộc trường hợp được dùng ngoại hối |
| TT-09 | Trả trước quá nửa giá trị mà không có bảo đảm hoàn trả | Nên thương lượng | Khuyến nghị của hệ thống | — | người dùng là Bên mua hoặc Bên thuê dịch vụ |
| TT-14 | Giá có thể điều chỉnh thì phải nêu thời điểm và mức điều chỉnh | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| TT-13 | Giá tính theo tỷ lệ phải nêu rõ tỷ lệ đó tính trên khoản nào | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| TH-01 | Thời điểm bắt đầu phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 1 Điều 401 Bộ luật Dân sự 2015 (đã xác minh) | — |
| TH-02 | Thời hạn hoặc thời điểm kết thúc phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: Điều 474 Bộ luật Dân sự 2015 (đã xác minh) | — |
| TH-03 | Tự động gia hạn mà không nêu cách từ chối gia hạn | Nên thương lượng | Khuyến nghị của hệ thống | — | — |
| CD-01 | Các trường hợp được đơn phương chấm dứt phải được nêu rõ | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 1 Điều 428 Bộ luật Dân sự 2015 (đã xác minh) | — |
| CD-02 | Đơn phương chấm dứt phải có thời hạn và cách thông báo | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 2 Điều 428 Bộ luật Dân sự 2015 (đã xác minh) | — |
| CD-03 | Phải nêu rõ cách thanh toán, hoàn trả khi chấm dứt trước hạn | Chưa rõ ràng | Thông lệ | khi HĐ im lặng: khoản 3 Điều 428 Bộ luật Dân sự 2015 (đã xác minh) | — |
| CD-04 | Bên kia được chấm dứt không cần lý do, bên bạn thì không | Nên thương lượng | Khuyến nghị của hệ thống | — | biết người dùng là bên nào |
| PV-01 | Mức phạt phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| PV-02 | Mức phạt theo tỷ lệ phải nêu rõ tính trên giá trị nào | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| PV-03 | Phải nêu rõ vi phạm nào bị phạt | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| PV-04 | Phải nêu rõ ngoài tiền phạt có được đòi bồi thường thiệt hại không | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 2 Điều 307 Luật Thương mại 2005 (đã xác minh); khi HĐ im lặng: khoản 3 Điều 418 Bộ luật Dân sự 2015 (đã xác minh) | — |
| PV-05 | Mức phạt trong hợp đồng thương mại không quá 8% | Vi phạm | Điều luật | Điều 301 Luật Thương mại 2005 (đã xác minh) | Hợp đồng thương mại |
| PV-06 | Chỉ bên bạn bị phạt khi vi phạm | Nên thương lượng | Khuyến nghị của hệ thống | — | biết người dùng là bên nào |
| GN-01 | Thời hạn giao hoặc bàn giao phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 3 Điều 37 Luật Thương mại 2005 (đã xác minh); khi HĐ im lặng: khoản 2 Điều 434 Bộ luật Dân sự 2015 (đã xác minh) | — |
| GN-03 | Phải nêu rõ cách kiểm tra, nghiệm thu | Chưa rõ ràng | Thông lệ | — | — |
| DT-03 | Kết quả hoặc tiêu chuẩn của dịch vụ phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| BHN-01 | Thời hạn bảo hành phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| BHN-02 | Phải nêu rõ phạm vi và điều kiện được bảo hành | Chưa rõ ràng | Thông lệ | — | — |
| BHN-03 | Phải nêu thời hạn sửa chữa, thay thế khi có yêu cầu bảo hành | Chưa rõ ràng | Thông lệ | khi HĐ im lặng: khoản 2 Điều 49 Luật Thương mại 2005 (đã xác minh) | — |
| BM-01 | Phạm vi thông tin phải bảo mật phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| BM-02 | Thời hạn nghĩa vụ bảo mật phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| BKK-01 | Phải nêu cách và thời hạn thông báo khi gặp sự kiện bất khả kháng | Chưa rõ ràng | Thông lệ | khi HĐ im lặng: khoản 1 Điều 295 Luật Thương mại 2005 (đã xác minh) | — |
| BKK-02 | Phải nêu cách xử lý khi sự kiện bất khả kháng kéo dài | Chưa rõ ràng | Thông lệ | — | — |
| GQ-01 | Phải nêu cơ quan giải quyết tranh chấp | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| GQ-02 | Chọn trọng tài thì phải nêu tên trung tâm trọng tài | Chưa rõ ràng | Thông lệ | — | — |
| DV-07 | Hợp đồng phải có nội dung về quyền và nghĩa vụ của các bên | Thiếu nội dung | Thông lệ | khoản 2 Điều 398 Bộ luật Dân sự 2015 (đã xác minh) | — |
| DV-08 | Hợp đồng phải có nội dung về trách nhiệm do vi phạm hợp đồng | Thiếu nội dung | Thông lệ | khoản 2 Điều 398 Bộ luật Dân sự 2015 (đã xác minh) | — |
| DV-01 | Hợp đồng phải có điều khoản về phạm vi công việc, dịch vụ | Thiếu nội dung | Thông lệ | khoản 2 Điều 398 Bộ luật Dân sự 2015 (đã xác minh) | — |
| DV-02 | Hợp đồng phải có điều khoản về giá và thanh toán | Thiếu nội dung | Thông lệ | khoản 2 Điều 398 Bộ luật Dân sự 2015 (đã xác minh) | — |
| DV-03 | Hợp đồng phải có điều khoản về thời hạn hợp đồng | Thiếu nội dung | Thông lệ | khoản 2 Điều 398 Bộ luật Dân sự 2015 (đã xác minh) | — |
| DV-04 | Hợp đồng phải có điều khoản về bàn giao, nghiệm thu kết quả | Thiếu nội dung | Thông lệ | khoản 2 Điều 398 Bộ luật Dân sự 2015 (đã xác minh) | — |
| DV-05 | Hợp đồng phải có điều khoản về chấm dứt hợp đồng | Thiếu nội dung | Thông lệ | — | — |
| DV-06 | Hợp đồng phải có điều khoản về giải quyết tranh chấp | Thiếu nội dung | Thông lệ | khoản 2 Điều 398 Bộ luật Dân sự 2015 (đã xác minh) | — |

## Thuê văn phòng, mặt bằng

### Nội dung bắt buộc

| Căn cứ | Nội dung | Mức độ | Phép kiểm |
|---|---|---|---|
| điểm a khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh) | Tên, địa chỉ của các bên | Thông lệ | TM-10 |
| điểm b khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh) | Thông tin mặt bằng và mục đích thuê | Thông lệ | TM-01, DT-05 |
| điểm c khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh) | Giá thuê | Thông lệ | TM-03, TT-01 |
| điểm d khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh) | Phương thức và thời hạn thanh toán | Thông lệ | TM-03, TT-02, TT-05 |
| điểm đ khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh) | Bảo lãnh ngân hàng của chủ đầu tư | Thông lệ | Không kiểm: Chỉ áp dụng khi bán nhà ở hình thành trong tương lai, không áp dụng cho hợp đồng thuê. |
| điểm e khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh) | Thời hạn giao, nhận mặt bằng | Thông lệ | TM-05, GN-01, GN-04 |
| điểm g khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh) | Bảo hành | Thông lệ | Không kiểm: Bảo hành gắn với việc bán, chuyển giao công trình; với hợp đồng thuê, trách nhiệm sửa chữa được kiểm tại TM-06 và SC-01. |
| điểm h khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh) | Quyền, nghĩa vụ của các bên | Thông lệ | TM-11 |
| điểm i khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh) | Trách nhiệm do vi phạm hợp đồng | Thông lệ | TM-12 |
| điểm k khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh) | Phạt vi phạm hợp đồng | Thông lệ | TM-12 |
| điểm l khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh) | Các trường hợp chấm dứt hợp đồng | Thông lệ | TM-07, CD-01, CD-03 |
| điểm m khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh) | Phương thức giải quyết tranh chấp | Thông lệ | TM-08, GQ-01 |
| điểm n khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh) | Thời điểm có hiệu lực | Thông lệ | TM-09 |
| điểm d khoản 2 Điều 398 Bộ luật Dân sự 2015 (đã xác minh) | Thời hạn thuê | Thông lệ | TM-04, TH-01, TH-02 |

### Phép kiểm

| Mã | Phép kiểm | Khi không đạt | Căn cứ | Điều luật | Áp dụng khi |
|---|---|---|---|---|---|
| TT-01 | Số tiền hoặc cách tính giá phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: Điều 52 Luật Thương mại 2005 (đã xác minh); khi HĐ im lặng: Điều 86 Luật Thương mại 2005 (đã xác minh); khi HĐ im lặng: khoản 2 Điều 473 Bộ luật Dân sự 2015 (đã xác minh); khi HĐ im lặng: khoản 2 Điều 433 Bộ luật Dân sự 2015 (đã xác minh) | — |
| TT-02 | Thời hạn thanh toán phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: Điều 55 Luật Thương mại 2005 (đã xác minh); khi HĐ im lặng: Điều 87 Luật Thương mại 2005 (đã xác minh); khi HĐ im lặng: khoản 1 Điều 481 Bộ luật Dân sự 2015 (đã xác minh); khi HĐ im lặng: khoản 2 Điều 440 Bộ luật Dân sự 2015 (đã xác minh) | — |
| TT-03 | Đồng tiền thanh toán phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| TT-04 | Giá phải ghi rõ đã hay chưa bao gồm thuế GTGT | Chưa rõ ràng | Thông lệ | — | — |
| TT-05 | Phương thức thanh toán phải được nêu rõ | Chưa rõ ràng | Thông lệ | khi HĐ im lặng: khoản 2 Điều 433 Bộ luật Dân sự 2015 (đã xác minh) | — |
| TT-06 | Lãi chậm thanh toán không vượt quá 20%/năm | Vi phạm | Điều luật | khoản 2 Điều 357 Bộ luật Dân sự 2015 (đã xác minh); khoản 1 Điều 468 Bộ luật Dân sự 2015 (đã xác minh) | — |
| TT-08 | Không ghi giá hoặc thanh toán bằng ngoại tệ | Vi phạm | Điều luật | Điều 22 Pháp lệnh Ngoại hối 2005 (đã xác minh) | Không thuộc trường hợp được dùng ngoại hối |
| TT-14 | Giá có thể điều chỉnh thì phải nêu thời điểm và mức điều chỉnh | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| TT-13 | Giá tính theo tỷ lệ phải nêu rõ tỷ lệ đó tính trên khoản nào | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| TH-01 | Thời điểm bắt đầu phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 1 Điều 401 Bộ luật Dân sự 2015 (đã xác minh) | — |
| TH-02 | Thời hạn hoặc thời điểm kết thúc phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: Điều 474 Bộ luật Dân sự 2015 (đã xác minh) | — |
| TH-03 | Tự động gia hạn mà không nêu cách từ chối gia hạn | Nên thương lượng | Khuyến nghị của hệ thống | — | — |
| CD-01 | Các trường hợp được đơn phương chấm dứt phải được nêu rõ | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 1 Điều 428 Bộ luật Dân sự 2015 (đã xác minh) | — |
| CD-02 | Đơn phương chấm dứt phải có thời hạn và cách thông báo | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 2 Điều 428 Bộ luật Dân sự 2015 (đã xác minh) | — |
| CD-03 | Phải nêu rõ cách thanh toán, hoàn trả khi chấm dứt trước hạn | Chưa rõ ràng | Thông lệ | khi HĐ im lặng: khoản 3 Điều 428 Bộ luật Dân sự 2015 (đã xác minh) | — |
| CD-04 | Bên kia được chấm dứt không cần lý do, bên bạn thì không | Nên thương lượng | Khuyến nghị của hệ thống | — | biết người dùng là bên nào |
| PV-01 | Mức phạt phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| PV-02 | Mức phạt theo tỷ lệ phải nêu rõ tính trên giá trị nào | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| PV-03 | Phải nêu rõ vi phạm nào bị phạt | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| PV-04 | Phải nêu rõ ngoài tiền phạt có được đòi bồi thường thiệt hại không | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 2 Điều 307 Luật Thương mại 2005 (đã xác minh); khi HĐ im lặng: khoản 3 Điều 418 Bộ luật Dân sự 2015 (đã xác minh) | — |
| PV-06 | Chỉ bên bạn bị phạt khi vi phạm | Nên thương lượng | Khuyến nghị của hệ thống | — | biết người dùng là bên nào |
| GN-01 | Thời hạn giao hoặc bàn giao phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 3 Điều 37 Luật Thương mại 2005 (đã xác minh); khi HĐ im lặng: khoản 2 Điều 434 Bộ luật Dân sự 2015 (đã xác minh) | — |
| GN-04 | Phải có biên bản bàn giao ghi nhận tình trạng tài sản | Chưa rõ ràng | Thông lệ | — | — |
| DC-01 | Số tiền đặt cọc phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| DC-02 | Phải nêu rõ khi nào tiền cọc được hoàn trả hoặc trừ vào tiền thanh toán | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 2 Điều 328 Bộ luật Dân sự 2015 (đã xác minh) | — |
| DC-03 | Phạt cọc không cân bằng, bất lợi cho bên đặt cọc | Nên thương lượng | Khuyến nghị của hệ thống | khoản 2 Điều 328 Bộ luật Dân sự 2015 (đã xác minh) | người dùng là Bên thuê hoặc Bên mua |
| SC-01 | Phải nêu rõ bên nào sửa chữa hư hỏng nào và ai chịu chi phí | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 1 Điều 477 Bộ luật Dân sự 2015 (đã xác minh) | — |
| CL-01 | Phải nêu rõ bên thuê có được cho thuê lại hay không | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: Điều 475 Bộ luật Dân sự 2015 (đã xác minh) | — |
| PL-01 | Phải nêu giấy tờ chứng minh quyền bán hoặc cho thuê tài sản | Chưa rõ ràng | Thông lệ | — | — |
| PL-02 | Phải nêu tài sản có đang thế chấp hay tranh chấp không | Chưa rõ ràng | Thông lệ | — | — |
| DT-05 | Mục đích sử dụng mặt bằng thuê phải được nêu rõ | Chưa rõ ràng | Tiêu chí rõ ràng | khoản 1 Điều 480 Bộ luật Dân sự 2015 (đã xác minh) | — |
| BKK-01 | Phải nêu cách và thời hạn thông báo khi gặp sự kiện bất khả kháng | Chưa rõ ràng | Thông lệ | khi HĐ im lặng: khoản 1 Điều 295 Luật Thương mại 2005 (đã xác minh) | — |
| BKK-02 | Phải nêu cách xử lý khi sự kiện bất khả kháng kéo dài | Chưa rõ ràng | Thông lệ | — | — |
| GQ-01 | Phải nêu cơ quan giải quyết tranh chấp | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| GQ-02 | Chọn trọng tài thì phải nêu tên trung tâm trọng tài | Chưa rõ ràng | Thông lệ | — | — |
| TM-10 | Hợp đồng phải có nội dung về tên, địa chỉ của các bên | Thiếu nội dung | Thông lệ | khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh) | — |
| TM-11 | Hợp đồng phải có nội dung về quyền và nghĩa vụ của các bên | Thiếu nội dung | Thông lệ | khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh) | — |
| TM-12 | Hợp đồng phải có nội dung về trách nhiệm do vi phạm hợp đồng | Thiếu nội dung | Thông lệ | khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh) | — |
| TM-01 | Hợp đồng phải có điều khoản về thông tin mặt bằng cho thuê | Thiếu nội dung | Thông lệ | khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh) | — |
| TM-02 | Hợp đồng phải có điều khoản về tình trạng pháp lý của mặt bằng | Thiếu nội dung | Thông lệ | — | — |
| TM-03 | Hợp đồng phải có điều khoản về giá thuê và thanh toán | Thiếu nội dung | Thông lệ | khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh) | — |
| TM-04 | Hợp đồng phải có điều khoản về thời hạn thuê | Thiếu nội dung | Thông lệ | khoản 2 Điều 398 Bộ luật Dân sự 2015 (đã xác minh) | — |
| TM-05 | Hợp đồng phải có điều khoản về bàn giao mặt bằng | Thiếu nội dung | Thông lệ | khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh) | — |
| TM-06 | Hợp đồng phải có điều khoản về sửa chữa, bảo trì | Thiếu nội dung | Thông lệ | — | — |
| TM-07 | Hợp đồng phải có điều khoản về chấm dứt hợp đồng | Thiếu nội dung | Thông lệ | khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh) | — |
| TM-08 | Hợp đồng phải có điều khoản về giải quyết tranh chấp | Thiếu nội dung | Thông lệ | khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh) | — |
| TM-09 | Hợp đồng phải nêu thời điểm có hiệu lực | Thiếu nội dung | Thông lệ | khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh) | — |

## Hợp đồng lao động

### Nội dung bắt buộc

| Căn cứ | Nội dung | Mức độ | Phép kiểm |
|---|---|---|---|
| điểm a khoản 1 Điều 21 Bộ luật Lao động 2019 (đã xác minh) | Tên, địa chỉ người sử dụng lao động; họ tên, chức danh người ký | Bắt buộc | LD-20 |
| điểm b khoản 1 Điều 21 Bộ luật Lao động 2019 (đã xác minh) | Họ tên, ngày sinh, giới tính, nơi cư trú, số giấy tờ tuỳ thân của người lao động | Bắt buộc | LD-21 |
| điểm c khoản 1 Điều 21 Bộ luật Lao động 2019 (đã xác minh) | Công việc và địa điểm làm việc | Bắt buộc | LD-01, DT-04 |
| điểm d khoản 1 Điều 21 Bộ luật Lao động 2019 (đã xác minh) | Thời hạn của hợp đồng lao động | Bắt buộc | LD-02, TH-02 |
| điểm đ khoản 1 Điều 21 Bộ luật Lao động 2019 (đã xác minh) | Mức lương | Bắt buộc | LD-03, TL-01 |
| điểm đ khoản 1 Điều 21 Bộ luật Lao động 2019 (đã xác minh) | Hình thức trả lương | Bắt buộc | LD-22 |
| điểm đ khoản 1 Điều 21 Bộ luật Lao động 2019 (đã xác minh) | Thời hạn trả lương | Bắt buộc | LD-03, TL-02 |
| điểm đ khoản 1 Điều 21 Bộ luật Lao động 2019 (đã xác minh) | Phụ cấp lương và các khoản bổ sung khác | Bắt buộc | LD-23 |
| điểm e khoản 1 Điều 21 Bộ luật Lao động 2019 (đã xác minh) | Chế độ nâng bậc, nâng lương | Bắt buộc | LD-09 |
| điểm g khoản 1 Điều 21 Bộ luật Lao động 2019 (đã xác minh) | Thời giờ làm việc | Bắt buộc | LD-04, TG-01 |
| điểm g khoản 1 Điều 21 Bộ luật Lao động 2019 (đã xác minh) | Thời giờ nghỉ ngơi | Bắt buộc | LD-24 |
| điểm h khoản 1 Điều 21 Bộ luật Lao động 2019 (đã xác minh) | Trang bị bảo hộ lao động | Bắt buộc | LD-10 |
| điểm i khoản 1 Điều 21 Bộ luật Lao động 2019 (đã xác minh) | Bảo hiểm xã hội, bảo hiểm y tế, bảo hiểm thất nghiệp | Bắt buộc | LD-05 |
| điểm k khoản 1 Điều 21 Bộ luật Lao động 2019 (đã xác minh) | Đào tạo, bồi dưỡng, nâng cao trình độ | Bắt buộc | LD-11 |
| khoản 2 Điều 21 Bộ luật Lao động 2019 (đã xác minh) | Khi có thoả thuận bảo vệ bí mật kinh doanh: nội dung, thời hạn, quyền lợi của người lao động | Thông lệ | BM-01, BM-02, BM-03 |

### Phép kiểm

| Mã | Phép kiểm | Khi không đạt | Căn cứ | Điều luật | Áp dụng khi |
|---|---|---|---|---|---|
| TH-01 | Thời điểm bắt đầu phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 1 Điều 401 Bộ luật Dân sự 2015 (đã xác minh) | — |
| TH-02 | Thời hạn hoặc thời điểm kết thúc phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: Điều 474 Bộ luật Dân sự 2015 (đã xác minh) | — |
| TH-04 | Hợp đồng lao động xác định thời hạn không quá 36 tháng | Vi phạm | Điều luật | khoản 1 Điều 20 Bộ luật Lao động 2019 (đã xác minh) | — |
| TV-01 | Thời gian thử việc phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| TV-02 | Không áp dụng thử việc với hợp đồng dưới 01 tháng | Vi phạm | Điều luật | khoản 3 Điều 24 Bộ luật Lao động 2019 (đã xác minh) | Hợp đồng lao động dưới 01 tháng |
| TV-03 | Thời gian thử việc không vượt mức tối đa theo vị trí công việc | Vi phạm | Điều luật | Điều 25 Bộ luật Lao động 2019 (đã xác minh) | — |
| TV-04 | Lương thử việc ít nhất 85% lương của công việc | Vi phạm | Điều luật | Điều 26 Bộ luật Lao động 2019 (đã xác minh) | — |
| TL-01 | Mức lương phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | khoản 1 Điều 21 Bộ luật Lao động 2019 (đã xác minh) | — |
| TL-02 | Kỳ hạn và thời điểm trả lương phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | khoản 2 Điều 97 Bộ luật Lao động 2019 (đã xác minh) | — |
| TL-03 | Lương của người lao động Việt Nam phải bằng Đồng Việt Nam | Vi phạm | Điều luật | khoản 2 Điều 95 Bộ luật Lao động 2019 (đã xác minh) | Người lao động là công dân Việt Nam |
| TL-04 | Khấu trừ lương hằng tháng không quá 30% | Vi phạm | Điều luật | khoản 3 Điều 102 Bộ luật Lao động 2019 (đã xác minh) | — |
| TL-05 | Lương, thưởng tính theo tỷ lệ phải nêu rõ tỷ lệ đó tính trên khoản nào | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| TG-01 | Thời giờ làm việc phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | khoản 1 Điều 21 Bộ luật Lao động 2019 (đã xác minh) | — |
| TG-02 | Thời giờ làm việc bình thường không quá 48 giờ mỗi tuần | Vi phạm | Điều luật | khoản 1 Điều 105 Bộ luật Lao động 2019 (đã xác minh) | — |
| TG-03 | Thời giờ làm việc bình thường không quá 10 giờ mỗi ngày | Vi phạm | Điều luật | khoản 2 Điều 105 Bộ luật Lao động 2019 (đã xác minh) | — |
| TG-04 | Làm thêm giờ không quá 40 giờ mỗi tháng | Vi phạm | Điều luật | khoản 2 Điều 107 Bộ luật Lao động 2019 (đã xác minh) | — |
| TG-05 | Làm thêm giờ không vượt mức tối đa mỗi năm | Vi phạm | Điều luật | khoản 2 Điều 107 Bộ luật Lao động 2019 (đã xác minh); khoản 3 Điều 107 Bộ luật Lao động 2019 (đã xác minh) | — |
| TG-06 | Nghỉ hằng năm ít nhất 12 ngày làm việc | Vi phạm | Điều luật | khoản 1 Điều 113 Bộ luật Lao động 2019 (đã xác minh) | — |
| TG-07 | Nghỉ hằng tuần ít nhất 24 giờ liên tục | Vi phạm | Điều luật | khoản 1 Điều 111 Bộ luật Lao động 2019 (đã xác minh) | — |
| TG-08 | Nghỉ Tết Âm lịch ít nhất 05 ngày hưởng nguyên lương | Vi phạm | Điều luật | khoản 1 Điều 112 Bộ luật Lao động 2019 (đã xác minh) | — |
| BH-01 | Không được thoả thuận bỏ bảo hiểm xã hội bắt buộc | Vi phạm | Điều luật | khoản 1 Điều 168 Bộ luật Lao động 2019 (đã xác minh) | Người lao động thuộc diện bảo hiểm xã hội bắt buộc |
| DT-04 | Công việc và địa điểm làm việc phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | khoản 1 Điều 21 Bộ luật Lao động 2019 (đã xác minh) | — |
| BM-01 | Phạm vi thông tin phải bảo mật phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| BM-02 | Thời hạn nghĩa vụ bảo mật phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| BM-03 | Hạn chế làm việc cho đối thủ sau khi nghỉ việc mà không có quyền lợi bù đắp | Nên thương lượng | Khuyến nghị của hệ thống | khoản 2 Điều 21 Bộ luật Lao động 2019 (đã xác minh) | người dùng là Người lao động |
| GQ-01 | Phải nêu cơ quan giải quyết tranh chấp | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| GQ-03 | Điều khoản tranh chấp lao động phải nêu bước hoà giải viên lao động trước khi khởi kiện | Thiếu nội dung | Thông lệ | Điều 187 Bộ luật Lao động 2019 (đã xác minh); khoản 1 Điều 188 Bộ luật Lao động 2019 (đã xác minh) | — |
| LD-01 | Hợp đồng phải có điều khoản về công việc và địa điểm làm việc | Thiếu nội dung | Điều luật | khoản 1 Điều 21 Bộ luật Lao động 2019 (đã xác minh) | — |
| LD-02 | Hợp đồng phải có điều khoản về thời hạn hợp đồng lao động | Thiếu nội dung | Điều luật | khoản 1 Điều 21 Bộ luật Lao động 2019 (đã xác minh) | — |
| LD-03 | Hợp đồng phải có điều khoản về tiền lương | Thiếu nội dung | Điều luật | khoản 1 Điều 21 Bộ luật Lao động 2019 (đã xác minh) | — |
| LD-04 | Hợp đồng phải có điều khoản về thời giờ làm việc, nghỉ ngơi | Thiếu nội dung | Điều luật | khoản 1 Điều 21 Bộ luật Lao động 2019 (đã xác minh) | — |
| LD-05 | Hợp đồng phải có điều khoản về bảo hiểm xã hội, y tế, thất nghiệp | Thiếu nội dung | Điều luật | khoản 1 Điều 21 Bộ luật Lao động 2019 (đã xác minh) | — |
| LD-06 | Người sử dụng lao động không được giữ bản chính giấy tờ của người lao động | Vi phạm | Điều luật | khoản 1 Điều 17 Bộ luật Lao động 2019 (đã xác minh) | — |
| LD-07 | Không được buộc người lao động đặt cọc, ký quỹ | Vi phạm | Điều luật | khoản 2 Điều 17 Bộ luật Lao động 2019 (đã xác minh) | — |
| LD-08 | Không được phạt tiền, cắt lương thay cho xử lý kỷ luật | Vi phạm | Điều luật | khoản 2 Điều 127 Bộ luật Lao động 2019 (đã xác minh) | — |
| LD-09 | Hợp đồng phải có nội dung về chế độ nâng bậc, nâng lương | Thiếu nội dung | Điều luật | khoản 1 Điều 21 Bộ luật Lao động 2019 (đã xác minh) | — |
| LD-10 | Hợp đồng phải có nội dung về trang bị bảo hộ lao động | Thiếu nội dung | Điều luật | khoản 1 Điều 21 Bộ luật Lao động 2019 (đã xác minh) | — |
| LD-11 | Hợp đồng phải có nội dung về đào tạo, bồi dưỡng, nâng cao trình độ | Thiếu nội dung | Điều luật | khoản 1 Điều 21 Bộ luật Lao động 2019 (đã xác minh) | — |
| LD-12 | Phải báo trước ít nhất 03 ngày làm việc khi điều chuyển công việc | Vi phạm | Điều luật | khoản 2 Điều 29 Bộ luật Lao động 2019 (đã xác minh) | — |
| LD-13 | Lương khi bị điều chuyển ít nhất 85% lương công việc cũ | Vi phạm | Điều luật | khoản 3 Điều 29 Bộ luật Lao động 2019 (đã xác minh) | — |
| LD-14 | Thời hạn người lao động phải báo trước không dài hơn mức luật quy định | Nên thương lượng | Khuyến nghị của hệ thống | khoản 1 Điều 35 Bộ luật Lao động 2019 (đã xác minh) | người dùng là Người lao động |
| LD-15 | Thời hạn thanh toán khi chấm dứt hợp đồng không quá 30 ngày | Vi phạm | Điều luật | khoản 1 Điều 48 Bộ luật Lao động 2019 (đã xác minh) | — |
| LD-16 | Tiền lương làm thêm giờ vào ngày thường ít nhất 150% | Vi phạm | Điều luật | khoản 1 Điều 98 Bộ luật Lao động 2019 (đã xác minh) | — |
| LD-17 | Tiền lương làm thêm giờ vào ngày nghỉ hằng tuần ít nhất 200% | Vi phạm | Điều luật | khoản 1 Điều 98 Bộ luật Lao động 2019 (đã xác minh) | — |
| LD-18 | Tiền lương làm thêm giờ vào ngày nghỉ lễ, Tết ít nhất 300% | Vi phạm | Điều luật | khoản 1 Điều 98 Bộ luật Lao động 2019 (đã xác minh) | — |
| LD-19 | Không được buộc người lao động làm việc để trả nợ | Vi phạm | Điều luật | khoản 3 Điều 17 Bộ luật Lao động 2019 (đã xác minh) | — |
| LD-20 | Hợp đồng phải có nội dung về tên, địa chỉ người sử dụng lao động và người ký hợp đồng | Thiếu nội dung | Điều luật | khoản 1 Điều 21 Bộ luật Lao động 2019 (đã xác minh) | — |
| LD-21 | Hợp đồng phải có nội dung về thông tin cá nhân của người lao động | Thiếu nội dung | Điều luật | khoản 1 Điều 21 Bộ luật Lao động 2019 (đã xác minh) | — |
| LD-22 | Hợp đồng phải có nội dung về hình thức trả lương | Thiếu nội dung | Điều luật | khoản 1 Điều 21 Bộ luật Lao động 2019 (đã xác minh) | — |
| LD-23 | Hợp đồng phải có nội dung về phụ cấp lương và các khoản bổ sung khác | Thiếu nội dung | Điều luật | khoản 1 Điều 21 Bộ luật Lao động 2019 (đã xác minh) | — |
| LD-24 | Hợp đồng phải có nội dung về thời giờ nghỉ ngơi | Thiếu nội dung | Điều luật | khoản 1 Điều 21 Bộ luật Lao động 2019 (đã xác minh) | — |
| LD-25 | Người sử dụng lao động chỉ được đơn phương chấm dứt trong các trường hợp luật quy định | Vi phạm | Điều luật | khoản 1 Điều 36 Bộ luật Lao động 2019 (đã xác minh) | — |
| LD-26 | Người sử dụng lao động phải báo trước ít nhất mức luật định khi đơn phương chấm dứt | Vi phạm | Điều luật | khoản 2 Điều 36 Bộ luật Lao động 2019 (đã xác minh) | — |

## Đặt cọc, mua bán nhà ở

### Nội dung bắt buộc

| Căn cứ | Nội dung | Mức độ | Phép kiểm |
|---|---|---|---|
| khoản 1 Điều 163 Luật Nhà ở 2023 (đã xác minh) | Họ tên, địa chỉ của các bên | Bắt buộc | MN-12 |
| khoản 2 Điều 163 Luật Nhà ở 2023 (đã xác minh) | Đặc điểm nhà ở và thửa đất | Bắt buộc | MN-01, MN-13 |
| khoản 2 Điều 163 Luật Nhà ở 2023 (đã xác minh) | Căn hộ chung cư: phần sở hữu chung, diện tích, kinh phí bảo trì | Bắt buộc | MN-14 |
| khoản 3 Điều 163 Luật Nhà ở 2023 (đã xác minh) | Giá mua bán | Bắt buộc | MN-03, TT-01 |
| khoản 4 Điều 163 Luật Nhà ở 2023 (đã xác minh) | Thời hạn và phương thức thanh toán | Bắt buộc | MN-03, TT-02, TT-05 |
| khoản 5 Điều 163 Luật Nhà ở 2023 (đã xác minh) | Thời gian giao nhận nhà | Bắt buộc | MN-04, GN-01 |
| khoản 5 Điều 163 Luật Nhà ở 2023 (đã xác minh) | Thời gian bảo hành (nhà xây mới) | Bắt buộc | MN-05, BHN-01 |
| khoản 6 Điều 163 Luật Nhà ở 2023 (đã xác minh) | Quyền và nghĩa vụ của các bên | Bắt buộc | MN-16 |
| khoản 7 Điều 163 Luật Nhà ở 2023 (đã xác minh) | Cam kết của các bên | Bắt buộc | Không kiểm: Nội dung cam kết do các bên tự quyết định, không có tiêu chí khách quan để kiểm tra. |
| khoản 8 Điều 163 Luật Nhà ở 2023 (đã xác minh) | Thoả thuận khác | Bắt buộc | Không kiểm: Nội dung tuỳ các bên. |
| khoản 9 Điều 163 Luật Nhà ở 2023 (đã xác minh) | Thời điểm có hiệu lực | Bắt buộc | MN-11 |
| khoản 10 Điều 163 Luật Nhà ở 2023 (đã xác minh) | Ngày, tháng, năm ký | Bắt buộc | MN-15 |
| khoản 11 Điều 163 Luật Nhà ở 2023 (đã xác minh) | Chữ ký, họ tên, con dấu của các bên | Bắt buộc | Không kiểm: Chữ ký và con dấu không kiểm tra được từ nội dung chữ của văn bản. |
| khoản 1 Điều 164 Luật Nhà ở 2023 (đã xác minh) | Công chứng, chứng thực hợp đồng | Bắt buộc | MN-09 |
| điểm đ khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh) | Bảo lãnh ngân hàng (nhà ở hình thành trong tương lai) | Thông lệ | MN-10 |
| điểm i khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh) | Trách nhiệm do vi phạm hợp đồng | Thông lệ | MN-17 |
| điểm k khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh) | Phạt vi phạm hợp đồng | Thông lệ | MN-17 |
| điểm l khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh) | Các trường hợp chấm dứt hợp đồng | Thông lệ | MN-07, CD-01 |
| điểm m khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh) | Phương thức giải quyết tranh chấp | Thông lệ | MN-08, GQ-01 |

### Phép kiểm

| Mã | Phép kiểm | Khi không đạt | Căn cứ | Điều luật | Áp dụng khi |
|---|---|---|---|---|---|
| TT-01 | Số tiền hoặc cách tính giá phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: Điều 52 Luật Thương mại 2005 (đã xác minh); khi HĐ im lặng: Điều 86 Luật Thương mại 2005 (đã xác minh); khi HĐ im lặng: khoản 2 Điều 473 Bộ luật Dân sự 2015 (đã xác minh); khi HĐ im lặng: khoản 2 Điều 433 Bộ luật Dân sự 2015 (đã xác minh) | — |
| TT-02 | Thời hạn thanh toán phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: Điều 55 Luật Thương mại 2005 (đã xác minh); khi HĐ im lặng: Điều 87 Luật Thương mại 2005 (đã xác minh); khi HĐ im lặng: khoản 1 Điều 481 Bộ luật Dân sự 2015 (đã xác minh); khi HĐ im lặng: khoản 2 Điều 440 Bộ luật Dân sự 2015 (đã xác minh) | — |
| TT-03 | Đồng tiền thanh toán phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| TT-05 | Phương thức thanh toán phải được nêu rõ | Chưa rõ ràng | Thông lệ | khi HĐ im lặng: khoản 2 Điều 433 Bộ luật Dân sự 2015 (đã xác minh) | — |
| TT-06 | Lãi chậm thanh toán không vượt quá 20%/năm | Vi phạm | Điều luật | khoản 2 Điều 357 Bộ luật Dân sự 2015 (đã xác minh); khoản 1 Điều 468 Bộ luật Dân sự 2015 (đã xác minh) | — |
| TT-10 | Lần thanh toán đầu không quá 30% giá trị hợp đồng | Vi phạm | Điều luật | Điều 25 Luật Kinh doanh bất động sản 2023 (đã xác minh) | Bên bán là chủ đầu tư dự án; Nhà ở hình thành trong tương lai |
| TT-11 | Tổng số tiền trả trước khi bàn giao không vượt mức luật định | Vi phạm | Điều luật | Điều 25 Luật Kinh doanh bất động sản 2023 (đã xác minh) | Bên bán là chủ đầu tư dự án; Nhà ở hình thành trong tương lai |
| TT-12 | Chưa có Giấy chứng nhận thì không thu quá 95% giá trị hợp đồng | Vi phạm | Điều luật | Điều 25 Luật Kinh doanh bất động sản 2023 (đã xác minh) | Bên bán là chủ đầu tư dự án; Nhà ở hình thành trong tương lai |
| TT-14 | Giá có thể điều chỉnh thì phải nêu thời điểm và mức điều chỉnh | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| TT-13 | Giá tính theo tỷ lệ phải nêu rõ tỷ lệ đó tính trên khoản nào | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| CD-01 | Các trường hợp được đơn phương chấm dứt phải được nêu rõ | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 1 Điều 428 Bộ luật Dân sự 2015 (đã xác minh) | — |
| CD-02 | Đơn phương chấm dứt phải có thời hạn và cách thông báo | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 2 Điều 428 Bộ luật Dân sự 2015 (đã xác minh) | — |
| CD-03 | Phải nêu rõ cách thanh toán, hoàn trả khi chấm dứt trước hạn | Chưa rõ ràng | Thông lệ | khi HĐ im lặng: khoản 3 Điều 428 Bộ luật Dân sự 2015 (đã xác minh) | — |
| CD-04 | Bên kia được chấm dứt không cần lý do, bên bạn thì không | Nên thương lượng | Khuyến nghị của hệ thống | — | biết người dùng là bên nào |
| PV-01 | Mức phạt phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| PV-02 | Mức phạt theo tỷ lệ phải nêu rõ tính trên giá trị nào | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| PV-03 | Phải nêu rõ vi phạm nào bị phạt | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| PV-04 | Phải nêu rõ ngoài tiền phạt có được đòi bồi thường thiệt hại không | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 2 Điều 307 Luật Thương mại 2005 (đã xác minh); khi HĐ im lặng: khoản 3 Điều 418 Bộ luật Dân sự 2015 (đã xác minh) | — |
| PV-06 | Chỉ bên bạn bị phạt khi vi phạm | Nên thương lượng | Khuyến nghị của hệ thống | — | biết người dùng là bên nào |
| GN-01 | Thời hạn giao hoặc bàn giao phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 3 Điều 37 Luật Thương mại 2005 (đã xác minh); khi HĐ im lặng: khoản 2 Điều 434 Bộ luật Dân sự 2015 (đã xác minh) | — |
| GN-04 | Phải có biên bản bàn giao ghi nhận tình trạng tài sản | Chưa rõ ràng | Thông lệ | — | — |
| DC-01 | Số tiền đặt cọc phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| DC-02 | Phải nêu rõ khi nào tiền cọc được hoàn trả hoặc trừ vào tiền thanh toán | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 2 Điều 328 Bộ luật Dân sự 2015 (đã xác minh) | — |
| DC-03 | Phạt cọc không cân bằng, bất lợi cho bên đặt cọc | Nên thương lượng | Khuyến nghị của hệ thống | khoản 2 Điều 328 Bộ luật Dân sự 2015 (đã xác minh) | người dùng là Bên thuê hoặc Bên mua |
| DC-04 | Chủ đầu tư thu tiền đặt cọc không quá 5% giá bán | Vi phạm | Điều luật | khoản 5 Điều 23 Luật Kinh doanh bất động sản 2023 (đã xác minh) | Bên bán là chủ đầu tư dự án |
| PL-01 | Phải nêu giấy tờ chứng minh quyền bán hoặc cho thuê tài sản | Chưa rõ ràng | Thông lệ | — | — |
| PL-02 | Phải nêu tài sản có đang thế chấp hay tranh chấp không | Chưa rõ ràng | Thông lệ | — | — |
| CQ-01 | Phải nêu rõ ai làm thủ tục cấp Giấy chứng nhận và trong thời hạn nào | Chưa rõ ràng | Thông lệ | — | — |
| BHN-01 | Thời hạn bảo hành phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| BHN-02 | Phải nêu rõ phạm vi và điều kiện được bảo hành | Chưa rõ ràng | Thông lệ | — | — |
| BHN-03 | Phải nêu thời hạn sửa chữa, thay thế khi có yêu cầu bảo hành | Chưa rõ ràng | Thông lệ | khi HĐ im lặng: khoản 2 Điều 49 Luật Thương mại 2005 (đã xác minh) | — |
| BKK-01 | Phải nêu cách và thời hạn thông báo khi gặp sự kiện bất khả kháng | Chưa rõ ràng | Thông lệ | khi HĐ im lặng: khoản 1 Điều 295 Luật Thương mại 2005 (đã xác minh) | — |
| BKK-02 | Phải nêu cách xử lý khi sự kiện bất khả kháng kéo dài | Chưa rõ ràng | Thông lệ | — | — |
| GQ-01 | Phải nêu cơ quan giải quyết tranh chấp | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| GQ-02 | Chọn trọng tài thì phải nêu tên trung tâm trọng tài | Chưa rõ ràng | Thông lệ | — | — |
| MN-01 | Hợp đồng phải có điều khoản về thông tin nhà ở mua bán | Thiếu nội dung | Thông lệ | khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh); khoản 2 Điều 163 Luật Nhà ở 2023 (đã xác minh) | — |
| MN-02 | Hợp đồng phải có điều khoản về tình trạng pháp lý của nhà ở | Thiếu nội dung | Thông lệ | — | — |
| MN-03 | Hợp đồng phải có điều khoản về giá và thanh toán | Thiếu nội dung | Thông lệ | khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh); khoản 4 Điều 163 Luật Nhà ở 2023 (đã xác minh) | — |
| MN-04 | Hợp đồng phải có điều khoản về bàn giao nhà | Thiếu nội dung | Điều luật | khoản 5 Điều 163 Luật Nhà ở 2023 (đã xác minh) | Văn bản là hợp đồng mua bán nhà ở |
| MN-05 | Hợp đồng phải có điều khoản về bảo hành | Thiếu nội dung | Thông lệ | khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh); khoản 5 Điều 163 Luật Nhà ở 2023 (đã xác minh) | Văn bản là hợp đồng mua bán nhà ở |
| MN-06 | Hợp đồng phải có điều khoản về chuyển quyền sở hữu | Thiếu nội dung | Thông lệ | — | Văn bản là hợp đồng mua bán nhà ở |
| MN-07 | Hợp đồng phải có điều khoản về chấm dứt hợp đồng | Thiếu nội dung | Thông lệ | khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh) | — |
| MN-08 | Hợp đồng phải có điều khoản về giải quyết tranh chấp | Thiếu nội dung | Thông lệ | khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh) | — |
| MN-09 | Hợp đồng mua bán nhà ở phải được công chứng hoặc chứng thực | Thiếu nội dung | Điều luật | khoản 1 Điều 164 Luật Nhà ở 2023 (đã xác minh) | Bên bán không kinh doanh bất động sản; Văn bản là hợp đồng mua bán nhà ở |
| MN-10 | Hợp đồng mua nhà hình thành trong tương lai phải có bảo lãnh ngân hàng | Thiếu nội dung | Điều luật | khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh) | Bên bán là chủ đầu tư dự án; Nhà ở hình thành trong tương lai; Văn bản là hợp đồng mua bán nhà ở |
| MN-11 | Hợp đồng phải nêu thời điểm có hiệu lực | Thiếu nội dung | Thông lệ | khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh); khoản 9 Điều 163 Luật Nhà ở 2023 (đã xác minh) | — |
| MN-12 | Hợp đồng phải có nội dung về họ tên, địa chỉ của các bên | Thiếu nội dung | Điều luật | khoản 1 Điều 163 Luật Nhà ở 2023 (đã xác minh) | Văn bản là hợp đồng mua bán nhà ở |
| MN-13 | Hợp đồng phải có nội dung về đặc điểm nhà ở và thửa đất gắn với nhà ở | Thiếu nội dung | Điều luật | khoản 2 Điều 163 Luật Nhà ở 2023 (đã xác minh) | Văn bản là hợp đồng mua bán nhà ở |
| MN-14 | Hợp đồng phải có nội dung về phần sở hữu chung, diện tích căn hộ và kinh phí bảo trì | Thiếu nội dung | Điều luật | khoản 2 Điều 163 Luật Nhà ở 2023 (đã xác minh) | Văn bản là hợp đồng mua bán nhà ở; Nhà ở mua bán là căn hộ chung cư |
| MN-15 | Hợp đồng phải có nội dung về ngày, tháng, năm ký hợp đồng | Thiếu nội dung | Thông lệ | khoản 10 Điều 163 Luật Nhà ở 2023 (đã xác minh) | — |
| MN-16 | Hợp đồng phải có nội dung về quyền và nghĩa vụ của các bên | Thiếu nội dung | Thông lệ | khoản 6 Điều 163 Luật Nhà ở 2023 (đã xác minh); khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh) | — |
| MN-17 | Hợp đồng phải có nội dung về trách nhiệm do vi phạm hợp đồng | Thiếu nội dung | Thông lệ | khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh) | — |

## Bảo hiểm nhân thọ

### Nội dung bắt buộc

| Căn cứ | Nội dung | Mức độ | Phép kiểm |
|---|---|---|---|
| điểm a khoản 1 Điều 17 Luật Kinh doanh bảo hiểm 2022 (đã xác minh) | Bên mua bảo hiểm, người được bảo hiểm, người thụ hưởng, doanh nghiệp bảo hiểm | Bắt buộc | NT-12 |
| điểm b khoản 1 Điều 17 Luật Kinh doanh bảo hiểm 2022 (đã xác minh) | Đối tượng bảo hiểm | Bắt buộc | NT-01 |
| điểm c khoản 1 Điều 17 Luật Kinh doanh bảo hiểm 2022 (đã xác minh) | Số tiền bảo hiểm | Bắt buộc | NT-13 |
| điểm d khoản 1 Điều 17 Luật Kinh doanh bảo hiểm 2022 (đã xác minh) | Phạm vi, quyền lợi bảo hiểm | Bắt buộc | NT-02 |
| điểm d khoản 1 Điều 17 Luật Kinh doanh bảo hiểm 2022 (đã xác minh) | Quy tắc, điều kiện, điều khoản bảo hiểm | Bắt buộc | NT-14 |
| điểm đ khoản 1 Điều 17 Luật Kinh doanh bảo hiểm 2022 (đã xác minh) | Quyền và nghĩa vụ của các bên | Bắt buộc | NT-15 |
| điểm e khoản 1 Điều 17 Luật Kinh doanh bảo hiểm 2022 (đã xác minh) | Thời hạn bảo hiểm | Bắt buộc | NT-03 |
| điểm e khoản 1 Điều 17 Luật Kinh doanh bảo hiểm 2022 (đã xác minh) | Thời điểm có hiệu lực | Bắt buộc | NT-16 |
| điểm g khoản 1 Điều 17 Luật Kinh doanh bảo hiểm 2022 (đã xác minh) | Mức phí, phương thức đóng phí | Bắt buộc | NT-04 |
| điểm h khoản 1 Điều 17 Luật Kinh doanh bảo hiểm 2022 (đã xác minh) | Phương thức trả tiền bảo hiểm | Bắt buộc | NT-05 |
| điểm i khoản 1 Điều 17 Luật Kinh doanh bảo hiểm 2022 (đã xác minh) | Phương thức giải quyết tranh chấp | Bắt buộc | NT-09, GQ-01 |

### Phép kiểm

| Mã | Phép kiểm | Khi không đạt | Căn cứ | Điều luật | Áp dụng khi |
|---|---|---|---|---|---|
| LT-01 | Các trường hợp loại trừ phải được liệt kê cụ thể | Chưa rõ ràng | Tiêu chí rõ ràng | khoản 2 Điều 19 Luật Kinh doanh bảo hiểm 2022 (đã xác minh) | — |
| LT-02 | Phải có xác nhận bên mua bảo hiểm đã được giải thích điều khoản loại trừ | Thiếu nội dung | Điều luật | khoản 2 Điều 19 Luật Kinh doanh bảo hiểm 2022 (đã xác minh) | — |
| BT-01 | Phải nêu thời hạn doanh nghiệp bảo hiểm trả tiền | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 1 Điều 31 Luật Kinh doanh bảo hiểm 2022 (đã xác minh) | — |
| BT-02 | Phải liệt kê hồ sơ cần nộp khi yêu cầu trả tiền bảo hiểm | Chưa rõ ràng | Thông lệ | — | — |
| GQ-01 | Phải nêu cơ quan giải quyết tranh chấp | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| NT-12 | Hợp đồng phải có nội dung về bên mua bảo hiểm, người được bảo hiểm và doanh nghiệp bảo hiểm | Thiếu nội dung | Điều luật | khoản 1 Điều 17 Luật Kinh doanh bảo hiểm 2022 (đã xác minh) | — |
| NT-13 | Hợp đồng phải có nội dung về số tiền bảo hiểm | Thiếu nội dung | Điều luật | khoản 1 Điều 17 Luật Kinh doanh bảo hiểm 2022 (đã xác minh) | — |
| NT-14 | Hợp đồng phải có nội dung về quy tắc, điều kiện, điều khoản bảo hiểm | Thiếu nội dung | Điều luật | khoản 1 Điều 17 Luật Kinh doanh bảo hiểm 2022 (đã xác minh) | — |
| NT-15 | Hợp đồng phải có nội dung về quyền và nghĩa vụ của doanh nghiệp bảo hiểm và bên mua bảo hiểm | Thiếu nội dung | Điều luật | khoản 1 Điều 17 Luật Kinh doanh bảo hiểm 2022 (đã xác minh) | — |
| NT-16 | Hợp đồng phải có nội dung về thời điểm có hiệu lực | Thiếu nội dung | Điều luật | khoản 1 Điều 17 Luật Kinh doanh bảo hiểm 2022 (đã xác minh) | — |
| NT-01 | Hợp đồng phải có điều khoản về đối tượng bảo hiểm | Thiếu nội dung | Điều luật | khoản 1 Điều 17 Luật Kinh doanh bảo hiểm 2022 (đã xác minh) | — |
| NT-02 | Hợp đồng phải có điều khoản về phạm vi, quyền lợi bảo hiểm | Thiếu nội dung | Điều luật | khoản 1 Điều 17 Luật Kinh doanh bảo hiểm 2022 (đã xác minh) | — |
| NT-03 | Hợp đồng phải có điều khoản về thời hạn bảo hiểm | Thiếu nội dung | Điều luật | khoản 1 Điều 17 Luật Kinh doanh bảo hiểm 2022 (đã xác minh) | — |
| NT-04 | Hợp đồng phải có điều khoản về phí bảo hiểm | Thiếu nội dung | Điều luật | khoản 1 Điều 17 Luật Kinh doanh bảo hiểm 2022 (đã xác minh) | — |
| NT-05 | Hợp đồng phải có điều khoản về phương thức trả tiền bảo hiểm | Thiếu nội dung | Điều luật | khoản 1 Điều 17 Luật Kinh doanh bảo hiểm 2022 (đã xác minh) | — |
| NT-06 | Hợp đồng phải có điều khoản về điều khoản loại trừ | Thiếu nội dung | Thông lệ | — | — |
| NT-07 | Hợp đồng phải có điều khoản về giá trị hoàn lại | Thiếu nội dung | Thông lệ | — | — |
| NT-08 | Hợp đồng phải có điều khoản về chấm dứt hợp đồng | Thiếu nội dung | Thông lệ | — | — |
| NT-09 | Hợp đồng phải có điều khoản về giải quyết tranh chấp | Thiếu nội dung | Điều luật | khoản 1 Điều 17 Luật Kinh doanh bảo hiểm 2022 (đã xác minh) | — |
| NT-10 | Thời gian cân nhắc ít nhất 21 ngày | Vi phạm | Điều luật | Điều 35 Luật Kinh doanh bảo hiểm 2022 (đã xác minh) | Hợp đồng bảo hiểm có thời hạn trên 01 năm |
| NT-11 | Thời gian gia hạn đóng phí ít nhất 60 ngày | Vi phạm | Điều luật | khoản 2 Điều 37 Luật Kinh doanh bảo hiểm 2022 (đã xác minh) | — |

## Kiểm tra toàn văn (mọi loại hợp đồng)

| Mã | Kiểm tra | Khi không đạt | Tiêu chí |
|---|---|---|---|
| VB-01 | Còn chỗ trống chưa điền | Lỗi soạn thảo | Hợp đồng ký kết không được còn chỗ trống chờ điền thông tin. |
| VB-02 | Dẫn chiếu đến điều khoản không tồn tại | Lỗi soạn thảo | Điều khoản được dẫn chiếu phải có trong hợp đồng. |
| VB-03 | Dẫn chiếu đến phụ lục không có trong tài liệu | Lỗi soạn thảo | Phụ lục được dẫn chiếu là một phần của hợp đồng và cần được đính kèm. |
| VB-04 | Số tiền bằng số và bằng chữ không khớp | Lỗi soạn thảo | Số tiền ghi bằng số và bằng chữ phải giống nhau. |
| VB-05 | Dùng từ ngữ không xác định được | Chưa rõ ràng | Thời hạn, mức độ và nghĩa vụ phải đo hoặc kiểm chứng được, không dùng từ ngữ để ngỏ cách hiểu. |
| VB-06 | Cùng một nội dung nhưng ghi khác nhau | Chưa rõ ràng | Một nội dung chỉ được có một giá trị trong toàn bộ hợp đồng. |

## Phép kiểm chưa áp dụng

| Mã | Phép kiểm | Trạng thái | Lý do |
|---|---|---|---|
| TT-07 | Lãi chậm thanh toán trong hợp đồng thương mại không vượt quá 20%/năm | rejected | Không dùng làm phép kiểm Vi phạm. Điều 306 LTM dẫn chiếu lãi suất nợ quá hạn trung bình trên thị trường và cho phép thoả thuận khác; việc trần 20%/năm của BLDS có áp dụng cho lãi chậm trả trong hợp đồng thương mại hay không chưa có cách hiểu thống nhất (rule cũ tự ghi là "cách áp dụng phổ biến"). |
| CD-05 | Người lao động không bị buộc báo trước lâu hơn mức luật định | draft | Điều 35 quy định mức báo trước tối thiểu mà người lao động phải tuân thủ ("ít nhất"), không trực tiếp cấm hợp đồng yêu cầu báo trước lâu hơn; việc kết luận "Vi phạm" cần thêm căn cứ (ví dụ nguyên tắc thoả thuận không được bất lợi hơn luật cho người lao động). Mức 03 ngày tính theo ngày làm việc. Chưa duyệt cho đến khi có căn cứ rõ hơn; nếu không có, chuyển sang nhóm Cân bằng. |
| BT-03 | Thời hạn nộp hồ sơ yêu cầu không ngắn hơn 01 năm | draft | Cần xác minh khoản 1 Điều 30 là thời hạn bắt buộc hay các bên được thoả thuận khác; câu chữ "theo hợp đồng bảo hiểm là 01 năm" chưa đủ rõ để tự kết luận Vi phạm. |
