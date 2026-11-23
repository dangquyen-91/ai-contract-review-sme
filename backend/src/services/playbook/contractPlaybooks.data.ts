import type { ClauseCategory } from '../../models/clauseTypeTaxonomy.model';
import type {
  CheckBasis,
  ContractFact,
  ContractPlaybook,
  LegalArticleRef,
  PlaybookCheck,
  PlaybookField,
  RequiredContentItem,
} from './playbookSchema';

const BLDS = 'civil_code_2015';
const BLLD = 'labor_code_2019';
const KDBDS = 'real_estate_business_law_2023';
const NHA_O = 'housing_law_2023';
const KDBH = 'insurance_business_law_2022';

const APPROVED = { status: 'approved' } as const;

const blds398 = (verifyText: string): LegalArticleRef => ({ sourceCode: BLDS, article: 398, clause: 2, verifyText });
const kdbds46 = (verifyText: string): LegalArticleRef => ({ sourceCode: KDBDS, article: 46, clause: 1, verifyText });
const blld21 = (verifyText: string): LegalArticleRef => ({ sourceCode: BLLD, article: 21, clause: 1, verifyText });
const kdbh17 = (verifyText: string): LegalArticleRef => ({ sourceCode: KDBH, article: 17, clause: 1, verifyText });
const nhaO163 = (clause: number, verifyText: string): LegalArticleRef => ({ sourceCode: NHA_O, article: 163, clause, verifyText });

const OBLIGATIONS_FIELD: PlaybookField = {
  key: 'parties_obligations',
  label: 'Quyền và nghĩa vụ của các bên',
  aspect: 'what',
  kind: 'text',
  extraction: 'What the contract says about the rights and obligations of each party: a clause or list setting out what each side must do or may demand.',
};

const LIABILITY_FIELD: PlaybookField = {
  key: 'breach_liability',
  label: 'Trách nhiệm do vi phạm hợp đồng',
  aspect: 'condition',
  kind: 'text',
  extraction: 'What the contract says about the consequences of breaking it: contractual penalties ("phạt vi phạm"), compensation for damage ("bồi thường thiệt hại") or other liability for breach.',
};

const partyFields = (prefix: string, party: string, who: string): PlaybookField[] => [
  {
    key: `${prefix}_name`,
    label: `Tên ${party}`,
    aspect: 'who',
    kind: 'text',
    extraction: `The name of ${who}: a person's full name or an organization's name.`,
  },
  {
    key: `${prefix}_address`,
    label: `Địa chỉ ${party}`,
    aspect: 'who',
    kind: 'text',
    extraction: `The address of ${who} (residence, head office or registered address).`,
  },
];

const EFFECTIVE_TIME_FIELD: PlaybookField = {
  key: 'effective_time',
  label: 'Thời điểm hợp đồng có hiệu lực',
  aspect: 'when',
  kind: 'date_or_event',
  extraction: 'When the contract takes effect (for example "kể từ ngày ký", "kể từ ngày công chứng", "từ ngày ... đóng phí đầu tiên").',
};

function expectContent(
  code: string,
  contractType: string,
  field: string | string[],
  topic: string,
  basis: CheckBasis,
  whyItMatters: string,
  suggestion: string,
  facts?: ContractFact[],
): PlaybookCheck {
  return {
    code,
    group: 'completeness',
    title: `Hợp đồng phải có nội dung về ${topic}`,
    appliesTo: { contractTypes: [contractType], ...(facts ? { facts } : {}) },
    test: typeof field === 'string' ? { kind: 'stated', field } : { kind: 'all_stated', fields: field },
    basis,
    question: `Hợp đồng thoả thuận thế nào về ${topic}?`,
    whyItMatters,
    suggestion,
    review: APPROVED,
  };
}

const NHA_O_163_PRACTICE =
  'Thông lệ: Điều 163 Luật Nhà ở bắt buộc nội dung này trong hợp đồng mua bán nhà ở; hợp đồng đặt cọc để mua nhà cũng nên có.';
const BLDS_398_PRACTICE =
  'Thông lệ: Điều 398 Bộ luật Dân sự liệt kê nội dung này trong các nội dung hợp đồng nên có.';
const KDBDS_46_PRACTICE =
  'Thông lệ: Điều 46 Luật Kinh doanh bất động sản bắt buộc nội dung này khi một bên kinh doanh bất động sản; với các trường hợp khác đây là nội dung nên có.';

const practice = (statement: string, references: LegalArticleRef[] = []): CheckBasis => ({
  kind: 'practice',
  statement,
  ...(references.length ? { references } : {}),
});

const law = (statement: string, articles: LegalArticleRef[]): CheckBasis => ({ kind: 'law', statement, articles });

function expectClause(
  code: string,
  contractType: string,
  clauseType: ClauseCategory,
  topic: string,
  basis: CheckBasis,
  whyItMatters: string,
): PlaybookCheck {
  return {
    code,
    group: 'completeness',
    title: `Hợp đồng phải có điều khoản về ${topic}`,
    appliesTo: { contractTypes: [contractType] },
    test: { kind: 'clause_present', clauseType },
    basis,
    question: `Hợp đồng thoả thuận thế nào về ${topic}?`,
    whyItMatters,
    review: APPROVED,
  };
}

const saleOnly = (check: PlaybookCheck): PlaybookCheck => ({
  ...check,
  appliesTo: { ...check.appliesTo, facts: [...(check.appliesTo.facts ?? []), 'housing_sale_agreement'] },
});

function requireContent(code: string, field: string | string[], topic: string, verifyText: string, whyItMatters: string, suggestion: string): PlaybookCheck {
  return {
    code,
    group: 'completeness',
    title: `Hợp đồng phải có nội dung về ${topic}`,
    appliesTo: { contractTypes: ['labor'] },
    test: typeof field === 'string' ? { kind: 'stated', field } : { kind: 'all_stated', fields: field },
    basis: law(`Hợp đồng lao động phải có nội dung về ${topic}.`, [blld21(verifyText)]),
    question: `Hợp đồng thoả thuận thế nào về ${topic}?`,
    whyItMatters,
    suggestion,
    review: APPROVED,
  };
}

const lawItem = (ref: RequiredContentItem['ref'], content: string, checks: string[]): RequiredContentItem => ({ ref, content, binding: 'law', checks });
const practiceItem = (ref: RequiredContentItem['ref'], content: string, checks: string[]): RequiredContentItem => ({ ref, content, binding: 'practice', checks });
const uncheckedItem = (ref: RequiredContentItem['ref'], content: string, binding: RequiredContentItem['binding'], notChecked: string): RequiredContentItem => ({
  ref,
  content,
  binding,
  checks: [],
  notChecked,
});
const point = (ref: LegalArticleRef, letter: string): RequiredContentItem['ref'] => ({ ...ref, point: letter });

function overtimeCheck(code: string, field: string, dayKind: string, limit: number, verifyText: string): PlaybookCheck {
  return {
    code,
    group: 'compliance',
    title: `Tiền lương làm thêm giờ vào ${dayKind} ít nhất ${limit}%`,
    appliesTo: { contractTypes: ['labor'] },
    test: { kind: 'at_least', field, limit },
    basis: law(`Người lao động làm thêm giờ vào ${dayKind} được trả lương ít nhất bằng ${limit}% tiền lương theo công việc đang làm.`, [
      { sourceCode: BLLD, article: 98, clause: 1, verifyText },
    ]),
    whyItMatters: 'Người lao động bị trả tiền làm thêm giờ thấp hơn mức luật bảo đảm.',
    suggestion: `Làm thêm giờ vào ${dayKind} được trả ít nhất bằng ${limit}% tiền lương theo công việc đang làm.`,
    review: APPROVED,
  };
}

const WHY = {
  subject: 'Không xác định được đối tượng thì không chứng minh được các bên đã thoả thuận mua, thuê hay làm gì.',
  payment: 'Thiếu thoả thuận về giá và thanh toán thì giá và thời hạn trả tiền sẽ do luật xác định, có thể khác ý định của các bên.',
  delivery: 'Thiếu thoả thuận về giao nhận thì khó xác định khi nào một bên đã hoàn thành hoặc chậm thực hiện nghĩa vụ.',
  term: 'Thiếu thoả thuận về thời hạn thì không rõ hợp đồng hết hiệu lực khi nào.',
  warranty: 'Thiếu thoả thuận về bảo hành thì bên nhận khó yêu cầu sửa chữa, đổi trả khi có lỗi sau khi nhận.',
  termination: 'Thiếu thoả thuận về chấm dứt thì khi muốn kết thúc sớm, các bên chỉ dựa vào quy định chung của luật và dễ tranh chấp.',
  dispute: 'Thiếu thoả thuận về giải quyết tranh chấp thì không rõ tranh chấp được đưa ra Toà án hay Trọng tài nào.',
  legalStatus: 'Thiếu thông tin pháp lý của tài sản thì bạn có thể giao dịch với người không có quyền bán hoặc cho thuê.',
  repair: 'Thiếu thoả thuận về sửa chữa thì khi hư hỏng, hai bên dễ đùn đẩy trách nhiệm và chi phí.',
  ownership: 'Thiếu thoả thuận về chuyển quyền sở hữu thì việc cấp Giấy chứng nhận cho bên mua có thể bị kéo dài.',
};

const WHY_OBLIGATIONS = 'Không nêu quyền và nghĩa vụ thì khi một bên không làm điều bên kia mong đợi, khó chứng minh đó là vi phạm hợp đồng.';
const WHY_LIABILITY = 'Không thoả thuận trách nhiệm khi vi phạm thì bên bị vi phạm chỉ còn cách tự chứng minh thiệt hại để đòi bồi thường theo luật chung.';
const SUGGEST_OBLIGATIONS = 'Quyền và nghĩa vụ của Bên [A]: [liệt kê]; quyền và nghĩa vụ của Bên [B]: [liệt kê].';
const SUGGEST_LIABILITY = 'Bên vi phạm nghĩa vụ [cụ thể] chịu phạt [mức] và bồi thường thiệt hại thực tế phát sinh cho bên kia.';

const obligationsCheck = (code: string, contractType: string, basis: CheckBasis) =>
  expectContent(code, contractType, 'parties_obligations', 'quyền và nghĩa vụ của các bên', basis, WHY_OBLIGATIONS, SUGGEST_OBLIGATIONS);
const liabilityCheck = (code: string, contractType: string, basis: CheckBasis) =>
  expectContent(code, contractType, 'breach_liability', 'trách nhiệm do vi phạm hợp đồng', basis, WHY_LIABILITY, SUGGEST_LIABILITY);

