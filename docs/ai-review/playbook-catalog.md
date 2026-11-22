# Danh mục phép kiểm của playbook 1.2.0

Tài liệu này được sinh tự động từ mã nguồn playbook bằng `npm run docs:playbook` (thư mục `backend`), ngày 2026-11-22. Không sửa tay; sửa playbook rồi chạy lại lệnh.

## Tổng quan

- 142 phép kiểm trong 27 bộ; **139 đang áp dụng**, 3 chưa áp dụng (nháp hoặc bị loại).
- 6 kiểm tra toàn văn bằng code, áp dụng cho mọi hợp đồng.
- **120/120 trích dẫn điều luật** đã được xác minh trong kho luật: văn bản còn hiệu lực, đúng điều, đúng câu neo.
- Một phép kiểm chỉ kết luận "Vi phạm" khi điều luật và điều kiện áp dụng đều đã xác minh; nếu không thì kết quả là "Chưa xác minh được".

| Kết quả khi không đạt | Số phép kiểm |
|---|---|
| Chưa rõ ràng | 50 |
| Vi phạm | 31 |
| Nên thương lượng | 8 |
| Thiếu nội dung | 50 |

| Căn cứ | Số phép kiểm |
|---|---|
| Tiêu chí rõ ràng | 35 |
| Thông lệ | 48 |
| Điều luật | 48 |
| Khuyến nghị của hệ thống | 8 |

## Số phép kiểm theo loại hợp đồng

| Loại hợp đồng | Phép kiểm áp dụng | Trong đó dựa trên điều luật |
|---|---|---|
| Mua bán hàng hoá | 41 | 2 |
| Cung ứng dịch vụ | 40 | 2 |
| Thuê văn phòng, mặt bằng | 44 | 2 |
| Hợp đồng lao động | 43 | 30 |
| Đặt cọc, mua bán nhà ở | 46 | 7 |
| Bảo hiểm nhân thọ | 16 | 9 |

## Mua bán hàng hoá

