import { CONTRACT_TYPES } from '../models/contract.model';
import { ClauseTypeTaxonomyModel, CLAUSE_CATEGORIES } from '../models/clauseTypeTaxonomy.model';

type ContractType = (typeof CONTRACT_TYPES)[number];

interface DefaultTaxonomyEntry {
  code: (typeof CLAUSE_CATEGORIES)[number];
  name: string;
  description: string;
  applicableContractTypes: ContractType[];
  isMandatory: boolean;
}

const ALL_TYPES: ContractType[] = [...CONTRACT_TYPES];

const DEFAULT_TAXONOMY: DefaultTaxonomyEntry[] = [
  {
    code: 'payment',
    name: 'Thanh toán',
    description: 'Điều khoản về giá trị hợp đồng, phương thức và thời hạn thanh toán',
    applicableContractTypes: ALL_TYPES,
    isMandatory: true,
  },
  {
    code: 'termination',
    name: 'Chấm dứt hợp đồng',
    description: 'Điều kiện và thủ tục chấm dứt hợp đồng',
    applicableContractTypes: ALL_TYPES,
    isMandatory: true,
  },
  {
    code: 'dispute_resolution',
    name: 'Giải quyết tranh chấp',
    description: 'Phương thức giải quyết tranh chấp (thương lượng, hòa giải, trọng tài, tòa án)',
    applicableContractTypes: ALL_TYPES,
    isMandatory: true,
  },
  {
    code: 'warranty',
    name: 'Bảo hành',
    description: 'Cam kết bảo hành hàng hóa/dịch vụ',
    applicableContractTypes: ['sales', 'service', 'saas'],
    isMandatory: true,
  },
  {
    code: 'intellectual_property',
    name: 'Sở hữu trí tuệ',
    description: 'Quyền sở hữu trí tuệ đối với sản phẩm/phần mềm/kết quả công việc',
    applicableContractTypes: ['saas', 'service'],
    isMandatory: true,
  },
  {
    code: 'confidentiality',
    name: 'Bảo mật thông tin',
    description: 'Nghĩa vụ bảo mật thông tin giữa các bên',
    applicableContractTypes: ['service', 'saas', 'labor'],
    isMandatory: false,
  },
  {
    code: 'penalty',
    name: 'Phạt vi phạm',
    description: 'Mức phạt khi một bên vi phạm nghĩa vụ hợp đồng',
    applicableContractTypes: ['sales', 'service', 'saas'],
    isMandatory: false,
  },
  {
    code: 'indemnity',
    name: 'Bồi thường thiệt hại',
    description: 'Trách nhiệm bồi thường thiệt hại khi vi phạm hợp đồng',
    applicableContractTypes: ['service', 'saas'],
    isMandatory: false,
  },
  {
    code: 'liability',
    name: 'Giới hạn trách nhiệm',
    description: 'Giới hạn hoặc loại trừ trách nhiệm pháp lý của các bên',
    applicableContractTypes: ['service', 'saas'],
    isMandatory: false,
  },
  {
    code: 'force_majeure',
    name: 'Bất khả kháng',
    description: 'Sự kiện bất khả kháng và hướng xử lý',
    applicableContractTypes: ALL_TYPES,
    isMandatory: false,
  },
  {
    code: 'renewal',
    name: 'Gia hạn hợp đồng',
    description: 'Điều kiện gia hạn hoặc tự động gia hạn hợp đồng',
    applicableContractTypes: ['service', 'saas', 'labor'],
    isMandatory: false,
  },
  {
    code: 'other',
    name: 'Khác',
    description: 'Các điều khoản khác không thuộc nhóm nào ở trên',
    applicableContractTypes: ALL_TYPES,
    isMandatory: false,
  },
];

export async function seedDefaultClauseTaxonomy(): Promise<void> {
  await Promise.all(
    DEFAULT_TAXONOMY.map((entry) =>
      ClauseTypeTaxonomyModel.findOneAndUpdate(
        { code: entry.code },
        { $set: entry },
        { upsert: true },
      ),
    ),
  );
}

export async function getTaxonomyIdByCode(): Promise<Map<string, string>> {
  const all = await ClauseTypeTaxonomyModel.find();
  return new Map(all.map((t) => [t.code, t._id.toString()]));
}

export async function getMandatoryTaxonomyForContractType(contractType: ContractType) {
  return ClauseTypeTaxonomyModel.find({
    isMandatory: true,
    applicableContractTypes: contractType,
  });
}
