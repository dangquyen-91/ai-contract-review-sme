import type { ClauseCategory } from '../../models/clauseTypeTaxonomy.model';
import type { CheckBasis, ContractPlaybook, LegalArticleRef, PlaybookCheck } from './playbookSchema';

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

function requireContent(code: string, field: string, topic: string, verifyText: string, whyItMatters: string, suggestion: string): PlaybookCheck {
  return {
    code,
    group: 'completeness',
    title: `Hợp đồng phải có nội dung về ${topic}`,
    appliesTo: { contractTypes: ['labor'] },
    test: { kind: 'stated', field },
    basis: law(`Hợp đồng lao động phải có nội dung về ${topic}.`, [blld21(verifyText)]),
    question: `Hợp đồng thoả thuận thế nào về ${topic}?`,
    whyItMatters,
    suggestion,
    review: APPROVED,
  };
}

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

export const SALES_CONTRACT_PLAYBOOK: ContractPlaybook = {
  contractType: 'sales',
  title: 'Hợp đồng mua bán hàng hoá',
  fields: [],
  checks: [
    expectClause('MB-01', 'sales', 'subject_scope', 'hàng hoá, số lượng, chất lượng', practice(BLDS_398_PRACTICE, [blds398('Đối tượng của hợp đồng')]), WHY.subject),
    expectClause('MB-02', 'sales', 'payment', 'giá và thanh toán', practice(BLDS_398_PRACTICE, [blds398('Giá, phương thức thanh toán')]), WHY.payment),
    expectClause('MB-03', 'sales', 'delivery_handover', 'giao nhận hàng hoá', practice(BLDS_398_PRACTICE, [blds398('Thời hạn, địa điểm, phương thức thực hiện hợp đồng')]), WHY.delivery),
    expectClause('MB-04', 'sales', 'warranty', 'bảo hành', practice('Thông lệ: hợp đồng mua bán hàng hoá thường có điều khoản bảo hành.'), WHY.warranty),
    expectClause('MB-05', 'sales', 'termination', 'chấm dứt hợp đồng', practice('Thông lệ: hợp đồng nên quy định các trường hợp và cách chấm dứt trước hạn.'), WHY.termination),
    expectClause('MB-06', 'sales', 'dispute_resolution', 'giải quyết tranh chấp', practice(BLDS_398_PRACTICE, [blds398('Phương thức giải quyết tranh chấp')]), WHY.dispute),
  ],
};

export const SERVICE_CONTRACT_PLAYBOOK: ContractPlaybook = {
  contractType: 'service',
  title: 'Hợp đồng dịch vụ',
  fields: [],
  checks: [
    expectClause('DV-01', 'service', 'subject_scope', 'phạm vi công việc, dịch vụ', practice(BLDS_398_PRACTICE, [blds398('Đối tượng của hợp đồng')]), WHY.subject),
    expectClause('DV-02', 'service', 'payment', 'giá và thanh toán', practice(BLDS_398_PRACTICE, [blds398('Giá, phương thức thanh toán')]), WHY.payment),
    expectClause('DV-03', 'service', 'term', 'thời hạn hợp đồng', practice(BLDS_398_PRACTICE, [blds398('Thời hạn, địa điểm, phương thức thực hiện hợp đồng')]), WHY.term),
    expectClause('DV-04', 'service', 'delivery_handover', 'bàn giao, nghiệm thu kết quả', practice(BLDS_398_PRACTICE, [blds398('Thời hạn, địa điểm, phương thức thực hiện hợp đồng')]), WHY.delivery),
    expectClause('DV-05', 'service', 'termination', 'chấm dứt hợp đồng', practice('Thông lệ: hợp đồng nên quy định các trường hợp và cách chấm dứt trước hạn.'), WHY.termination),
    expectClause('DV-06', 'service', 'dispute_resolution', 'giải quyết tranh chấp', practice(BLDS_398_PRACTICE, [blds398('Phương thức giải quyết tranh chấp')]), WHY.dispute),
  ],
};

