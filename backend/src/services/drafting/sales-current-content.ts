import type { TemplateSection } from './templates';
import { SALES_REFERENCE_OPENING } from './sales-reference-content';

const article = (number: number, title: string, lines: string[]): TemplateSection => ({
  key: `salesArticle${number}`,
  title,
  body: lines.join('\n'),
  guidance:
    'Không tự đặt lãi suất, mức phạt, miễn trách nhiệm hoặc loại bỏ quyền khiếu nại. Đối chiếu vai trò, dữ liệu và luật được cung cấp.',
});

// Keep the opening's indexes stable for the existing seller/buyer field mapping.
export const SALES_CURRENT_OPENING = SALES_REFERENCE_OPENING.map((line, index) =>
  index === 8
    ? 'Căn cứ Luật Chất lượng sản phẩm, hàng hóa số 05/2007/QH12 đã được sửa đổi, bổ sung, bao gồm Luật số 78/2025/QH15 có hiệu lực từ ngày 01/01/2026;'
    : line,
);

export const SALES_CURRENT_SECTIONS: TemplateSection[] = [
  article(1, 'ĐỐI TƯỢNG VÀ CHẤT LƯỢNG HÀNG HÓA', [
    '1. Bên A bán và Bên B mua hàng hóa theo Phụ lục 01: chủng loại, số lượng, đơn vị, đơn giá, tình trạng mới hoặc đã qua sử dụng, xuất xứ và yêu cầu chất lượng phải ghi rõ.',
    '2. Hàng hóa phải được phép giao dịch, đáp ứng tiêu chuẩn và quy chuẩn bắt buộc áp dụng. Bên bán cung cấp hồ sơ pháp lý, nhãn, hướng dẫn và chứng từ chất lượng theo loại hàng; không mặc định mọi hàng đều mới hoặc đều cần cùng một chứng nhận.',
    '3. Bên bán bảo đảm quyền bán hợp pháp, thông báo hạn chế quyền sở hữu, quyền của bên thứ ba và tình trạng bảo đảm nếu có. Việc xử lý tranh chấp, thu hồi và bồi thường căn cứ pháp luật và chứng cứ.',
    '4. Quy cách đóng gói, bao bì và ký mã hiệu tại Phụ lục 01 phải phù hợp việc vận chuyển, bảo quản và kiểm tra hàng.',
  ]),
  article(2, 'THỜI HẠN VÀ THAY ĐỔI PHẠM VI', [
    '1. Thời điểm hiệu lực quy định tại Điều 15; tiến độ giao hàng và nghĩa vụ thanh toán theo Điều 3, Điều 4 và Phụ lục 01.',
    '2. Gia hạn, đổi hàng, thay đổi số lượng hoặc giá phải được các bên thống nhất bằng văn bản. Việc chưa ký biên bản thanh lý không tự làm phát sinh nghĩa vụ giao thêm hàng hoặc thanh toán khoản chưa thỏa thuận.',
  ]),
  article(3, 'GIÁ TRỊ, THUẾ VÀ THANH TOÁN', [
    '1. Giá trị trước thuế: {{price}} VND. Thuế suất VAT áp dụng: {{vatRate}}%; tiền VAT: {{vatAmount}} VND. Tổng thanh toán: {{totalPrice}} VND (bằng chữ: {{priceInWords}}). Trường hợp không chịu thuế hoặc miễn thuế cần ghi căn cứ trong chứng từ; hệ thống không xác định thay nghĩa vụ thuế.',
    '2. Bên B chuyển khoản vào tài khoản bên bán đã ghi trong hợp đồng; các bên xác minh thay đổi tài khoản và lưu chứng từ. Phí ngân hàng theo dịch vụ và thỏa thuận; không thu trùng khoản đã tính trong giá.',
    '3. Tạm ứng: {{advanceAmount}} VND (bằng chữ: {{advanceInWords}}), tương đương {{advancePercent}}% tổng thanh toán, trong {{advanceDays}} ngày từ ngày ký. Nếu tạm ứng bằng 0 thì không phát sinh đợt tạm ứng và không được dùng đợt này để trì hoãn giao hàng.',
    '4. Phần còn lại: {{remainingAmount}} VND (bằng chữ: {{remainingInWords}}), trong {{remainingDays}} ngày từ khi nhận đủ hàng, hồ sơ nghiệm thu và hóa đơn hợp lệ theo giao dịch. Các mốc khác phải ghi rõ trong phụ lục được thống nhất.',
    '5. Tiền được ghi nhận khi đã vào tài khoản đúng người nhận. Thiếu thông báo chuyển tiền không tự miễn trách nhiệm giao hàng nếu bên bán có thể đối chiếu khoản đã nhận.',
    '6. Bên bán lập hóa đơn đúng loại, thời điểm và nội dung theo pháp luật hóa đơn, thuế; không được trì hoãn thời điểm lập hóa đơn bắt buộc chỉ bằng thỏa thuận thanh toán.',
  ]),
  article(4, 'GIAO NHẬN VÀ BẢO QUẢN', [
    '1. Giao hàng trong {{deliveryDays}} ngày từ khi nhận tạm ứng; nếu không tạm ứng thì tính từ ngày ký, trừ mốc khác tại Phụ lục 01. Địa điểm: {{deliveryPlace}}. Tiến độ từng đợt ghi trong phụ lục.',
    '2. Phí vận chuyển do Bên {{transportCostParty}} chịu; bốc xếp và các chi phí khác được ghi rõ tại phụ lục, không tự phát sinh khoản ngoài thỏa thuận.',
    '3. Bên bán thông báo trước 48 (bốn mươi tám) giờ về lịch giao dự kiến; hai bên xác nhận đầu mối có thẩm quyền, tình trạng, số lượng và chứng từ bằng biên bản hoặc hình thức có thể đối chiếu.',
    '4. Nếu bên mua chậm nhận, bên bán thông báo và bảo quản hợp lý. Chi phí lưu kho thỏa thuận: {{storageFee}} VND/ngày; khoản yêu cầu thanh toán phải có căn cứ, không thu trùng. Chuyển rủi ro chỉ khi đủ điều kiện pháp luật, không mặc nhiên chuyển mọi rủi ro vì từ chối nhận hàng có căn cứ.',
  ]),
  article(5, 'KIỂM TRA, KHIẾU NẠI VÀ KHẮC PHỤC', [
    '1. Hai bên kiểm tra khi giao nhận, ghi sai lệch và bảo lưu ý kiến. Biên bản là một nguồn chứng cứ, không phải nguồn duy nhất; có thể đối chiếu chứng từ, hình ảnh, giám định và tài liệu hợp pháp khác.',
    '2. Thời hạn thông báo khiếu nại khuyết tật ẩn theo thỏa thuận: {{complaintDays}} ngày; áp dụng cùng nghĩa vụ bảo hành và quy định bắt buộc. Không dùng thời hạn này để loại bỏ quyền hợp pháp của người tiêu dùng hoặc trách nhiệm không được phép loại trừ.',
    '3. Bên bán bổ sung, sửa chữa hoặc thay thế hàng không phù hợp trong {{replacementDays}} ngày làm việc từ khi xác nhận yêu cầu có căn cứ; phân định chi phí theo lỗi, nghĩa vụ và chứng từ.',
    '4. Im lặng hoặc ký nhận không tự động đồng nghĩa từ bỏ mọi quyền khiếu nại, bảo hành hoặc yêu cầu xử lý khuyết tật ẩn. Nếu không khắc phục, áp dụng quyền và chế tài phù hợp pháp luật, không tự động hủy toàn bộ hợp đồng trong mọi trường hợp.',
  ]),
  article(6, 'QUYỀN VÀ NGHĨA VỤ BÊN BÁN', [
    'Bên A giao đúng hàng, chất lượng, tiến độ và hồ sơ; giải thích hướng dẫn sử dụng, thực hiện bảo hành và phối hợp xử lý sản phẩm không an toàn khi pháp luật yêu cầu.',
    'Bên A có quyền nhận tiền, yêu cầu tiếp nhận hàng và áp dụng biện pháp xử lý vi phạm khi có căn cứ. Tạm ngừng giao hàng phải đúng điều kiện, thông báo và phạm vi; không mặc nhiên giữ mọi khoản tiền của bên mua.',
  ]),
  article(7, 'QUYỀN VÀ NGHĨA VỤ BÊN MUA', [
    'Bên B thanh toán, phối hợp nhận, kiểm tra và bảo quản hàng đúng hướng dẫn; cung cấp thông tin cần thiết và thông báo sai lệch kịp thời.',
    'Bên B có quyền nhận hàng phù hợp, yêu cầu hồ sơ, bảo hành và khắc phục; không phải từ bỏ quyền pháp luật bảo vệ vì đã thanh toán hoặc ký biên bản.',
  ]),
  article(8, 'QUYỀN SỞ HỮU, RỦI RO VÀ BẢO HÀNH', [
    '1. Quyền sở hữu và rủi ro là các vấn đề khác nhau. Quyền sở hữu chuyển khi giao hàng, trừ thỏa thuận bảo lưu hợp pháp được lập bằng văn bản; việc đối kháng bên thứ ba thực hiện theo quy định áp dụng.',
    '2. Rủi ro chuyển theo thỏa thuận và Điều 57 đến Điều 61 Luật Thương mại khi thuộc phạm vi áp dụng. Chuyển rủi ro không xóa trách nhiệm về hàng không phù hợp hoặc vi phạm đã có trước đó.',
    '3. Bảo hành theo thỏa thuận: {{warrantyMonths}} tháng từ khi bàn giao, không làm giảm nghĩa vụ bắt buộc hoặc quyền lợi bảo hành đã cam kết khác. Phản hồi yêu cầu trong {{warrantyResponseDays}} ngày làm việc.',
    '4. Xử lý lỗi, đổi trả, chi phí và trường hợp loại trừ phải được giải thích và chứng minh; không tự động từ chối do hao mòn hoặc sử dụng sai khi chưa xác định nguyên nhân.',
  ]),
  article(9, 'LÃI CHẬM TRẢ, PHẠT VÀ BỒI THƯỜNG', [
    '1. Lãi chậm thanh toán: {{latePaymentTerms}}. Phải phân biệt lãi chậm trả với phạt vi phạm; nếu không có thỏa thuận hợp pháp thì xác định theo Điều 306 Luật Thương mại hoặc quy định dân sự tương ứng với giao dịch.',
    '2. Mức phạt các bên lựa chọn: {{penaltyPercent}}% giá trị phần nghĩa vụ bị vi phạm. Chọn 0 nghĩa là không thỏa thuận phạt. Khi Luật Thương mại áp dụng, tổng mức phạt tuân thủ Điều 301, không vượt 8% giá trị phần nghĩa vụ bị vi phạm trong phạm vi điều luật này; không tính trên toàn bộ hợp đồng nếu chỉ một phần nghĩa vụ bị vi phạm.',
    '3. Bồi thường cần có căn cứ trách nhiệm, thiệt hại và quan hệ nhân quả; bên yêu cầu chứng minh và hạn chế tổn thất. Không đồng nhất khoản phạt, lãi và thiệt hại hoặc thu trùng cho cùng một khoản tổn thất.',
  ]),
  article(10, 'TẠM NGỪNG, ĐÌNH CHỈ VÀ HỦY BỎ', [
    '1. Hai bên có thể thống nhất chấm dứt bằng văn bản và đối chiếu nghĩa vụ còn lại. Tạm ngừng, đình chỉ, hủy bỏ hoặc đơn phương chấm dứt phải có căn cứ theo thỏa thuận hợp pháp và pháp luật tương ứng.',
    '2. Bên áp dụng chế tài nêu căn cứ, phạm vi và hậu quả, thông báo đúng quy định; cho cơ hội khắc phục nếu thuộc trường hợp phải thực hiện. Không mặc định mọi chậm giao, chậm trả đều là vi phạm cơ bản.',
    '3. Xác định riêng hoàn trả hàng, tiền, lãi, phạt và bồi thường theo chế tài thực tế; không tự động xóa bảo hành, quyền khiếu nại hoặc công nợ đã phát sinh.',
  ]),
  article(11, 'BẤT KHẢ KHÁNG VÀ MIỄN TRÁCH NHIỆM', [
    'Chỉ miễn trách nhiệm khi chứng minh đủ điều kiện theo Điều 294, Điều 295 Luật Thương mại hoặc pháp luật tương ứng. Thiên tai, dịch bệnh hay thay đổi chính sách không tự động là căn cứ miễn mọi nghĩa vụ.',
    'Bên bị ảnh hưởng thông báo kịp thời, cung cấp chứng cứ và hạn chế thiệt hại; hai bên thống nhất xử lý phần bị ảnh hưởng. Không tự xóa nghĩa vụ thanh toán phần đã thực hiện hoặc mọi trách nhiệm ngoài phạm vi sự kiện.',
  ]),
  article(12, 'BẢO MẬT VÀ SỬA ĐỔI', [
    'Thông tin chưa công khai chỉ được dùng cho thực hiện hợp đồng, với phạm vi tiếp cận phù hợp. Bảo mật không ngăn cung cấp thông tin theo pháp luật, khiếu nại hoặc bảo vệ quyền hợp pháp.',
    'Sửa đổi, bổ sung được thống nhất bằng văn bản và có xác nhận của người có thẩm quyền; không tự thay đổi giá, chất lượng hoặc miễn nghĩa vụ chỉ bằng thông báo đơn phương.',
  ]),
  article(13, 'GIẢI QUYẾT TRANH CHẤP', [
    'Ưu tiên thương lượng, hòa giải và lưu tài liệu. Nếu không giải quyết được, yêu cầu cơ quan có thẩm quyền theo pháp luật; trọng tài chỉ khi có thỏa thuận trọng tài hợp lệ. Thương lượng không được dùng để làm mất quyền yêu cầu hoặc thời hiệu theo luật.',
  ]),
  article(14, 'THÔNG BÁO VÀ ĐỐI CHIẾU', [
    'Thông báo qua địa chỉ và đầu mối đã ghi trong hợp đồng bằng cách có thể xác nhận việc tiếp nhận. Lưu chứng từ gửi, nhận; email gửi thành công không tự chứng minh bên kia đã nhận trong mọi tình huống.',
    'Thay đổi đầu mối cần thông báo kịp thời. Thời hạn theo ngày làm việc hay ngày lịch phải được xác định rõ; các bên không mặc nhiên bỏ qua ngày nghỉ hoặc nghĩa vụ thông báo bắt buộc.',
  ]),
  article(15, 'ĐIỀU KHOẢN THI HÀNH', [
    'Hợp đồng có hiệu lực từ khi được các bên giao kết hợp lệ, trừ thỏa thuận khác bằng văn bản. Hợp đồng giấy lập 02 bản, mỗi bên giữ 01 bản; giao kết điện tử theo điều kiện pháp luật áp dụng.',
    'Phụ lục 01 ghi đầy đủ hàng hóa và tiến độ. Nội dung không được giảm quyền bắt buộc của người tiêu dùng hoặc trái quy định chuyên ngành có liên quan.',
  ]),
];
