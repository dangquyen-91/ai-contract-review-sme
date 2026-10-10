import { HydratedDocument } from 'mongoose';
import { AppError } from '../errors/AppError';
import { ClauseCategory } from '../models/clauseTypeTaxonomy.model';
import { ContractProfile, ContractProfileModel, PROFILE_SEGMENTS } from '../models/contractProfile.model';
import { IndustryModel } from '../models/industry.model';
import { getTaxonomyByCodes } from './clauseTypeTaxonomy.service';
import type { SensitiveDataType } from './redaction.service';

const DEFAULT_INDUSTRIES = [
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

interface DefaultProfile {
  code: string;
  aliases?: string[];
  name: string;
  promptLabel: string;
  segment: (typeof PROFILE_SEGMENTS)[number];
  parties: { code: string; name: string }[];
  governingLaws: string[];
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

const DEFAULT_PROFILES: DefaultProfile[] = [
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
    governingLaws: ['Luật Thương mại 2005', 'Bộ luật Dân sự 2015'],
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
    governingLaws: ['Luật Thương mại 2005', 'Bộ luật Dân sự 2015'],
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
    governingLaws: ['Bộ luật Dân sự 2015', 'Luật Kinh doanh bất động sản 2023'],
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
    governingLaws: ['Bộ luật Lao động 2019', 'Nghị định 145/2020/NĐ-CP'],
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
    governingLaws: [
      'Luật Nhà ở 2023',
      'Luật Kinh doanh bất động sản 2023',
      'Luật Đất đai 2024',
      'Bộ luật Dân sự 2015',
    ],
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
    governingLaws: ['Luật Kinh doanh bảo hiểm 2022', 'Bộ luật Dân sự 2015'],
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

function assertProfileConsistency(profile: DefaultProfile) {
  const categories = new Set(profile.clauseCategories);
  const industries = new Set<string>(DEFAULT_INDUSTRIES.map((i) => i.code));
  const problems = [
    ...(categories.has('other') ? [] : ['clauseCategories must include "other"']),
    ...profile.mandatoryClauses
      .filter((code) => !categories.has(code))
      .map((code) => `mandatory clause "${code}" is not in clauseCategories`),
    ...(profile.industryRules ?? []).flatMap((rule) => [
      ...(industries.has(rule.industry) ? [] : [`unknown industry "${rule.industry}"`]),
      ...(rule.extraMandatoryClauses ?? [])
        .filter((code) => !categories.has(code))
        .map((code) => `${rule.industry} extra mandatory clause "${code}" is not in clauseCategories`),
    ]),
    ...(new Set(profile.parties.map((p) => p.code)).size === profile.parties.length
      ? []
      : ['party codes must be unique']),
  ];
  if (problems.length > 0) {
    throw new Error(`Invalid contract profile "${profile.code}": ${problems.join('; ')}`);
  }
}

export async function seedDefaultContractProfiles(): Promise<void> {
  DEFAULT_PROFILES.forEach(assertProfileConsistency);

  await Promise.all(
    DEFAULT_INDUSTRIES.map((industry) =>
      IndustryModel.findOneAndUpdate({ code: industry.code }, { $set: industry }, { upsert: true }),
    ),
  );

  await Promise.all(
    DEFAULT_PROFILES.map((profile) =>
      ContractProfileModel.findOneAndUpdate(
        { code: profile.code },
        { $set: { aliases: [], industryRules: [], ...profile } },
        { upsert: true, runValidators: true },
      ),
    ),
  );
}

type ProfileDocument = HydratedDocument<ContractProfile>;

export async function resolveContractProfile(code: string): Promise<ProfileDocument> {
  const profile = await ContractProfileModel.findOne({ $or: [{ code }, { aliases: code }] });
  if (!profile) {
    throw AppError.badRequest(`Unknown contract type: ${code}`);
  }
  return profile;
}

export async function validateContractContext(
  profile: ProfileDocument,
  context: { ourParty?: string; industry?: string },
) {
  if (context.ourParty && !profile.parties.some((p) => p.code === context.ourParty)) {
    const allowed = profile.parties.map((p) => p.code).join(', ');
    throw AppError.badRequest(`ourParty must be one of: ${allowed}`);
  }
  if (context.industry && !(await IndustryModel.exists({ code: context.industry }))) {
    throw AppError.badRequest(`Unknown industry: ${context.industry}`);
  }
}

export interface ReviewContext {
  profileCode: string;
  contractLabel: string;
  governingLaws: string[];
  partyName?: string;
  industryName?: string;
  industryChecks: string[];
  clauseCategories: ClauseCategory[];
  mandatoryClauses: ClauseCategory[];
  redactionPolicy: SensitiveDataType[];
}

export async function buildReviewContext(contract: {
  type: string;
  ourParty?: string | null;
  industry?: string | null;
}): Promise<ReviewContext> {
  const profile = await resolveContractProfile(contract.type);
  const rule = contract.industry
    ? profile.industryRules.find((r) => r.industry === contract.industry)
    : undefined;
  const industry = contract.industry
    ? await IndustryModel.findOne({ code: contract.industry })
    : null;

  return {
    profileCode: profile.code,
    contractLabel: profile.promptLabel,
    governingLaws: profile.governingLaws,
    partyName: profile.parties.find((p) => p.code === contract.ourParty)?.name,
    industryName: industry?.name,
    industryChecks: rule?.checks ?? [],
    clauseCategories: profile.clauseCategories as ClauseCategory[],
    mandatoryClauses: [
      ...new Set([...profile.mandatoryClauses, ...(rule?.extraMandatoryClauses ?? [])]),
    ] as ClauseCategory[],
    redactionPolicy: profile.redactionPolicy as SensitiveDataType[],
  };
}

export function describeReviewContext(context: ReviewContext): string {
  return [
    `Contract type: Vietnamese ${context.contractLabel}.`,
    context.governingLaws.length > 0
      ? `Main governing Vietnamese law: ${context.governingLaws.join(', ')}.`
      : '',
    context.partyName
      ? `The user is "${context.partyName}" in this contract. Judge every clause from this party's point of view and protect its interests.`
      : 'The user has not said which party they are. When a clause favors one side, say which side it hurts.',
    context.industryName ? `The user's business is in the "${context.industryName}" industry.` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export async function listContractProfiles() {
  const [profiles, industries] = await Promise.all([
    ContractProfileModel.find().sort({ segment: 1, code: 1 }),
    IndustryModel.find().sort({ code: 1 }),
  ]);
  const taxonomy = await getTaxonomyByCodes([
    ...new Set(
      profiles.flatMap((p) => [
        ...p.mandatoryClauses,
        ...p.industryRules.flatMap((r) => r.extraMandatoryClauses),
      ]),
    ),
  ]);
  const clauseName = (code: string) => ({
    code,
    name: taxonomy.find((t) => t.code === code)?.name ?? code,
  });

  return profiles.map((profile) => ({
    code: profile.code,
    aliases: profile.aliases,
    name: profile.name,
    segment: profile.segment,
    parties: profile.parties.map(({ code, name }) => ({ code, name })),
    governingLaws: profile.governingLaws,
    mandatoryClauses: profile.mandatoryClauses.map(clauseName),
    redactionPolicy: profile.redactionPolicy,
    industries: industries.map((industry) => {
      const rule = profile.industryRules.find((r) => r.industry === industry.code);
      return {
        code: industry.code,
        name: industry.name,
        checks: rule?.checks ?? [],
        extraMandatoryClauses: (rule?.extraMandatoryClauses ?? []).map(clauseName),
      };
    }),
  }));
}