| Mã | Phép kiểm | Khi không đạt | Căn cứ | Điều luật | Áp dụng khi |
|---|---|---|---|---|---|
| TT-01 | Số tiền hoặc cách tính giá phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: Điều 52 Luật Thương mại 2005 (đã xác minh) | — |
| TT-02 | Thời hạn thanh toán phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: Điều 55 Luật Thương mại 2005 (đã xác minh) | — |
| TT-03 | Đồng tiền thanh toán phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| TT-04 | Giá phải ghi rõ đã hay chưa bao gồm thuế GTGT | Chưa rõ ràng | Thông lệ | — | — |
| TT-05 | Phương thức thanh toán phải được nêu rõ | Chưa rõ ràng | Thông lệ | khi HĐ im lặng: khoản 2 Điều 433 Bộ luật Dân sự 2015 (đã xác minh) | — |
| TT-08 | Không ghi giá hoặc thanh toán bằng ngoại tệ | Vi phạm | Điều luật | Điều 22 Pháp lệnh Ngoại hối 2005 (đã xác minh) | Không thuộc trường hợp được dùng ngoại hối |
| TT-09 | Trả trước quá nửa giá trị mà không có bảo đảm hoàn trả | Nên thương lượng | Khuyến nghị của hệ thống | — | người dùng là buyer hoặc client |
| TT-14 | Giá có thể điều chỉnh thì phải nêu thời điểm và mức điều chỉnh | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| TT-13 | Giá tính theo tỷ lệ phải nêu rõ tỷ lệ đó tính trên khoản nào | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| CD-01 | Các trường hợp được đơn phương chấm dứt phải được nêu rõ | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 1 Điều 428 Bộ luật Dân sự 2015 (đã xác minh) | — |
| CD-02 | Đơn phương chấm dứt phải có thời hạn và cách thông báo | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 2 Điều 428 Bộ luật Dân sự 2015 (đã xác minh) | — |
| CD-03 | Phải nêu rõ cách thanh toán, hoàn trả khi chấm dứt trước hạn | Chưa rõ ràng | Thông lệ | khi HĐ im lặng: khoản 3 Điều 428 Bộ luật Dân sự 2015 (đã xác minh) | — |
| CD-04 | Bên kia được chấm dứt không cần lý do, bên bạn thì không | Nên thương lượng | Khuyến nghị của hệ thống | — | — |
| PV-01 | Mức phạt phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| PV-02 | Mức phạt theo tỷ lệ phải nêu rõ tính trên giá trị nào | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| PV-03 | Phải nêu rõ vi phạm nào bị phạt | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| PV-04 | Phải nêu rõ ngoài tiền phạt có được đòi bồi thường thiệt hại không | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 2 Điều 307 Luật Thương mại 2005 (đã xác minh) | — |
| PV-05 | Mức phạt trong hợp đồng thương mại không quá 8% | Vi phạm | Điều luật | Điều 301 Luật Thương mại 2005 (đã xác minh) | Hợp đồng thương mại |
| PV-06 | Chỉ bên bạn bị phạt khi vi phạm | Nên thương lượng | Khuyến nghị của hệ thống | — | — |
| GN-01 | Thời hạn giao hoặc bàn giao phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 3 Điều 37 Luật Thương mại 2005 (đã xác minh) | — |
| GN-02 | Địa điểm giao hàng phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 2 Điều 35 Luật Thương mại 2005 (đã xác minh) | — |
| GN-03 | Phải nêu rõ cách kiểm tra, nghiệm thu | Chưa rõ ràng | Thông lệ | — | — |
| GN-05 | Phải nêu thời hạn khiếu nại về số lượng, chất lượng hàng hoá | Chưa rõ ràng | Thông lệ | khi HĐ im lặng: Điều 318 Luật Thương mại 2005 (đã xác minh) | — |
| DT-01 | Số lượng hàng hoá phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | khoản 1 Điều 34 Luật Thương mại 2005 (đã xác minh) | — |
| DT-02 | Chất lượng, quy cách hàng hoá phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | khoản 1 Điều 34 Luật Thương mại 2005 (đã xác minh) | — |
| BHN-01 | Thời hạn bảo hành phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| BHN-02 | Phải nêu rõ phạm vi và điều kiện được bảo hành | Chưa rõ ràng | Thông lệ | — | — |
| BHN-03 | Phải nêu thời hạn sửa chữa, thay thế khi có yêu cầu bảo hành | Chưa rõ ràng | Thông lệ | khi HĐ im lặng: khoản 2 Điều 49 Luật Thương mại 2005 (đã xác minh) | — |
| BHN-04 | Bên mua phải chịu chi phí bảo hành | Nên thương lượng | Khuyến nghị của hệ thống | khoản 3 Điều 49 Luật Thương mại 2005 (đã xác minh) | người dùng là buyer |
| BM-01 | Phạm vi thông tin phải bảo mật phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| BM-02 | Thời hạn nghĩa vụ bảo mật phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| BKK-01 | Phải nêu cách và thời hạn thông báo khi gặp sự kiện bất khả kháng | Chưa rõ ràng | Thông lệ | khi HĐ im lặng: khoản 1 Điều 295 Luật Thương mại 2005 (đã xác minh) | — |
| BKK-02 | Phải nêu cách xử lý khi sự kiện bất khả kháng kéo dài | Chưa rõ ràng | Thông lệ | — | — |
| GQ-01 | Phải nêu cơ quan giải quyết tranh chấp | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| GQ-02 | Chọn trọng tài thì phải nêu tên trung tâm trọng tài | Chưa rõ ràng | Thông lệ | — | — |
| MB-01 | Hợp đồng phải có điều khoản về hàng hoá, số lượng, chất lượng | Thiếu nội dung | Thông lệ | khoản 2 Điều 398 Bộ luật Dân sự 2015 (đã xác minh) | — |
| MB-02 | Hợp đồng phải có điều khoản về giá và thanh toán | Thiếu nội dung | Thông lệ | khoản 2 Điều 398 Bộ luật Dân sự 2015 (đã xác minh) | — |
| MB-03 | Hợp đồng phải có điều khoản về giao nhận hàng hoá | Thiếu nội dung | Thông lệ | khoản 2 Điều 398 Bộ luật Dân sự 2015 (đã xác minh) | — |
| MB-04 | Hợp đồng phải có điều khoản về bảo hành | Thiếu nội dung | Thông lệ | — | — |
| MB-05 | Hợp đồng phải có điều khoản về chấm dứt hợp đồng | Thiếu nội dung | Thông lệ | — | — |
| MB-06 | Hợp đồng phải có điều khoản về giải quyết tranh chấp | Thiếu nội dung | Thông lệ | khoản 2 Điều 398 Bộ luật Dân sự 2015 (đã xác minh) | — |

