import { field, section, individualFields, closing, withGroups } from './templateFields';

export const HOUSING_PURCHASE_TEMPLATE = withGroups({
  code: 'housing_purchase',
  name: 'Hợp đồng đặt cọc và mua bán nhà / căn hộ',
  version: 2,
  description:
    'Dành cho cá nhân: xác định nhà/căn hộ, đặt cọc, tiến độ thanh toán, hồ sơ và điều kiện chuyển quyền.',
  identityKind: 'individual',
  legalBasis:
    'Bộ luật Dân sự số 91/2015/QH13, gồm Điều 328 về đặt cọc; Luật Nhà ở số 27/2023/QH15 (đã được sửa đổi, bổ sung, tham khảo văn bản hợp nhất số 132/VBHN-VPQH ngày 29/8/2025); Luật Đất đai số 31/2024/QH15 và Luật Kinh doanh bất động sản số 29/2023/QH15 đã được sửa đổi, bổ sung trong phạm vi áp dụng cho giao dịch.',
  parties: [
    { code: 'buyer', name: 'Bên mua / bên đặt cọc' },
    { code: 'seller', name: 'Bên bán / bên nhận đặt cọc' },
  ],
  fields: [
    ...individualFields,
    field('propertyAddress', 'Địa chỉ nhà / căn hộ'),
    field('propertyDetails', 'Diện tích, kết cấu và phần sở hữu chung / riêng', 'textarea'),
    field('ownership', 'Giấy chứng nhận, chủ sở hữu và tình trạng pháp lý', 'textarea'),
    {
      ...field('transactionStage', 'Giai đoạn giao dịch', 'select'),
      defaultValue: 'deposit',
      options: [
        { value: 'deposit', label: 'Thỏa thuận đặt cọc' },
        { value: 'purchase', label: 'Hợp đồng mua bán' },
      ],
    },
    field(
      'transactionConditions',
      'Điều kiện giao dịch, loại nhà ở và hồ sơ cần hoàn tất',
      'textarea',
    ),
    field('startDate', 'Ngày hiệu lực dự kiến', 'date'),
    field('endDate', 'Hạn hoàn tất giao dịch', 'date'),
    field('price', 'Giá mua bán (VND)', 'number'),
    { ...field('depositAmount', 'Tiền đặt cọc (VND)', 'number'), defaultValue: '0' },
    field(
      'depositTerms',
      'Mục đích cọc, hoàn trả, khấu trừ và xử lý khi không giao kết',
      'textarea',
    ),
    field('payment', 'Tiến độ, phương thức thanh toán và điều kiện từng đợt', 'textarea'),
    field(
      'transfer',
      'Thời hạn, hồ sơ công chứng / chứng thực và đăng ký chuyển quyền',
      'textarea',
    ),
    field('handover', 'Thời điểm bàn giao, hiện trạng, tài sản và hồ sơ', 'textarea'),
    field('tax', 'Thuế, phí và trách nhiệm kê khai / thanh toán', 'textarea'),
    field('termination', 'Vi phạm, chấm dứt và hoàn trả các khoản tiền', 'textarea'),
  ],
  sections: [
    section(
      'property',
      'Nhà ở giao dịch',
      'Địa chỉ: {{propertyAddress}}. Đặc điểm: {{propertyDetails}}.\nGiấy tờ quyền sở hữu, chủ sở hữu, tình trạng thế chấp và hạn chế giao dịch: {{ownership}}. Các bên kiểm tra hồ sơ gốc, quyền đại diện và sự đồng ý của người có quyền liên quan trước khi giao kết.',
    ),
    section(
      'stage',
      'Giai đoạn và điều kiện giao dịch',
      'Giai đoạn được các bên chọn: {{transactionStage}}. Điều kiện tiên quyết, loại nhà ở và hồ sơ: {{transactionConditions}}. Ngày dự kiến thực hiện: {{startDate}}; hạn hoàn tất: {{endDate}}.\nNếu chọn đặt cọc, văn bản chỉ xác lập biện pháp bảo đảm theo phạm vi đã ghi; các điều khoản mua bán bên dưới là nội dung dự kiến để giao kết, không mặc nhiên là hợp đồng chuyển quyền. Nếu chọn mua bán, chỉ giao kết khi đủ điều kiện của tài sản, chủ thể và hình thức luật định; không dùng giấy đặt cọc thay cho hợp đồng mua bán bắt buộc công chứng hoặc chứng thực.',
    ),
    section(
      'price',
      'Giá và thanh toán',
      'Giá mua bán: {{price}} VND. Tiến độ, phương thức và điều kiện thanh toán: {{payment}}. Mỗi lần thanh toán có xác nhận và chứng từ; thông tin người nhận tiền phải được đối chiếu.',
    ),
    section(
      'deposit',
      'Đặt cọc',
      'Số tiền cọc: {{depositAmount}} VND. Mục đích, điều kiện hoàn, khấu trừ và xử lý khi không giao kết: {{depositTerms}}. Các bên ghi rõ cọc bảo đảm giao kết, thực hiện hay cả hai, người nhận có thẩm quyền và chứng từ nhận tiền. Khi giao kết, thực hiện, cọc được hoàn hoặc trừ vào nghĩa vụ thanh toán. Theo Điều 328 Bộ luật Dân sự, trừ thỏa thuận khác, bên đặt cọc từ chối giao kết, thực hiện thì mất cọc; bên nhận cọc từ chối thì hoàn cọc và trả thêm khoản tương đương. Việc áp dụng phải xem xét căn cứ, lỗi và quy định bắt buộc, không coi mọi trường hợp không hoàn tất là lỗi của bên mua. Khi số tiền bằng 0 trong giai đoạn mua bán, không phát sinh khoản cọc.\nVới nhà ở hình thành trong tương lai do chủ đầu tư dự án thu cọc thuộc khoản 5 Điều 23 Luật Kinh doanh bất động sản, phải đủ điều kiện đưa vào kinh doanh và mức cọc không vượt 5% giá bán. Không áp dụng trần này một cách máy móc cho mọi giao dịch nhà ở giữa cá nhân.',
    ),
    section(
      'transfer',
      'Hồ sơ và chuyển quyền',
      'Thời hạn, hồ sơ, công chứng / chứng thực và đăng ký chuyển quyền: {{transfer}}. Hợp đồng mua bán nhà ở phải tuân thủ Điều 164 Luật Nhà ở về công chứng, chứng thực và các ngoại lệ theo đúng loại giao dịch. Thời điểm hiệu lực của hợp đồng, chuyển quyền sở hữu nhà ở và đăng ký quyền đối với đất được xác định riêng theo quy định áp dụng; việc trả cọc, thanh toán hoặc hoàn tất bản nháp không tự chứng minh đã sang tên. Hồ sơ phải xác minh quyền định đoạt, đồng sở hữu, quyền của vợ/chồng, ủy quyền, thế chấp, tranh chấp và hạn chế giao dịch liên quan.',
    ),
    section(
      'handover',
      'Bàn giao và nghĩa vụ tài chính',
      'Bàn giao nhà, hiện trạng, tài sản và hồ sơ: {{handover}}.\nThuế, phí và trách nhiệm kê khai / thanh toán: {{tax}}. Các bên lập biên bản, đối chiếu nghĩa vụ còn lại và tình trạng sử dụng.',
    ),
    section(
      'termination',
      'Vi phạm và chấm dứt',
      'Xử lý vi phạm, chấm dứt và hoàn tiền: {{termination}}. Việc bồi thường hoặc xử lý cọc phải có căn cứ hợp pháp và không được mặc nhiên loại bỏ quyền của bên còn lại.',
    ),
    closing[0],
    section(
      'effect',
      'Hiệu lực theo giai đoạn và tài liệu kèm theo',
      'Ngày dự kiến thực hiện là {{startDate}}. Hiệu lực được xác định theo giai đoạn đã chọn và điều kiện giao kết, hình thức bắt buộc. Thỏa thuận đặt cọc không thay thế thủ tục mua bán và chuyển quyền; hợp đồng mua bán thuộc diện công chứng, chứng thực phải thực hiện đúng quy định. Các bên đọc, đối chiếu hồ sơ gốc, ký và lưu văn bản cùng phụ lục; thao tác hoàn tất trên hệ thống chỉ hoàn tất bản nháp.',
    ),
  ],
  reviewNotes: [
    'Đối chiếu hồ sơ sở hữu và điều kiện giao dịch thực tế; hoàn tất thủ tục công chứng, chứng thực, đăng ký khi pháp luật yêu cầu.',
  ],
});
