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
    name: 'Thanh toan',
    description: 'Dieu khoan ve gia tri hop dong, phuong thuc va thoi han thanh toan',
    applicableContractTypes: ALL_TYPES,
    isMandatory: true,
  },
  {
    code: 'termination',
    name: 'Cham dut hop dong',
    description: 'Dieu kien va thu tuc cham dut hop dong',
    applicableContractTypes: ALL_TYPES,
    isMandatory: true,
  },
  {
    code: 'dispute_resolution',
    name: 'Giai quyet tranh chap',
    description: 'Phuong thuc giai quyet tranh chap (thuong luong, hoa giai, trong tai, toa an)',
    applicableContractTypes: ALL_TYPES,
    isMandatory: true,
  },
  {
    code: 'warranty',
    name: 'Bao hanh',
    description: 'Cam ket bao hanh hang hoa/dich vu',
    applicableContractTypes: ['sales', 'service', 'saas'],
    isMandatory: true,
  },
  {
    code: 'intellectual_property',
    name: 'So huu tri tue',
    description: 'Quyen so huu tri tue doi voi san pham/phan mem/ket qua cong viec',
    applicableContractTypes: ['saas', 'service'],
    isMandatory: true,
  },
  {
    code: 'confidentiality',
    name: 'Bao mat thong tin',
    description: 'Nghia vu bao mat thong tin giua cac ben',
    applicableContractTypes: ['service', 'saas', 'labor'],
    isMandatory: false,
  },
  {
    code: 'penalty',
    name: 'Phat vi pham',
    description: 'Muc phat khi mot ben vi pham nghia vu hop dong',
    applicableContractTypes: ['sales', 'service', 'saas'],
    isMandatory: false,
  },
  {
    code: 'indemnity',
    name: 'Boi thuong thiet hai',
    description: 'Trach nhiem boi thuong thiet hai khi vi pham hop dong',
    applicableContractTypes: ['service', 'saas'],
    isMandatory: false,
  },
  {
    code: 'liability',
    name: 'Gioi han trach nhiem',
    description: 'Gioi han hoac loai tru trach nhiem phap ly cua cac ben',
    applicableContractTypes: ['service', 'saas'],
    isMandatory: false,
  },
  {
    code: 'force_majeure',
    name: 'Bat kha khang',
    description: 'Su kien bat kha khang va huong xu ly',
    applicableContractTypes: ALL_TYPES,
    isMandatory: false,
  },
  {
    code: 'renewal',
    name: 'Gia han hop dong',
    description: 'Dieu kien gia han hoac tu dong gia han hop dong',
    applicableContractTypes: ['service', 'saas', 'labor'],
    isMandatory: false,
  },
  {
    code: 'other',
    name: 'Khac',
    description: 'Cac dieu khoan khac khong thuoc nhom nao o tren',
    applicableContractTypes: ALL_TYPES,
    isMandatory: false,
  },
];

export async function seedDefaultClauseTaxonomy(): Promise<void> {
  await Promise.all(
    DEFAULT_TAXONOMY.map((entry) =>
      ClauseTypeTaxonomyModel.findOneAndUpdate(
        { code: entry.code },
        { $setOnInsert: entry },
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