export const SALES_CONTRACT_PLAYBOOK: ContractPlaybook = {
  contractType: 'sales',
  title: 'Hợp đồng mua bán hàng hoá',
  fields: [OBLIGATIONS_FIELD, LIABILITY_FIELD],
  checks: [
    obligationsCheck('MB-07', 'sales', practice(BLDS_398_PRACTICE, [blds398('Quyền, nghĩa vụ của các bên')])),
    liabilityCheck('MB-08', 'sales', practice(BLDS_398_PRACTICE, [blds398('Trách nhiệm do vi phạm hợp đồng')])),
    expectClause('MB-01', 'sales', 'subject_scope', 'hàng hoá, số lượng, chất lượng', practice(BLDS_398_PRACTICE, [blds398('Đối tượng của hợp đồng')]), WHY.subject),
    expectClause('MB-02', 'sales', 'payment', 'giá và thanh toán', practice(BLDS_398_PRACTICE, [blds398('Giá, phương thức thanh toán')]), WHY.payment),
    expectClause('MB-03', 'sales', 'delivery_handover', 'giao nhận hàng hoá', practice(BLDS_398_PRACTICE, [blds398('Thời hạn, địa điểm, phương thức thực hiện hợp đồng')]), WHY.delivery),
    expectClause('MB-04', 'sales', 'warranty', 'bảo hành', practice('Thông lệ: hợp đồng mua bán hàng hoá thường có điều khoản bảo hành.'), WHY.warranty),
    expectClause('MB-05', 'sales', 'termination', 'chấm dứt hợp đồng', practice('Thông lệ: hợp đồng nên quy định các trường hợp và cách chấm dứt trước hạn.'), WHY.termination),
    expectClause('MB-06', 'sales', 'dispute_resolution', 'giải quyết tranh chấp', practice(BLDS_398_PRACTICE, [blds398('Phương thức giải quyết tranh chấp')]), WHY.dispute),
  ],
  requiredContent: [
    practiceItem(point(blds398('Đối tượng của hợp đồng'), 'a'), 'Đối tượng của hợp đồng', ['MB-01']),
    practiceItem(point(blds398('Số lượng, chất lượng'), 'b'), 'Số lượng, chất lượng', ['DT-01', 'DT-02']),
    practiceItem(point(blds398('Giá, phương thức thanh toán'), 'c'), 'Giá, phương thức thanh toán', ['MB-02', 'TT-01', 'TT-05']),
    practiceItem(point(blds398('Thời hạn, địa điểm, phương thức thực hiện hợp đồng'), 'd'), 'Thời hạn, địa điểm, phương thức giao hàng', ['MB-03', 'GN-01', 'GN-02']),
    practiceItem(point(blds398('Quyền, nghĩa vụ của các bên'), 'đ'), 'Quyền, nghĩa vụ của các bên', ['MB-07']),
    practiceItem(point(blds398('Trách nhiệm do vi phạm hợp đồng'), 'e'), 'Trách nhiệm do vi phạm hợp đồng', ['MB-08']),
    practiceItem(point(blds398('Phương thức giải quyết tranh chấp'), 'g'), 'Phương thức giải quyết tranh chấp', ['MB-06', 'GQ-01']),
  ],
};

export const SERVICE_CONTRACT_PLAYBOOK: ContractPlaybook = {
  contractType: 'service',
  title: 'Hợp đồng dịch vụ',
  fields: [OBLIGATIONS_FIELD, LIABILITY_FIELD],
  checks: [
    obligationsCheck('DV-07', 'service', practice(BLDS_398_PRACTICE, [blds398('Quyền, nghĩa vụ của các bên')])),
    liabilityCheck('DV-08', 'service', practice(BLDS_398_PRACTICE, [blds398('Trách nhiệm do vi phạm hợp đồng')])),
    expectClause('DV-01', 'service', 'subject_scope', 'phạm vi công việc, dịch vụ', practice(BLDS_398_PRACTICE, [blds398('Đối tượng của hợp đồng')]), WHY.subject),
    expectClause('DV-02', 'service', 'payment', 'giá và thanh toán', practice(BLDS_398_PRACTICE, [blds398('Giá, phương thức thanh toán')]), WHY.payment),
    expectClause('DV-03', 'service', 'term', 'thời hạn hợp đồng', practice(BLDS_398_PRACTICE, [blds398('Thời hạn, địa điểm, phương thức thực hiện hợp đồng')]), WHY.term),
    expectClause('DV-04', 'service', 'delivery_handover', 'bàn giao, nghiệm thu kết quả', practice(BLDS_398_PRACTICE, [blds398('Thời hạn, địa điểm, phương thức thực hiện hợp đồng')]), WHY.delivery),
    expectClause('DV-05', 'service', 'termination', 'chấm dứt hợp đồng', practice('Thông lệ: hợp đồng nên quy định các trường hợp và cách chấm dứt trước hạn.'), WHY.termination),
    expectClause('DV-06', 'service', 'dispute_resolution', 'giải quyết tranh chấp', practice(BLDS_398_PRACTICE, [blds398('Phương thức giải quyết tranh chấp')]), WHY.dispute),
  ],
  requiredContent: [
    practiceItem(point(blds398('Đối tượng của hợp đồng'), 'a'), 'Đối tượng của hợp đồng: công việc, dịch vụ', ['DV-01']),
    practiceItem(point(blds398('Số lượng, chất lượng'), 'b'), 'Kết quả, tiêu chuẩn của dịch vụ', ['DT-03']),
    practiceItem(point(blds398('Giá, phương thức thanh toán'), 'c'), 'Giá, phương thức thanh toán', ['DV-02', 'TT-01', 'TT-05']),
    practiceItem(point(blds398('Thời hạn, địa điểm, phương thức thực hiện hợp đồng'), 'd'), 'Thời hạn, cách thực hiện và nghiệm thu', ['DV-03', 'DV-04', 'GN-03']),
    practiceItem(point(blds398('Quyền, nghĩa vụ của các bên'), 'đ'), 'Quyền, nghĩa vụ của các bên', ['DV-07']),
    practiceItem(point(blds398('Trách nhiệm do vi phạm hợp đồng'), 'e'), 'Trách nhiệm do vi phạm hợp đồng', ['DV-08']),
    practiceItem(point(blds398('Phương thức giải quyết tranh chấp'), 'g'), 'Phương thức giải quyết tranh chấp', ['DV-06', 'GQ-01']),
  ],
};

export const OFFICE_LEASE_CONTRACT_PLAYBOOK: ContractPlaybook = {
  contractType: 'office_lease',
  title: 'Hợp đồng thuê văn phòng, mặt bằng',
  fields: [
    EFFECTIVE_TIME_FIELD,
    ...partyFields('lessor', 'bên cho thuê', 'the lessor'),
    ...partyFields('lessee', 'bên thuê', 'the lessee'),
    OBLIGATIONS_FIELD,
    LIABILITY_FIELD,
  ],
  checks: [
    expectContent(
      'TM-10',
      'office_lease',
      ['lessor_name', 'lessor_address', 'lessee_name', 'lessee_address'],
      'tên, địa chỉ của các bên',
      practice(KDBDS_46_PRACTICE, [kdbds46('Tên, địa chỉ của các bên')]),
      'Thiếu tên, địa chỉ của một bên thì khó xác định ai có quyền, nghĩa vụ theo hợp đồng và gửi thông báo cho ai.',
      'Bên cho thuê: [tên], địa chỉ: [địa chỉ]; Bên thuê: [tên], địa chỉ: [địa chỉ].',
    ),
    obligationsCheck('TM-11', 'office_lease', practice(KDBDS_46_PRACTICE, [kdbds46('Quyền, nghĩa vụ của các bên')])),
    liabilityCheck('TM-12', 'office_lease', practice(KDBDS_46_PRACTICE, [kdbds46('Trách nhiệm do vi phạm hợp đồng'), kdbds46('Phạt vi phạm hợp đồng')])),
    expectClause('TM-01', 'office_lease', 'subject_scope', 'thông tin mặt bằng cho thuê', practice(KDBDS_46_PRACTICE, [kdbds46('Các thông tin về bất động sản')]), WHY.subject),
    expectClause('TM-02', 'office_lease', 'property_legal_status', 'tình trạng pháp lý của mặt bằng', practice('Thông lệ: hợp đồng thuê nên ghi giấy tờ chứng minh quyền cho thuê của bên cho thuê.'), WHY.legalStatus),
    expectClause('TM-03', 'office_lease', 'payment', 'giá thuê và thanh toán', practice(KDBDS_46_PRACTICE, [kdbds46('Phương thức và thời hạn thanh toán')]), WHY.payment),
    expectClause('TM-04', 'office_lease', 'term', 'thời hạn thuê', practice(BLDS_398_PRACTICE, [blds398('Thời hạn, địa điểm, phương thức thực hiện hợp đồng')]), WHY.term),
    expectClause('TM-05', 'office_lease', 'delivery_handover', 'bàn giao mặt bằng', practice(KDBDS_46_PRACTICE, [kdbds46('Thời hạn giao, nhận bất động sản và hồ sơ kèm theo')]), WHY.delivery),
    expectClause('TM-06', 'office_lease', 'maintenance_repair', 'sửa chữa, bảo trì', practice('Thông lệ: hợp đồng thuê nên phân định trách nhiệm sửa chữa và chi phí.'), WHY.repair),
    expectClause('TM-07', 'office_lease', 'termination', 'chấm dứt hợp đồng', practice(KDBDS_46_PRACTICE, [kdbds46('Các trường hợp chấm dứt, hủy bỏ hợp đồng và biện pháp xử lý')]), WHY.termination),
    expectClause('TM-08', 'office_lease', 'dispute_resolution', 'giải quyết tranh chấp', practice(KDBDS_46_PRACTICE, [kdbds46('Phương thức giải quyết tranh chấp')]), WHY.dispute),
    {
      code: 'TM-09',
      group: 'completeness',
      title: 'Hợp đồng phải nêu thời điểm có hiệu lực',
      appliesTo: { contractTypes: ['office_lease'] },
      test: { kind: 'stated', field: 'effective_time' },
      basis: practice(KDBDS_46_PRACTICE, [kdbds46('Thời điểm có hiệu lực của hợp đồng')]),
      question: 'Hợp đồng thuê có hiệu lực từ khi nào?',
      whyItMatters: 'Không rõ thời điểm có hiệu lực thì khó xác định từ khi nào bắt đầu tính tiền thuê và các nghĩa vụ khác.',
      suggestion: 'Hợp đồng có hiệu lực kể từ ngày [ký/bàn giao mặt bằng].',
      review: APPROVED,
    },
  ],
  requiredContent: [
    practiceItem(point(kdbds46('Tên, địa chỉ của các bên'), 'a'), 'Tên, địa chỉ của các bên', ['TM-10']),
    practiceItem(point(kdbds46('Các thông tin về bất động sản'), 'b'), 'Thông tin mặt bằng và mục đích thuê', ['TM-01', 'DT-05']),
    practiceItem(point(kdbds46('Giá bán, cho thuê, cho thuê mua'), 'c'), 'Giá thuê', ['TM-03', 'TT-01']),
    practiceItem(point(kdbds46('Phương thức và thời hạn thanh toán'), 'd'), 'Phương thức và thời hạn thanh toán', ['TM-03', 'TT-02', 'TT-05']),
    uncheckedItem(
      point(kdbds46('Bảo lãnh của ngân hàng bảo lãnh cho nghĩa vụ tài chính của chủ đầu tư'), 'đ'),
      'Bảo lãnh ngân hàng của chủ đầu tư',
      'practice',
      'Chỉ áp dụng khi bán nhà ở hình thành trong tương lai, không áp dụng cho hợp đồng thuê.',
    ),
    practiceItem(point(kdbds46('Thời hạn giao, nhận bất động sản và hồ sơ kèm theo'), 'e'), 'Thời hạn giao, nhận mặt bằng', ['TM-05', 'GN-01', 'GN-04']),
    uncheckedItem(point(kdbds46('Bảo hành'), 'g'), 'Bảo hành', 'practice', 'Bảo hành gắn với việc bán, chuyển giao công trình; với hợp đồng thuê, trách nhiệm sửa chữa được kiểm tại TM-06 và SC-01.'),
    practiceItem(point(kdbds46('Quyền, nghĩa vụ của các bên'), 'h'), 'Quyền, nghĩa vụ của các bên', ['TM-11']),
    practiceItem(point(kdbds46('Trách nhiệm do vi phạm hợp đồng'), 'i'), 'Trách nhiệm do vi phạm hợp đồng', ['TM-12']),
    practiceItem(point(kdbds46('Phạt vi phạm hợp đồng'), 'k'), 'Phạt vi phạm hợp đồng', ['TM-12']),
    practiceItem(point(kdbds46('Các trường hợp chấm dứt, hủy bỏ hợp đồng và biện pháp xử lý'), 'l'), 'Các trường hợp chấm dứt hợp đồng', ['TM-07', 'CD-01', 'CD-03']),
    practiceItem(point(kdbds46('Phương thức giải quyết tranh chấp'), 'm'), 'Phương thức giải quyết tranh chấp', ['TM-08', 'GQ-01']),
    practiceItem(point(kdbds46('Thời điểm có hiệu lực của hợp đồng'), 'n'), 'Thời điểm có hiệu lực', ['TM-09']),
    practiceItem(point(blds398('Thời hạn, địa điểm, phương thức thực hiện hợp đồng'), 'd'), 'Thời hạn thuê', ['TM-04', 'TH-01', 'TH-02']),
  ],
};