## Cung ứng dịch vụ

| Mã | Phép kiểm | Khi không đạt | Căn cứ | Điều luật | Áp dụng khi |
|---|---|---|---|---|---|
| TT-01 | Số tiền hoặc cách tính giá phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: Điều 86 Luật Thương mại 2005 (đã xác minh) | — |
| TT-02 | Thời hạn thanh toán phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: Điều 87 Luật Thương mại 2005 (đã xác minh) | — |
| TT-03 | Đồng tiền thanh toán phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| TT-04 | Giá phải ghi rõ đã hay chưa bao gồm thuế GTGT | Chưa rõ ràng | Thông lệ | — | — |
| TT-05 | Phương thức thanh toán phải được nêu rõ | Chưa rõ ràng | Thông lệ | — | — |
| TT-08 | Không ghi giá hoặc thanh toán bằng ngoại tệ | Vi phạm | Điều luật | Điều 22 Pháp lệnh Ngoại hối 2005 (đã xác minh) | Không thuộc trường hợp được dùng ngoại hối |
| TT-09 | Trả trước quá nửa giá trị mà không có bảo đảm hoàn trả | Nên thương lượng | Khuyến nghị của hệ thống | — | người dùng là buyer hoặc client |
| TT-14 | Giá có thể điều chỉnh thì phải nêu thời điểm và mức điều chỉnh | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| TT-13 | Giá tính theo tỷ lệ phải nêu rõ tỷ lệ đó tính trên khoản nào | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| TH-01 | Thời điểm bắt đầu phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 1 Điều 401 Bộ luật Dân sự 2015 (đã xác minh) | — |
| TH-02 | Thời hạn hoặc thời điểm kết thúc phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| TH-03 | Tự động gia hạn mà không nêu cách từ chối gia hạn | Nên thương lượng | Khuyến nghị của hệ thống | — | — |
| CD-01 | Các trường hợp được đơn phương chấm dứt phải được nêu rõ | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 1 Điều 428 Bộ luật Dân sự 2015 (đã xác minh) | — |
| CD-02 | Đơn phương chấm dứt phải có thời hạn và cách thông báo | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 2 Điều 428 Bộ luật Dân sự 2015 (đã xác minh) | — |
| CD-03 | Phải nêu rõ cách thanh toán, hoàn trả khi chấm dứt trước hạn | Chưa rõ ràng | Thông lệ | khi HĐ im lặng: khoản 3 Điều 428 Bộ luật Dân sự 2015 (đã xác minh) | — |
| CD-04 | Bên kia được chấm dứt không cần lý do, bên bạn thì không | Nên thương lượng | Khuyến nghị của hệ thống | — | — |
| PV-01 | Mức phạt phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| PV-02 | Mức phạt theo tỷ lệ phải nêu rõ tính trên giá trị nào | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| PV-03 | Phải nêu rõ vi phạm nào bị phạt | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| PV-04 | Phải nêu rõ ngoài tiền phạt có được đòi bồi thường thiệt hại không | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 2 Điều 307 Luật Thương mại 2005 (đã xác minh) | — |
| PV-05 | Mức phạt trong hợp đồng thương mại không quá 8% | Vi phạm | Điều luật | Điều 301 Luật Thương mại 2005 (đã xác minh) | Hợp đồng thương mại |
| PV-06 | Chỉ bên bạn bị phạt khi vi phạm | Nên thương lượng | Khuyến nghị của hệ thống | — | — |
| GN-01 | Thời hạn giao hoặc bàn giao phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| GN-03 | Phải nêu rõ cách kiểm tra, nghiệm thu | Chưa rõ ràng | Thông lệ | — | — |
| DT-03 | Kết quả hoặc tiêu chuẩn của dịch vụ phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| BHN-01 | Thời hạn bảo hành phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| BHN-02 | Phải nêu rõ phạm vi và điều kiện được bảo hành | Chưa rõ ràng | Thông lệ | — | — |
| BHN-03 | Phải nêu thời hạn sửa chữa, thay thế khi có yêu cầu bảo hành | Chưa rõ ràng | Thông lệ | — | — |
| BM-01 | Phạm vi thông tin phải bảo mật phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| BM-02 | Thời hạn nghĩa vụ bảo mật phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| BKK-01 | Phải nêu cách và thời hạn thông báo khi gặp sự kiện bất khả kháng | Chưa rõ ràng | Thông lệ | khi HĐ im lặng: khoản 1 Điều 295 Luật Thương mại 2005 (đã xác minh) | — |
| BKK-02 | Phải nêu cách xử lý khi sự kiện bất khả kháng kéo dài | Chưa rõ ràng | Thông lệ | — | — |
| GQ-01 | Phải nêu cơ quan giải quyết tranh chấp | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| GQ-02 | Chọn trọng tài thì phải nêu tên trung tâm trọng tài | Chưa rõ ràng | Thông lệ | — | — |
| DV-01 | Hợp đồng phải có điều khoản về phạm vi công việc, dịch vụ | Thiếu nội dung | Thông lệ | khoản 2 Điều 398 Bộ luật Dân sự 2015 (đã xác minh) | — |
| DV-02 | Hợp đồng phải có điều khoản về giá và thanh toán | Thiếu nội dung | Thông lệ | khoản 2 Điều 398 Bộ luật Dân sự 2015 (đã xác minh) | — |
| DV-03 | Hợp đồng phải có điều khoản về thời hạn hợp đồng | Thiếu nội dung | Thông lệ | khoản 2 Điều 398 Bộ luật Dân sự 2015 (đã xác minh) | — |
| DV-04 | Hợp đồng phải có điều khoản về bàn giao, nghiệm thu kết quả | Thiếu nội dung | Thông lệ | khoản 2 Điều 398 Bộ luật Dân sự 2015 (đã xác minh) | — |
| DV-05 | Hợp đồng phải có điều khoản về chấm dứt hợp đồng | Thiếu nội dung | Thông lệ | — | — |
| DV-06 | Hợp đồng phải có điều khoản về giải quyết tranh chấp | Thiếu nội dung | Thông lệ | khoản 2 Điều 398 Bộ luật Dân sự 2015 (đã xác minh) | — |

