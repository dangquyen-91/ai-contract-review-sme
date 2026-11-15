import type { TemplateSection } from './templates';

const article = (key: string, title: string, lines: string[]): TemplateSection => ({
  key,
  title,
  body: lines.join('\n'),
  guidance:
    'Chỉ đề xuất theo thông tin và nguồn luật được cung cấp; không tự đặt mức phạt, cấm cạnh tranh hoặc hạn chế quyền nghỉ việc.',
});

// Mẫu v5, đối chiếu Bộ luật Lao động hợp nhất 18/VBHN-VPQH ngày 12/02/2026.
export const LABOR_SECTIONS: TemplateSection[] = [
  article('employment', 'Hình thức, công việc, địa điểm và thời hạn', [
    '1. Loại hợp đồng: {{termType}}. Ngày bắt đầu làm việc: {{startDate}}. Ngày kết thúc (chỉ áp dụng với hợp đồng xác định thời hạn): {{endDate}}.',
    '2. Chức danh: {{jobTitle}}. Công việc cụ thể: {{job}}. Địa điểm làm việc đã thỏa thuận: {{workplace}}.',
    '3. Thay đổi công việc hoặc địa điểm ngoài phạm vi hợp đồng cần được thống nhất theo Điều 28 và Điều 33 Bộ luật Lao động, trừ trường hợp pháp luật cho phép.',
    '4. Tạm chuyển làm công việc khác chỉ khi đủ điều kiện tại Điều 29; thông báo trước ít nhất 03 ngày làm việc, nêu thời hạn và bố trí công việc phù hợp. Tổng thời gian không quá 60 ngày làm việc cộng dồn trong một năm; vượt giới hạn phải có sự đồng ý bằng văn bản của người lao động. Lương và quyền lợi thực hiện theo điều luật này.',
    '5. Không mặc nhiên chấm dứt hợp đồng chỉ vì người lao động không đồng ý với đề nghị thay đổi công việc hoặc địa điểm.',
  ]),
  article('conditions', 'Tiền lương và điều kiện làm việc', [
    '1. Lương theo công việc / chức danh: {{salary}} VND/tháng (bằng chữ: {{salaryInWords}}). Mức lương phải đáp ứng mức tối thiểu áp dụng tại nơi làm việc và thời điểm trả lương.',
    '2. Phụ cấp và các khoản bổ sung: {{allowances}}. Hình thức trả lương: {{payment}}. Kỳ hạn trả: {{salaryPaymentDay}}. Các bên ghi rõ mức tiền hoặc cách xác định từng khoản.',
    '3. Chế độ nâng bậc, nâng lương: {{salaryReview}}. Thưởng, lương tháng thứ 13 và phúc lợi khác chỉ áp dụng khi có cam kết hoặc quy chế hợp pháp tương ứng.',
    '4. Lịch làm việc: {{workingTime}}. Thứ Bảy: {{saturdayHours}}. Chủ nhật: {{sundayHours}}. Thời giờ làm việc, nghỉ giữa giờ và chuyển ca phải tuân thủ Bộ luật Lao động.',
    '5. Làm thêm phải đáp ứng điều kiện về sự đồng ý, giới hạn giờ và tiền lương tại Điều 98, Điều 107; ngoại lệ về sự đồng ý chỉ áp dụng đúng Điều 108.',
    '6. Nghỉ hằng tuần: {{weeklyRest}}. Bảo đảm ít nhất 24 giờ liên tục mỗi tuần; nếu chu kỳ đặc biệt không thể nghỉ hằng tuần thì bảo đảm bình quân một tháng ít nhất 04 ngày nghỉ theo Điều 111.',
    '7. Nghỉ hằng năm theo Điều 113 và Điều 114: đủ 12 tháng làm việc được nghỉ 12, 14 hoặc 16 ngày làm việc tùy đối tượng và công việc; chưa đủ 12 tháng tính theo tỷ lệ. Cứ đủ 05 năm làm việc cho cùng người sử dụng lao động được tăng thêm 01 ngày.',
    '8. Nghỉ lễ, tết theo Điều 112. Nếu ngày nghỉ hằng tuần trùng ngày lễ, tết thì nghỉ bù ngày nghỉ hằng tuần vào ngày làm việc kế tiếp theo khoản 3 Điều 111.',
    '9. Bảo hiểm xã hội, bảo hiểm y tế, bảo hiểm thất nghiệp: {{insurance}}. Đối tượng, căn cứ, mức đóng và thời gian tham gia theo pháp luật có hiệu lực; không loại bỏ nghĩa vụ bắt buộc bằng thỏa thuận.',
    '10. Trang bị bảo hộ và điều kiện an toàn: {{protection}}. Đào tạo, bồi dưỡng kỹ năng: {{training}}.',
  ]),
  article('employeeRights', 'Quyền của người lao động', [
    '1. Được bố trí công việc theo thỏa thuận, trả lương đầy đủ, đúng hạn và thông tin rõ về các khoản khấu trừ; được bảo đảm an toàn, nghỉ ngơi, bảo hiểm và quyền lợi theo pháp luật.',
    '2. Được bảo vệ khỏi phân biệt đối xử, cưỡng bức lao động và quấy rối tình dục; được yêu cầu giải thích, khiếu nại, tố cáo và giải quyết tranh chấp theo pháp luật.',
    '3. Được thực hiện quyền đơn phương chấm dứt hợp đồng theo Điều 35; nghĩa vụ bảo mật không loại bỏ các quyền hợp pháp này.',
  ]),
  article('employeeDuties', 'Nghĩa vụ của người lao động', [
    '1. Thực hiện công việc đã giao kết, tuân thủ nội quy hợp pháp, hướng dẫn an toàn; bảo quản tài sản được giao và thông báo sự cố.',
    '2. Thực hiện phần nghĩa vụ bảo hiểm, thuế thuộc trách nhiệm của mình. Khấu trừ lương phải có căn cứ, thông báo rõ và tuân thủ giới hạn pháp luật.',
    '3. Khi đào tạo bằng kinh phí của người sử dụng lao động hoặc đối tác tài trợ, các bên lập hợp đồng đào tạo theo Điều 62, ghi rõ chi phí, thời hạn cam kết và trách nhiệm hoàn trả.',
    '4. Hoàn trả chi phí đào tạo chỉ khi có căn cứ theo pháp luật và thỏa thuận đào tạo hợp pháp, dựa trên chi phí có chứng từ hợp lệ. Không tự động buộc hoàn toàn bộ học phí, tiền lương và mọi chế độ chỉ vì nghỉ việc.',
    '5. Bàn giao công việc, hồ sơ và tài sản khi kết thúc; việc bàn giao không được dùng để trì hoãn trái luật thanh toán quyền lợi.',
  ]),
  article('employerRights', 'Quyền của người sử dụng lao động', [
    '1. Tổ chức, điều hành, đánh giá công việc trong phạm vi hợp đồng, nội quy và pháp luật; đánh giá phải có căn cứ và được thông tin rõ.',
    '2. Thay đổi, tạm chuyển công việc theo điều kiện pháp luật, không áp đặt quyền điều chuyển không giới hạn hoặc yêu cầu từ bỏ quyền lợi.',
    '3. Xử lý kỷ luật theo Điều 122 đến Điều 127, đúng căn cứ, thẩm quyền, trình tự và thời hiệu. Không phạt tiền, cắt lương thay xử lý kỷ luật; trách nhiệm vật chất được xem xét riêng.',
  ]),
  article('employerDuties', 'Nghĩa vụ của người sử dụng lao động', [
    '1. Bảo đảm công việc, nơi làm việc, lương, nghỉ ngơi và chế độ đã giao kết; tôn trọng danh dự, nhân phẩm và quyền của người lao động.',
    '2. Kê khai, đóng phần bảo hiểm thuộc trách nhiệm doanh nghiệp đúng quy định và cung cấp thông tin để người lao động kiểm tra.',
    '3. Cấp bảo hộ, hướng dẫn an toàn, phòng ngừa tai nạn và tổ chức đào tạo theo thỏa thuận; không chuyển phần nghĩa vụ bắt buộc của doanh nghiệp sang người lao động.',
    '4. Khi chấm dứt, hoàn thành xác nhận thời gian đóng bảo hiểm, trả giấy tờ gốc đã giữ và cung cấp bản sao tài liệu về quá trình làm việc khi có yêu cầu theo Điều 48.',
  ]),
  article('termination', 'Chấm dứt hợp đồng và thanh toán quyền lợi', [
    '1. Căn cứ chấm dứt theo Điều 34. Thỏa thuận chấm dứt, đơn phương chấm dứt và sa thải là các trường hợp khác nhau, phải tuân thủ điều kiện và thủ tục tương ứng.',
    '2. Người lao động có quyền đơn phương chấm dứt theo Điều 35, không phải chứng minh một lý do thuộc danh sách trong mẫu cũ. Báo trước thông thường: ít nhất 45 ngày với hợp đồng không xác định thời hạn; 30 ngày với hợp đồng từ 12 đến 36 tháng; 03 ngày làm việc với hợp đồng dưới 12 tháng. Trường hợp không cần báo trước và ngành, nghề đặc thù áp dụng quy định tương ứng.',
    '3. Người sử dụng lao động chỉ đơn phương chấm dứt khi có căn cứ Điều 36, tuân thủ báo trước và các trường hợp không được chấm dứt tại Điều 37; không tự thêm căn cứ từ nội quy hoặc bất đồng điều chuyển.',
    '4. Sa thải chỉ khi đủ điều kiện Điều 125 và đúng trình tự xử lý kỷ luật; không dùng danh sách căn cứ đơn phương chấm dứt thay thủ tục sa thải.',
    '5. Thanh toán quyền lợi trong 14 ngày làm việc kể từ ngày chấm dứt; chỉ kéo dài khi thuộc khoản 1 Điều 48 và không quá 30 ngày. Trợ cấp, bảo hiểm và quyền lợi khác thực hiện theo điều kiện pháp luật áp dụng.',
    '6. Hậu quả đơn phương chấm dứt trái pháp luật theo Điều 40, Điều 41 và quy định liên quan; không mặc định một mức bồi thường cho mọi tình huống.',
  ]),
  article('confidentialInformation', 'Phạm vi thông tin cần bảo mật', [
    '1. Thông tin cần bảo mật là bí mật kinh doanh, bí mật công nghệ và thông tin chưa công khai được giao hợp pháp để làm việc, có phạm vi nhận biết rõ và biện pháp bảo vệ phù hợp.',
    '2. Không mặc định mọi kiến thức, kinh nghiệm nghề nghiệp, dữ liệu cá nhân hoặc mọi thông tin công ty đều là bí mật. Thông tin đã công khai hợp pháp, phát triển độc lập hoặc có được hợp pháp từ bên khác không tự động thuộc phạm vi này.',
    '3. Tài liệu khách hàng, kỹ thuật, tài chính và nhân sự phải được xác định phạm vi tiếp cận và xử lý theo pháp luật áp dụng, bao gồm quy định về bảo vệ dữ liệu cá nhân.',
  ]),
  article('confidentialDuties', 'Thực hiện bảo mật và trách nhiệm khi vi phạm', [
    '1. Sử dụng thông tin đúng nhiệm vụ, chỉ chia sẻ cho người có quyền tiếp cận; bảo quản và hoàn trả tài liệu theo hướng dẫn hợp pháp.',
    '2. Người có thẩm quyền tiếp nhận yêu cầu tiết lộ, hoàn trả hoặc xử lý tài liệu: {{generalDirector}}. Khi có lộ lọt, các bên thông báo và phối hợp hạn chế thiệt hại.',
    '3. Bảo mật không ngăn cản cung cấp thông tin theo pháp luật, yêu cầu cơ quan có thẩm quyền, khiếu nại, tố cáo hoặc bảo vệ quyền lợi hợp pháp. Thông báo cho công ty chỉ thực hiện trong phạm vi pháp luật cho phép.',
    '4. Công việc liên quan trực tiếp bí mật kinh doanh, công nghệ có thể được các bên lập thỏa thuận bằng văn bản theo khoản 2 Điều 21, ghi rõ nội dung, thời hạn bảo vệ, quyền lợi và trách nhiệm phù hợp pháp luật.',
    '5. Mẫu này không đặt nghĩa vụ cấm cạnh tranh sau nghỉ việc. Mọi đề nghị hạn chế hoạt động nghề nghiệp phải được xem xét riêng về căn cứ, phạm vi và hiệu lực, không suy diễn từ nghĩa vụ bảo mật.',
    '6. Bồi thường chỉ xem xét khi có căn cứ, chứng cứ thiệt hại và trách nhiệm theo pháp luật, đúng trình tự. Không tự động áp mức phạt hoặc bồi thường cố định theo số tháng lương.',
  ]),
  article('otherAgreements', 'Sửa đổi và thỏa thuận bổ sung', [
    'Bên đề nghị sửa đổi thông báo trước ít nhất 03 ngày làm việc về nội dung cần sửa theo Điều 33. Khi thống nhất, hai bên ký phụ lục hoặc hợp đồng mới; nếu không thống nhất thì tiếp tục hợp đồng đã giao kết.',
    'Phụ lục ghi rõ nội dung và thời điểm áp dụng; không sửa thời hạn hợp đồng bằng phụ lục theo Điều 22. Không giảm quyền lợi tối thiểu bắt buộc hoặc vô hiệu hóa quyền của người lao động.',
  ]),
  article('disputes', 'Giải quyết tranh chấp', [
    'Các bên ưu tiên đối thoại, thương lượng. Hòa giải, trọng tài lao động hoặc yêu cầu Tòa án thực hiện đúng thẩm quyền, thời hiệu và điều kiện của từng loại tranh chấp; thực hiện hòa giải trước khi khởi kiện nếu thuộc trường hợp bắt buộc.',
    'Không yêu cầu người lao động từ bỏ quyền khiếu nại, tố cáo hoặc giải quyết tranh chấp vì đã ký hợp đồng.',
  ]),
  article('effect', 'Điều khoản thi hành', [
    '1. Hợp đồng có hiệu lực từ ngày {{effectiveDate:day}} tháng {{effectiveDate:month}} năm {{effectiveDate:year}}. Ngày bắt đầu làm việc và thời hạn xác định tại Điều 1.',
    '2. Nội dung chưa thỏa thuận áp dụng pháp luật lao động và thỏa ước có hiệu lực đối với các bên. Nội quy không thay thế điều kiện bắt buộc của pháp luật.',
    '3. Các bên đã đọc, hiểu và tự nguyện ký. Hợp đồng giấy lập 02 bản, mỗi bên giữ 01 bản; giao kết điện tử tuân thủ điều kiện pháp luật về hợp đồng lao động điện tử.',
  ]),
];
