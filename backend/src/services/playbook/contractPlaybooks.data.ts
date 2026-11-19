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
  fields: [],
  checks: [
    expectClause('TM-01', 'office_lease', 'subject_scope', 'thông tin mặt bằng cho thuê', practice(KDBDS_46_PRACTICE, [kdbds46('Các thông tin về bất động sản')]), WHY.subject),
    expectClause('TM-02', 'office_lease', 'property_legal_status', 'tình trạng pháp lý của mặt bằng', practice('Thông lệ: hợp đồng thuê nên ghi giấy tờ chứng minh quyền cho thuê của bên cho thuê.'), WHY.legalStatus),
    expectClause('TM-03', 'office_lease', 'payment', 'giá thuê và thanh toán', practice(KDBDS_46_PRACTICE, [kdbds46('Phương thức và thời hạn thanh toán')]), WHY.payment),
    expectClause('TM-04', 'office_lease', 'term', 'thời hạn thuê', practice(BLDS_398_PRACTICE, [blds398('Thời hạn, địa điểm, phương thức thực hiện hợp đồng')]), WHY.term),
    expectClause('TM-05', 'office_lease', 'delivery_handover', 'bàn giao mặt bằng', practice(KDBDS_46_PRACTICE, [kdbds46('Thời hạn giao, nhận bất động sản và hồ sơ kèm theo')]), WHY.delivery),
    expectClause('TM-06', 'office_lease', 'maintenance_repair', 'sửa chữa, bảo trì', practice('Thông lệ: hợp đồng thuê nên phân định trách nhiệm sửa chữa và chi phí.'), WHY.repair),
    expectClause('TM-07', 'office_lease', 'termination', 'chấm dứt hợp đồng', practice(KDBDS_46_PRACTICE, [kdbds46('Các trường hợp chấm dứt, hủy bỏ hợp đồng và biện pháp xử lý')]), WHY.termination),
    expectClause('TM-08', 'office_lease', 'dispute_resolution', 'giải quyết tranh chấp', practice(KDBDS_46_PRACTICE, [kdbds46('Phương thức giải quyết tranh chấp')]), WHY.dispute),
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
      extraction: 'true when the employer may fine the employee or cut wages as a disciplinary measure.',
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
  ],
};

export const HOUSING_PURCHASE_CONTRACT_PLAYBOOK: ContractPlaybook = {
  contractType: 'housing_purchase',
  title: 'Hợp đồng mua bán nhà ở',
  fields: [
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
  ],
};

export const LIFE_INSURANCE_CONTRACT_PLAYBOOK: ContractPlaybook = {
  contractType: 'life_insurance',
  title: 'Hợp đồng bảo hiểm nhân thọ',
  fields: [],
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
  ],
};