## Thuê văn phòng, mặt bằng

| Mã | Phép kiểm | Khi không đạt | Căn cứ | Điều luật | Áp dụng khi |
|---|---|---|---|---|---|
| TT-01 | Số tiền hoặc cách tính giá phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 2 Điều 473 Bộ luật Dân sự 2015 (đã xác minh) | — |
| TT-02 | Thời hạn thanh toán phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 1 Điều 481 Bộ luật Dân sự 2015 (đã xác minh) | — |
| TT-03 | Đồng tiền thanh toán phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| TT-04 | Giá phải ghi rõ đã hay chưa bao gồm thuế GTGT | Chưa rõ ràng | Thông lệ | — | — |
| TT-05 | Phương thức thanh toán phải được nêu rõ | Chưa rõ ràng | Thông lệ | — | — |
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
| CD-04 | Bên kia được chấm dứt không cần lý do, bên bạn thì không | Nên thương lượng | Khuyến nghị của hệ thống | — | — |
| PV-01 | Mức phạt phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| PV-02 | Mức phạt theo tỷ lệ phải nêu rõ tính trên giá trị nào | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| PV-03 | Phải nêu rõ vi phạm nào bị phạt | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| PV-04 | Phải nêu rõ ngoài tiền phạt có được đòi bồi thường thiệt hại không | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 3 Điều 418 Bộ luật Dân sự 2015 (đã xác minh) | — |
| PV-06 | Chỉ bên bạn bị phạt khi vi phạm | Nên thương lượng | Khuyến nghị của hệ thống | — | — |
| GN-01 | Thời hạn giao hoặc bàn giao phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| GN-04 | Phải có biên bản bàn giao ghi nhận tình trạng tài sản | Chưa rõ ràng | Thông lệ | — | — |
| DC-01 | Số tiền đặt cọc phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| DC-02 | Phải nêu rõ khi nào tiền cọc được hoàn trả hoặc trừ vào tiền thanh toán | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 2 Điều 328 Bộ luật Dân sự 2015 (đã xác minh) | — |
| DC-03 | Phạt cọc không cân bằng, bất lợi cho bên đặt cọc | Nên thương lượng | Khuyến nghị của hệ thống | khoản 2 Điều 328 Bộ luật Dân sự 2015 (đã xác minh) | người dùng là lessee hoặc buyer |
| SC-01 | Phải nêu rõ bên nào sửa chữa hư hỏng nào và ai chịu chi phí | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 1 Điều 477 Bộ luật Dân sự 2015 (đã xác minh) | — |
| CL-01 | Phải nêu rõ bên thuê có được cho thuê lại hay không | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: Điều 475 Bộ luật Dân sự 2015 (đã xác minh) | — |
| PL-01 | Phải nêu giấy tờ chứng minh quyền bán hoặc cho thuê tài sản | Chưa rõ ràng | Thông lệ | — | — |
| PL-02 | Phải nêu tài sản có đang thế chấp hay tranh chấp không | Chưa rõ ràng | Thông lệ | — | — |
| DT-05 | Mục đích sử dụng mặt bằng thuê phải được nêu rõ | Chưa rõ ràng | Tiêu chí rõ ràng | khoản 1 Điều 480 Bộ luật Dân sự 2015 (đã xác minh) | — |
| BKK-01 | Phải nêu cách và thời hạn thông báo khi gặp sự kiện bất khả kháng | Chưa rõ ràng | Thông lệ | — | — |
| BKK-02 | Phải nêu cách xử lý khi sự kiện bất khả kháng kéo dài | Chưa rõ ràng | Thông lệ | — | — |
| GQ-01 | Phải nêu cơ quan giải quyết tranh chấp | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| GQ-02 | Chọn trọng tài thì phải nêu tên trung tâm trọng tài | Chưa rõ ràng | Thông lệ | — | — |
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

