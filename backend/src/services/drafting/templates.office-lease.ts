import { field, section, documentFields, closing, withGroups } from './templateFields';

export const OFFICE_LEASE_TEMPLATE = withGroups({
  code: 'office_lease',
  name: 'Hợp đồng thuê văn phòng / mặt bằng',
  version: 2,
  description:
    'Dành cho doanh nghiệp thuê hoặc cho thuê văn phòng, mặt bằng: diện tích, tiền thuê, bàn giao và hoàn trả.',
  legalBasis:
    'Bộ luật Dân sự số 91/2015/QH13, các quy định về thuê tài sản; Luật Kinh doanh bất động sản số 29/2023/QH15, Luật Đất đai số 31/2024/QH15 và Luật Nhà ở số 27/2023/QH15 đã được sửa đổi, bổ sung trong phạm vi áp dụng cho tài sản và giao dịch thực tế.',
  parties: [
    { code: 'lessee', name: 'Bên thuê' },
    { code: 'lessor', name: 'Bên cho thuê' },
  ],
  fields: [
    ...documentFields,
    field('companyName', 'Tên doanh nghiệp của bạn', 'text', 'parties'),
    field('companyTaxCode', 'Mã số thuế doanh nghiệp', 'text', 'parties'),
    field('companyAddress', 'Địa chỉ doanh nghiệp', 'text', 'parties'),
    field('representative', 'Người đại diện doanh nghiệp', 'text', 'parties'),
    field('representativePosition', 'Chức vụ người đại diện', 'text', 'parties'),
    field('partnerName', 'Tên bên còn lại', 'text', 'parties'),
    field('partnerIdentifier', 'Mã số thuế / căn cước bên còn lại', 'text', 'parties'),
    field('partnerAddress', 'Địa chỉ bên còn lại', 'text', 'parties'),
    field('partnerRepresentative', 'Người đại diện bên còn lại (nếu có)', 'text', 'parties', false),
    field('propertyAddress', 'Địa chỉ văn phòng / mặt bằng'),
    field('propertyDetails', 'Diện tích, ranh giới, hiện trạng và tiện ích', 'textarea'),
    field('ownership', 'Giấy tờ chứng minh quyền cho thuê và hạn chế sử dụng', 'textarea'),
    field('purpose', 'Mục đích sử dụng và hoạt động kinh doanh được phép', 'textarea'),
    field(
      'operatingConditions',
      'Điều kiện kinh doanh, an toàn, phòng cháy và quyền tiếp cận',
      'textarea',
    ),
    field('startDate', 'Ngày bắt đầu thuê', 'date'),
    field('endDate', 'Ngày kết thúc thuê', 'date'),
    field('price', 'Tiền thuê mỗi tháng (VND)', 'number'),
    { ...field('depositAmount', 'Tiền đặt cọc (VND)', 'number'), defaultValue: '0' },
    field('payment', 'Kỳ hạn, phương thức trả tiền và điều chỉnh giá', 'textarea'),
    field('depositTerms', 'Nhận, khấu trừ và hoàn cọc', 'textarea'),
    field('tax', 'Thuế, hóa đơn, điện nước và phí dịch vụ', 'textarea'),
    field('handover', 'Thời điểm, điều kiện và biên bản bàn giao', 'textarea'),
    field('repairs', 'Cải tạo, sửa chữa, bảo trì và an toàn', 'textarea'),
    field('termination', 'Chấm dứt, thời hạn báo trước và hoàn trả mặt bằng', 'textarea'),
  ],
  sections: [
    section(
      'property',
      'Đối tượng thuê và quyền cho thuê',
      'Địa chỉ: {{propertyAddress}}. Diện tích, hiện trạng, tiện ích: {{propertyDetails}}.\nCăn cứ quyền cho thuê và các hạn chế sử dụng: {{ownership}}. Bên cho thuê cung cấp giấy tờ để đối chiếu, thông báo tình trạng tranh chấp, thế chấp, hạn chế quyền và sự đồng ý cần thiết của người có quyền liên quan. Nếu là cho thuê lại, phải có quyền cho thuê lại hợp lệ và không vượt thời hạn, phạm vi của hợp đồng gốc.',
    ),
    section(
      'term',
      'Mục đích và thời hạn thuê',
      'Mục đích sử dụng: {{purpose}}. Thời hạn từ {{startDate}} đến {{endDate}}. Việc gia hạn, cho thuê lại hoặc chuyển giao được thỏa thuận bằng văn bản và phải phù hợp quyền của bên cho thuê.\nĐiều kiện hoạt động, giấy phép, phòng cháy, an toàn và tiếp cận: {{operatingConditions}}. Các bên xác minh công năng được phép của tài sản; không sử dụng căn hộ chung cư có mục đích để ở làm văn phòng trái quy định. Việc ký hợp đồng không tự xác nhận đủ điều kiện kinh doanh hoặc phòng cháy.',
    ),
    section(
      'rent',
      'Tiền thuê và thanh toán',
      'Tiền thuê: {{price}} VND/tháng. Kỳ hạn, phương thức và điều chỉnh giá: {{payment}}.\nThuế, hóa đơn, điện nước và phí dịch vụ: {{tax}}. Các bên lưu chứng từ và đối chiếu công nợ; không tự suy diễn tiền thuê đã bao gồm khoản chưa ghi rõ.',
    ),
    section(
      'deposit',
      'Đặt cọc',
      'Số tiền đặt cọc: {{depositAmount}} VND; nếu bằng 0, các bên không thu cọc. Điều kiện nhận, khấu trừ, thời hạn và cách hoàn trả: {{depositTerms}}. Cọc không tự thay thế tiền thuê kỳ cuối nếu chưa được thống nhất. Các khoản khấu trừ phải có căn cứ, bảng đối chiếu và chứng từ; không mặc nhiên tịch thu toàn bộ cọc khi chưa xác định căn cứ vi phạm, thỏa thuận hợp pháp và trách nhiệm của từng bên.',
    ),
    section(
      'handover',
      'Bàn giao và sử dụng',
      'Thời điểm, điều kiện và biên bản bàn giao: {{handover}}. Biên bản ghi rõ diện tích, tình trạng, thiết bị, chìa khóa và công tơ. Bên thuê sử dụng đúng mục đích và phạm vi đã thỏa thuận.',
    ),
    section(
      'maintenance',
      'Cải tạo, sửa chữa và trách nhiệm',
      'Thỏa thuận về cải tạo, sửa chữa, bảo trì và an toàn: {{repairs}}. Bên cho thuê bảo đảm giá trị sử dụng theo thỏa thuận và chịu trách nhiệm sửa chữa thuộc nghĩa vụ của mình; bên thuê bảo quản, sử dụng đúng mục đích, chịu chi phí sửa chữa nhỏ theo tập quán và bồi thường hư hỏng do lỗi của mình. Cải tạo kết cấu, lắp đặt hoặc thay đổi công năng phải có chấp thuận và thủ tục bắt buộc. Bên thuê không phải chịu trách nhiệm về hao mòn tự nhiên khi trả tài sản; các bên thông báo, phối hợp xử lý sự cố và xác định trách nhiệm đối với khuyết tật có trước khi bàn giao.',
    ),
    section(
      'termination',
      'Chấm dứt và hoàn trả',
      'Điều kiện chấm dứt, thời hạn báo trước và hoàn trả: {{termination}}. Khi kết thúc, các bên lập biên bản, đối chiếu tiền thuê, phí, tài sản và cọc; việc chấm dứt không tự xóa nghĩa vụ đã phát sinh hợp pháp. Bên cho thuê không được tự khóa cửa, giữ tài sản hoặc cắt điện nước trái quy định để cưỡng ép thanh toán. Các bên xử lý quyền tiếp cận, di dời, chi phí cải tạo được chấp thuận và khôi phục mặt bằng theo thỏa thuận hợp pháp; không mặc định bên thuê chịu toàn bộ hư hỏng không do lỗi của mình.',
    ),
    ...closing,
  ],
  reviewNotes: [
    'Kiểm tra giấy tờ quyền cho thuê, công năng, thời hạn còn lại nếu thuê lại, điều kiện phòng cháy và ngành nghề thực tế trước khi ký.',
    'Đối chiếu quy định áp dụng theo loại tài sản: https://chinhphu.vn/?docid=215257&pageid=27160 và https://vanban.chinhphu.vn/?classid=1&docid=183188&pageid=27160.',
  ],
});
