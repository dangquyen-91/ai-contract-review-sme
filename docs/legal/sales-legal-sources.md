# Nguồn luật cho mẫu mua bán hàng hóa

Đối chiếu nguồn chính thức ngày 02/11/2026. Mẫu mua bán v3 giữ 15 điều và Phụ lục 01 của file Word được cung cấp, chuyển các chỗ trống thành trường liên kết. Bên A luôn là bên bán, Bên B luôn là bên mua; thông tin tài khoản được đặt theo vai trò đã chọn.

## Danh mục để nhập LegalSource

| Code | Văn bản / bản dùng để nhập | Nguồn chính thức | Phạm vi sử dụng |
| --- | --- | --- | --- |
| `commercial_law_2005` | Luật Thương mại 36/2005/QH11; bản hợp nhất 113/VBHN-VPQH năm 2025 | [PDF Chính phủ](https://datafiles.chinhphu.vn/cpp/files/vbpq/2025/9/113-vbhn-vpqh.pdf) | Mua bán hàng hóa, giao nhận, thanh toán, chuyển rủi ro, chế tài, lãi chậm trả và khiếu nại. Kiểm tra phạm vi áp dụng Luật Thương mại cho từng giao dịch. |
| `civil_code_2015` | Bộ luật Dân sự 91/2015/QH13 | [Cổng Chính phủ, có tệp đính kèm](https://vanban.chinhphu.vn/default.aspx?docid=183188&pageid=27160) | Giao kết, thực hiện, hiệu lực và chấm dứt hợp đồng, mua bán tài sản, nghĩa vụ dân sự, bất khả kháng. |
| `product_quality_law_2007` | Luật Chất lượng sản phẩm, hàng hóa 05/2007/QH12; bản hợp nhất 156/VBHN-VPQH ngày 09/09/2025 | [PDF hợp nhất Chính phủ](https://datafiles.chinhphu.vn/cpp/files/vbpq/2025/9/156-vbhn-vpqh.pdf) | Chất lượng, thông tin hàng hóa, nghĩa vụ của bên bán và trách nhiệm liên quan đến hàng hóa không bảo đảm chất lượng. Bao gồm sửa đổi tại Luật 78/2025/QH15 có hiệu lực 01/01/2026. |
| `consumer_protection_law_2023` | Luật Bảo vệ quyền lợi người tiêu dùng 19/2023/QH15; bản hợp nhất 47/VBHN-VPQH ngày 17/03/2026 | [Cổng Chính phủ, có PDF hợp nhất](https://vanban.chinhphu.vn/?classid=2629&docid=217232&pageid=27160) | Chỉ áp dụng khi giao dịch thuộc phạm vi bảo vệ người tiêu dùng; chú ý điều khoản hạn chế quyền khiếu nại, trách nhiệm bảo hành và điều kiện giao dịch. |
| `decree_55_2024` | Nghị định 55/2024/NĐ-CP | [Cổng Chính phủ, có tệp đính kèm](https://vanban.chinhphu.vn/?docid=210254&pageid=27160) | Hướng dẫn Luật Bảo vệ quyền lợi người tiêu dùng, sử dụng khi giao dịch thuộc phạm vi tương ứng. |

Bản hợp nhất dùng để đọc nội dung đã cập nhật, không phải một luật độc lập thay thế luật gốc. `citationLabel` nên ghi cả số luật gốc và số bản hợp nhất; `sourceType` vẫn là `law` cho các bản hợp nhất luật trên. Khi nhập phải kiểm tra các chú thích hiệu lực, phần đã bãi bỏ và quy định chuyển tiếp, không coi ngày hợp nhất là ngày có hiệu lực của toàn bộ luật.

## Cách nhập vào hệ thống hiện tại

1. Manager mở **Kho luật → Thêm nguồn**, chọn đúng code trong bảng. Nếu đã có code, cập nhật nguồn hiện có theo luồng quản trị; không tạo code thứ hai cho cùng một luật chỉ vì dùng bản hợp nhất.
2. Tải tệp chính thức từ liên kết; nhập số hiệu, trích dẫn, ngày ban hành / hiệu lực và trạng thái đã kiểm chứng. Với luật gốc đã sửa đổi, dùng trạng thái `amended`, không đánh dấu toàn bộ luật là hết hiệu lực chỉ vì một số điều đã được sửa đổi.
3. Xem trước kết quả tách điều, kiểm tra độ bao phủ rồi nhập. Chờ job embedding hoàn thành trước khi chọn luật ở trang soạn thảo.
4. Với profile `sales` đã tồn tại trong DB, bổ sung các code còn thiếu ở cấu hình profile khi cần dùng cho luồng rà soát hợp đồng. Thay đổi dữ liệu mặc định trong code không tự ghi đè profile hiện có.

Danh mục và bộ lọc trong code không tự tạo bản ghi, nội dung luật hoặc embedding trong DB. Bộ chọn của mẫu mua bán chỉ hiện các nguồn thuộc danh mục trên có nội dung đã nhập, đã sẵn sàng và đáp ứng bộ lọc hiệu lực. Nguồn người tiêu dùng được cung cấp để người dùng lựa chọn khi phù hợp, không tự kết luận mọi hợp đồng mua bán là giao dịch tiêu dùng.

## Kiểm tra mẫu

- Tạo mới từ **Mua bán hàng hóa v3** hoặc chọn **Dùng mẫu mới** ở bản nháp v2. Bản nháp cũ lưu snapshot và không bị ghi đè.
- Thử cả vai trò bên bán và bên mua; tên doanh nghiệp của người dùng phải nằm đúng bên tương ứng.
- Điền bảng hàng hóa tại Phụ lục 01; tổng trước thuế liên kết với bảng, các ô tiền được định dạng theo giao diện hiện có. VAT, tạm ứng, tiền còn lại và tiền bằng chữ phải được đối chiếu trước khi hoàn tất.
- Mẫu giữ nội dung thỏa thuận như file gốc (gồm các mốc 48 giờ, 0,05%/ngày và 8%); đây không phải kết luận rằng các mức này phù hợp cho mọi trường hợp. Sử dụng kiểm tra điều khoản với nguồn phù hợp trước khi ký.
