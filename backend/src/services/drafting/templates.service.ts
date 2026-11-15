import type { ContractTemplate } from './templates';
import { field, section, withGroups } from './templateFields';

export function buildServiceTemplate(base: ContractTemplate): ContractTemplate {
  return withGroups({
    ...base,
    version: 3,
    legalBasis:
      'Bộ luật Dân sự số 91/2015/QH13, các quy định về hợp đồng dịch vụ; Luật Thương mại số 36/2005/QH11 đã được sửa đổi, bổ sung khi dịch vụ thuộc phạm vi áp dụng; pháp luật sở hữu trí tuệ, bảo vệ dữ liệu cá nhân và pháp luật chuyên ngành liên quan đến dịch vụ thực tế.',
    fields: [
      ...base.fields,
      field(
        'acceptanceTerms',
        'Thời hạn phản hồi, tiêu chí nghiệm thu và cách xử lý lỗi',
        'textarea',
      ),
      field('changeControl', 'Thủ tục thay đổi phạm vi, giá và tiến độ', 'textarea'),
      field(
        'liabilityTerms',
        'Vi phạm, lãi chậm trả, bồi thường và giới hạn trách nhiệm',
        'textarea',
      ),
      field('terminationTerms', 'Điều kiện chấm dứt, báo trước và quyết toán', 'textarea'),
      field('dataHandling', 'Dữ liệu, tài khoản truy cập và bên thứ ba tham gia', 'textarea'),
    ],
    sections: [
      ...base.sections
        .filter(
          (item) =>
            !['confidentiality', 'termination', 'changes', 'disputes', 'effect'].includes(item.key),
        )
        .map((item) => {
          if (item.key === 'delivery')
            return {
              ...item,
              body:
                item.body +
                '\nĐiều kiện nghiệm thu và xử lý lỗi: {{acceptanceTerms}}. Các bên lập biên bản, ghi rõ hạng mục đạt, chưa đạt và hạn khắc phục. Việc im lặng không mặc nhiên xóa quyền yêu cầu khắc phục hoặc quyền đối với lỗi chưa thể phát hiện khi bàn giao.',
            };
          if (item.key === 'payment')
            return {
              ...item,
              body:
                item.body +
                '\nBên cung ứng lập hóa đơn đúng thời điểm pháp luật quy định, cung cấp chứng từ và chỉ định người nhận tiền có thẩm quyền. Việc lập hóa đơn không đồng nghĩa bên sử dụng đã nghiệm thu hoặc thanh toán.',
            };
          if (item.key === 'ownership')
            return {
              ...item,
              body:
                item.body +
                '\nViệc chuyển giao hoặc cấp phép chỉ áp dụng đối với quyền mà bên cung ứng có quyền định đoạt. Tài liệu có trước, phần mềm và thành phần của bên thứ ba được liệt kê kèm điều kiện sử dụng. Quyền nhân thân không được chuyển giao vẫn được bảo vệ theo pháp luật.',
            };
          return item;
        }),
      section(
        'changes',
        'Thay đổi phạm vi và phối hợp',
        'Thủ tục đề nghị, xác nhận và ghi nhận thay đổi: {{changeControl}}. Thay đổi phạm vi, giá, lịch bàn giao hoặc người phụ trách cần được người có thẩm quyền của hai bên xác nhận bằng văn bản trước khi thực hiện. Không coi yêu cầu đơn phương là nghĩa vụ cung cấp miễn phí ngoài phạm vi hợp đồng.',
      ),
      section(
        'data',
        'Bảo mật, dữ liệu và bên thứ ba',
        'Thỏa thuận về dữ liệu, tài khoản và bên thứ ba: {{dataHandling}}. Các bên giới hạn quyền truy cập, chỉ xử lý dữ liệu cho mục đích hợp pháp, phân định trách nhiệm khi có sự cố, hoàn trả hoặc xóa dữ liệu theo thỏa thuận và nghĩa vụ lưu trữ bắt buộc. Việc thuê bên thứ ba không tự miễn trách nhiệm của bên cung ứng; không chuyển giao dữ liệu hoặc quyền truy cập vượt thẩm quyền. Bảo mật không ngăn việc cung cấp thông tin theo yêu cầu hợp pháp của cơ quan có thẩm quyền.',
      ),
      section(
        'liability',
        'Vi phạm và trách nhiệm',
        'Thỏa thuận trách nhiệm: {{liabilityTerms}}. Phạt vi phạm chỉ áp dụng nếu có thỏa thuận hợp lệ; với dịch vụ thương mại thông thường thuộc Luật Thương mại, mức phạt tuân thủ giới hạn tại Điều 301, không lấy toàn bộ giá trị hợp đồng thay cho phần nghĩa vụ bị vi phạm. Lãi chậm trả được xác định theo thỏa thuận hợp pháp và Điều 306 khi thuộc phạm vi áp dụng. Bồi thường phải có căn cứ, chứng minh thiệt hại và quan hệ nhân quả; không mặc nhiên áp dụng mức phạt thương mại cho mọi hợp đồng dân sự hoặc loại bỏ quyền bắt buộc của người tiêu dùng.',
      ),
      section(
        'termination',
        'Tạm ngừng, chấm dứt và quyết toán',
        'Điều kiện, thông báo và quyết toán: {{terminationTerms}}. Việc chấm dứt phải có căn cứ theo hợp đồng và pháp luật; các bên xác nhận phần công việc hợp lệ đã thực hiện, khoản phải thanh toán, hoàn trả, dữ liệu và tài sản bàn giao. Trường hợp bất khả kháng phải chứng minh điều kiện, thông báo và hạn chế thiệt hại; không tự miễn mọi nghĩa vụ thanh toán đã phát sinh.',
      ),
      section(
        'disputes',
        'Giải quyết tranh chấp',
        'Tranh chấp được ưu tiên thương lượng; nếu không giải quyết được thì yêu cầu Tòa án có thẩm quyền. Trọng tài chỉ áp dụng khi có thỏa thuận trọng tài hợp lệ và tranh chấp thuộc thẩm quyền trọng tài. Việc thỏa thuận không loại bỏ quyền, thủ tục bắt buộc của bên được pháp luật bảo vệ.',
      ),
      section(
        'effect',
        'Hiệu lực và tài liệu hợp đồng',
        'Hợp đồng có hiệu lực từ {{startDate}} theo điều kiện giao kết hợp pháp. Phụ lục phạm vi, tiêu chí nghiệm thu, giá và tiến độ là bộ phận của hợp đồng khi được thống nhất. Các bên kiểm tra và ký bằng hình thức phù hợp; hoàn tất bản nháp trên hệ thống không thay thế việc giao kết. Mỗi bên lưu một bản và các xác nhận thay đổi.',
      ),
    ],
    reviewNotes: [
      'Chỉ dùng cho dịch vụ thông thường; dịch vụ có điều kiện hoặc quy định chuyên ngành cần bổ sung giấy phép, điều kiện và điều khoản tương ứng.',
      'Đối chiếu phạm vi, nghiệm thu, quyền đối với sản phẩm, dữ liệu và giới hạn trách nhiệm với thỏa thuận thực tế; không tự mặc định thuế suất hoặc chuyển giao quyền của bên thứ ba.',
      'Căn cứ tham khảo: https://vanban.chinhphu.vn/?docid=215232&pageid=27160 và https://vanban.chinhphu.vn/?classid=1&docid=183188&pageid=27160.',
    ],
  });
}