| Mã | Phép kiểm | Khi không đạt | Căn cứ | Điều luật | Áp dụng khi |
|---|---|---|---|---|---|
| TH-01 | Thời điểm bắt đầu phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| TH-02 | Thời hạn hoặc thời điểm kết thúc phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
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
| BH-01 | Không được thoả thuận bỏ bảo hiểm xã hội bắt buộc | Vi phạm | Điều luật | khoản 1 Điều 168 Bộ luật Lao động 2019 (đã xác minh) | Người lao động thuộc diện bảo hiểm xã hội bắt buộc |
| DT-04 | Công việc và địa điểm làm việc phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | khoản 1 Điều 21 Bộ luật Lao động 2019 (đã xác minh) | — |
| BM-01 | Phạm vi thông tin phải bảo mật phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| BM-02 | Thời hạn nghĩa vụ bảo mật phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| BM-03 | Hạn chế làm việc cho đối thủ sau khi nghỉ việc mà không có quyền lợi bù đắp | Nên thương lượng | Khuyến nghị của hệ thống | khoản 2 Điều 21 Bộ luật Lao động 2019 (đã xác minh) | người dùng là employee |
| GQ-01 | Phải nêu cơ quan giải quyết tranh chấp | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
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
| LD-14 | Thời hạn người lao động phải báo trước không dài hơn mức luật quy định | Nên thương lượng | Khuyến nghị của hệ thống | khoản 1 Điều 35 Bộ luật Lao động 2019 (đã xác minh) | người dùng là employee |
| LD-15 | Thời hạn thanh toán khi chấm dứt hợp đồng không quá 30 ngày | Vi phạm | Điều luật | khoản 1 Điều 48 Bộ luật Lao động 2019 (đã xác minh) | — |
| LD-16 | Tiền lương làm thêm giờ vào ngày thường ít nhất 150% | Vi phạm | Điều luật | khoản 1 Điều 98 Bộ luật Lao động 2019 (đã xác minh) | — |
| LD-17 | Tiền lương làm thêm giờ vào ngày nghỉ hằng tuần ít nhất 200% | Vi phạm | Điều luật | khoản 1 Điều 98 Bộ luật Lao động 2019 (đã xác minh) | — |
| LD-18 | Tiền lương làm thêm giờ vào ngày nghỉ lễ, Tết ít nhất 300% | Vi phạm | Điều luật | khoản 1 Điều 98 Bộ luật Lao động 2019 (đã xác minh) | — |
| LD-19 | Không được buộc người lao động làm việc để trả nợ | Vi phạm | Điều luật | khoản 3 Điều 17 Bộ luật Lao động 2019 (đã xác minh) | — |

