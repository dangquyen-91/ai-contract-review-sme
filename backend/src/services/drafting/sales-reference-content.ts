import type { TemplateSection } from './templates';

// Reference: user-supplied sales contract; blank values are linked editor fields.
export const SALES_REFERENCE_OPENING: readonly string[] = [
  'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
  'Độc lập - Tự do - Hạnh phúc',
  '---o0o---',
  '{{signingPlace}}, ngày {{signingDate:day}} tháng {{signingDate:month}} năm {{signingDate:year}}',
  'HỢP ĐỒNG MUA BÁN HÀNG HÓA',
  'Số: {{reference}}/HĐMBHH',
  'Căn cứ Luật Thương mại số 36/2005/QH11 được Quốc hội nước Cộng hòa xã hội chủ nghĩa Việt Nam khóa XI thông qua ngày 14 tháng 6 năm 2005;',
  'Căn cứ Bộ luật Dân sự số 91/2015/QH13 được Quốc hội nước Cộng hòa xã hội chủ nghĩa Việt Nam khóa XIII thông qua ngày 24 tháng 11 năm 2015;',
  'Căn cứ Luật Chất lượng sản phẩm, hàng hóa số 05/2007/QH12 được Quốc hội nước Cộng hòa xã hội chủ nghĩa Việt Nam khóa XII thông qua ngày 21 tháng 11 năm 2007;',
  'Căn cứ Luật Bảo vệ quyền lợi người tiêu dùng số 19/2023/QH15 được Quốc hội nước Cộng hòa xã hội chủ nghĩa Việt Nam khóa XV thông qua ngày 20 tháng 6 năm 2023 (trong trường hợp Bên mua là người tiêu dùng);',
  'Căn cứ vào các văn bản hướng dẫn thi hành và các văn bản pháp luật khác có liên quan;',
  'Căn cứ vào nhu cầu và khả năng của hai bên, trên cơ sở tự nguyện, bình đẳng và thỏa thuận.',
  'Hợp đồng này được lập và ký kết bởi các bên có tên dưới đây:',
  'BÊN A (BÊN BÁN):',
  'Tên tổ chức/Họ và tên: {{companyName}}',
  'Mã số doanh nghiệp/Số CCCD: {{companyTaxCode}} Cấp ngày: {{companyIdIssuedDate}} Nơi cấp: {{companyIdIssuedPlace}}',
  'Địa chỉ trụ sở/thường trú: {{companyAddress}}',
  'Người đại diện: {{representative}} Chức vụ: {{representativePosition}}',
  '(Theo Giấy ủy quyền số {{authorization}} ngày {{authorizationDate}} nếu có)',
  'Số điện thoại: {{companyPhone}}',
  'Email: {{companyEmail}}',
  'Số tài khoản ngân hàng: {{sellerBankAccount}}',
  'Chủ tài khoản: {{sellerAccountHolder}}',
  'Ngân hàng: {{sellerBankName}}',
  'BÊN B (BÊN MUA):',
  'Tên tổ chức/Họ và tên: {{partnerName}}',
  'Mã số doanh nghiệp/Số CCCD: {{partnerIdentifier}} Cấp ngày: {{partnerIdIssuedDate}} Nơi cấp: {{partnerIdIssuedPlace}}',
  'Địa chỉ trụ sở/thường trú: {{partnerAddress}}',
  'Người đại diện: {{partnerRepresentative}} Chức vụ: {{partnerPosition}}',
  '(Theo Giấy ủy quyền số {{partnerAuthorization}} ngày {{partnerAuthorizationDate}} nếu có)',
  'Số điện thoại: {{partnerPhone}}',
  'Email: {{partnerEmail}}',
  'Hai bên đồng ý ký kết Hợp đồng mua bán hàng hóa (sau đây gọi tắt là "Hợp đồng") với các điều khoản và điều kiện chi tiết như sau:',
];

