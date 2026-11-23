import type { ClausePlaybook } from './playbookSchema';

const KDBH = 'insurance_business_law_2022';

const INSURANCE = ['life_insurance'];
const APPROVED = { status: 'approved' } as const;

export const INSURANCE_EXCLUSIONS_PLAYBOOK: ClausePlaybook = {
  clauseTypes: ['insurance_exclusions'],
  title: 'Điều khoản loại trừ',
  fields: [
    {
      key: 'exclusions_list',
      label: 'Các trường hợp loại trừ',
      aspect: 'what',
      kind: 'text',
      extraction: 'The specific cases in which the insurer does not pay ("điều khoản loại trừ").',
    },
    {
      key: 'explanation_confirmed',
      label: 'Xác nhận đã được giải thích điều khoản loại trừ',
      aspect: 'how',
      kind: 'boolean',
      extraction:
        'true when the contract contains a confirmation that the policyholder has had the exclusions explained and understood them.',
    },
  ],
  notApplicable: [{ aspect: 'where', reason: 'Điều khoản loại trừ không gắn với địa điểm.' }],
  checks: [
    {
      code: 'LT-01',
      group: 'clarity',
      title: 'Các trường hợp loại trừ phải được liệt kê cụ thể',
      appliesTo: { contractTypes: INSURANCE },
      test: { kind: 'stated', field: 'exclusions_list' },
      basis: {
        kind: 'criterion',
        statement: 'Bên mua bảo hiểm phải biết chính xác trường hợp nào không được trả tiền bảo hiểm.',
        references: [{ sourceCode: KDBH, article: 19, clause: 2, verifyText: 'phải quy định rõ trong hợp đồng bảo hiểm' }],
      },
      question: 'Cụ thể những trường hợp nào doanh nghiệp bảo hiểm không trả tiền bảo hiểm?',
      whyItMatters: 'Điều khoản loại trừ mơ hồ dễ bị dùng để từ chối chi trả khi xảy ra sự kiện bảo hiểm.',
      suggestion: 'Doanh nghiệp bảo hiểm không trả tiền bảo hiểm trong các trường hợp sau: [liệt kê từng trường hợp cụ thể].',
      review: APPROVED,
    },
    {
      code: 'LT-02',
      group: 'completeness',
      title: 'Phải có xác nhận bên mua bảo hiểm đã được giải thích điều khoản loại trừ',
      appliesTo: { contractTypes: INSURANCE },
      test: { kind: 'fails_when_all', conditions: [{ field: 'explanation_confirmed', op: 'not_stated' }] },
      basis: {
        kind: 'law',
        statement:
          'Doanh nghiệp bảo hiểm phải giải thích rõ ràng, đầy đủ điều khoản loại trừ và có bằng chứng xác nhận bên mua bảo hiểm đã được giải thích và hiểu rõ khi giao kết.',
        articles: [{ sourceCode: KDBH, article: 19, clause: 2, verifyText: 'có bằng chứng xác nhận việc bên mua bảo hiểm đã được' }],
      },
      whyItMatters: 'Không có bằng chứng đã giải thích thì việc áp dụng điều khoản loại trừ để từ chối chi trả có thể bị tranh chấp.',
      suggestion: 'Bên mua bảo hiểm xác nhận đã được doanh nghiệp bảo hiểm giải thích đầy đủ và hiểu rõ các điều khoản loại trừ trách nhiệm bảo hiểm.',
      review: {
        status: 'approved',
        note: 'Bằng chứng có thể nằm ở tài liệu khác ngoài hợp đồng (ví dụ hồ sơ yêu cầu bảo hiểm), nên kết quả chỉ là "Thiếu nội dung", không phải "Vi phạm".',
      },
    },
  ],
};