## Đặt cọc, mua bán nhà ở

| Mã | Phép kiểm | Khi không đạt | Căn cứ | Điều luật | Áp dụng khi |
|---|---|---|---|---|---|
| TT-01 | Số tiền hoặc cách tính giá phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 2 Điều 433 Bộ luật Dân sự 2015 (đã xác minh) | — |
| TT-02 | Thời hạn thanh toán phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 2 Điều 440 Bộ luật Dân sự 2015 (đã xác minh) | — |
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
| CD-04 | Bên kia được chấm dứt không cần lý do, bên bạn thì không | Nên thương lượng | Khuyến nghị của hệ thống | — | — |
| PV-01 | Mức phạt phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| PV-02 | Mức phạt theo tỷ lệ phải nêu rõ tính trên giá trị nào | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| PV-03 | Phải nêu rõ vi phạm nào bị phạt | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| PV-04 | Phải nêu rõ ngoài tiền phạt có được đòi bồi thường thiệt hại không | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 3 Điều 418 Bộ luật Dân sự 2015 (đã xác minh) | — |
| PV-06 | Chỉ bên bạn bị phạt khi vi phạm | Nên thương lượng | Khuyến nghị của hệ thống | — | — |
| GN-01 | Thời hạn giao hoặc bàn giao phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 2 Điều 434 Bộ luật Dân sự 2015 (đã xác minh) | — |
| GN-04 | Phải có biên bản bàn giao ghi nhận tình trạng tài sản | Chưa rõ ràng | Thông lệ | — | — |
| DC-01 | Số tiền đặt cọc phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| DC-02 | Phải nêu rõ khi nào tiền cọc được hoàn trả hoặc trừ vào tiền thanh toán | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 2 Điều 328 Bộ luật Dân sự 2015 (đã xác minh) | — |
| DC-03 | Phạt cọc không cân bằng, bất lợi cho bên đặt cọc | Nên thương lượng | Khuyến nghị của hệ thống | khoản 2 Điều 328 Bộ luật Dân sự 2015 (đã xác minh) | người dùng là lessee hoặc buyer |
| DC-04 | Chủ đầu tư thu tiền đặt cọc không quá 5% giá bán | Vi phạm | Điều luật | khoản 5 Điều 23 Luật Kinh doanh bất động sản 2023 (đã xác minh) | Bên bán là chủ đầu tư dự án |
| PL-01 | Phải nêu giấy tờ chứng minh quyền bán hoặc cho thuê tài sản | Chưa rõ ràng | Thông lệ | — | — |
| PL-02 | Phải nêu tài sản có đang thế chấp hay tranh chấp không | Chưa rõ ràng | Thông lệ | — | — |
| CQ-01 | Phải nêu rõ ai làm thủ tục cấp Giấy chứng nhận và trong thời hạn nào | Chưa rõ ràng | Thông lệ | — | — |
| BHN-01 | Thời hạn bảo hành phải xác định được | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| BHN-02 | Phải nêu rõ phạm vi và điều kiện được bảo hành | Chưa rõ ràng | Thông lệ | — | — |
| BHN-03 | Phải nêu thời hạn sửa chữa, thay thế khi có yêu cầu bảo hành | Chưa rõ ràng | Thông lệ | — | — |
| BKK-01 | Phải nêu cách và thời hạn thông báo khi gặp sự kiện bất khả kháng | Chưa rõ ràng | Thông lệ | — | — |
| BKK-02 | Phải nêu cách xử lý khi sự kiện bất khả kháng kéo dài | Chưa rõ ràng | Thông lệ | — | — |
| GQ-01 | Phải nêu cơ quan giải quyết tranh chấp | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
| GQ-02 | Chọn trọng tài thì phải nêu tên trung tâm trọng tài | Chưa rõ ràng | Thông lệ | — | — |
| MN-01 | Hợp đồng phải có điều khoản về thông tin nhà ở mua bán | Thiếu nội dung | Thông lệ | khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh) | — |
| MN-02 | Hợp đồng phải có điều khoản về tình trạng pháp lý của nhà ở | Thiếu nội dung | Thông lệ | — | — |
| MN-03 | Hợp đồng phải có điều khoản về giá và thanh toán | Thiếu nội dung | Thông lệ | khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh) | — |
| MN-04 | Hợp đồng phải có điều khoản về bàn giao nhà | Thiếu nội dung | Thông lệ | khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh) | — |
| MN-05 | Hợp đồng phải có điều khoản về bảo hành | Thiếu nội dung | Thông lệ | khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh) | — |
| MN-06 | Hợp đồng phải có điều khoản về chuyển quyền sở hữu | Thiếu nội dung | Thông lệ | — | — |
| MN-07 | Hợp đồng phải có điều khoản về chấm dứt hợp đồng | Thiếu nội dung | Thông lệ | khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh) | — |
| MN-08 | Hợp đồng phải có điều khoản về giải quyết tranh chấp | Thiếu nội dung | Thông lệ | khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh) | — |
| MN-09 | Hợp đồng mua bán nhà ở phải được công chứng hoặc chứng thực | Thiếu nội dung | Điều luật | khoản 1 Điều 164 Luật Nhà ở 2023 (đã xác minh) | Bên bán không kinh doanh bất động sản |
| MN-10 | Hợp đồng mua nhà hình thành trong tương lai phải có bảo lãnh ngân hàng | Thiếu nội dung | Điều luật | khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh) | Bên bán là chủ đầu tư dự án; Nhà ở hình thành trong tương lai |
| MN-11 | Hợp đồng phải nêu thời điểm có hiệu lực | Thiếu nội dung | Thông lệ | khoản 1 Điều 46 Luật Kinh doanh bất động sản 2023 (đã xác minh) | — |

