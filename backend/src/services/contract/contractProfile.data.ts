import type { ClauseCategory } from '../../models/clauseTypeTaxonomy.model';
import type { PROFILE_SEGMENTS } from '../../models/contractProfile.model';
import type { SensitiveDataType } from '../ai/redaction.service';
import type { LegalSourceCode } from '../legal/legalSourceCatalog.data';
import { SALES_LEGAL_SOURCE_CODES } from '../legal/legalSourceCatalog.data';

export const DEFAULT_INDUSTRIES = [
  { code: 'fnb', name: 'Ăn uống (F&B)' },
  { code: 'retail', name: 'Bán lẻ' },
  { code: 'it_services', name: 'Dịch vụ công nghệ thông tin' },
] as const;

export interface DefaultProfile {
  code: string;
  aliases?: string[];
  name: string;
  promptLabel: string;
  segment: (typeof PROFILE_SEGMENTS)[number];
  parties: { code: string; name: string }[];
  legalSources: LegalSourceCode[];
  clauseCategories: ClauseCategory[];
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
    legalSources: SALES_LEGAL_SOURCE_CODES,
    clauseCategories: [
      'subject_scope', 'payment', 'delivery_handover', 'warranty', 'confidentiality', 'penalty',
      'indemnity', 'liability', 'termination', 'force_majeure', 'dispute_resolution', 'other',
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
  },
];