export const LABOR_CONTRACT_PLAYBOOK: ContractPlaybook = {
  contractType: 'labor',
  title: 'Hợp đồng lao động',
  fields: [
    {
      key: 'keeps_original_documents',
      label: 'Giữ bản chính giấy tờ của người lao động',
      aspect: 'what',
      kind: 'boolean',
      extraction: "true when the employer keeps the employee's original identity papers, diplomas or certificates.",
    },
    {
      key: 'employee_deposit_required',
      label: 'Người lao động phải đặt cọc, ký quỹ',
      aspect: 'what',
      kind: 'boolean',
      extraction: 'true when the employee must pay a deposit or guarantee money, or pledge property, to the employer.',
    },
    {
      key: 'monetary_fines',
      label: 'Phạt tiền, cắt lương người lao động',
      aspect: 'what',
      kind: 'boolean',
      extraction:
        'true only when the employer may fine the employee or cut wages as a punishment for breaking work rules or discipline. Deductions from wages to compensate damage to the employer\'s property are NOT fines.',
    },
    {
      key: 'raise_policy',
      label: 'Chế độ nâng bậc, nâng lương',
      aspect: 'when',
      kind: 'text',
      extraction:
        'What the contract says about raising the wage or moving to a higher pay grade ("nâng bậc", "nâng lương", "điều chỉnh lương"). Any arrangement counts, including a reference to the company pay rules or a review without a promised increase; no fixed raise is required.',
    },
    {
      key: 'protective_equipment',
      label: 'Trang bị bảo hộ lao động',
      aspect: 'what',
      kind: 'text',
      extraction:
        'What the contract says about protective equipment or work tools the employer provides ("trang bị bảo hộ lao động", "trang bị ... phục vụ công việc"). Any arrangement counts, including equipment suited to the job or a reference to the law or work rules.',
    },
    {
      key: 'training',
      label: 'Đào tạo, bồi dưỡng',
      aspect: 'what',
      kind: 'text',
      extraction:
        'What the contract says about training, coaching or skill development ("đào tạo", "bồi dưỡng"). Any arrangement counts, including training when the job requires it or a reference to company rules; no training programme has to be promised.',
    },
    {
      key: 'transfer_notice_days',
      label: 'Báo trước khi điều chuyển công việc',
      aspect: 'when',
      kind: 'days',
      extraction:
        'How many days in advance the employer must notify the employee before temporarily moving them to a job different from the contract ("điều chuyển", "chuyển làm công việc khác").',
    },
    {
      key: 'transfer_wage_percent',
      label: 'Lương khi bị điều chuyển so với lương cũ',
      aspect: 'how_much',
      kind: 'percent',
      extraction: 'The wage during a temporary transfer to another job, as a percentage of the wage of the old job.',
    },
    {
      key: 'employee_notice_days',
      label: 'Thời hạn người lao động phải báo trước khi nghỉ việc',
      aspect: 'when',
      kind: 'days',
      extraction:
        'How many days in advance the employee must notify the employer to end the contract unilaterally ("đơn phương chấm dứt", "báo trước"). Only the period that applies to the employee, not the one for the employer.',
    },
    {
      key: 'settlement_days',
      label: 'Thời hạn thanh toán khi chấm dứt hợp đồng',
      aspect: 'when',
      kind: 'days',
      extraction: 'Within how many days after the contract ends the parties must pay all amounts owed to each other.',
    },
    {
      key: 'overtime_weekday_percent',
      label: 'Tiền lương làm thêm giờ ngày thường',
      aspect: 'how_much',
      kind: 'percent',
      extraction: 'Overtime pay on normal working days, as a percentage of the normal wage (for example 150 for 150%).',
    },
    {
      key: 'overtime_rest_day_percent',
      label: 'Tiền lương làm thêm vào ngày nghỉ hằng tuần',
      aspect: 'how_much',
      kind: 'percent',
      extraction: 'Overtime pay on weekly rest days, as a percentage of the normal wage.',
    },
    {
      key: 'overtime_holiday_percent',
      label: 'Tiền lương làm thêm vào ngày lễ, Tết',
      aspect: 'how_much',
      kind: 'percent',
      extraction: 'Overtime pay on public holidays, Tết and paid days off, as a percentage of the normal wage.',
    },
    {
      key: 'works_to_repay_debt',
      label: 'Làm việc để trả nợ cho người sử dụng lao động',
      aspect: 'condition',
      kind: 'boolean',
      extraction: 'true when the employee must work under this contract to pay off a debt owed to the employer.',
    },
    ...partyFields('employer', 'người sử dụng lao động', 'the employer'),
    {
      key: 'employer_signatory',
      label: 'Họ tên, chức danh người ký phía người sử dụng lao động',
      aspect: 'who',
      kind: 'text',
      extraction: 'The full name and the job title of the person who signs for the employer (for example "Đại diện: Ông ..., chức vụ Giám đốc").',
    },
    {
      key: 'employee_name',
      label: 'Họ tên người lao động',
      aspect: 'who',
      kind: 'text',
      extraction: "The employee's full name.",
    },
    {
      key: 'employee_birth_date',
      label: 'Ngày tháng năm sinh của người lao động',
      aspect: 'who',
      kind: 'text',
      extraction: "The employee's date of birth.",
    },
    {
      key: 'employee_gender',
      label: 'Giới tính của người lao động',
      aspect: 'who',
      kind: 'text',
      extraction: 'The employee\'s gender, stated directly ("Giới tính: Nam") or through a title before the name ("Ông", "Bà", "Anh", "Chị").',
    },
    {
      key: 'employee_residence',
      label: 'Nơi cư trú của người lao động',
      aspect: 'who',
      kind: 'text',
      extraction: "The employee's place of residence: permanent or current address.",
    },
    {
      key: 'employee_id_number',
      label: 'Số giấy tờ tuỳ thân của người lao động',
      aspect: 'who',
      kind: 'text',
      extraction: "The number of the employee's citizen identity card, identity card or passport.",
    },
    {
      key: 'pay_method',
      label: 'Hình thức trả lương',
      aspect: 'how',
      kind: 'text',
      extraction:
        'How the wage is paid: in cash or by transfer to the employee\'s bank account, or the pay form when named as such ("trả lương theo thời gian", "theo sản phẩm", "lương khoán"). A wage amount per month alone ("9.000.000 đồng/tháng") does not state it.',
    },
    {
      key: 'allowances',
      label: 'Phụ cấp lương và các khoản bổ sung khác',
      aspect: 'how_much',
      kind: 'text',
      extraction:
        'What the contract says about wage allowances ("phụ cấp") or other supplementary payments ("các khoản bổ sung khác", for example allowances for meals, travel, phone), including a statement that there are none or a reference to the company pay rules.',
    },
    {
      key: 'rest_time',
      label: 'Thời giờ nghỉ ngơi',
      aspect: 'when',
      kind: 'text',
      extraction:
        'What the contract says about rest: breaks during the working day, weekly days off, annual leave or public holidays, including a reference to the Labor Code or the work rules for them. Working hours or the number of working days per week alone do not state it.',
    },
    {
      key: 'employer_notice_days',
      label: 'Số ngày người sử dụng lao động phải báo trước khi đơn phương chấm dứt',
      aspect: 'when',
      kind: 'days',
      extraction:
        'How many days in advance the employer must notify the employee before ending the contract unilaterally. Only the period that applies to the employer, not the one for the employee; not the notice for disciplinary dismissal ("sa thải").',
    },
    {
      key: 'employer_terminates_outside_law',
      label: 'Người sử dụng lao động được chấm dứt ngoài các trường hợp luật cho phép',
      aspect: 'condition',
      kind: 'boolean',
      extraction:
        'true only when the contract lets the employer end the contract unilaterally at will, without a reason, or for a reason outside this list from the Labor Code: the employee often fails to complete the work under the company\'s assessment rules; long illness or accident treatment; natural disaster, fire, epidemic or forced downsizing; not returning to work after a suspension; reaching retirement age; leaving work without good reason for 5 working days in a row; giving false information when hired. Disciplinary dismissal ("sa thải") under the work rules is NOT this. A reference to Article 36 of the Labor Code is NOT this.',
    },
  ],
  checks: [
    expectClause('LD-01', 'labor', 'subject_scope', 'công việc và địa điểm làm việc', law('Hợp đồng lao động phải có nội dung về công việc và địa điểm làm việc.', [blld21('Công việc và địa điểm làm việc')]), WHY.subject),
    expectClause('LD-02', 'labor', 'term', 'thời hạn hợp đồng lao động', law('Hợp đồng lao động phải có nội dung về thời hạn của hợp đồng.', [blld21('Thời hạn của hợp đồng lao động')]), WHY.term),
    expectClause('LD-03', 'labor', 'wages', 'tiền lương', law('Hợp đồng lao động phải có mức lương, hình thức trả lương, thời hạn trả lương, phụ cấp và các khoản bổ sung.', [blld21('hình thức trả lương, thời hạn trả lương')]), 'Thiếu thoả thuận về tiền lương thì không có căn cứ để trả lương, đóng bảo hiểm và giải quyết tranh chấp.'),
    expectClause('LD-04', 'labor', 'working_time', 'thời giờ làm việc, nghỉ ngơi', law('Hợp đồng lao động phải có nội dung về thời giờ làm việc, thời giờ nghỉ ngơi.', [blld21('Thời giờ làm việc, thời giờ nghỉ ngơi')]), 'Thiếu thoả thuận về thời giờ làm việc thì không xác định được giờ làm thêm và tiền lương làm thêm.'),
    expectClause('LD-05', 'labor', 'social_insurance', 'bảo hiểm xã hội, y tế, thất nghiệp', law('Hợp đồng lao động phải có nội dung về bảo hiểm xã hội, bảo hiểm y tế và bảo hiểm thất nghiệp.', [blld21('Bảo hiểm xã hội, bảo hiểm y tế và bảo hiểm thất nghiệp')]), 'Thiếu thoả thuận về bảo hiểm thì quyền lợi bảo hiểm của người lao động không được thể hiện rõ.'),
    {
      code: 'LD-06',
      group: 'compliance',
      title: 'Người sử dụng lao động không được giữ bản chính giấy tờ của người lao động',
      appliesTo: { contractTypes: ['labor'] },
      test: { kind: 'fails_when_all', conditions: [{ field: 'keeps_original_documents', op: 'is_true' }] },
      basis: law('Người sử dụng lao động không được giữ bản chính giấy tờ tuỳ thân, văn bằng, chứng chỉ của người lao động.', [
        { sourceCode: BLLD, article: 17, clause: 1, verifyText: 'bản chính giấy tờ' },
      ]),
      whyItMatters: 'Người lao động bị hạn chế quyền nghỉ việc và có thể bị ép buộc tiếp tục làm việc.',
      suggestion: 'Người sử dụng lao động chỉ giữ bản sao giấy tờ của người lao động.',
      replacesRule: 'BLLD_KEEP_ORIGINAL_DOCUMENTS',
      review: APPROVED,
    },
    {
      code: 'LD-07',
      group: 'compliance',
      title: 'Không được buộc người lao động đặt cọc, ký quỹ',
      appliesTo: { contractTypes: ['labor'] },
      test: { kind: 'fails_when_all', conditions: [{ field: 'employee_deposit_required', op: 'is_true' }] },
      basis: law(
        'Người sử dụng lao động không được yêu cầu người lao động thực hiện biện pháp bảo đảm bằng tiền hoặc tài sản khác cho việc thực hiện hợp đồng lao động.',
        [{ sourceCode: BLLD, article: 17, clause: 2, verifyText: 'biện pháp bảo đảm bằng tiền hoặc tài sản khác' }],
      ),
      whyItMatters: 'Người lao động có thể bị giữ tiền và mất tiền khi nghỉ việc.',
      suggestion: 'Bỏ yêu cầu người lao động đặt cọc, ký quỹ hoặc thế chấp tài sản.',
      replacesRule: 'BLLD_EMPLOYEE_DEPOSIT',
      review: APPROVED,
    },
    {
      code: 'LD-08',
      group: 'compliance',
      title: 'Không được phạt tiền, cắt lương thay cho xử lý kỷ luật',
      appliesTo: { contractTypes: ['labor'] },
      test: { kind: 'fails_when_all', conditions: [{ field: 'monetary_fines', op: 'is_true' }] },
      basis: law('Nghiêm cấm phạt tiền, cắt lương thay việc xử lý kỷ luật lao động.', [
        { sourceCode: BLLD, article: 127, clause: 2, verifyText: 'Phạt tiền, cắt lương thay việc xử lý kỷ luật lao động' },
      ]),
      whyItMatters: 'Người lao động bị trừ thu nhập trái quy định thay vì được xử lý kỷ luật theo đúng thủ tục.',
      suggestion: 'Vi phạm kỷ luật được xử lý theo nội quy lao động và Bộ luật Lao động; không áp dụng phạt tiền, cắt lương.',
      replacesRule: 'BLLD_MONETARY_FINES',
      review: APPROVED,
    },
    requireContent('LD-09', 'raise_policy', 'chế độ nâng bậc, nâng lương', 'Chế độ nâng bậc, nâng lương', 'Không có chế độ nâng lương thì người lao động không có căn cứ để yêu cầu được xét tăng lương.', 'Người lao động được xét nâng bậc, nâng lương [định kỳ hằng năm] căn cứ [kết quả công việc], theo quy chế lương của Công ty.'),
    requireContent('LD-10', 'protective_equipment', 'trang bị bảo hộ lao động', 'Trang bị bảo hộ lao động cho người lao động', 'Không rõ trang bị bảo hộ thì khó xác định trách nhiệm của người sử dụng lao động khi xảy ra tai nạn lao động.', 'Người sử dụng lao động trang bị cho người lao động [danh mục phương tiện bảo hộ, công cụ làm việc] phù hợp với công việc.'),
    requireContent('LD-11', 'training', 'đào tạo, bồi dưỡng, nâng cao trình độ', 'Đào tạo, bồi dưỡng, nâng cao trình độ, kỹ năng nghề', 'Không rõ chế độ đào tạo thì người lao động không biết quyền được đào tạo và nghĩa vụ hoàn trả chi phí đào tạo nếu có.', 'Người lao động được đào tạo [hội nhập, nghiệp vụ]; trường hợp đào tạo nghề bằng kinh phí của người sử dụng lao động, hai bên ký hợp đồng đào tạo riêng.'),
    {
      code: 'LD-12',
      group: 'compliance',
      title: 'Phải báo trước ít nhất 03 ngày làm việc khi điều chuyển công việc',
      appliesTo: { contractTypes: ['labor'] },
      test: { kind: 'at_least', field: 'transfer_notice_days', limit: 3 },
      basis: law('Khi tạm thời chuyển người lao động làm công việc khác, người sử dụng lao động phải báo cho người lao động biết trước ít nhất 03 ngày làm việc.', [
        { sourceCode: BLLD, article: 29, clause: 2, verifyText: 'biết trước ít nhất 03 ngày làm việc' },
      ]),
      whyItMatters: 'Người lao động bị chuyển việc đột ngột, không kịp sắp xếp.',
      suggestion: 'Khi tạm thời chuyển người lao động làm công việc khác, người sử dụng lao động báo trước ít nhất 03 ngày làm việc và nêu rõ thời hạn làm tạm thời.',
      review: APPROVED,
    },
    {
      code: 'LD-13',
      group: 'compliance',
      title: 'Lương khi bị điều chuyển ít nhất 85% lương công việc cũ',
      appliesTo: { contractTypes: ['labor'] },
      test: { kind: 'at_least', field: 'transfer_wage_percent', limit: 85 },
      basis: law('Tiền lương theo công việc mới khi bị tạm thời điều chuyển ít nhất phải bằng 85% tiền lương của công việc cũ nhưng không thấp hơn mức lương tối thiểu.', [
        { sourceCode: BLLD, article: 29, clause: 3, verifyText: 'ít nhất phải bằng 85% tiền lương của công việc cũ' },
      ]),
      whyItMatters: 'Người lao động bị giảm thu nhập quá mức khi bị chuyển sang việc khác.',
      suggestion: 'Tiền lương theo công việc mới ít nhất bằng 85% tiền lương của công việc cũ và được giữ nguyên lương cũ trong 30 ngày làm việc đầu.',
      review: APPROVED,
    },
    {
      code: 'LD-14',
      group: 'balance',
      title: 'Thời hạn người lao động phải báo trước không dài hơn mức luật quy định',
      appliesTo: { contractTypes: ['labor'], partyRoles: ['employee'] },
      test: {
        kind: 'at_most_tiered',
        field: 'employee_notice_days',
        tiers: [
          { facts: ['labor_contract_indefinite'], limit: 45 },
          { facts: ['labor_contract_12_to_36_months'], limit: 30 },
          { facts: ['labor_contract_under_12_months'], limit: 3 },
        ],
        absoluteLimit: 45,
      },
      basis: {
        kind: 'policy',
        statement:
          'Khuyến nghị của hệ thống: Bộ luật Lao động chỉ yêu cầu người lao động báo trước 45 ngày (không xác định thời hạn), 30 ngày (12 đến 36 tháng) hoặc 03 ngày làm việc (dưới 12 tháng); hợp đồng đòi báo trước lâu hơn là hạn chế quyền nghỉ việc của người lao động.',
        references: [
          { sourceCode: BLLD, article: 35, clause: 1, verifyText: 'Ít nhất 45 ngày nếu làm việc theo hợp đồng lao động không xác định thời hạn' },
          { sourceCode: BLLD, article: 35, clause: 1, verifyText: 'Ít nhất 30 ngày nếu làm việc theo hợp đồng lao động xác định thời hạn có thời hạn từ 12 tháng đến 36 tháng' },
        ],
      },
      whyItMatters: 'Bạn phải chờ lâu hơn mức luật yêu cầu mới được nghỉ việc, có thể mất cơ hội việc làm mới.',
      suggestion: 'Người lao động đơn phương chấm dứt hợp đồng báo trước theo Điều 35 Bộ luật Lao động: [45/30 ngày hoặc 03 ngày làm việc tuỳ loại hợp đồng].',
      review: APPROVED,
    },
    {
      code: 'LD-15',
      group: 'compliance',
      title: 'Thời hạn thanh toán khi chấm dứt hợp đồng không quá 30 ngày',
      appliesTo: { contractTypes: ['labor'] },
      test: { kind: 'at_most', field: 'settlement_days', limit: 30 },
      basis: law('Hai bên phải thanh toán đầy đủ các khoản tiền liên quan trong 14 ngày làm việc kể từ ngày chấm dứt; chỉ một số trường hợp được kéo dài nhưng không quá 30 ngày.', [
        { sourceCode: BLLD, article: 48, clause: 1, verifyText: 'có thể kéo dài nhưng không được quá 30 ngày' },
      ]),
      whyItMatters: 'Người lao động phải chờ quá lâu mới nhận được lương còn nợ, tiền phép năm và trợ cấp sau khi nghỉ việc.',
      suggestion: 'Trong thời hạn 14 ngày làm việc kể từ ngày chấm dứt hợp đồng, hai bên thanh toán đầy đủ các khoản tiền liên quan đến quyền lợi của mỗi bên.',
      review: {
        status: 'approved',
        note: 'Thời hạn chuẩn là 14 ngày làm việc; 15 đến 30 ngày chỉ hợp lệ trong các trường hợp tại điểm a đến d khoản 1 Điều 48, nên phép kiểm chỉ kết luận khi vượt 30 ngày.',
      },
    },
    overtimeCheck('LD-16', 'overtime_weekday_percent', 'ngày thường', 150, 'Vào ngày thường, ít nhất bằng 150%'),
    overtimeCheck('LD-17', 'overtime_rest_day_percent', 'ngày nghỉ hằng tuần', 200, 'Vào ngày nghỉ hằng tuần, ít nhất bằng 200%'),
    overtimeCheck('LD-18', 'overtime_holiday_percent', 'ngày nghỉ lễ, Tết', 300, 'ít nhất bằng 300%'),
    {
      code: 'LD-19',
      group: 'compliance',
      title: 'Không được buộc người lao động làm việc để trả nợ',
      appliesTo: { contractTypes: ['labor'] },
      test: { kind: 'fails_when_all', conditions: [{ field: 'works_to_repay_debt', op: 'is_true' }] },
      basis: law('Người sử dụng lao động không được buộc người lao động thực hiện hợp đồng lao động để trả nợ cho người sử dụng lao động.', [
        { sourceCode: BLLD, article: 17, clause: 3, verifyText: 'Buộc người lao động thực hiện hợp đồng lao động để trả nợ' },
      ]),
      whyItMatters: 'Người lao động bị ràng buộc làm việc để trừ nợ, mất quyền tự do chấm dứt hợp đồng.',
      suggestion: 'Bỏ nội dung buộc người lao động làm việc để trả nợ; khoản nợ (nếu có) được thoả thuận và thanh toán riêng.',
      review: APPROVED,
    },
    requireContent(
      'LD-20',
      ['employer_name', 'employer_address', 'employer_signatory'],
      'tên, địa chỉ người sử dụng lao động và người ký hợp đồng',
      'Tên, địa chỉ của người sử dụng lao động và họ tên, chức danh của người giao kết hợp đồng lao động',
      'Thiếu thông tin bên sử dụng lao động hoặc người ký thì khó xác định ai chịu trách nhiệm theo hợp đồng và người ký có thẩm quyền hay không.',
      'Người sử dụng lao động: [tên], địa chỉ: [địa chỉ]; đại diện: [họ tên], chức vụ: [chức vụ].',
    ),
    requireContent(
      'LD-21',
      ['employee_name', 'employee_birth_date', 'employee_gender', 'employee_residence', 'employee_id_number'],
      'thông tin cá nhân của người lao động',
      'Họ tên, ngày tháng năm sinh, giới tính, nơi cư trú, số thẻ Căn cước công dân',
      'Thiếu thông tin cá nhân thì khó xác định đúng người lao động khi đăng ký bảo hiểm xã hội và khi có tranh chấp.',
      'Người lao động: [họ tên], sinh ngày [ngày/tháng/năm], giới tính: [Nam/Nữ], nơi cư trú: [địa chỉ], số CCCD: [số].',
    ),
    requireContent(
      'LD-22',
      'pay_method',
      'hình thức trả lương',
      'hình thức trả lương, thời hạn trả lương',
      'Không rõ hình thức trả lương thì dễ tranh chấp về cách tính lương và cách nhận lương.',
      'Hình thức trả lương: theo [thời gian/sản phẩm/khoán], trả [bằng tiền mặt/chuyển khoản vào tài khoản cá nhân của người lao động].',
    ),
    requireContent(
      'LD-23',
      'allowances',
      'phụ cấp lương và các khoản bổ sung khác',
      'phụ cấp lương và các khoản bổ sung khác',
      'Không ghi phụ cấp và các khoản bổ sung thì người lao động khó yêu cầu các khoản đã được hứa ngoài hợp đồng, và khó xác định tiền lương làm căn cứ đóng bảo hiểm.',
      'Phụ cấp lương: [tên phụ cấp, mức tiền]; các khoản bổ sung khác: [khoản, mức tiền]. Ghi "Không có" nếu không áp dụng.',
    ),
    requireContent(
      'LD-24',
      'rest_time',
      'thời giờ nghỉ ngơi',
      'Thời giờ làm việc, thời giờ nghỉ ngơi',
      'Không ghi thời giờ nghỉ ngơi thì khó xác định người lao động được nghỉ những ngày nào và khi nào là làm thêm giờ.',
      'Thời giờ nghỉ ngơi: nghỉ giữa giờ [số] phút; nghỉ hằng tuần vào [ngày]; nghỉ hằng năm, nghỉ lễ, tết theo Bộ luật Lao động.',
    ),
    {
      code: 'LD-25',
      group: 'compliance',
      title: 'Người sử dụng lao động chỉ được đơn phương chấm dứt trong các trường hợp luật quy định',
      appliesTo: { contractTypes: ['labor'] },
      test: { kind: 'fails_when_all', conditions: [{ field: 'employer_terminates_outside_law', op: 'is_true' }] },
      basis: law('Người sử dụng lao động chỉ có quyền đơn phương chấm dứt hợp đồng lao động trong các trường hợp liệt kê tại khoản 1 Điều 36 Bộ luật Lao động.', [
        { sourceCode: BLLD, article: 36, clause: 1, verifyText: 'có quyền đơn phương chấm dứt hợp đồng lao động trong trường hợp sau đây' },
      ]),
      whyItMatters: 'Người lao động có thể bị cho nghỉ việc vì những lý do luật không cho phép; việc chấm dứt như vậy là trái pháp luật.',
      suggestion: 'Người sử dụng lao động chỉ được đơn phương chấm dứt hợp đồng trong các trường hợp tại khoản 1 Điều 36 Bộ luật Lao động và phải báo trước theo khoản 2 Điều 36.',
      review: {
        status: 'approved',
        note: 'Sa thải là hình thức kỷ luật theo Điều 125, không thuộc phép kiểm này.',
      },
    },
    {
      code: 'LD-26',
      group: 'compliance',
      title: 'Người sử dụng lao động phải báo trước ít nhất mức luật định khi đơn phương chấm dứt',
      appliesTo: { contractTypes: ['labor'] },
      test: {
        kind: 'at_least_tiered',
        field: 'employer_notice_days',
        tiers: [
          { facts: ['labor_contract_indefinite'], limit: 45 },
          { facts: ['labor_contract_12_to_36_months'], limit: 30 },
          { facts: ['labor_contract_under_12_months'], limit: 3 },
        ],
        absoluteLimit: 3,
      },
      basis: law(
        'Người sử dụng lao động đơn phương chấm dứt hợp đồng phải báo trước ít nhất 45 ngày (không xác định thời hạn), 30 ngày (từ 12 đến 36 tháng) hoặc 03 ngày làm việc (dưới 12 tháng).',
        [
          { sourceCode: BLLD, article: 36, clause: 2, verifyText: 'Ít nhất 45 ngày đối với hợp đồng lao động không xác định thời hạn' },
          { sourceCode: BLLD, article: 36, clause: 2, verifyText: 'Ít nhất 30 ngày đối với hợp đồng lao động xác định thời hạn có thời hạn từ 12 tháng đến 36 tháng' },
          { sourceCode: BLLD, article: 36, clause: 2, verifyText: 'Ít nhất 03 ngày làm việc đối với hợp đồng lao động xác định thời hạn có thời hạn dưới 12 tháng' },
        ],
      ),
      whyItMatters: 'Người lao động bị cho nghỉ việc với thời gian báo trước ngắn hơn luật bảo đảm, không kịp tìm việc mới.',
      suggestion: 'Khi đơn phương chấm dứt hợp đồng, người sử dụng lao động báo trước cho người lao động ít nhất [45/30 ngày hoặc 03 ngày làm việc] theo khoản 2 Điều 36 Bộ luật Lao động.',
      review: {
        status: 'approved',
        note: 'Mức 03 ngày tính theo ngày làm việc nên phép kiểm so theo ngày thường; một số ngành đặc thù có thời hạn báo trước riêng theo quy định của Chính phủ.',
      },
    },
  ],
  requiredContent: [
    lawItem(point(blld21('Tên, địa chỉ của người sử dụng lao động'), 'a'), 'Tên, địa chỉ người sử dụng lao động; họ tên, chức danh người ký', ['LD-20']),
    lawItem(point(blld21('Họ tên, ngày tháng năm sinh, giới tính, nơi cư trú'), 'b'), 'Họ tên, ngày sinh, giới tính, nơi cư trú, số giấy tờ tuỳ thân của người lao động', ['LD-21']),
    lawItem(point(blld21('Công việc và địa điểm làm việc'), 'c'), 'Công việc và địa điểm làm việc', ['LD-01', 'DT-04']),
    lawItem(point(blld21('Thời hạn của hợp đồng lao động'), 'd'), 'Thời hạn của hợp đồng lao động', ['LD-02', 'TH-02']),
    lawItem(point(blld21('Mức lương theo công việc hoặc chức danh'), 'đ'), 'Mức lương', ['LD-03', 'TL-01']),
    lawItem(point(blld21('hình thức trả lương, thời hạn trả lương'), 'đ'), 'Hình thức trả lương', ['LD-22']),
    lawItem(point(blld21('hình thức trả lương, thời hạn trả lương'), 'đ'), 'Thời hạn trả lương', ['LD-03', 'TL-02']),
    lawItem(point(blld21('phụ cấp lương và các khoản bổ sung khác'), 'đ'), 'Phụ cấp lương và các khoản bổ sung khác', ['LD-23']),
    lawItem(point(blld21('Chế độ nâng bậc, nâng lương'), 'e'), 'Chế độ nâng bậc, nâng lương', ['LD-09']),
    lawItem(point(blld21('Thời giờ làm việc, thời giờ nghỉ ngơi'), 'g'), 'Thời giờ làm việc', ['LD-04', 'TG-01']),
    lawItem(point(blld21('Thời giờ làm việc, thời giờ nghỉ ngơi'), 'g'), 'Thời giờ nghỉ ngơi', ['LD-24']),
    lawItem(point(blld21('Trang bị bảo hộ lao động cho người lao động'), 'h'), 'Trang bị bảo hộ lao động', ['LD-10']),
    lawItem(point(blld21('Bảo hiểm xã hội, bảo hiểm y tế và bảo hiểm thất nghiệp'), 'i'), 'Bảo hiểm xã hội, bảo hiểm y tế, bảo hiểm thất nghiệp', ['LD-05']),
    lawItem(point(blld21('Đào tạo, bồi dưỡng, nâng cao trình độ, kỹ năng nghề'), 'k'), 'Đào tạo, bồi dưỡng, nâng cao trình độ', ['LD-11']),
    practiceItem(
      { sourceCode: BLLD, article: 21, clause: 2, verifyText: 'nội dung, thời hạn bảo vệ bí mật kinh doanh' },
      'Khi có thoả thuận bảo vệ bí mật kinh doanh: nội dung, thời hạn, quyền lợi của người lao động',
      ['BM-01', 'BM-02', 'BM-03'],
    ),
  ],
};

