export type TemplateCode = 'labor' | 'service' | 'sales';
export interface TemplateField {
  key: string;
  label: string;
  kind: 'text' | 'textarea' | 'date' | 'number' | 'select' | 'items';
  required: boolean;
  group: 'parties' | 'terms';
  options?: { value: string; label: string }[];
  placeholder?: string;
  help?: string;
  defaultValue?: string;
}
export interface TemplateSection { key: string; title: string; body: string; guidance?: string }
export interface FormGroup { key: string; title: string; description: string; step: 'parties' | 'terms'; fields: string[] }
export interface ContractTemplate {
  code: TemplateCode;
  name: string;
  description: string;
  version: number;
  fields: TemplateField[];
  sections: TemplateSection[];
  legalBasis: string;
  parties: { code: string; name: string }[];
  formGroups?: FormGroup[];
}
import { buildDetailedTemplate } from './templates.v2';

const field = (key: string, label: string, kind: TemplateField['kind'] = 'text', required = true, group: TemplateField['group'] = 'terms'): TemplateField => ({ key, label, kind, required, group });
const commonFields: TemplateField[] = [
  field('companyTaxCode', 'Mã số thuế doanh nghiệp', 'text', true, 'parties'),
  field('companyAddress', 'Địa chỉ doanh nghiệp', 'text', true, 'parties'),
  field('reference', 'Số hợp đồng', 'text', true, 'parties'),
  field('signingDate', 'Ngày ký dự kiến', 'date', true, 'parties'),
  field('signingPlace', 'Địa điểm ký', 'text', true, 'parties'),
  field('representative', 'Người đại diện doanh nghiệp', 'text', true, 'parties'),
  field('representativePosition', 'Chức vụ người đại diện', 'text', true, 'parties'),
  field('authorization', 'Căn cứ ủy quyền (nếu có)', 'text', false, 'parties'),
  field('partnerName', 'Tên bên đối tác / người lao động', 'text', true, 'parties'),
  field('partnerAddress', 'Địa chỉ bên đối tác / người lao động', 'text', true, 'parties'),
  field('partnerIdentifier', 'Mã số thuế / số căn cước / hộ chiếu', 'text', true, 'parties'),
  field('partnerRepresentative', 'Người đại diện đối tác và chức vụ (nếu có)', 'text', false, 'parties'),
  field('startDate', 'Ngày bắt đầu hiệu lực', 'date'),
  field('endDate', 'Ngày kết thúc (bỏ trống nếu không xác định thời hạn)', 'date', false),
];
const commercialFields: TemplateField[] = [
  field('scope', 'Công việc / danh mục hàng hóa, số lượng và quy cách', 'textarea'),
  field('price', 'Tổng giá trị trước thuế (VND)', 'number'),
  field('tax', 'Thuế và tổng giá trị thanh toán', 'textarea'),
  field('payment', 'Phương thức, các đợt và thời hạn thanh toán', 'textarea'),
  field('handover', 'Tiến độ, địa điểm bàn giao và tiêu chí nghiệm thu', 'textarea'),
  field('warranty', 'Bảo hành, hỗ trợ / xử lý sai sót', 'textarea'),
];
const commonSections: TemplateSection[] = [
  { key: 'confidentiality', title: 'Bảo mật thông tin', body: 'Các bên bảo mật thông tin nhận được trong quá trình thực hiện hợp đồng, chỉ sử dụng cho mục đích thực hiện hợp đồng; việc cung cấp thông tin theo yêu cầu hợp pháp được thực hiện theo pháp luật áp dụng.' },
  { key: 'termination', title: 'Thay đổi và chấm dứt hợp đồng', body: 'Việc sửa đổi hợp đồng phải được các bên thống nhất bằng văn bản. Căn cứ chấm dứt, thông báo và nghĩa vụ còn lại thực hiện theo thỏa thuận hợp pháp và pháp luật áp dụng; không tự động miễn nghĩa vụ đã phát sinh.' },
  { key: 'disputes', title: 'Giải quyết tranh chấp và hiệu lực', body: 'Hợp đồng áp dụng pháp luật Việt Nam. Các bên ưu tiên thương lượng; nếu không giải quyết được thì thực hiện thủ tục tại cơ quan có thẩm quyền theo pháp luật áp dụng. Hợp đồng có hiệu lực từ {{startDate}}; mỗi bên giữ một bản có giá trị như nhau.' },
];

