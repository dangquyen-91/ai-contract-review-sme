import type { ClauseCategory } from '../../models/clauseTypeTaxonomy.model';
import type { PROFILE_SEGMENTS } from '../../models/contractProfile.model';
import type { SensitiveDataType } from '../ai/redaction.service';
import type { LegalSourceCode } from '../legal/legalSourceCatalog.data';

export const DEFAULT_INDUSTRIES = [
  { code: 'fnb', name: 'Ăn uống (F&B)' },
  { code: 'retail', name: 'Bán lẻ' },
  { code: 'it_services', name: 'Dịch vụ công nghệ thông tin' },
] as const;

type IndustryCode = (typeof DEFAULT_INDUSTRIES)[number]['code'];

interface DefaultIndustryRule {
  industry: IndustryCode;
  checks: string[];
  extraMandatoryClauses?: ClauseCategory[];
}

export interface DefaultProfile {
  code: string;
  aliases?: string[];
  name: string;
  promptLabel: string;
  segment: (typeof PROFILE_SEGMENTS)[number];
  parties: { code: string; name: string }[];
  legalSources: LegalSourceCode[];
  clauseCategories: ClauseCategory[];
  mandatoryClauses: ClauseCategory[];
  industryRules?: DefaultIndustryRule[];
  redactionPolicy: SensitiveDataType[];
}
const PERSONAL_DATA: SensitiveDataType[] = [
  'person_name',
  'national_id',
  'passport',
  'date_of_birth',
  'phone',
  'email',
  'bank_account',
  'personal_address',
];