export const HOUSING_PURCHASE_CONTRACT_PLAYBOOK: ContractPlaybook = {
  contractType: 'housing_purchase',
  title: 'Hợp đồng mua bán nhà ở',
  fields: [
    {
      key: 'bank_guarantee',
      label: 'Bảo lãnh ngân hàng cho nghĩa vụ của chủ đầu tư',
      aspect: 'condition',
      kind: 'text',
      extraction: "The bank guarantee for the developer's financial obligations to the buyer of an off-plan home (\"bảo lãnh của ngân hàng\").",
    },
    EFFECTIVE_TIME_FIELD,
    ...partyFields('seller', 'bên bán', 'the seller'),
    ...partyFields('buyer', 'bên mua', 'the buyer'),
    {
      key: 'home_features',
      label: 'Đặc điểm nhà ở',
      aspect: 'what',
      kind: 'text',
      extraction: 'The description of the home sold: address or unit number, type, floor area, number of floors or rooms.',
    },
    {
      key: 'land_plot',
      label: 'Đặc điểm thửa đất gắn với nhà ở',
      aspect: 'what',
      kind: 'text',
      extraction:
        'The residential land plot the home stands on: plot number, map sheet, land area, or for an apartment the land used in common by the building.',
    },
    {
      key: 'common_ownership',
      label: 'Phần sở hữu chung, sử dụng chung của nhà chung cư',
      aspect: 'what',
      kind: 'text',
      extraction: 'The parts of the apartment building owned or used in common ("phần sở hữu chung, sử dụng chung").',
    },
    {
      key: 'private_area',
      label: 'Diện tích sử dụng thuộc sở hữu riêng, diện tích sàn căn hộ',
      aspect: 'how_much',
      kind: 'text',
      extraction: 'The usable area owned privately by the buyer or the floor area of the apartment.',
    },
    {
      key: 'maintenance_fund',
      label: 'Kinh phí bảo trì nhà chung cư',
      aspect: 'how_much',
      kind: 'text',
      extraction: 'Who pays the apartment building maintenance fund ("kinh phí bảo trì"), how much, or the account it is paid into.',
    },
    {
      key: 'signing_date',
      label: 'Ngày, tháng, năm ký hợp đồng',
      aspect: 'when',
      kind: 'date_or_event',
      extraction: 'The date the contract is signed (for example "Hôm nay, ngày ... tháng ... năm ...").',
    },
    OBLIGATIONS_FIELD,
    LIABILITY_FIELD,
    {
      key: 'notarization_mentioned',
      label: 'Công chứng, chứng thực hợp đồng',
      aspect: 'how',
      kind: 'text',
      extraction: 'What the contract says about notarizing or certifying it ("công chứng", "chứng thực").',
    },
  ],
  checks: [
    expectClause('MN-01', 'housing_purchase', 'subject_scope', 'thông tin nhà ở mua bán', practice(NHA_O_163_PRACTICE, [kdbds46('Các thông tin về bất động sản'), nhaO163(2, 'Mô tả đặc điểm của nhà ở giao dịch')]), WHY.subject),
    expectClause('MN-02', 'housing_purchase', 'property_legal_status', 'tình trạng pháp lý của nhà ở', practice('Thông lệ: hợp đồng mua nhà nên ghi giấy tờ chứng minh quyền bán của bên bán.'), WHY.legalStatus),
    expectClause('MN-03', 'housing_purchase', 'payment', 'giá và thanh toán', practice(NHA_O_163_PRACTICE, [kdbds46('Phương thức và thời hạn thanh toán'), nhaO163(4, 'Thời hạn và phương thức thanh toán tiền')]), WHY.payment),
    saleOnly(expectClause('MN-04', 'housing_purchase', 'delivery_handover', 'bàn giao nhà', law('Hợp đồng mua bán nhà ở phải có thời gian giao nhận nhà ở.', [nhaO163(5, 'Thời gian giao nhận nhà ở')]), WHY.delivery)),
    saleOnly(expectClause('MN-05', 'housing_purchase', 'warranty', 'bảo hành', practice(KDBDS_46_PRACTICE, [kdbds46('Bảo hành'), nhaO163(5, 'thời gian bảo hành nhà ở nếu là mua, thuê mua nhà ở được đầu tư xây dựng mới')]), WHY.warranty)),
    saleOnly(expectClause('MN-06', 'housing_purchase', 'ownership_transfer', 'chuyển quyền sở hữu', practice('Thông lệ: hợp đồng mua nhà nên quy định thủ tục và thời hạn cấp Giấy chứng nhận cho bên mua.'), WHY.ownership)),
    expectClause('MN-07', 'housing_purchase', 'termination', 'chấm dứt hợp đồng', practice(KDBDS_46_PRACTICE, [kdbds46('Các trường hợp chấm dứt, hủy bỏ hợp đồng và biện pháp xử lý')]), WHY.termination),
    expectClause('MN-08', 'housing_purchase', 'dispute_resolution', 'giải quyết tranh chấp', practice(KDBDS_46_PRACTICE, [kdbds46('Phương thức giải quyết tranh chấp')]), WHY.dispute),
    {
      code: 'MN-09',
      group: 'completeness',
      title: 'Hợp đồng mua bán nhà ở phải được công chứng hoặc chứng thực',
      appliesTo: { contractTypes: ['housing_purchase'], facts: ['seller_not_real_estate_business', 'housing_sale_agreement'] },
      test: { kind: 'stated', field: 'notarization_mentioned' },
      basis: law(
        'Mua bán nhà ở phải thực hiện công chứng hoặc chứng thực hợp đồng (trừ các trường hợp tại khoản 2 Điều 164); thời điểm có hiệu lực là thời điểm hoàn thành công chứng, chứng thực.',
        [{ sourceCode: NHA_O, article: 164, clause: 1, verifyText: 'phải thực hiện công chứng hoặc chứng thực hợp đồng' }],
      ),
      question: 'Hợp đồng có được công chứng hoặc chứng thực không, tại đâu và ai chịu phí?',
      whyItMatters:
        'Hợp đồng mua bán nhà ở chưa công chứng, chứng thực chưa có hiệu lực và không dùng được để sang tên trên Giấy chứng nhận.',
      suggestion: 'Hai bên công chứng hợp đồng này tại [tổ chức hành nghề công chứng]; phí công chứng do Bên [bên] chịu.',
      replacesRule: 'HOUSING_NOTARIZATION',
      review: {
        status: 'approved',
        note:
          'Hợp đồng không nhắc đến công chứng chưa có nghĩa là sẽ không công chứng, nên kết quả là "Thiếu nội dung", không phải "Vi phạm". Rule cũ dùng absentValue=false nên coi im lặng là không công chứng.',
      },
    },
    {
      code: 'MN-10',
      group: 'completeness',
      title: 'Hợp đồng mua nhà hình thành trong tương lai phải có bảo lãnh ngân hàng',
      appliesTo: { contractTypes: ['housing_purchase'], facts: ['seller_is_developer', 'off_plan_home', 'housing_sale_agreement'] },
      test: { kind: 'stated', field: 'bank_guarantee' },
      basis: law('Hợp đồng bán nhà ở hình thành trong tương lai phải có nội dung về bảo lãnh của ngân hàng cho nghĩa vụ tài chính của chủ đầu tư.', [
        kdbds46('Bảo lãnh của ngân hàng bảo lãnh cho nghĩa vụ tài chính của chủ đầu tư'),
      ]),
      question: 'Ngân hàng nào bảo lãnh nghĩa vụ tài chính của chủ đầu tư với bên mua?',
      whyItMatters: 'Không có bảo lãnh ngân hàng thì nếu chủ đầu tư không bàn giao nhà, bên mua khó lấy lại tiền đã trả.',
      suggestion: 'Nghĩa vụ tài chính của chủ đầu tư đối với bên mua được bảo lãnh bởi [tên ngân hàng] theo thư bảo lãnh số [số].',
      review: APPROVED,
    },
    {
      code: 'MN-11',
      group: 'completeness',
      title: 'Hợp đồng phải nêu thời điểm có hiệu lực',
      appliesTo: { contractTypes: ['housing_purchase'] },
      test: { kind: 'stated', field: 'effective_time' },
      basis: practice(NHA_O_163_PRACTICE, [kdbds46('Thời điểm có hiệu lực của hợp đồng'), nhaO163(9, 'Thời điểm có hiệu lực của hợp đồng')]),
      question: 'Hợp đồng có hiệu lực từ khi nào: từ ngày ký hay từ ngày công chứng?',
      whyItMatters: 'Không rõ thời điểm có hiệu lực thì khó xác định từ khi nào các bên phải thực hiện nghĩa vụ.',
      suggestion: 'Hợp đồng có hiệu lực kể từ ngày [ký/được công chứng].',
      review: APPROVED,
    },
    expectContent(
      'MN-12',
      'housing_purchase',
      ['seller_name', 'seller_address', 'buyer_name', 'buyer_address'],
      'họ tên, địa chỉ của các bên',
      law('Hợp đồng về nhà ở phải có họ và tên của cá nhân, tên của tổ chức và địa chỉ của các bên.', [
        nhaO163(1, 'Họ và tên của cá nhân, tên của tổ chức và địa chỉ của các bên'),
      ]),
      'Thiếu họ tên, địa chỉ của một bên thì khó xác định đúng người bán, người mua khi công chứng và sang tên.',
      'Bên bán: [họ tên/tên tổ chức], địa chỉ: [địa chỉ]; Bên mua: [họ tên/tên tổ chức], địa chỉ: [địa chỉ].',
      ['housing_sale_agreement'],
    ),
    expectContent(
      'MN-13',
      'housing_purchase',
      ['home_features', 'land_plot'],
      'đặc điểm nhà ở và thửa đất gắn với nhà ở',
      law('Hợp đồng về nhà ở phải mô tả đặc điểm của nhà ở giao dịch và đặc điểm của thửa đất ở gắn với nhà ở đó.', [
        nhaO163(2, 'Mô tả đặc điểm của nhà ở giao dịch và đặc điểm của thửa đất ở gắn với nhà ở đó'),
      ]),
      'Mô tả nhà và đất không đủ thì khó đối chiếu với Giấy chứng nhận, dễ tranh chấp về diện tích hoặc phạm vi tài sản được mua.',
      'Nhà ở: [địa chỉ, loại nhà, diện tích sàn, số tầng]; thửa đất số [số], tờ bản đồ số [số], diện tích [số] m².',
      ['housing_sale_agreement'],
    ),
    expectContent(
      'MN-14',
      'housing_purchase',
      ['common_ownership', 'private_area', 'maintenance_fund'],
      'phần sở hữu chung, diện tích căn hộ và kinh phí bảo trì',
      law(
        'Hợp đồng mua bán căn hộ chung cư phải ghi rõ phần sở hữu chung, sử dụng chung; diện tích sử dụng thuộc sở hữu riêng; diện tích sàn căn hộ; trách nhiệm đóng, mức đóng kinh phí bảo trì.',
        [nhaO163(2, 'phải ghi rõ phần sở hữu chung, sử dụng chung')],
      ),
      'Không ghi rõ phần sở hữu chung, diện tích và kinh phí bảo trì thì bên mua dễ bị tính sai diện tích và tranh chấp với chủ đầu tư về phí bảo trì.',
      'Phần sở hữu chung, sử dụng chung: [liệt kê]; diện tích sử dụng thuộc sở hữu riêng: [số] m²; diện tích sàn căn hộ: [số] m²; kinh phí bảo trì: [2]% giá bán, do Bên [bên] nộp vào tài khoản [số].',
      ['housing_sale_agreement', 'apartment_purchase'],
    ),
    expectContent(
      'MN-15',
      'housing_purchase',
      'signing_date',
      'ngày, tháng, năm ký hợp đồng',
      practice(NHA_O_163_PRACTICE, [nhaO163(10, 'Ngày, tháng, năm ký kết hợp đồng')]),
      'Không có ngày ký thì khó xác định thời điểm có hiệu lực và các thời hạn tính từ ngày ký.',
      'Hợp đồng được ký ngày [ngày] tháng [tháng] năm [năm].',
    ),
    obligationsCheck('MN-16', 'housing_purchase', practice(NHA_O_163_PRACTICE, [nhaO163(6, 'Quyền và nghĩa vụ của các bên'), kdbds46('Quyền, nghĩa vụ của các bên')])),
    liabilityCheck('MN-17', 'housing_purchase', practice(KDBDS_46_PRACTICE, [kdbds46('Trách nhiệm do vi phạm hợp đồng'), kdbds46('Phạt vi phạm hợp đồng')])),
  ],
  requiredContent: [
    lawItem(nhaO163(1, 'Họ và tên của cá nhân, tên của tổ chức và địa chỉ của các bên'), 'Họ tên, địa chỉ của các bên', ['MN-12']),
    lawItem(nhaO163(2, 'Mô tả đặc điểm của nhà ở giao dịch'), 'Đặc điểm nhà ở và thửa đất', ['MN-01', 'MN-13']),
    lawItem(nhaO163(2, 'phải ghi rõ phần sở hữu chung, sử dụng chung'), 'Căn hộ chung cư: phần sở hữu chung, diện tích, kinh phí bảo trì', ['MN-14']),
    lawItem(nhaO163(3, 'Giá trị góp vốn, giá giao dịch nhà ở'), 'Giá mua bán', ['MN-03', 'TT-01']),
    lawItem(nhaO163(4, 'Thời hạn và phương thức thanh toán tiền'), 'Thời hạn và phương thức thanh toán', ['MN-03', 'TT-02', 'TT-05']),
    lawItem(nhaO163(5, 'Thời gian giao nhận nhà ở'), 'Thời gian giao nhận nhà', ['MN-04', 'GN-01']),
    lawItem(nhaO163(5, 'thời gian bảo hành nhà ở nếu là mua, thuê mua nhà ở được đầu tư xây dựng mới'), 'Thời gian bảo hành (nhà xây mới)', ['MN-05', 'BHN-01']),
    lawItem(nhaO163(6, 'Quyền và nghĩa vụ của các bên'), 'Quyền và nghĩa vụ của các bên', ['MN-16']),
    uncheckedItem(nhaO163(7, 'Cam kết của các bên'), 'Cam kết của các bên', 'law', 'Nội dung cam kết do các bên tự quyết định, không có tiêu chí khách quan để kiểm tra.'),
    uncheckedItem(nhaO163(8, 'Thỏa thuận khác'), 'Thoả thuận khác', 'law', 'Nội dung tuỳ các bên.'),
    lawItem(nhaO163(9, 'Thời điểm có hiệu lực của hợp đồng'), 'Thời điểm có hiệu lực', ['MN-11']),
    lawItem(nhaO163(10, 'Ngày, tháng, năm ký kết hợp đồng'), 'Ngày, tháng, năm ký', ['MN-15']),
    uncheckedItem(
      nhaO163(11, 'Chữ ký và ghi rõ họ, tên của các bên'),
      'Chữ ký, họ tên, con dấu của các bên',
      'law',
      'Chữ ký và con dấu không kiểm tra được từ nội dung chữ của văn bản.',
    ),
    lawItem({ sourceCode: NHA_O, article: 164, clause: 1, verifyText: 'phải thực hiện công chứng hoặc chứng thực hợp đồng' }, 'Công chứng, chứng thực hợp đồng', ['MN-09']),
    practiceItem(point(kdbds46('Bảo lãnh của ngân hàng bảo lãnh cho nghĩa vụ tài chính của chủ đầu tư'), 'đ'), 'Bảo lãnh ngân hàng (nhà ở hình thành trong tương lai)', ['MN-10']),
    practiceItem(point(kdbds46('Trách nhiệm do vi phạm hợp đồng'), 'i'), 'Trách nhiệm do vi phạm hợp đồng', ['MN-17']),
    practiceItem(point(kdbds46('Phạt vi phạm hợp đồng'), 'k'), 'Phạt vi phạm hợp đồng', ['MN-17']),
    practiceItem(point(kdbds46('Các trường hợp chấm dứt, hủy bỏ hợp đồng và biện pháp xử lý'), 'l'), 'Các trường hợp chấm dứt hợp đồng', ['MN-07', 'CD-01']),
    practiceItem(point(kdbds46('Phương thức giải quyết tranh chấp'), 'm'), 'Phương thức giải quyết tranh chấp', ['MN-08', 'GQ-01']),
  ],
};

