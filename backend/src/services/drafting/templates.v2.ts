import type { ContractTemplate, FormGroup, TemplateField, TemplateSection } from './templates';

const group = (key: string, title: string, description: string, step: 'parties' | 'terms', fields: string[]): FormGroup => ({ key, title, description, step, fields });
const extra = (key: string, label: string, kind: TemplateField['kind'], required: boolean, step: 'parties' | 'terms', placeholder?: string): TemplateField => ({ key, label, kind, required, group: step, placeholder });
const descriptions: Record<string, { placeholder?: string; help?: string }> = {
  reference: { placeholder: 'Ví dụ: 01/2026/HĐLĐ', help: 'Số tham chiếu do doanh nghiệp quản lý, không dùng số của mẫu thử.' },
  signingPlace: { placeholder: 'Ví dụ: Thành phố Hồ Chí Minh' },
  representative: { placeholder: 'Họ và tên đầy đủ của người có thẩm quyền ký', help: 'Nhập tên cá nhân, không nhập vai trò tài khoản như Staff hoặc Owner.' },
  representativePosition: { placeholder: 'Ví dụ: Giám đốc / Người được ủy quyền' },
  authorization: { placeholder: 'Số, ngày và phạm vi ủy quyền (nếu ký theo ủy quyền)' },
  allowances: { placeholder: 'Ghi tên, mức tiền hoặc cách xác định từng khoản; ghi Không nếu không có.' },
  workingTime: { placeholder: 'Ví dụ: 08:00–12:00, 13:00–17:00 từ thứ Hai đến thứ Sáu; nghỉ thứ Bảy, Chủ nhật. Nêu thêm chế độ nghỉ nếu có.' },
  salaryReview: { placeholder: 'Nêu thời điểm xem xét và tiêu chí nâng lương; không nhập ký tự thử.' },
  protection: { placeholder: 'Nêu trang bị phù hợp công việc; nếu không cần, ghi rõ Không yêu cầu trang bị đặc thù.' },
  training: { placeholder: 'Nêu đào tạo ban đầu, bồi dưỡng và cách thỏa thuận chi phí nếu có đào tạo riêng.' },
  tax: { placeholder: 'Nêu thuế suất áp dụng, tiền thuế và tổng thanh toán theo giao dịch thực tế.', help: 'Hệ thống không mặc định thuế suất. Tổng ở bảng hạng mục là giá trị trước thuế.' },
  payment: { placeholder: 'Nêu hình thức thanh toán, thời điểm hoặc từng đợt và chứng từ cần có.' },
  handover: { placeholder: 'Nêu thời điểm, địa điểm, tài liệu bàn giao, tiêu chí kiểm tra và người xác nhận.' },
  warranty: { placeholder: 'Nêu phạm vi, thời hạn bảo hành, cách thông báo và xử lý sai sót.' },
  intellectualProperty: { placeholder: 'Nêu quyền đối với sản phẩm, mã nguồn, tài liệu; thời điểm bàn giao và giới hạn sử dụng.' },
};
const openingGroups: FormGroup[] = [
  group('document', '01. Thông tin văn bản', 'Số tham chiếu, ngày và địa điểm ký hợp đồng.', 'parties', ['reference', 'signingDate', 'signingPlace']),
  group('company', '02. Doanh nghiệp của bạn', 'Kiểm tra thông tin pháp nhân và thẩm quyền của người ký.', 'parties', ['companyTaxCode', 'companyAddress', 'representative', 'representativePosition', 'authorization']),
];
const ending: TemplateSection[] = [
  { key: 'confidentiality', title: 'Bảo mật thông tin và dữ liệu', body: 'Thông tin được cung cấp trong quá trình thực hiện chỉ được sử dụng cho mục đích hợp đồng; các bên áp dụng biện pháp bảo vệ phù hợp và giới hạn người được tiếp cận.\nNghĩa vụ bảo mật không loại trừ việc cung cấp thông tin theo yêu cầu hợp pháp, việc thực hiện quyền khiếu nại, tố cáo hoặc các quyền khác được pháp luật bảo vệ.', guidance: 'Nêu cách tiếp nhận, lưu giữ, sử dụng, hoàn trả và xử lý thông tin. Không dùng cam kết bảo mật tuyệt đối hoặc tự đặt phạt tiền.' },
  { key: 'termination', title: 'Sửa đổi, tạm ngừng và chấm dứt', body: 'Việc sửa đổi, bổ sung được các bên thống nhất bằng văn bản; không tự làm mất quyền hoặc nghĩa vụ đã phát sinh.\nViệc tạm ngừng, chấm dứt, thông báo và thanh toán nghĩa vụ còn lại phải có căn cứ phù hợp với loại hợp đồng và pháp luật áp dụng.', guidance: 'Phân biệt thỏa thuận chấm dứt và đơn phương chấm dứt. Nêu trình tự thông báo, bàn giao, đối soát. Không tự đặt số ngày báo trước, trợ cấp hay mức bồi thường.' },
  { key: 'disputes', title: 'Giải quyết tranh chấp', body: 'Các bên ưu tiên trao đổi, thương lượng và lưu giữ tài liệu liên quan đến quá trình giải quyết.\nNếu không đạt thỏa thuận, tranh chấp được giải quyết theo đúng trình tự và thẩm quyền do pháp luật áp dụng quy định.', guidance: 'Không tự chọn trọng tài, tòa án cụ thể hay bỏ qua thủ tục bắt buộc. Nêu việc phối hợp cung cấp tài liệu và thực hiện nghĩa vụ không bị tranh chấp nếu phù hợp.' },
  { key: 'effect', title: 'Hiệu lực và điều khoản thi hành', body: 'Hợp đồng có hiệu lực từ ngày {{startDate}}. Các bên xác nhận đã đọc, hiểu và tự nguyện thỏa thuận các nội dung.\nHợp đồng được lập thành 02 bản có giá trị như nhau, mỗi bên giữ 01 bản. Phụ lục được ký hợp lệ là bộ phận của hợp đồng trong phạm vi pháp luật cho phép.', guidance: 'Không lặp lại ngày hiệu lực hoặc số bản. Nêu trách nhiệm thông báo thay đổi đầu mối và việc phối hợp thực hiện.' },
];