export const DEFAULT_PROFILES: DefaultProfile[] = [
  {
    code: 'sales',
    name: 'Mua bán hàng hoá',
    promptLabel: 'hợp đồng mua bán hàng hóa',
    segment: 'business',
    redactionPolicy: PERSONAL_DATA,
    parties: [
      { code: 'buyer', name: 'Bên mua' },
      { code: 'seller', name: 'Bên bán' },
    ],
    legalSources: ['commercial_law_2005', 'civil_code_2015'],
    clauseCategories: [
      'subject_scope', 'payment', 'delivery_handover', 'warranty', 'confidentiality', 'penalty',
      'indemnity', 'liability', 'termination', 'force_majeure', 'dispute_resolution', 'other',
    ],
    mandatoryClauses: ['subject_scope', 'payment', 'delivery_handover', 'warranty', 'termination', 'dispute_resolution'],
    industryRules: [
      {
        industry: 'fnb',
        checks: [
          'Thời gian khắc phục khi thiết bị hỏng trong giờ kinh doanh',
          'Giấy chứng nhận an toàn thực phẩm và nguồn gốc xuất xứ đối với nguyên liệu, thực phẩm',
          'Đổi trả hàng hư hỏng, hết hạn sử dụng',
        ],
      },
      {
        industry: 'retail',
        checks: [
          'Điều kiện trả lại hàng tồn, hàng chậm bán',
          'Chiết khấu, thưởng doanh số và điều kiện áp dụng',
          'Trách nhiệm của bên bán khi hàng giả, hàng kém chất lượng',
        ],
      },
      {
        industry: 'it_services',
        checks: [
          'Bản quyền phần mềm cài sẵn hoặc đi kèm thiết bị',
          'Hỗ trợ kỹ thuật và thời gian phản hồi sự cố',
        ],
      },
    ],
  },
  {
    code: 'service',
    aliases: ['saas'],
    name: 'Cung ứng dịch vụ',
    promptLabel: 'hợp đồng cung ứng dịch vụ',
    segment: 'business',
    redactionPolicy: PERSONAL_DATA,
    parties: [
      { code: 'client', name: 'Bên thuê dịch vụ' },
      { code: 'provider', name: 'Bên cung ứng dịch vụ' },
    ],
    legalSources: ['commercial_law_2005', 'civil_code_2015'],
    clauseCategories: [
      'subject_scope', 'payment', 'term', 'delivery_handover', 'service_level', 'warranty',
      'confidentiality', 'data_protection', 'intellectual_property', 'penalty', 'indemnity',
      'liability', 'renewal', 'termination', 'force_majeure', 'dispute_resolution', 'other',
    ],
    mandatoryClauses: ['subject_scope', 'payment', 'term', 'delivery_handover', 'termination', 'dispute_resolution'],
    industryRules: [
      {
        industry: 'it_services',
        checks: [
          'Cam kết mức dịch vụ (SLA), thời gian phản hồi và mức bồi hoàn khi vi phạm',
          'Quyền sở hữu mã nguồn, dữ liệu và kết quả công việc',
          'Bảo vệ dữ liệu cá nhân của khách hàng khi bên cung ứng xử lý thay',
          'Bàn giao dữ liệu khi chấm dứt hợp đồng',
        ],
        extraMandatoryClauses: ['service_level', 'intellectual_property', 'data_protection'],
      },
      {
        industry: 'fnb',
        checks: [
          'Tiêu chuẩn vệ sinh an toàn thực phẩm khi thuê dịch vụ chế biến, cung cấp suất ăn',
          'Tần suất và phạm vi dịch vụ vệ sinh, bảo trì thiết bị bếp',
        ],
      },
      {
        industry: 'retail',
        checks: [
          'Phạm vi và chi phí dịch vụ vận chuyển, giao hàng',
          'Trách nhiệm khi hàng hoá thất lạc, hư hỏng trong quá trình cung ứng dịch vụ',
        ],
      },
    ],
  },
  {
    code: 'office_lease',
    name: 'Thuê văn phòng, mặt bằng',
    promptLabel: 'hợp đồng thuê văn phòng / mặt bằng kinh doanh',
    segment: 'business',
    redactionPolicy: [...PERSONAL_DATA, 'land_certificate'],
    parties: [
      { code: 'lessee', name: 'Bên thuê' },
      { code: 'lessor', name: 'Bên cho thuê' },
    ],
    legalSources: ['civil_code_2015', 'real_estate_business_law_2023'],
    clauseCategories: [
      'subject_scope', 'property_legal_status', 'payment', 'deposit', 'term', 'delivery_handover',
      'maintenance_repair', 'sublease_transfer', 'renewal', 'penalty', 'indemnity', 'termination',
      'force_majeure', 'dispute_resolution', 'other',
    ],
    mandatoryClauses: [
      'subject_scope', 'property_legal_status', 'payment', 'term', 'delivery_handover',
      'maintenance_repair', 'termination', 'dispute_resolution',
    ],
    industryRules: [
      {
        industry: 'fnb',
        checks: [
          'Quyền cải tạo, lắp đặt bếp, hệ thống hút khói, thoát nước',
          'Trách nhiệm về phòng cháy chữa cháy và các giấy phép liên quan',
          'Xử lý phần cải tạo, trang thiết bị khi hết hạn thuê',
        ],
      },
      {
        industry: 'retail',
        checks: [
          'Quyền đặt biển hiệu, sử dụng mặt tiền',
          'Phí dịch vụ, phí quản lý và cách điều chỉnh',
          'Giờ hoạt động được phép',
        ],
      },
      {
        industry: 'it_services',
        checks: [
          'Giờ ra vào toà nhà, chi phí điện và điều hoà ngoài giờ',
          'Quyền lắp đặt hạ tầng mạng, phòng máy chủ',
        ],
      },
    ],
  },
  {
    code: 'labor',
    name: 'Hợp đồng lao động',
    promptLabel: 'hợp đồng lao động',
    segment: 'both',
    redactionPolicy: [...PERSONAL_DATA, 'tax_code'],
    parties: [
      { code: 'employee', name: 'Người lao động' },
      { code: 'employer', name: 'Người sử dụng lao động' },
    ],
    legalSources: ['labor_code_2019', 'decree_145_2020'],
    clauseCategories: [
      'subject_scope', 'term', 'probation', 'wages', 'working_time', 'social_insurance',
      'confidentiality', 'intellectual_property', 'penalty', 'indemnity', 'termination',
      'dispute_resolution', 'other',
    ],
    mandatoryClauses: ['subject_scope', 'term', 'wages', 'working_time', 'social_insurance'],
    industryRules: [
      {
        industry: 'it_services',
        checks: [
          'Quyền sở hữu mã nguồn, sản phẩm tạo ra trong thời gian làm việc',
          'Cam kết không cạnh tranh, không lôi kéo khách hàng sau khi nghỉ việc',
        ],
        extraMandatoryClauses: ['confidentiality', 'intellectual_property'],
      },
      {
        industry: 'fnb',
        checks: [
          'Ca làm việc, làm thêm giờ và làm việc ngày lễ, Tết',
          'Khám sức khoẻ và chứng nhận kiến thức an toàn thực phẩm',
        ],
      },
      {
        industry: 'retail',
        checks: [
          'Chỉ tiêu doanh số và cách tính thưởng',
          'Trách nhiệm bồi thường khi thất thoát hàng hoá',
        ],
      },
    ],
  },
  {
    code: 'housing_purchase',
    name: 'Đặt cọc, mua bán nhà ở',
    promptLabel: 'hợp đồng đặt cọc / mua bán nhà ở',
    segment: 'individual',
    redactionPolicy: [...PERSONAL_DATA, 'tax_code', 'land_certificate'],
    parties: [
      { code: 'buyer', name: 'Bên mua' },
      { code: 'seller', name: 'Bên bán' },
    ],
    legalSources: ['housing_law_2023', 'real_estate_business_law_2023', 'land_law_2024', 'civil_code_2015'],
    clauseCategories: [
      'subject_scope', 'property_legal_status', 'payment', 'deposit', 'delivery_handover', 'warranty',
      'ownership_transfer', 'penalty', 'termination', 'force_majeure', 'dispute_resolution', 'other',
    ],
    mandatoryClauses: [
      'subject_scope', 'property_legal_status', 'payment', 'delivery_handover', 'warranty',
      'ownership_transfer', 'termination', 'dispute_resolution',
    ],
  },
  {
    code: 'life_insurance',
    name: 'Bảo hiểm nhân thọ',
    promptLabel: 'hợp đồng bảo hiểm nhân thọ',
    segment: 'individual',
    redactionPolicy: [...PERSONAL_DATA, 'tax_code'],
    parties: [
      { code: 'policyholder', name: 'Bên mua bảo hiểm' },
      { code: 'insurer', name: 'Doanh nghiệp bảo hiểm' },
    ],
    legalSources: ['insurance_business_law_2022', 'civil_code_2015'],
    clauseCategories: [
      'subject_scope', 'payment', 'term', 'insurance_benefits', 'insurance_exclusions', 'claims',
      'surrender_value', 'termination', 'dispute_resolution', 'other',
    ],
    mandatoryClauses: [
      'subject_scope', 'payment', 'term', 'insurance_benefits', 'insurance_exclusions', 'claims',
      'surrender_value', 'termination', 'dispute_resolution',
    ],
  },
];