export const LIFE_INSURANCE_CONTRACT_PLAYBOOK: ContractPlaybook = {
  contractType: 'life_insurance',
  title: 'Hợp đồng bảo hiểm nhân thọ',
  fields: [
    {
      key: 'cooling_off_days',
      label: 'Thời gian cân nhắc',
      aspect: 'when',
      kind: 'days',
      extraction: 'How many days after receiving the contract the policyholder may cancel it and get the premium back ("thời gian cân nhắc").',
    },
    {
      key: 'grace_period_days',
      label: 'Thời gian gia hạn đóng phí',
      aspect: 'when',
      kind: 'days',
      extraction: 'How many days the policyholder may pay a later premium after its due date before the contract lapses ("thời gian gia hạn đóng phí").',
    },
    {
      key: 'insurer_name',
      label: 'Doanh nghiệp bảo hiểm',
      aspect: 'who',
      kind: 'text',
      extraction: 'The name of the insurance company.',
    },
    {
      key: 'policyholder',
      label: 'Bên mua bảo hiểm',
      aspect: 'who',
      kind: 'text',
      extraction: 'Who buys the insurance and pays the premium ("bên mua bảo hiểm"): name or a reference to the person named in the policy schedule.',
    },
    {
      key: 'insured_person',
      label: 'Người được bảo hiểm',
      aspect: 'who',
      kind: 'text',
      extraction: 'Whose life or health is insured ("người được bảo hiểm"): name or a reference to the person named in the policy schedule.',
    },
    {
      key: 'sum_insured',
      label: 'Số tiền bảo hiểm',
      aspect: 'how_much',
      kind: 'text',
      deferrable: true,
      extraction: 'The sum insured ("số tiền bảo hiểm") or how it is determined.',
    },
    {
      key: 'policy_terms',
      label: 'Quy tắc, điều kiện, điều khoản bảo hiểm',
      aspect: 'what',
      kind: 'text',
      deferrable: true,
      extraction:
        'The insurance rules, conditions and terms that apply to the contract ("quy tắc, điều khoản sản phẩm"), for example the product terms issued with a decision of the insurer.',
    },
    OBLIGATIONS_FIELD,
    EFFECTIVE_TIME_FIELD,
  ],
  checks: [
    expectContent(
      'NT-12',
      'life_insurance',
      ['insurer_name', 'policyholder', 'insured_person'],
      'bên mua bảo hiểm, người được bảo hiểm và doanh nghiệp bảo hiểm',
      law('Hợp đồng bảo hiểm phải có thông tin bên mua bảo hiểm, người được bảo hiểm, người thụ hưởng (nếu có) và doanh nghiệp bảo hiểm.', [
        kdbh17('Bên mua bảo hiểm, người được bảo hiểm, người thụ hưởng (nếu có), doanh nghiệp bảo hiểm'),
      ]),
      'Không xác định rõ ai mua bảo hiểm và ai được bảo hiểm thì khó xác định ai phải đóng phí và ai được chi trả.',
      'Bên mua bảo hiểm: [họ tên]; Người được bảo hiểm: [họ tên]; Người thụ hưởng: [họ tên]; Doanh nghiệp bảo hiểm: [tên].',
    ),
    expectContent(
      'NT-13',
      'life_insurance',
      'sum_insured',
      'số tiền bảo hiểm',
      law('Hợp đồng bảo hiểm phải có số tiền bảo hiểm.', [kdbh17('Số tiền bảo hiểm hoặc giá trị tài sản được bảo hiểm')]),
      'Không có số tiền bảo hiểm thì không xác định được mức chi trả khi xảy ra sự kiện bảo hiểm.',
      'Số tiền bảo hiểm: [số tiền] đồng.',
    ),
    expectContent(
      'NT-14',
      'life_insurance',
      'policy_terms',
      'quy tắc, điều kiện, điều khoản bảo hiểm',
      law('Hợp đồng bảo hiểm phải có quy tắc, điều kiện, điều khoản bảo hiểm.', [kdbh17('quy tắc, điều kiện, điều khoản bảo hiểm')]),
      'Không dẫn chiếu quy tắc, điều khoản sản phẩm thì bên mua khó biết điều kiện chi trả và các trường hợp loại trừ đầy đủ.',
      'Hợp đồng áp dụng Quy tắc, điều khoản sản phẩm [tên sản phẩm] ban hành kèm theo [quyết định số] của Doanh nghiệp bảo hiểm.',
    ),
    expectContent(
      'NT-15',
      'life_insurance',
      'parties_obligations',
      'quyền và nghĩa vụ của doanh nghiệp bảo hiểm và bên mua bảo hiểm',
      law('Hợp đồng bảo hiểm phải có quyền và nghĩa vụ của doanh nghiệp bảo hiểm và bên mua bảo hiểm.', [kdbh17('Quyền và nghĩa vụ của doanh nghiệp bảo hiểm')]),
      WHY_OBLIGATIONS,
      SUGGEST_OBLIGATIONS,
    ),
    expectContent(
      'NT-16',
      'life_insurance',
      'effective_time',
      'thời điểm có hiệu lực',
      law('Hợp đồng bảo hiểm phải có thời điểm có hiệu lực.', [kdbh17('Thời hạn bảo hiểm, thời điểm có hiệu lực của hợp đồng bảo hiểm')]),
      'Không rõ thời điểm có hiệu lực thì khó xác định sự kiện xảy ra trước ngày nào thì không được chi trả.',
      'Hợp đồng có hiệu lực từ [ngày/thời điểm đóng phí đầu tiên và được chấp nhận bảo hiểm].',
    ),
    expectClause('NT-01', 'life_insurance', 'subject_scope', 'đối tượng bảo hiểm', law('Hợp đồng bảo hiểm phải có nội dung về đối tượng bảo hiểm.', [kdbh17('Đối tượng bảo hiểm')]), WHY.subject),
    expectClause('NT-02', 'life_insurance', 'insurance_benefits', 'phạm vi, quyền lợi bảo hiểm', law('Hợp đồng bảo hiểm phải có nội dung về phạm vi hoặc quyền lợi bảo hiểm.', [kdbh17('Phạm vi hoặc quyền lợi bảo hiểm')]), 'Thiếu quyền lợi bảo hiểm thì không xác định được bạn được chi trả trong trường hợp nào và bao nhiêu.'),
    expectClause('NT-03', 'life_insurance', 'term', 'thời hạn bảo hiểm', law('Hợp đồng bảo hiểm phải có thời hạn bảo hiểm và thời điểm có hiệu lực.', [kdbh17('Thời hạn bảo hiểm, thời điểm có hiệu lực')]), WHY.term),
    expectClause('NT-04', 'life_insurance', 'payment', 'phí bảo hiểm', law('Hợp đồng bảo hiểm phải có mức phí bảo hiểm và phương thức đóng phí.', [kdbh17('Mức phí bảo hiểm, phương thức đóng phí bảo hiểm')]), 'Thiếu thoả thuận về phí thì không rõ phải đóng bao nhiêu, khi nào và hậu quả khi chậm đóng.'),
    expectClause('NT-05', 'life_insurance', 'claims', 'phương thức trả tiền bảo hiểm', law('Hợp đồng bảo hiểm phải có phương thức bồi thường, trả tiền bảo hiểm.', [kdbh17('Phương thức bồi thường, trả tiền bảo hiểm')]), 'Thiếu thủ tục chi trả thì việc nhận tiền bảo hiểm dễ bị kéo dài.'),
    expectClause('NT-06', 'life_insurance', 'insurance_exclusions', 'điều khoản loại trừ', practice('Thông lệ: hợp đồng bảo hiểm nhân thọ nêu rõ các trường hợp loại trừ để bên mua biết trước.'), 'Không biết trước các trường hợp loại trừ thì bạn có thể bị từ chối chi trả bất ngờ.'),
    expectClause('NT-07', 'life_insurance', 'surrender_value', 'giá trị hoàn lại', practice('Thông lệ: hợp đồng bảo hiểm nhân thọ nêu cách tính giá trị hoàn lại khi chấm dứt trước hạn.'), 'Không rõ giá trị hoàn lại thì khi huỷ hợp đồng sớm, bạn không biết sẽ nhận lại bao nhiêu.'),
    expectClause('NT-08', 'life_insurance', 'termination', 'chấm dứt hợp đồng', practice('Thông lệ: hợp đồng nên quy định các trường hợp và cách chấm dứt trước hạn.'), WHY.termination),
    expectClause('NT-09', 'life_insurance', 'dispute_resolution', 'giải quyết tranh chấp', law('Hợp đồng bảo hiểm phải có phương thức giải quyết tranh chấp.', [kdbh17('Phương thức giải quyết tranh chấp')]), WHY.dispute),
    {
      code: 'NT-10',
      group: 'compliance',
      title: 'Thời gian cân nhắc ít nhất 21 ngày',
      appliesTo: { contractTypes: ['life_insurance'], facts: ['insurance_term_over_one_year'] },
      test: { kind: 'at_least', field: 'cooling_off_days', limit: 21 },
      basis: law('Với hợp đồng bảo hiểm có thời hạn trên 01 năm, trong 21 ngày kể từ ngày nhận hợp đồng, bên mua bảo hiểm có quyền từ chối tiếp tục tham gia bảo hiểm.', [
        { sourceCode: KDBH, article: 35, verifyText: 'trong thời hạn 21 ngày kể từ ngày nhận được hợp đồng bảo hiểm' },
      ]),
      whyItMatters: 'Bên mua có ít thời gian hơn luật cho phép để đọc kỹ và huỷ hợp đồng mà được hoàn phí.',
      suggestion: 'Trong thời hạn 21 ngày kể từ ngày nhận được hợp đồng, bên mua bảo hiểm có quyền từ chối tiếp tục tham gia bảo hiểm và được hoàn lại phí đã đóng.',
      review: APPROVED,
    },
    {
      code: 'NT-11',
      group: 'compliance',
      title: 'Thời gian gia hạn đóng phí ít nhất 60 ngày',
      appliesTo: { contractTypes: ['life_insurance'] },
      test: { kind: 'at_least', field: 'grace_period_days', limit: 60 },
      basis: law('Khi phí bảo hiểm nhân thọ đóng nhiều lần mà bên mua không đóng được các kỳ tiếp theo thì thời gian gia hạn đóng phí là 60 ngày.', [
        { sourceCode: KDBH, article: 37, clause: 2, verifyText: 'thời gian gia hạn đóng phí là 60 ngày' },
      ]),
      whyItMatters: 'Hợp đồng có thể bị chấm dứt sớm hơn luật cho phép khi bên mua chậm đóng phí.',
      suggestion: 'Thời gian gia hạn đóng phí là 60 ngày kể từ ngày đến hạn đóng phí.',
      review: APPROVED,
    },
  ],
  requiredContent: [
    lawItem(point(kdbh17('Bên mua bảo hiểm, người được bảo hiểm'), 'a'), 'Bên mua bảo hiểm, người được bảo hiểm, người thụ hưởng, doanh nghiệp bảo hiểm', ['NT-12']),
    lawItem(point(kdbh17('Đối tượng bảo hiểm'), 'b'), 'Đối tượng bảo hiểm', ['NT-01']),
    lawItem(point(kdbh17('Số tiền bảo hiểm hoặc giá trị tài sản được bảo hiểm'), 'c'), 'Số tiền bảo hiểm', ['NT-13']),
    lawItem(point(kdbh17('Phạm vi hoặc quyền lợi bảo hiểm'), 'd'), 'Phạm vi, quyền lợi bảo hiểm', ['NT-02']),
    lawItem(point(kdbh17('quy tắc, điều kiện, điều khoản bảo hiểm'), 'd'), 'Quy tắc, điều kiện, điều khoản bảo hiểm', ['NT-14']),
    lawItem(point(kdbh17('Quyền và nghĩa vụ của doanh nghiệp bảo hiểm'), 'đ'), 'Quyền và nghĩa vụ của các bên', ['NT-15']),
    lawItem(point(kdbh17('Thời hạn bảo hiểm, thời điểm có hiệu lực'), 'e'), 'Thời hạn bảo hiểm', ['NT-03']),
    lawItem(point(kdbh17('Thời hạn bảo hiểm, thời điểm có hiệu lực'), 'e'), 'Thời điểm có hiệu lực', ['NT-16']),
    lawItem(point(kdbh17('Mức phí bảo hiểm, phương thức đóng phí bảo hiểm'), 'g'), 'Mức phí, phương thức đóng phí', ['NT-04']),
    lawItem(point(kdbh17('Phương thức bồi thường, trả tiền bảo hiểm'), 'h'), 'Phương thức trả tiền bảo hiểm', ['NT-05']),
    lawItem(point(kdbh17('Phương thức giải quyết tranh chấp'), 'i'), 'Phương thức giải quyết tranh chấp', ['NT-09', 'GQ-01']),
  ],
};