export function buildDetailedTemplate(base: ContractTemplate): ContractTemplate {
  const labor = base.code === 'labor';
  const fields = base.fields.filter(field => !labor || field.key !== 'partnerRepresentative').map(field => ({ ...field, ...descriptions[field.key] }));
  function change(key: string, update: Partial<TemplateField>) { Object.assign(fields.find(field => field.key === key)!, update); }
  change('partnerName', { label: labor ? 'Họ và tên người lao động' : 'Tên pháp lý bên đối tác', placeholder: labor ? 'Ví dụ: Nguyễn Văn An' : 'Tên đầy đủ theo hồ sơ pháp lý' });
  change('partnerAddress', { label: labor ? 'Nơi cư trú của người lao động' : 'Địa chỉ bên đối tác' });
  change('partnerIdentifier', { label: labor ? 'Số căn cước / hộ chiếu' : 'Mã số thuế / giấy tờ pháp lý' });
  change('endDate', { label: labor ? 'Ngày kết thúc (với hợp đồng xác định thời hạn)' : 'Ngày hoàn thành thực hiện' });
  if (labor) {
    change('job', { label: 'Chức danh và nhiệm vụ cụ thể', placeholder: 'Nêu chức danh, nhiệm vụ chính, phạm vi công việc và người quản lý trực tiếp.' });
    change('payment', { label: 'Hình thức trả lương', placeholder: 'Ví dụ: Chuyển khoản vào tài khoản của người lao động.' });
    change('insurance', { defaultValue: 'Tham gia và thực hiện nghĩa vụ bảo hiểm xã hội, bảo hiểm y tế, bảo hiểm thất nghiệp theo quy định áp dụng đối với người lao động.' });
    fields.push(extra('salaryPaymentDay', 'Kỳ hạn trả lương', 'text', true, 'terms', 'Ví dụ: Ngày 05 của tháng kế tiếp; nêu cách xử lý ngày nghỉ.'));
    fields.push(extra('partnerIdIssuedDate', 'Ngày cấp giấy tờ định danh (nếu có)', 'date', false, 'parties'));
    fields.push(extra('partnerIdIssuedPlace', 'Nơi cấp giấy tờ định danh (nếu có)', 'text', false, 'parties'));
    return { ...base, version: 2, fields, formGroups: [
      ...openingGroups,
      group('employee', '03. Người lao động', 'Thông tin cá nhân của người trực tiếp giao kết hợp đồng, không nhập tên công ty.', 'parties', ['partnerName', 'partnerBirthDate', 'partnerGender', 'partnerIdentifier', 'partnerIdIssuedDate', 'partnerIdIssuedPlace', 'partnerAddress']),
      group('employment', '01. Công việc và thời hạn', 'Xác định vị trí, nơi làm việc và thời hạn phù hợp.', 'terms', ['termType', 'startDate', 'endDate', 'job', 'workplace']),
      group('salary', '02. Tiền lương và phụ cấp', 'Tách rõ số tiền, hình thức trả và kỳ hạn trả lương.', 'terms', ['salary', 'allowances', 'payment', 'salaryPaymentDay', 'salaryReview']),
      group('conditions', '03. Điều kiện làm việc và chế độ', 'Mô tả cụ thể giờ làm, nghỉ ngơi, bảo hiểm, bảo hộ và đào tạo.', 'terms', ['workingTime', 'insurance', 'protection', 'training']),
    ], sections: [
      { key: 'employment', title: 'Công việc, địa điểm và thời hạn', body: 'Loại hợp đồng: {{termType}}. Thời điểm bắt đầu: {{startDate}}. Thời điểm kết thúc: {{endDate}}.\nChức danh và nhiệm vụ: {{job}}.\nĐịa điểm làm việc: {{workplace}}.', guidance: 'Nêu phạm vi công việc, phối hợp, báo cáo và cách thống nhất thay đổi công việc; không tự bổ sung nhiệm vụ vượt dữ liệu.' },
      { key: 'salary', title: 'Tiền lương, phụ cấp và thanh toán', body: 'Mức lương theo công việc hoặc chức danh: {{salary}} VND/tháng.\nPhụ cấp và khoản bổ sung: {{allowances}}.\nHình thức trả lương: {{payment}}. Kỳ hạn trả: {{salaryPaymentDay}}.', guidance: 'Nêu việc cung cấp thông tin thanh toán, bảng kê và đối chiếu sai lệch. Không tự đặt ngày trả, mức phụ cấp, loại gross/net hoặc tỷ lệ khấu trừ.' },
      { key: 'salaryReview', title: 'Chế độ nâng bậc, nâng lương', body: 'Thời điểm, căn cứ và điều kiện xem xét nâng bậc, nâng lương: {{salaryReview}}.\nMức lương thay đổi được thông báo và ghi nhận bằng hình thức phù hợp theo quy định.', guidance: 'Làm rõ đánh giá, trao đổi và ghi nhận thay đổi; không hứa tăng lương tự động hoặc bịa tỷ lệ.' },
      { key: 'workingTime', title: 'Thời giờ làm việc và nghỉ ngơi', body: 'Thời giờ làm việc, nghỉ trong ngày và nghỉ hằng tuần: {{workingTime}}.\nViệc làm thêm giờ, nghỉ phép và các chế độ nghỉ khác thực hiện theo thỏa thuận hợp pháp, nội quy phù hợp và pháp luật áp dụng.', guidance: 'Nêu cách phối hợp đăng ký nghỉ và bố trí công việc; không tự thêm lịch, số ngày nghỉ hay ép làm thêm.' },
      { key: 'insurance', title: 'Bảo hiểm và an toàn lao động', body: 'Bảo hiểm xã hội, bảo hiểm y tế và bảo hiểm thất nghiệp: {{insurance}}.\nTrang bị bảo hộ lao động và điều kiện an toàn: {{protection}}.', guidance: 'Nêu phối hợp hồ sơ tham gia, thông báo biến động, sử dụng bảo hộ và báo cáo nguy cơ; không tự đặt mức đóng hoặc quy kết miễn bảo hiểm.' },
      { key: 'training', title: 'Đào tạo và phát triển kỹ năng', body: 'Chế độ đào tạo, bồi dưỡng và nâng cao trình độ: {{training}}.\nNội dung về chi phí, cam kết đào tạo hoặc hoàn trả nếu có phải được thỏa thuận riêng phù hợp quy định.', guidance: 'Nêu trách nhiệm tham gia và phối hợp đào tạo; không tự tạo nghĩa vụ hoàn trả chi phí.' },
      { key: 'employee', title: 'Quyền và nghĩa vụ của người lao động', body: 'Người lao động được thực hiện công việc và hưởng các chế độ đã thỏa thuận; được cung cấp thông tin, điều kiện làm việc phù hợp và thực hiện các quyền được pháp luật bảo vệ.\nNgười lao động thực hiện nhiệm vụ đã thỏa thuận, phối hợp công việc, tuân thủ nội quy hợp pháp, giữ gìn tài sản được giao và thông báo kịp thời các vấn đề ảnh hưởng đến công việc.', guidance: 'Cụ thể hóa theo chức danh đã nhập: tiếp nhận giao việc, báo cáo, bảo quản tài sản, quyền phản ánh và đề nghị hỗ trợ. Không đặt chế tài hoặc nhiệm vụ ngoài hợp đồng.' },
      { key: 'employer', title: 'Quyền và nghĩa vụ của người sử dụng lao động', body: 'Người sử dụng lao động bố trí công việc, trả lương và thực hiện các chế độ đã thỏa thuận; bảo đảm điều kiện làm việc và tôn trọng quyền, lợi ích hợp pháp của người lao động.\nViệc tổ chức, điều hành, đánh giá công việc và xử lý vấn đề phát sinh phải trong phạm vi thỏa thuận và pháp luật áp dụng.', guidance: 'Cụ thể hóa trách nhiệm hướng dẫn, công cụ làm việc, xác nhận kết quả, xử lý phản ánh và thanh toán. Không trao quyền đơn phương vô hạn.' },
      ...ending,
    ] };
  }
  change('scope', { label: base.code === 'sales' ? 'Yêu cầu chất lượng và quy cách hàng hóa' : 'Phạm vi công việc và sản phẩm bàn giao', placeholder: base.code === 'sales' ? 'Nêu chủng loại, quy cách, chất lượng, xuất xứ, bao gói và tài liệu kèm theo.' : 'Nêu mục tiêu, phạm vi thực hiện, đầu ra và phần không thuộc phạm vi dịch vụ.' });
  fields.push(extra('lineItems', base.code === 'sales' ? 'Bảng hàng hóa' : 'Bảng hạng mục dịch vụ (nếu có)', 'items', base.code === 'sales', 'terms'));
  return { ...base, version: 2, fields, formGroups: [
    ...openingGroups,
    group('partner', '03. Bên đối tác', 'Nhập tên pháp lý và thông tin người đại diện của bên còn lại.', 'parties', ['partnerName', 'partnerIdentifier', 'partnerAddress', 'partnerRepresentative']),
    group('scope', base.code === 'sales' ? '01. Hàng hóa và giá trị' : '01. Dịch vụ và giá trị', 'Liệt kê hạng mục, quy cách, số lượng và đơn giá; tổng bảng được tính tự động.', 'terms', ['scope', 'lineItems', 'price', 'tax']),
    group('delivery', '02. Thời gian và bàn giao', 'Xác định mốc thực hiện, nơi giao nhận và tiêu chí xác nhận hoàn thành.', 'terms', ['startDate', 'endDate', 'handover', 'warranty']),
    group('payment', '03. Thanh toán và quyền liên quan', 'Nêu phương thức, các đợt thanh toán và quyền đối với sản phẩm nếu có.', 'terms', ['payment', 'intellectualProperty'].filter(key => fields.some(field => field.key === key))),
  ], sections: [
    { key: 'scope', title: base.code === 'sales' ? 'Hàng hóa, số lượng và chất lượng' : 'Phạm vi và sản phẩm dịch vụ', body: 'Phạm vi và yêu cầu: {{scope}}.\n{{lineItems}}', guidance: 'Làm rõ phạm vi và trách nhiệm cung cấp tài liệu; không viết lại bảng hoặc tự thêm hàng hóa/hạng mục.' },
    { key: 'price', title: 'Giá trị hợp đồng và thuế', body: 'Tổng giá trị trước thuế: {{price}} VND.\nThuế và tổng thanh toán theo thỏa thuận: {{tax}}.', guidance: 'Nêu đối chiếu giá trị, chứng từ và nguyên tắc ghi nhận thay đổi bằng văn bản; không tự tính hoặc thêm thuế suất.' },
    { key: 'payment', title: 'Phương thức và tiến độ thanh toán', body: 'Phương thức, các đợt, thời hạn và điều kiện thanh toán: {{payment}}.\nCác bên phối hợp cung cấp, kiểm tra chứng từ để thực hiện thanh toán đúng thỏa thuận.', guidance: 'Nêu hồ sơ xác nhận, thông báo sai lệch và đối soát; không bịa khoản đặt cọc, hạn trả hoặc lãi suất.' },
    { key: 'delivery', title: base.code === 'sales' ? 'Giao hàng, kiểm tra và nghiệm thu' : 'Tiến độ, bàn giao và nghiệm thu', body: 'Thời gian thực hiện: từ {{startDate}} đến {{endDate}}.\nTiến độ, địa điểm, hồ sơ bàn giao và tiêu chí nghiệm thu: {{handover}}.', guidance: 'Làm rõ phối hợp, biên bản giao nhận, ghi nhận lỗi và xác nhận hoàn thành; không tự đặt thời hạn nghiệm thu.' },
    { key: 'warranty', title: 'Bảo hành, hỗ trợ và khắc phục sai sót', body: 'Phạm vi, thời hạn và phương thức bảo hành / xử lý sai sót: {{warranty}}.\nCác bên thông báo và phối hợp ghi nhận tình trạng phát sinh, xác định trách nhiệm theo thỏa thuận và quy định áp dụng.', guidance: 'Nêu thông tin cần cung cấp khi báo lỗi và cách xác nhận khắc phục; không tự thêm thời hạn bảo hành.' },
    { key: 'obligations', title: 'Quyền và nghĩa vụ của các bên', body: '{{supplierRole}} thực hiện đúng đối tượng, chất lượng, tiến độ và hồ sơ đã thống nhất.\n{{recipientRole}} phối hợp cung cấp thông tin, tiếp nhận, kiểm tra và thanh toán theo hợp đồng.', guidance: `Viết riêng trách nhiệm của bên A và bên B theo vai trò đã chọn, sử dụng đúng tên vai trò cho hợp đồng ${base.name}; nêu yêu cầu thay đổi, phối hợp, kiểm tra. Không dùng cả hai loại vai trò trong cùng một câu.` },
    ...(base.code === 'service' ? [{ key: 'ownership', title: 'Quyền đối với sản phẩm và tài liệu', body: 'Quyền sở hữu, sử dụng, thời điểm và phạm vi bàn giao: {{intellectualProperty}}.\nQuyền của bên thứ ba và các giới hạn sử dụng được các bên thông báo, ghi nhận phù hợp trước khi bàn giao.', guidance: 'Làm rõ tài liệu phải bàn giao và trách nhiệm thông báo giới hạn quyền; không tự cấp phép mã nguồn hay chuyển giao quyền chưa được thỏa thuận.' }] : []),
    ...ending,
  ] };
}