const BASE_TEMPLATES: readonly ContractTemplate[] = [
  {
    code: 'labor', name: 'Hợp đồng lao động', version: 1,
    description: 'Doanh nghiệp tuyển người lao động Việt Nam từ đủ 18 tuổi; xác định hoặc không xác định thời hạn.',
    legalBasis: 'Bộ luật Lao động số 45/2019/QH14 và các văn bản sửa đổi, bổ sung, hướng dẫn có liên quan.',
    parties: [{ code: 'employer', name: 'Người sử dụng lao động' }],
    fields: [
      ...commonFields,
      field('partnerBirthDate', 'Ngày sinh người lao động', 'date', true, 'parties'),
      field('partnerGender', 'Giới tính người lao động', 'text', true, 'parties'),
      { ...field('termType', 'Loại thời hạn'), kind: 'select', options: [{ value: 'fixed', label: 'Xác định thời hạn' }, { value: 'indefinite', label: 'Không xác định thời hạn' }] },
      field('job', 'Chức danh và mô tả công việc', 'textarea'),
      field('workplace', 'Địa điểm làm việc'),
      field('salary', 'Mức lương theo công việc / chức danh (VND/tháng)', 'number'),
      field('allowances', 'Phụ cấp và các khoản bổ sung (ghi Không nếu không có)', 'textarea'),
      field('payment', 'Hình thức và kỳ hạn trả lương', 'textarea'),
      field('workingTime', 'Thời giờ làm việc và nghỉ ngơi', 'textarea'),
      field('salaryReview', 'Chế độ nâng bậc, nâng lương', 'textarea'),
      field('insurance', 'Bảo hiểm xã hội, y tế và thất nghiệp', 'textarea'),
      field('protection', 'Trang bị bảo hộ lao động', 'textarea'),
      field('training', 'Đào tạo, bồi dưỡng và nâng cao kỹ năng', 'textarea'),
    ],
    sections: [
      { key: 'employment', title: 'Công việc, địa điểm và thời hạn', body: 'Công việc: {{job}}. Địa điểm: {{workplace}}. Loại hợp đồng: {{termType}}. Bắt đầu từ {{startDate}}; thời điểm kết thúc: {{endDate}}.' },
      { key: 'salary', title: 'Tiền lương và chế độ nâng lương', body: 'Lương theo công việc / chức danh: {{salary}} VND/tháng. Phụ cấp và khoản bổ sung: {{allowances}}. Hình thức và kỳ trả lương: {{payment}}. Nâng bậc, nâng lương: {{salaryReview}}.' },
      { key: 'workingTime', title: 'Thời giờ làm việc, nghỉ ngơi và bảo hộ', body: 'Thời giờ làm việc, nghỉ ngơi: {{workingTime}}. Trang bị bảo hộ lao động: {{protection}}.' },
      { key: 'benefits', title: 'Bảo hiểm và đào tạo', body: 'Bảo hiểm xã hội, bảo hiểm y tế và bảo hiểm thất nghiệp: {{insurance}}. Đào tạo, bồi dưỡng và nâng cao trình độ, kỹ năng nghề: {{training}}.' },
      ...commonSections,
    ],
  },
  {
    code: 'service', name: 'Hợp đồng dịch vụ', version: 1,
    description: 'Dịch vụ thông thường trong nước với phạm vi công việc, sản phẩm bàn giao và tiêu chí nghiệm thu.',
    legalBasis: 'Bộ luật Dân sự số 91/2015/QH13; Luật Thương mại số 36/2005/QH11 khi thuộc phạm vi áp dụng, cùng các văn bản sửa đổi, bổ sung có liên quan.',
    parties: [{ code: 'provider', name: 'Bên cung cấp dịch vụ' }, { code: 'client', name: 'Bên sử dụng dịch vụ' }],
    fields: [...commonFields, ...commercialFields, field('intellectualProperty', 'Quyền sở hữu và sử dụng sản phẩm bàn giao', 'textarea')],
    sections: [
      { key: 'scope', title: 'Phạm vi và sản phẩm dịch vụ', body: 'Phạm vi công việc và sản phẩm bàn giao: {{scope}}. Thời gian thực hiện từ {{startDate}} đến {{endDate}}.' },
      { key: 'price', title: 'Giá dịch vụ và thanh toán', body: 'Giá trị trước thuế: {{price}} VND. Thuế và tổng thanh toán: {{tax}}. Phương thức và tiến độ thanh toán: {{payment}}.' },
      { key: 'handover', title: 'Bàn giao, nghiệm thu và hỗ trợ', body: 'Tiến độ, địa điểm và tiêu chí nghiệm thu: {{handover}}. Bảo hành và xử lý sai sót: {{warranty}}.' },
      { key: 'ownership', title: 'Quyền đối với sản phẩm dịch vụ', body: 'Quyền sở hữu, bàn giao và sử dụng sản phẩm: {{intellectualProperty}}.' },
      ...commonSections,
    ],
  },
  {
    code: 'sales', name: 'Hợp đồng mua bán hàng hóa', version: 1,
    description: 'Mua bán hàng hóa thông thường trong nước; ghi rõ hàng hóa, giá, giao nhận và bảo hành.',
    legalBasis: 'Bộ luật Dân sự số 91/2015/QH13; Luật Thương mại số 36/2005/QH11 khi thuộc phạm vi áp dụng, cùng các văn bản sửa đổi, bổ sung có liên quan.',
    parties: [{ code: 'seller', name: 'Bên bán' }, { code: 'buyer', name: 'Bên mua' }],
    fields: [...commonFields, ...commercialFields],
    sections: [
      { key: 'goods', title: 'Hàng hóa và yêu cầu chất lượng', body: 'Danh mục hàng hóa, số lượng, đơn vị tính, đơn giá và quy cách: {{scope}}.' },
      { key: 'price', title: 'Giá trị và thanh toán', body: 'Giá trị trước thuế: {{price}} VND. Thuế và tổng thanh toán: {{tax}}. Phương thức và tiến độ thanh toán: {{payment}}.' },
      { key: 'delivery', title: 'Giao hàng, kiểm tra và nghiệm thu', body: 'Thời gian thực hiện từ {{startDate}} đến {{endDate}}. Giao nhận và kiểm tra hàng hóa: {{handover}}.' },
      { key: 'warranty', title: 'Bảo hành và xử lý hàng không phù hợp', body: 'Bảo hành, hỗ trợ và xử lý hàng không phù hợp: {{warranty}}.' },
      ...commonSections,
    ],
  },
];

export const CONTRACT_TEMPLATES: readonly ContractTemplate[] = BASE_TEMPLATES.map(buildDetailedTemplate);

export function getTemplate(code: TemplateCode) {
  return CONTRACT_TEMPLATES.find(template => template.code === code)!;
}