## Bảo hiểm nhân thọ

| Mã | Phép kiểm | Khi không đạt | Căn cứ | Điều luật | Áp dụng khi |
|---|---|---|---|---|---|
| LT-01 | Các trường hợp loại trừ phải được liệt kê cụ thể | Chưa rõ ràng | Tiêu chí rõ ràng | khoản 2 Điều 19 Luật Kinh doanh bảo hiểm 2022 (đã xác minh) | — |
| LT-02 | Phải có xác nhận bên mua bảo hiểm đã được giải thích điều khoản loại trừ | Thiếu nội dung | Điều luật | khoản 2 Điều 19 Luật Kinh doanh bảo hiểm 2022 (đã xác minh) | — |
| BT-01 | Phải nêu thời hạn doanh nghiệp bảo hiểm trả tiền | Chưa rõ ràng | Tiêu chí rõ ràng | khi HĐ im lặng: khoản 1 Điều 31 Luật Kinh doanh bảo hiểm 2022 (đã xác minh) | — |
| BT-02 | Phải liệt kê hồ sơ cần nộp khi yêu cầu trả tiền bảo hiểm | Chưa rõ ràng | Thông lệ | — | — |
| GQ-01 | Phải nêu cơ quan giải quyết tranh chấp | Chưa rõ ràng | Tiêu chí rõ ràng | — | — |
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