export const SALES_REFERENCE_SECTIONS: TemplateSection[] = [
  {
    key: 'salesArticle1',
    title: 'ĐỐI TƯỢNG CỦA HỢP ĐỒNG',
    body: '1. Bên A đồng ý bán và Bên B đồng ý mua các loại hàng hóa (sau đây gọi là "Hàng hóa") với chủng loại, số lượng, đơn vị tính, quy cách, chất lượng và đơn giá được mô tả chi tiết tại Phụ lục 01 đính kèm và là một phần không thể tách rời của Hợp đồng này.\n2. Bên A cam kết Hàng hóa là hàng mới 100% (một trăm phần trăm), chưa qua sử dụng, đúng nguồn gốc, xuất xứ, được phép lưu thông hợp pháp trên thị trường, không thuộc danh mục hàng hóa cấm kinh doanh hoặc hạn chế kinh doanh.\n3. Bên A cam kết Hàng hóa thuộc quyền sở hữu hợp pháp của Bên A, không có bất kỳ tranh chấp nào về quyền sở hữu, không phải là tài sản bảo đảm, không bị kê biên để thi hành án và không vi phạm quyền sở hữu trí tuệ của bất kỳ bên thứ ba nào. Nếu có tranh chấp phát sinh từ bên thứ ba liên quan đến các cam kết này, Bên A chịu hoàn toàn trách nhiệm giải quyết và bồi thường mọi thiệt hại cho Bên B.\n4. Hàng hóa phải được đóng gói theo quy cách, bao bì và có ký mã hiệu, nhãn mác phù hợp với tính chất của Hàng hóa, bảo đảm an toàn trong quá trình vận chuyển, bốc dỡ, lưu kho và bảo quản. Chi tiết về quy cách đóng gói được quy định tại Phụ lục 01. Trường hợp bao bì bị hư hỏng, rách vỡ, ẩm ướt làm ảnh hưởng đến chất lượng Hàng hóa bên trong thì được coi là Hàng hóa không phù hợp với Hợp đồng.',
  },
  {
    key: 'salesArticle2',
    title: 'THỜI HẠN VÀ GIA HẠN HỢP ĐỒNG',
    body: '1. Thời hạn của Hợp đồng là từ ngày Hợp đồng có hiệu lực cho đến khi hai bên hoàn thành đầy đủ các nghĩa vụ của mình và ký kết Biên bản thanh lý Hợp đồng.\n2. Thời hạn giao hàng được quy định chi tiết tại Điều 4 của Hợp đồng này.\n3. Trường hợp hai bên có nhu cầu tiếp tục mua bán sau khi hoàn thành Hợp đồng này, hai bên sẽ ký kết một hợp đồng mới hoặc một phụ lục gia hạn với các điều khoản được thỏa thuận lại.',
  },
  {
    key: 'salesArticle3',
    title: 'GIÁ TRỊ VÀ PHƯƠNG THỨC THANH TOÁN',
    body: '1. Tổng giá trị Hợp đồng được xác định trên cơ sở số lượng và đơn giá Hàng hóa tại Phụ lục 01, cụ thể:\na) Tổng giá trị Hàng hóa trước thuế: {{price}} VNĐ.\nb) Thuế giá trị gia tăng (VAT {{vatRate}}%): {{vatAmount}} VNĐ.\nc) Tổng giá trị Hợp đồng (đã bao gồm VAT): {{totalPrice}} VNĐ (Bằng chữ: {{priceInWords}} đồng Việt Nam).\n2. Đơn giá Hàng hóa là giá cố định trong suốt thời hạn thực hiện Hợp đồng, trừ trường hợp hai bên có thỏa thuận khác bằng một phụ lục được ký kết hợp lệ.\n3. Phương thức thanh toán: Bên B thanh toán cho Bên A bằng hình thức chuyển khoản vào tài khoản ngân hàng của Bên A đã nêu tại phần đầu Hợp đồng. Mọi chi phí liên quan đến việc chuyển khoản do Bên B chịu.\n4. Tiến độ thanh toán:\na) Đợt 1 (Tạm ứng): Bên B thanh toán cho Bên A số tiền là {{advanceAmount}} VNĐ (Bằng chữ: {{advanceInWords}} đồng Việt Nam), tương đương {{advancePercent}}% tổng giá trị Hợp đồng, trong vòng {{advanceDays}} ngày kể từ ngày hai bên ký kết Hợp đồng.\nb) Đợt 2 (Thanh toán phần còn lại): Bên B thanh toán số tiền còn lại là {{remainingAmount}} VNĐ (Bằng chữ: {{remainingInWords}} đồng Việt Nam) trong vòng {{remainingDays}} ngày kể từ ngày hai bên ký Biên bản nghiệm thu và Bên B nhận được đầy đủ hóa đơn giá trị gia tăng hợp lệ từ Bên A.\n5. Việc thanh toán được coi là hoàn thành khi số tiền được ghi có vào tài khoản của Bên A. Bên B có trách nhiệm thông báo cho Bên A kèm theo chứng từ chuyển khoản ngay sau mỗi lần thanh toán. Nếu Bên B không thông báo dẫn đến Bên A không ghi nhận được khoản thanh toán và làm chậm tiến độ giao hàng, Bên A sẽ không phải chịu trách nhiệm cho sự chậm trễ này.\n6. Bên A có trách nhiệm xuất hóa đơn giá trị gia tăng hợp lệ cho Bên B tương ứng với giá trị mỗi đợt thanh toán hoặc giá trị Hàng hóa đã giao, tùy theo thỏa thuận của hai bên.',
  },
  {
    key: 'salesArticle4',
    title: 'GIAO NHẬN HÀNG HÓA',
    body: '1. Thời hạn giao hàng: Bên A giao toàn bộ Hàng hóa cho Bên B trong vòng {{deliveryDays}} ngày kể từ ngày Bên A nhận được khoản thanh toán tạm ứng Đợt 1 theo điểm a khoản 4 Điều 3. Trường hợp giao hàng theo nhiều đợt, tiến độ chi tiết sẽ được quy định tại Phụ lục 01.\n2. Địa điểm giao hàng: {{deliveryPlace}}\n3. Chi phí vận chuyển và bốc xếp:\na) Chi phí vận chuyển Hàng hóa đến địa điểm giao hàng do Bên {{transportCostParty}} chịu.\nb) Chi phí bốc xếp Hàng hóa do mỗi bên chịu một đầu (Bên A chịu chi phí bốc hàng lên phương tiện vận chuyển, Bên B chịu chi phí dỡ hàng xuống tại địa điểm giao hàng).\n4. Thông báo giao hàng: Bên A phải thông báo bằng văn bản cho Bên B về thời gian giao hàng dự kiến trước ít nhất 48 (bốn mươi tám) giờ để Bên B chuẩn bị nhân lực và phương tiện tiếp nhận.\n5. Thủ tục giao nhận:\na) Tại thời điểm giao nhận, đại diện có thẩm quyền của hai bên cùng tiến hành kiểm tra, nghiệm thu Hàng hóa theo quy định tại Điều 5 của Hợp đồng này.\nb) Người nhận hàng của Bên B phải xuất trình giấy giới thiệu hoặc giấy ủy quyền hợp lệ.\nc) Việc giao nhận phải được lập thành Biên bản bàn giao và nghiệm thu, có chữ ký xác nhận của đại diện hai bên. Biên bản này là cơ sở để xác nhận việc hoàn thành nghĩa vụ giao hàng và tiến hành thanh toán.\n6. Xử lý khi có vi phạm về thời gian giao nhận:\na) Trường hợp Bên A giao hàng chậm so với thời hạn đã thỏa thuận, Bên A phải chịu phạt vi phạm theo quy định tại Điều 9 của Hợp đồng này.\nb) Trường hợp đến thời hạn giao hàng mà Bên B không nhận hàng hoặc từ chối nhận hàng không có lý do chính đáng, Bên B phải chịu mọi rủi ro đối với Hàng hóa kể từ thời điểm đó và thanh toán cho Bên A chi phí lưu kho, bảo quản thực tế phát sinh, nhưng không thấp hơn {{storageFee}} VNĐ/ngày.',
  },
  {
    key: 'salesArticle5',
    title: 'KIỂM TRA, KHIẾU NẠI VÀ ĐỔI TRẢ HÀNG HÓA',
    body: '1. Bên B có quyền và nghĩa vụ kiểm tra số lượng, chất lượng, quy cách, bao bì của Hàng hóa ngay tại thời điểm giao nhận. Mọi sai lệch phát hiện được phải được ghi rõ trong Biên bản bàn giao và nghiệm thu, có xác nhận của cả hai bên. Đây là cơ sở duy nhất để giải quyết các khiếu nại về sai lệch có thể nhận thấy bằng mắt thường.\n2. Đối với các khuyết tật của Hàng hóa không thể phát hiện được trong quá trình kiểm tra thông thường (khuyết tật ẩn tì), Bên B có quyền khiếu nại trong vòng {{complaintDays}} ngày kể từ ngày nhận hàng. Khiếu nại phải được lập thành văn bản, nêu rõ tình trạng khuyết tật và kèm theo bằng chứng (hình ảnh, video, biên bản giám định của bên thứ ba nếu có).\n3. Xử lý Hàng hóa không phù hợp:\na) Trường hợp Hàng hóa bị thiếu, sai chủng loại, quy cách hoặc có khuyết tật do lỗi của Bên A, Bên B có quyền từ chối nhận phần Hàng hóa không phù hợp và yêu cầu Bên A giao bổ sung, thay thế.\nb) Bên A có trách nhiệm khắc phục (giao bổ sung, thay thế bằng Hàng hóa mới đạt yêu cầu) trong vòng {{replacementDays}} ngày làm việc kể từ ngày nhận được khiếu nại hợp lệ của Bên B. Mọi chi phí phát sinh liên quan đến việc khắc phục, bao gồm chi phí vận chuyển, bốc xếp, giám định, do Bên A chịu.\nc) Quá thời hạn khắc phục nêu trên mà Bên A không thực hiện, Bên B có quyền hủy bỏ phần Hợp đồng tương ứng với lô hàng không phù hợp, yêu cầu Bên A hoàn trả số tiền đã thanh toán cho phần hàng hóa đó và áp dụng các chế tài theo Điều 9 của Hợp đồng này.\n4. Im lặng được coi là chấp nhận. Nếu quá thời hạn khiếu nại quy định tại khoản 1 và khoản 2 Điều này mà Bên B không có bất kỳ khiếu nại nào bằng văn bản, Hàng hóa được coi là đã được Bên B chấp nhận hoàn toàn về số lượng và chất lượng.',
  },
  {
    key: 'salesArticle6',
    title: 'QUYỀN VÀ NGHĨA VỤ CỦA BÊN A',
    body: '1. Quyền của Bên A:\na) Nhận đủ tiền thanh toán từ Bên B theo đúng thỏa thuận tại Điều 3.\nb) Yêu cầu Bên B tiếp nhận Hàng hóa đúng thời gian, địa điểm đã thỏa thuận.\nc) Tạm ngừng giao lô hàng tiếp theo nếu Bên B vi phạm nghĩa vụ thanh toán cho lô hàng trước đó, sau khi đã thông báo cho Bên B và cho một thời hạn hợp lý để khắc phục nhưng không có kết quả.\nd) Từ chối các yêu cầu đổi, trả Hàng hóa không có căn cứ hoặc không tuân thủ quy trình khiếu nại tại Điều 5.\n2. Nghĩa vụ của Bên A:\na) Giao Hàng hóa cho Bên B đúng chủng loại, đủ số lượng, đúng chất lượng, quy cách, bao bì và đúng tiến độ, địa điểm đã thỏa thuận.\nb) Cung cấp đầy đủ cho Bên B các chứng từ liên quan đến Hàng hóa như hóa đơn giá trị gia tăng, phiếu xuất kho, giấy chứng nhận chất lượng, xuất xứ (nếu có).\nc) Chịu trách nhiệm về tính pháp lý và chất lượng của Hàng hóa cho đến thời điểm chuyển giao rủi ro cho Bên B.\nd) Thực hiện nghĩa vụ bảo hành Hàng hóa theo quy định tại Điều 8.\ne) Bảo mật các thông tin liên quan đến Hợp đồng và hoạt động kinh doanh của Bên B.',
  },
  {
    key: 'salesArticle7',
    title: 'QUYỀN VÀ NGHĨA VỤ CỦA BÊN B',
    body: '1. Quyền của Bên B:\na) Nhận Hàng hóa đúng theo các thỏa thuận về số lượng, chất lượng, thời gian và địa điểm.\nb) Kiểm tra Hàng hóa tại thời điểm giao nhận và thực hiện quyền khiếu nại theo Điều 5.\nc) Yêu cầu Bên A giao bổ sung, thay thế hoặc sửa chữa Hàng hóa không phù hợp.\nd) Yêu cầu Bên A cung cấp đầy đủ hóa đơn, chứng từ hợp lệ.\ne) Hưởng chính sách bảo hành theo quy định tại Điều 8.\n2. Nghĩa vụ của Bên B:\na) Thanh toán đầy đủ và đúng hạn cho Bên A theo thỏa thuận tại Điều 3.\nb) Bố trí nhân lực, phương tiện và các điều kiện cần thiết để tiếp nhận Hàng hóa đúng thời gian, địa điểm đã thỏa thuận.\nc) Phối hợp với Bên A trong việc kiểm tra, nghiệm thu Hàng hóa và ký xác nhận vào các biên bản liên quan.\nd) Sử dụng và bảo quản Hàng hóa theo đúng hướng dẫn của nhà sản xuất hoặc của Bên A để đảm bảo quyền lợi bảo hành.\ne) Bảo mật các thông tin liên quan đến Hợp đồng và hoạt động kinh doanh của Bên A.',
  },
  {
    key: 'salesArticle8',
    title: 'CHUYỂN GIAO RỦI RO VÀ BẢO HÀNH',
    body: '1. Chuyển giao quyền sở hữu: Quyền sở hữu đối với Hàng hóa được chuyển từ Bên A sang Bên B kể từ thời điểm Bên B hoàn thành 100% (một trăm phần trăm) nghĩa vụ thanh toán theo Hợp đồng này.\n2. Chuyển giao rủi ro: Mọi rủi ro về mất mát, hư hỏng đối với Hàng hóa được chuyển từ Bên A sang Bên B kể từ thời điểm hai bên ký Biên bản bàn giao và nghiệm thu tại địa điểm giao hàng.\n3. Thời hạn bảo hành: Bên A bảo hành chất lượng Hàng hóa trong thời hạn {{warrantyMonths}} tháng kể từ ngày hai bên ký Biên bản bàn giao và nghiệm thu, hoặc theo thời hạn bảo hành của nhà sản xuất, tùy theo thời hạn nào dài hơn.\n4. Điều kiện bảo hành:\na) Trong thời hạn bảo hành, nếu Hàng hóa phát sinh hư hỏng, khuyết tật do lỗi kỹ thuật của nhà sản xuất hoặc do lỗi của Bên A, Bên A có trách nhiệm sửa chữa miễn phí hoặc đổi Hàng hóa mới cho Bên B.\nb) Bên B phải thông báo cho Bên A bằng văn bản ngay khi phát hiện khuyết tật. Bên A có trách nhiệm cử đại diện kỹ thuật đến kiểm tra và đưa ra phương án xử lý trong vòng {{warrantyResponseDays}} ngày làm việc kể từ ngày nhận được thông báo.\nc) Bên A không chịu trách nhiệm bảo hành đối với các hư hỏng do Bên B sử dụng, vận hành, bảo quản sai hướng dẫn, hoặc do hao mòn tự nhiên, hoặc do các tác động từ bên ngoài không thuộc lỗi của Bên A.',
  },
  {
    key: 'salesArticle9',
    title: 'PHẠT VI PHẠM VÀ BỒI THƯỜNG THIỆT HẠI',
    body: '1. Phạt chậm thanh toán: Trường hợp Bên B chậm thanh toán bất kỳ khoản nào so với thời hạn quy định tại Điều 3, Bên B phải chịu lãi chậm trả là 0,05% (không phẩy không năm phần trăm) trên số tiền chậm trả cho mỗi ngày chậm thanh toán.\n2. Phạt chậm giao hàng: Trường hợp Bên A chậm giao hàng so với thời hạn quy định tại Điều 4, Bên A phải chịu phạt vi phạm là 0,05% (không phẩy không năm phần trăm) trên giá trị phần Hàng hóa bị giao chậm cho mỗi ngày chậm trễ.\n3. Đối với các hành vi vi phạm khác không phải là chậm thực hiện nghĩa vụ, bên vi phạm phải chịu một khoản phạt bằng 8% (tám phần trăm) giá trị phần nghĩa vụ Hợp đồng bị vi phạm.\n4. Tổng mức phạt vi phạm đối với toàn bộ các hành vi vi phạm theo Hợp đồng này không vượt quá 8% (tám phần trăm) giá trị phần nghĩa vụ Hợp đồng bị vi phạm.\n5. Ngoài việc bị phạt vi phạm, bên vi phạm còn phải bồi thường toàn bộ thiệt hại thực tế phát sinh cho bên bị vi phạm, bao gồm cả khoản lợi trực tiếp mà bên bị vi phạm đáng lẽ được hưởng nếu không có hành vi vi phạm. Bên bị vi phạm có nghĩa vụ chứng minh thiệt hại và áp dụng các biện pháp hợp lý để hạn chế tổn thất.',
  },
  {
    key: 'salesArticle10',
    title: 'CHẤM DỨT HỢP ĐỒNG',
    body: '1. Hợp đồng này chấm dứt trong các trường hợp sau:\na) Hai bên đã hoàn thành đầy đủ các quyền và nghĩa vụ của mình.\nb) Hai bên đồng ý chấm dứt Hợp đồng trước thời hạn bằng văn bản.\nc) Một bên bị giải thể, phá sản theo quy định của pháp luật.\nd) Do sự kiện bất khả kháng kéo dài theo quy định tại Điều 11.\ne) Một bên đơn phương chấm dứt Hợp đồng theo khoản 2 Điều này.\n2. Một bên có quyền đơn phương chấm dứt Hợp đồng nếu bên kia vi phạm nghiêm trọng nghĩa vụ Hợp đồng và không khắc phục vi phạm trong thời hạn 15 (mười lăm) ngày kể từ ngày nhận được thông báo yêu cầu khắc phục. Các trường hợp sau được coi là vi phạm nghiêm trọng:\na) Bên A giao hàng chậm quá 30 (ba mươi) ngày so với thời hạn thỏa thuận.\nb) Hàng hóa giao không đúng chất lượng, quy cách một cách có hệ thống hoặc không thể khắc phục được.\nc) Bên B chậm thanh toán quá 30 (ba mươi) ngày so với thời hạn thỏa thuận.\n3. Hậu quả pháp lý của việc chấm dứt Hợp đồng: Việc chấm dứt Hợp đồng không làm ảnh hưởng đến các quyền và nghĩa vụ đã phát sinh trước đó, cũng như các điều khoản về phạt vi phạm, bồi thường thiệt hại, bảo mật và giải quyết tranh chấp.',
  },
  {
    key: 'salesArticle11',
    title: 'SỰ KIỆN BẤT KHẢ KHÁNG',
    body: '1. Sự kiện bất khả kháng là sự kiện xảy ra một cách khách quan, không thể lường trước và không thể khắc phục được mặc dù đã áp dụng mọi biện pháp cần thiết trong khả năng cho phép, bao gồm nhưng không giới hạn: thiên tai, hỏa hoạn, dịch bệnh, chiến tranh, lệnh cấm hoặc thay đổi chính sách của cơ quan nhà nước có thẩm quyền.\n2. Khi một bên không thể thực hiện nghĩa vụ do sự kiện bất khả kháng, bên đó phải thông báo cho bên kia bằng văn bản trong vòng 05 (năm) ngày kể từ ngày xảy ra sự kiện. Các bên không phải chịu trách nhiệm về việc không thực hiện nghĩa vụ trong thời gian xảy ra sự kiện bất khả kháng.\n3. Nếu sự kiện bất khả kháng kéo dài quá 30 (ba mươi) ngày, mỗi bên có quyền chấm dứt Hợp đồng. Trong trường hợp này, hai bên sẽ tiến hành thanh toán các phần nghĩa vụ đã thực hiện cho nhau và không bên nào phải bồi thường thiệt hại thêm.',
  },
  {
    key: 'salesArticle12',
    title: 'CAM KẾT CHUNG',
    body: '1. Hai bên cam kết thực hiện nghiêm túc và đầy đủ các điều khoản đã thỏa thuận trong Hợp đồng này. Bên nào vi phạm phải chịu trách nhiệm theo quy định của Hợp đồng và của pháp luật.\n2. Hai bên xác nhận đã đọc kỹ, hiểu rõ toàn bộ nội dung của Hợp đồng và hoàn toàn tự nguyện ký kết, không bị ép buộc, lừa dối.\n3. Mọi sửa đổi, bổ sung Hợp đồng này phải được lập thành phụ lục và có chữ ký xác nhận của cả hai bên mới có giá trị pháp lý.',
  },
  {
    key: 'salesArticle13',
    title: 'GIẢI QUYẾT TRANH CHẤP',
    body: '1. Trong quá trình thực hiện Hợp đồng, nếu có tranh chấp phát sinh, hai bên ưu tiên giải quyết thông qua thương lượng, hòa giải trong thời hạn 30 (ba mươi) ngày kể từ ngày một bên gửi thông báo về tranh chấp.\n2. Hết thời hạn nêu trên mà không giải quyết được, tranh chấp được đưa ra Tòa án nhân dân có thẩm quyền nơi Bên bị đơn có trụ sở chính để giải quyết theo quy định của pháp luật Việt Nam.',
  },
  {
    key: 'salesArticle14',
    title: 'THÔNG BÁO VÀ CÁCH TÍNH THỜI HẠN',
    body: '1. Mọi thông báo giữa hai bên theo Hợp đồng này được gửi bằng một trong các hình thức: trực tiếp có ký nhận, thư bảo đảm đến địa chỉ ghi tại phần đầu Hợp đồng, hoặc thư điện tử đến địa chỉ email đã đăng ký.\n2. Thông báo được coi là đã nhận: ngay khi ký nhận nếu gửi trực tiếp; sau 03 (ba) ngày làm việc kể từ ngày gửi nếu gửi bằng thư bảo đảm; ngay khi gửi thành công nếu gửi bằng thư điện tử trong giờ làm việc, hoặc vào đầu giờ làm việc kế tiếp nếu gửi ngoài giờ làm việc. "Ngày làm việc" là các ngày từ thứ Hai đến thứ Sáu, không bao gồm ngày nghỉ lễ, Tết theo quy định.\n3. Khi thay đổi thông tin liên lạc, bên thay đổi phải thông báo cho bên kia bằng văn bản trong 03 (ba) ngày làm việc. Nếu không thông báo, mọi thông báo gửi đến địa chỉ cũ vẫn được coi là hợp lệ.',
  },
  {
    key: 'salesArticle15',
    title: 'ĐIỀU KHOẢN THI HÀNH',
    body: '1. Hợp đồng này có hiệu lực pháp lý kể từ ngày ký.\n2. Hợp đồng này được lập thành 02 (hai) bản, mỗi bản có giá trị pháp lý như nhau, mỗi bên giữ 01 (một) bản để thực hiện.\n3. Hợp đồng này và các phụ lục đính kèm là một thể thống nhất và là bộ phận không tách rời của nhau.',
  },
];

export const SALES_REFERENCE_APPENDIX: readonly string[] = [
  'Quy cách đóng gói, bao bì, ký mã hiệu: {{packaging}}',
  'Tiến độ giao hàng (nếu giao nhiều đợt):',
  'Đợt 1: {{deliveryBatchOne}}',
  'Đợt 2: {{deliveryBatchTwo}}',
  'Tổng hợp giá trị:',
  'Tổng giá trị Hàng hóa trước thuế: {{price}} VNĐ',
  'Thuế giá trị gia tăng (VAT {{vatRate}}%): {{vatAmount}} VNĐ',
  'Tổng giá trị Hợp đồng (đã bao gồm VAT): {{totalPrice}} VNĐ',
  '(Bằng chữ: {{priceInWords}} đồng Việt Nam)',
  'Phụ lục này là một phần không thể tách rời của Hợp đồng.',
];