export const OFFICE_LEASE_CONTRACT_PLAYBOOK: ContractPlaybook = {
  contractType: 'office_lease',
  title: 'Hợp đồng thuê văn phòng, mặt bằng',
  fields: [
    {
      key: 'effective_time',
      label: 'Thời điểm hợp đồng có hiệu lực',
      aspect: 'when',
      kind: 'date_or_event',
      extraction: 'When the contract takes effect (for example "kể từ ngày ký").',
    },
  ],
  checks: [
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
    {
      key: 'effective_time',
      label: 'Thời điểm hợp đồng có hiệu lực',
      aspect: 'when',
      kind: 'date_or_event',
      extraction: 'When the contract takes effect (for example "kể từ ngày ký", "kể từ ngày công chứng").',
    },
    {
      key: 'notarization_mentioned',
      label: 'Công chứng, chứng thực hợp đồng',
      aspect: 'how',
      kind: 'text',
      extraction: 'What the contract says about notarizing or certifying it ("công chứng", "chứng thực").',
    },
  ],
  checks: [
    expectClause('MN-01', 'housing_purchase', 'subject_scope', 'thông tin nhà ở mua bán', practice(KDBDS_46_PRACTICE, [kdbds46('Các thông tin về bất động sản')]), WHY.subject),
    expectClause('MN-02', 'housing_purchase', 'property_legal_status', 'tình trạng pháp lý của nhà ở', practice('Thông lệ: hợp đồng mua nhà nên ghi giấy tờ chứng minh quyền bán của bên bán.'), WHY.legalStatus),
    expectClause('MN-03', 'housing_purchase', 'payment', 'giá và thanh toán', practice(KDBDS_46_PRACTICE, [kdbds46('Phương thức và thời hạn thanh toán')]), WHY.payment),
    expectClause('MN-04', 'housing_purchase', 'delivery_handover', 'bàn giao nhà', practice(KDBDS_46_PRACTICE, [kdbds46('Thời hạn giao, nhận bất động sản và hồ sơ kèm theo')]), WHY.delivery),
    expectClause('MN-05', 'housing_purchase', 'warranty', 'bảo hành', practice(KDBDS_46_PRACTICE, [kdbds46('Bảo hành')]), WHY.warranty),
    expectClause('MN-06', 'housing_purchase', 'ownership_transfer', 'chuyển quyền sở hữu', practice('Thông lệ: hợp đồng mua nhà nên quy định thủ tục và thời hạn cấp Giấy chứng nhận cho bên mua.'), WHY.ownership),
    expectClause('MN-07', 'housing_purchase', 'termination', 'chấm dứt hợp đồng', practice(KDBDS_46_PRACTICE, [kdbds46('Các trường hợp chấm dứt, hủy bỏ hợp đồng và biện pháp xử lý')]), WHY.termination),
    expectClause('MN-08', 'housing_purchase', 'dispute_resolution', 'giải quyết tranh chấp', practice(KDBDS_46_PRACTICE, [kdbds46('Phương thức giải quyết tranh chấp')]), WHY.dispute),
    {
      code: 'MN-09',
      group: 'completeness',
      title: 'Hợp đồng mua bán nhà ở phải được công chứng hoặc chứng thực',
      appliesTo: { contractTypes: ['housing_purchase'], facts: ['seller_not_real_estate_business'] },
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
      appliesTo: { contractTypes: ['housing_purchase'], facts: ['seller_is_developer', 'off_plan_home'] },
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
      basis: practice(KDBDS_46_PRACTICE, [kdbds46('Thời điểm có hiệu lực của hợp đồng')]),
      question: 'Hợp đồng có hiệu lực từ khi nào: từ ngày ký hay từ ngày công chứng?',
      whyItMatters: 'Không rõ thời điểm có hiệu lực thì khó xác định từ khi nào các bên phải thực hiện nghĩa vụ.',
      suggestion: 'Hợp đồng có hiệu lực kể từ ngày [ký/được công chứng].',
      review: APPROVED,
    },
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
  ],
  checks: [
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
};
