import type { ClausePlaybook } from './playbookSchema';

const LTM = 'commercial_law_2005';
const BLDS = 'civil_code_2015';

const CONTRACTS = ['sales', 'service', 'office_lease', 'housing_purchase'];
const APPROVED = { status: 'approved' } as const;

export const PENALTY_PLAYBOOK: ClausePlaybook = {
  clauseTypes: ['penalty'],
  title: 'Phạt vi phạm',
  fields: [
    {
      key: 'penalty_agreed',
      label: 'Có thoả thuận phạt vi phạm',
      aspect: 'condition',
      kind: 'boolean',
      extraction: 'true when the contract imposes a penalty for breach ("phạt vi phạm").',
    },
    {
      key: 'penalty_level',
      label: 'Mức phạt',
      aspect: 'how_much',
      kind: 'text',
      extraction: 'The penalty as stated: a fixed amount or a rate. If several breaches have different penalties, list each.',
    },
    {
      key: 'penalty_rate_percent',
      label: 'Mức phạt theo tỷ lệ',
      aspect: 'how_much',
      kind: 'percent',
      extraction: 'The penalty rate as a percentage, only when stated as a percentage. If several rates are stated, the highest.',
    },
    {
      key: 'penalty_base',
      label: 'Cơ sở tính phạt',
      aspect: 'how_much',
      kind: 'text',
      extraction:
        'What a percentage penalty is calculated on, for example "giá trị phần nghĩa vụ hợp đồng bị vi phạm" or "tổng giá trị hợp đồng".',
    },
    {
      key: 'penalized_breaches',
      label: 'Vi phạm bị phạt',
      aspect: 'what',
      kind: 'text',
      extraction: 'Which breaches trigger the penalty.',
    },
    {
      key: 'damages_relation',
      label: 'Quan hệ giữa phạt và bồi thường',
      aspect: 'condition',
      kind: 'text',
      extraction:
        'Whether the injured party may claim damages ("bồi thường thiệt hại") in addition to the penalty, or only one of them.',
    },
    {
      key: 'penalty_binds_user',
      label: 'Bên bạn chịu phạt',
      aspect: 'who',
      kind: 'boolean',
      extraction: "true when the user's party must pay a penalty if it breaches.",
    },
    {
      key: 'penalty_binds_counterparty',
      label: 'Bên kia chịu phạt',
      aspect: 'who',
      kind: 'boolean',
      extraction: "true when the other party (not the user's party) must also pay a penalty if it breaches.",
    },
  ],
  notApplicable: [{ aspect: 'where', reason: 'Phạt vi phạm không gắn với địa điểm.' }],
  checks: [
    {
      code: 'PV-01',
      group: 'clarity',
      title: 'Mức phạt phải xác định được',
      appliesTo: { contractTypes: CONTRACTS },
      test: {
        kind: 'fails_when_all',
        conditions: [
          { field: 'penalty_agreed', op: 'is_true' },
          { field: 'penalty_level', op: 'not_stated' },
        ],
      },
      basis: {
        kind: 'criterion',
        statement: 'Phạt vi phạm chỉ áp dụng được khi xác định được số tiền phải nộp.',
      },
      question: 'Mức phạt là bao nhiêu: một số tiền cố định hay một tỷ lệ phần trăm?',
      whyItMatters: 'Không rõ mức phạt thì điều khoản phạt khó áp dụng khi có vi phạm.',
      suggestion: 'Bên vi phạm chịu phạt [tỷ lệ]% giá trị phần nghĩa vụ hợp đồng bị vi phạm.',
      review: APPROVED,
    },
    {
      code: 'PV-02',
      group: 'clarity',
      title: 'Mức phạt theo tỷ lệ phải nêu rõ tính trên giá trị nào',
      appliesTo: { contractTypes: CONTRACTS },
      test: {
        kind: 'fails_when_all',
        conditions: [
          { field: 'penalty_rate_percent', op: 'greater_than', value: 0 },
          { field: 'penalty_base', op: 'not_stated' },
        ],
      },
      basis: {
        kind: 'criterion',
        statement: 'Một tỷ lệ phần trăm chỉ ra được số tiền khi biết nó tính trên giá trị nào.',
      },
      question: 'Tỷ lệ phạt được tính trên giá trị nào: phần nghĩa vụ bị vi phạm hay toàn bộ giá trị hợp đồng?',
      whyItMatters: 'Cùng một tỷ lệ nhưng tính trên phần vi phạm hay trên cả hợp đồng cho ra số tiền chênh lệch rất lớn.',
      suggestion: 'Mức phạt là [tỷ lệ]% giá trị phần nghĩa vụ hợp đồng bị vi phạm.',
      review: APPROVED,
    },
    {
      code: 'PV-03',
      group: 'clarity',
      title: 'Phải nêu rõ vi phạm nào bị phạt',
      appliesTo: { contractTypes: CONTRACTS },
      test: {
        kind: 'fails_when_all',
        conditions: [
          { field: 'penalty_agreed', op: 'is_true' },
          { field: 'penalized_breaches', op: 'not_stated' },
        ],
      },
      basis: {
        kind: 'criterion',
        statement: 'Phải xác định được hành vi nào làm phát sinh nghĩa vụ nộp phạt.',
      },
      question: 'Những vi phạm nào thì bị phạt?',
      whyItMatters: 'Không rõ hành vi bị phạt thì các bên dễ tranh cãi một vi phạm cụ thể có bị phạt hay không.',
      suggestion: 'Bên [bên] chịu phạt khi [vi phạm cụ thể, ví dụ: giao hàng chậm quá 5 ngày so với thời hạn].',
      review: APPROVED,
    },
    {
      code: 'PV-04',
      group: 'clarity',
      title: 'Phải nêu rõ ngoài tiền phạt có được đòi bồi thường thiệt hại không',
      appliesTo: { contractTypes: CONTRACTS },
      test: {
        kind: 'fails_when_all',
        conditions: [
          { field: 'penalty_agreed', op: 'is_true' },
          { field: 'damages_relation', op: 'not_stated' },
        ],
      },
      basis: {
        kind: 'criterion',
        statement:
          'Khi hợp đồng không nói rõ, kết quả phụ thuộc vào luật áp dụng: Luật Thương mại và Bộ luật Dân sự quy định theo hai hướng ngược nhau.',
      },
      question: 'Khi một bên vi phạm, bên bị vi phạm được đòi cả tiền phạt lẫn bồi thường thiệt hại, hay chỉ một trong hai?',
      whyItMatters:
        'Nếu chỉ được nhận tiền phạt, bên bị vi phạm có thể không bù đắp được thiệt hại thực tế lớn hơn mức phạt.',
      suggestion:
        'Ngoài tiền phạt vi phạm, bên vi phạm còn phải bồi thường toàn bộ thiệt hại thực tế phát sinh do hành vi vi phạm.',
      fallbackRules: [
        {
          contractTypes: ['sales', 'service'],
          facts: ['commercial_contract'],
          statement: 'Khi có thoả thuận phạt vi phạm, bên bị vi phạm có quyền áp dụng cả phạt vi phạm và buộc bồi thường thiệt hại.',
          article: { sourceCode: LTM, article: 307, clause: 2, verifyText: 'cả chế tài phạt vi phạm và buộc bồi thường thiệt hại' },
        },
        {
          contractTypes: ['office_lease', 'housing_purchase'],
          statement:
            'Có thoả thuận phạt vi phạm nhưng không thoả thuận về việc vừa chịu phạt vừa bồi thường thì bên vi phạm chỉ phải chịu phạt vi phạm.',
          article: { sourceCode: BLDS, article: 418, clause: 3, verifyText: 'chỉ phải chịu phạt vi phạm' },
        },
      ],
      replacesRule: 'BLDS_PENALTY_WITHOUT_DAMAGES',
      review: APPROVED,
    },
    {
      code: 'PV-05',
      group: 'compliance',
      title: 'Mức phạt trong hợp đồng thương mại không quá 8%',
      appliesTo: { contractTypes: ['sales', 'service'], facts: ['commercial_contract'] },
      test: { kind: 'at_most', field: 'penalty_rate_percent', limit: 8 },
      basis: {
        kind: 'law',
        statement:
          'Mức phạt đối với vi phạm nghĩa vụ hợp đồng hoặc tổng mức phạt đối với nhiều vi phạm không quá 8% giá trị phần nghĩa vụ hợp đồng bị vi phạm.',
        articles: [{ sourceCode: LTM, article: 301, verifyText: 'không quá 8% giá trị phần nghĩa vụ hợp đồng bị vi phạm' }],
      },
      whyItMatters: 'Phần phạt vượt 8% có nguy cơ không được Toà án hoặc Trọng tài chấp nhận.',
      suggestion: 'Mức phạt là [tỷ lệ, không quá 8]% giá trị phần nghĩa vụ hợp đồng bị vi phạm.',
      replacesRule: 'LTM_PENALTY_CAP',
      review: {
        status: 'approved',
        note:
          'Điều 301 có ngoại lệ tại Điều 266 (dịch vụ giám định). Tỷ lệ trên 8% luôn vượt trần dù cơ sở tính là phần vi phạm hay cả hợp đồng; tỷ lệ từ 8% trở xuống nhưng tính trên cả hợp đồng có thể vẫn vượt trần nhưng phép kiểm này không bắt được.',
      },
    },
    {
      code: 'PV-06',
      group: 'balance',
      title: 'Chỉ bên bạn bị phạt khi vi phạm',
      appliesTo: { contractTypes: CONTRACTS, requiresUserParty: true },
      test: {
        kind: 'fails_when_all',
        conditions: [
          { field: 'penalty_binds_user', op: 'is_true' },
          { field: 'penalty_binds_counterparty', op: 'not_stated' },
        ],
      },
      basis: {
        kind: 'policy',
        statement: 'Khuyến nghị của hệ thống: chế tài phạt vi phạm nên áp dụng cho cả hai bên đối với các nghĩa vụ tương ứng.',
      },
      whyItMatters: 'Bên kia vi phạm thì bạn không có khoản phạt nào để yêu cầu, trong khi bạn vi phạm thì bị phạt.',
      suggestion: 'Bên nào vi phạm nghĩa vụ theo hợp đồng thì chịu phạt [tỷ lệ]% giá trị phần nghĩa vụ bị vi phạm.',
      review: APPROVED,
    },
  ],
};
