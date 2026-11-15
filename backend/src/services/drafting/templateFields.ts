import type { ContractTemplate, TemplateField, TemplateSection } from './templates';

export const field = (
  key: string,
  label: string,
  kind: TemplateField['kind'] = 'text',
  group: TemplateField['group'] = 'terms',
  required = true,
): TemplateField => ({ key, label, kind, group, required });
export const section = (key: string, title: string, body: string): TemplateSection => ({
  key,
  title,
  body,
});
export const documentFields = [
  field('reference', 'Số hợp đồng', 'text', 'parties'),
  field('signingDate', 'Ngày ký dự kiến', 'date', 'parties'),
  field('signingPlace', 'Địa điểm ký', 'text', 'parties'),
];
export const individualFields = [
  ...documentFields,
  field('representative', 'Họ và tên của bạn', 'text', 'parties'),
  field('companyTaxCode', 'Số căn cước / hộ chiếu của bạn', 'text', 'parties'),
  field('companyAddress', 'Địa chỉ liên hệ của bạn', 'text', 'parties'),
  field('phone', 'Số điện thoại của bạn', 'text', 'parties'),
  field('partnerName', 'Tên bên còn lại', 'text', 'parties'),
  field('partnerIdentifier', 'Căn cước / mã số doanh nghiệp bên còn lại', 'text', 'parties'),
  field('partnerAddress', 'Địa chỉ bên còn lại', 'text', 'parties'),
  field(
    'partnerRepresentative',
    'Người đại diện và căn cứ đại diện (nếu có)',
    'text',
    'parties',
    false,
  ),
  field('partnerPhone', 'Số điện thoại bên còn lại', 'text', 'parties'),
];
export const closing = [
  section(
    'notices',
    'Thông báo và giải quyết tranh chấp',
    'Các bên gửi thông báo qua thông tin liên hệ trong hợp đồng và xác nhận việc tiếp nhận. Khi thay đổi thông tin phải thông báo cho bên còn lại.\nTranh chấp được ưu tiên thương lượng; nếu không giải quyết được, các bên thực hiện thủ tục tại cơ quan có thẩm quyền theo pháp luật áp dụng.',
  ),
  section(
    'effect',
    'Hiệu lực và tài liệu kèm theo',
    'Hợp đồng có hiệu lực từ ngày {{startDate}} theo các điều kiện giao kết áp dụng cho giao dịch. Các bên đọc, kiểm tra nội dung và thống nhất bằng văn bản về sửa đổi, bổ sung.\nMỗi bên giữ một bản và các phụ lục đã được thống nhất. Việc hoàn tất bản nháp trên hệ thống không thay thế ký kết, công chứng, chứng thực hoặc đăng ký khi giao dịch thuộc trường hợp phải thực hiện.',
  ),
];

export function withGroups(template: Omit<ContractTemplate, 'formGroups'>): ContractTemplate {
  return {
    ...template,
    formGroups: [
      {
        key: 'parties',
        title: 'Thông tin các bên',
        description: 'Đối chiếu thông tin người ký và giấy tờ giao dịch.',
        step: 'parties',
        fields: template.fields.filter((item) => item.group === 'parties').map((item) => item.key),
      },
      {
        key: 'terms',
        title: 'Điều khoản giao dịch',
        description: 'Điền nội dung theo hồ sơ và thỏa thuận thực tế.',
        step: 'terms',
        fields: template.fields.filter((item) => item.group === 'terms').map((item) => item.key),
      },
    ],
  };
}