export const CLAIMS_PLAYBOOK: ClausePlaybook = {
  clauseTypes: ['claims'],
  title: 'Yêu cầu và chi trả bảo hiểm',
  fields: [
    {
      key: 'insurer_payment_deadline',
      label: 'Thời hạn trả tiền bảo hiểm',
      aspect: 'when',
      kind: 'date_or_event',
      extraction: 'How long after receiving a complete claim file the insurer must pay.',
    },
    {
      key: 'claim_documents',
      label: 'Hồ sơ yêu cầu trả tiền bảo hiểm',
      aspect: 'what',
      kind: 'text',
      extraction: 'The documents needed to claim the insurance benefit.',
    },
    {
      key: 'claim_submission_days',
      label: 'Thời hạn nộp hồ sơ yêu cầu',
      aspect: 'when',
      kind: 'days',
      extraction: 'The time limit, in days, for submitting a claim after the insured event (a year = 365 days).',
    },
  ],
  notApplicable: [{ aspect: 'where', reason: 'Nơi nộp hồ sơ không ảnh hưởng đến quyền được chi trả.' }],
  checks: [
    {
      code: 'BT-01',
      group: 'clarity',
      title: 'Phải nêu thời hạn doanh nghiệp bảo hiểm trả tiền',
      appliesTo: { contractTypes: INSURANCE },
      test: { kind: 'stated', field: 'insurer_payment_deadline' },
      basis: { kind: 'criterion', statement: 'Phải xác định được khi nào doanh nghiệp bảo hiểm chậm trả tiền bảo hiểm.' },
      question: 'Doanh nghiệp bảo hiểm phải trả tiền trong bao lâu kể từ khi nhận đủ hồ sơ?',
      whyItMatters: 'Không rõ thời hạn thì khó yêu cầu lãi chậm trả khi việc chi trả bị kéo dài.',
      suggestion: 'Doanh nghiệp bảo hiểm trả tiền bảo hiểm trong vòng [số] ngày kể từ ngày nhận đủ hồ sơ hợp lệ.',
      fallbackRules: [
        {
          contractTypes: INSURANCE,
          statement: 'Doanh nghiệp bảo hiểm phải trả tiền bảo hiểm trong thời hạn 15 ngày kể từ ngày nhận được đầy đủ hồ sơ hợp lệ.',
          article: { sourceCode: KDBH, article: 31, clause: 1, verifyText: 'trong thời hạn 15 ngày kể từ ngày nhận được đầy đủ hồ sơ hợp lệ' },
        },
      ],
      review: APPROVED,
    },
    {
      code: 'BT-02',
      group: 'clarity',
      title: 'Phải liệt kê hồ sơ cần nộp khi yêu cầu trả tiền bảo hiểm',
      appliesTo: { contractTypes: INSURANCE },
      test: { kind: 'stated', field: 'claim_documents' },
      basis: {
        kind: 'practice',
        statement: 'Thông lệ là liệt kê cụ thể hồ sơ yêu cầu chi trả để xác định khi nào hồ sơ được coi là đầy đủ.',
      },
      question: 'Khi yêu cầu trả tiền bảo hiểm cần nộp những giấy tờ gì?',
      whyItMatters: 'Danh sách hồ sơ không rõ dễ bị dùng để kéo dài thời hạn chi trả với lý do hồ sơ chưa đầy đủ.',
      suggestion: 'Hồ sơ yêu cầu trả tiền bảo hiểm gồm: [liệt kê từng giấy tờ].',
      review: APPROVED,
    },
    {
      code: 'BT-03',
      group: 'compliance',
      title: 'Thời hạn nộp hồ sơ yêu cầu không ngắn hơn 01 năm',
      appliesTo: { contractTypes: INSURANCE },
      test: { kind: 'at_least', field: 'claim_submission_days', limit: 365 },
      basis: {
        kind: 'law',
        statement: 'Thời hạn nộp hồ sơ yêu cầu bồi thường, trả tiền bảo hiểm theo hợp đồng bảo hiểm là 01 năm kể từ ngày xảy ra sự kiện bảo hiểm.',
        articles: [{ sourceCode: KDBH, article: 30, clause: 1, verifyText: 'là 01 năm kể từ ngày xảy ra sự kiện bảo hiểm' }],
      },
      whyItMatters: 'Thời hạn nộp hồ sơ ngắn hơn luật định có thể làm người thụ hưởng mất quyền được chi trả.',
      suggestion: 'Thời hạn nộp hồ sơ yêu cầu trả tiền bảo hiểm là 01 năm kể từ ngày xảy ra sự kiện bảo hiểm.',
      review: {
        status: 'draft',
        note: 'Cần xác minh khoản 1 Điều 30 là thời hạn bắt buộc hay các bên được thoả thuận khác; câu chữ "theo hợp đồng bảo hiểm là 01 năm" chưa đủ rõ để tự kết luận Vi phạm.',
      },
    },
  ],
};
