import { field, section, individualFields, closing, withGroups } from './templateFields';

export const LIFE_INSURANCE_TEMPLATE = withGroups({
  code: 'life_insurance',
  name: 'Hợp đồng bảo hiểm nhân thọ',
  version: 2,
  description:
    'Bản dự thảo từ góc nhìn bên mua: đối chiếu sản phẩm, quyền lợi, phí và điều khoản của doanh nghiệp bảo hiểm.',
  identityKind: 'individual',
  counterpartyLabel: 'Doanh nghiệp bảo hiểm',
  legalBasis:
    'Luật Kinh doanh bảo hiểm số 08/2022/QH15 đã được sửa đổi, bổ sung bởi Luật số 139/2025/QH15 có hiệu lực từ 01/01/2026 (tham khảo văn bản hợp nhất số 31/VBHN-VPQH ngày 13/3/2026); Bộ luật Dân sự và quy định hướng dẫn áp dụng cho sản phẩm thực tế.',
  parties: [{ code: 'policyholder', name: 'Bên mua bảo hiểm' }],
  fields: [
    ...individualFields,
    field('product', 'Tên sản phẩm, mã quy tắc và điều khoản chính thức', 'textarea'),
    field('insuredPerson', 'Người được bảo hiểm, thông tin và quan hệ với bên mua', 'textarea'),
    field('beneficiary', 'Người thụ hưởng, tỷ lệ và cách thay đổi', 'textarea'),
    field('startDate', 'Ngày hiệu lực dự kiến', 'date'),
    field('endDate', 'Ngày kết thúc thời hạn bảo hiểm', 'date'),
    field('receivedDate', 'Ngày thực nhận hợp đồng (nếu đã nhận)', 'date', 'terms', false),
    field('price', 'Phí mỗi kỳ (VND)', 'number'),
    field('sumInsured', 'Số tiền bảo hiểm (VND)', 'number'),
    field('payment', 'Kỳ đóng phí, thời hạn đóng, gia hạn và khôi phục', 'textarea'),
    field('benefits', 'Quyền lợi, sự kiện bảo hiểm và cách xác định chi trả', 'textarea'),
    field('exclusions', 'Điều khoản loại trừ và điều kiện áp dụng', 'textarea'),
    field('disclosure', 'Thông tin kê khai, xác nhận đồng ý và tài liệu kèm theo', 'textarea'),
    field('claims', 'Hồ sơ, thời hạn thông báo và quy trình yêu cầu chi trả', 'textarea'),
    field(
      'cancellation',
      'Cân nhắc tham gia, hủy, chấm dứt, hoàn phí và giá trị hoàn lại',
      'textarea',
    ),
    field('fees', 'Phí, khấu trừ, quyền lợi bảo đảm và minh họa không bảo đảm', 'textarea'),
  ],
  sections: [
    section(
      'product',
      'Sản phẩm và tài liệu hợp đồng',
      'Tên sản phẩm, phiên bản quy tắc và điều khoản: {{product}}. Các bên đối chiếu hồ sơ yêu cầu bảo hiểm, quy tắc, điều khoản và tài liệu do doanh nghiệp bảo hiểm cung cấp.\nĐây là bản dự thảo để trao đổi; chỉ tài liệu được các bên giao kết hợp lệ mới xác lập phạm vi bảo hiểm.',
    ),
    section(
      'insured',
      'Người được bảo hiểm và người thụ hưởng',
      'Người được bảo hiểm và quan hệ với bên mua: {{insuredPerson}}.\nNgười thụ hưởng, tỷ lệ và cách thay đổi: {{beneficiary}}. Thông tin, sự đồng ý và quyền lợi có thể được bảo hiểm được đối chiếu với hồ sơ giao kết.',
    ),
    section(
      'term',
      'Thời hạn và phí bảo hiểm',
      'Thời hạn dự kiến từ {{startDate}} đến {{endDate}}; điều kiện bắt đầu trách nhiệm bảo hiểm theo tài liệu sản phẩm đã thống nhất. Ngày thực nhận hợp đồng nếu đã nhận: {{receivedDate}}.\nPhí mỗi kỳ: {{price}} VND. Kỳ đóng, thời hạn đóng, gia hạn và khôi phục: {{payment}}.',
    ),
    section(
      'benefits',
      'Quyền lợi bảo hiểm',
      'Số tiền bảo hiểm: {{sumInsured}} VND. Quyền lợi, sự kiện bảo hiểm và cách xác định chi trả: {{benefits}}. Không suy diễn quyền lợi ngoài quy tắc và điều khoản đã được giao kết.',
    ),
    section(
      'exclusions',
      'Loại trừ trách nhiệm',
      'Điều khoản loại trừ và điều kiện áp dụng: {{exclusions}}. Theo Điều 19 Luật Kinh doanh bảo hiểm, doanh nghiệp bảo hiểm phải ghi rõ loại trừ, giải thích đầy đủ và lưu bằng chứng xác nhận bên mua đã được giải thích và hiểu nội dung khi giao kết. Không áp dụng loại trừ về chậm thông báo khi việc chậm thông báo do bất khả kháng hoặc trở ngại khách quan. Không tự bổ sung trường hợp loại trừ ngoài tài liệu hợp lệ.',
    ),
    section(
      'disclosure',
      'Kê khai và cung cấp thông tin',
      'Thông tin kê khai, xác nhận đồng ý và tài liệu kèm theo: {{disclosure}}. Bên mua trả lời đầy đủ, trung thực theo yêu cầu của doanh nghiệp bảo hiểm; doanh nghiệp bảo hiểm cung cấp, giải thích quy tắc, quyền lợi, phí, rủi ro và quyền chấm dứt. Không ký thay hoặc để trống thông tin cần xác nhận. Quyền lợi có thể được bảo hiểm và sự đồng ý của người được bảo hiểm, người đại diện theo pháp luật trong trường hợp cần thiết phải được kiểm tra theo luật; không mặc nhiên coi thông tin do người soạn nhập là sự chấp thuận của người khác.',
    ),
    section(
      'claims',
      'Yêu cầu chi trả',
      'Hồ sơ, thời hạn thông báo và quy trình yêu cầu chi trả: {{claims}}. Doanh nghiệp bảo hiểm hướng dẫn hồ sơ, xác nhận tiếp nhận, giải quyết theo thời hạn thỏa thuận hợp pháp và quy định bắt buộc; nếu từ chối phải giải thích căn cứ. Bên mua, người được bảo hiểm hoặc người thụ hưởng được yêu cầu giải thích và thực hiện quyền khiếu nại, giải quyết tranh chấp theo luật. Người yêu cầu lưu chứng từ nộp, bổ sung hồ sơ và kết quả giải quyết.',
    ),
    section(
      'cancellation',
      'Hủy, chấm dứt và giá trị hợp đồng',
      'Điều kiện hủy, chấm dứt, hoàn phí và giá trị hoàn lại theo tài liệu sản phẩm: {{cancellation}}.\nTheo Điều 35 Luật Kinh doanh bảo hiểm, với hợp đồng có thời hạn trên 01 năm, bên mua có 21 ngày kể từ ngày nhận được hợp đồng để từ chối tiếp tục tham gia. Khi thực hiện quyền này, hợp đồng bị hủy, bên mua nhận lại phí đã đóng sau khi trừ chi phí hợp lý nếu có theo thỏa thuận; doanh nghiệp bảo hiểm không phải bồi thường, trả tiền bảo hiểm khi xảy ra sự kiện bảo hiểm. Mốc tính là ngày thực nhận hợp đồng, không tự lấy ngày ký hoặc ngày hiệu lực thay thế. Ngày thực nhận được ghi nhận theo chứng từ giao nhận; nếu chưa nhận, không tự giả định đã bắt đầu thời gian cân nhắc.\nPhí, khấu trừ, quyền lợi bảo đảm và minh họa không bảo đảm: {{fees}}. Giá trị hoàn lại khi chấm dứt sau thời gian cân nhắc có thể thấp hơn phí đã đóng; không coi giá trị minh họa, lãi dự kiến hoặc quyền lợi không bảo đảm là cam kết chi trả.',
    ),
    section(
      'premiumRights',
      'Gia hạn đóng phí và quyền của bên mua',
      'Khi đóng phí nhiều lần, đã đóng một hoặc một số kỳ nhưng không thể đóng tiếp, thời gian gia hạn đóng phí là 60 ngày theo Điều 37 Luật Kinh doanh bảo hiểm. Doanh nghiệp bảo hiểm không tự khấu trừ phí từ giá trị hoàn lại khi chưa có sự đồng ý của bên mua và không khởi kiện đòi đóng phí, trừ trường hợp bảo hiểm nhóm theo luật. Việc khôi phục hiệu lực, thay đổi người thụ hưởng và điều chỉnh hợp đồng phải được ghi nhận theo quy định và tài liệu sản phẩm; không tự coi việc ngừng đóng phí là đã được hoàn toàn bộ phí.',
    ),
    ...closing,
  ],
  reviewNotes: [
    'Đối chiếu bản dự thảo với quy tắc và điều khoản chính thức của sản phẩm bảo hiểm. Không tự suy đoán quyền lợi, mức phí, loại trừ hoặc giá trị hoàn lại.',
    'Quyền cân nhắc 21 ngày áp dụng khi thời hạn hợp đồng trên 01 năm và tính từ lúc nhận hợp đồng, không phải từ ngày ký. Nguồn: https://datafiles.chinhphu.vn/cpp/files/vbpq/2026/3/31-vbhn-vpqh.pdf.',
  ],
});
