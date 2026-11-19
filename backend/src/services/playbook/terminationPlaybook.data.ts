import type { ClausePlaybook } from './playbookSchema';

const BLDS = 'civil_code_2015';
const BLLD = 'labor_code_2019';

const CONTRACTS = ['sales', 'service', 'office_lease', 'housing_purchase'];
const APPROVED = { status: 'approved' } as const;

export const TERMINATION_PLAYBOOK: ClausePlaybook = {
  clauseTypes: ['termination'],
  title: 'Chấm dứt hợp đồng',
  fields: [
    {
      key: 'unilateral_termination_allowed',
      label: 'Có quyền đơn phương chấm dứt',
      aspect: 'condition',
      kind: 'boolean',
      extraction: 'true when the contract lets a party terminate it unilaterally ("đơn phương chấm dứt").',
    },
    {
      key: 'termination_grounds',
      label: 'Trường hợp được đơn phương chấm dứt',
      aspect: 'condition',
      kind: 'text',
      extraction: 'The situations in which a party may terminate unilaterally.',
    },
    {
      key: 'termination_notice',
      label: 'Thông báo trước khi chấm dứt',
      aspect: 'when',
      kind: 'text',
      extraction: 'How long in advance, and in what form, a party must notify the other before terminating.',
    },
    {
      key: 'settlement_on_termination',
      label: 'Thanh toán, hoàn trả khi chấm dứt',
      aspect: 'how_much',
      kind: 'text',
      extraction:
        'How payments, refunds, deposits or work already done are settled when the contract ends before its term.',
    },
    {
      key: 'counterparty_terminates_without_cause',
      label: 'Bên kia được chấm dứt không cần lý do',
      aspect: 'who',
      kind: 'boolean',
      extraction:
        "true when the other party (not the user's party) may terminate for any reason or for convenience, without the user being in breach.",
    },
    {
      key: 'user_terminates_without_cause',
      label: 'Bên bạn được chấm dứt không cần lý do',
      aspect: 'who',
      kind: 'boolean',
      extraction: "true when the user's party may also terminate for any reason or for convenience.",
    },
    {
      key: 'employee_notice_days',
      label: 'Số ngày người lao động phải báo trước',
      aspect: 'when',
      kind: 'days',
      extraction: 'In a labor contract, the days of notice the employee must give to terminate unilaterally.',
    },
  ],
  notApplicable: [{ aspect: 'where', reason: 'Việc chấm dứt hợp đồng không gắn với địa điểm.' }],
  checks: [
    {
      code: 'CD-01',
      group: 'clarity',
      title: 'Các trường hợp được đơn phương chấm dứt phải được nêu rõ',
      appliesTo: { contractTypes: CONTRACTS },
      test: {
        kind: 'fails_when_all',
        conditions: [
          { field: 'unilateral_termination_allowed', op: 'is_true' },
          { field: 'termination_grounds', op: 'not_stated' },
        ],
      },
      basis: {
        kind: 'criterion',
        statement: 'Quyền đơn phương chấm dứt chỉ thực hiện được không tranh cãi khi biết rõ trong trường hợp nào được dùng.',
      },
      question: 'Trong những trường hợp nào một bên được đơn phương chấm dứt hợp đồng?',
      whyItMatters:
        'Không rõ căn cứ thì khi một bên chấm dứt, bên kia có thể cho rằng việc chấm dứt là trái hợp đồng và đòi bồi thường.',
      suggestion: 'Mỗi bên được đơn phương chấm dứt hợp đồng khi bên kia [vi phạm cụ thể, ví dụ: chậm thanh toán quá 30 ngày].',
      fallbackRules: [
        {
          contractTypes: CONTRACTS,
          statement:
            'Một bên được đơn phương chấm dứt khi bên kia vi phạm nghiêm trọng nghĩa vụ, hoặc khi các bên có thoả thuận hoặc pháp luật có quy định.',
          article: { sourceCode: BLDS, article: 428, clause: 1, verifyText: 'vi phạm nghiêm trọng nghĩa vụ trong hợp đồng' },
        },
      ],
      review: APPROVED,
    },
    {
      code: 'CD-02',
      group: 'clarity',
      title: 'Đơn phương chấm dứt phải có thời hạn và cách thông báo',
      appliesTo: { contractTypes: CONTRACTS },
      test: {
        kind: 'fails_when_all',
        conditions: [
          { field: 'unilateral_termination_allowed', op: 'is_true' },
          { field: 'termination_notice', op: 'not_stated' },
        ],
      },
      basis: {
        kind: 'criterion',
        statement: 'Phải xác định được khi nào việc chấm dứt có hiệu lực, nên cần biết phải báo trước bao lâu và bằng hình thức nào.',
      },
      question: 'Muốn đơn phương chấm dứt thì phải báo trước bao nhiêu ngày, và bằng hình thức nào?',
      whyItMatters: 'Không có thời hạn báo trước thì bên kia có thể bị chấm dứt đột ngột, không kịp chuẩn bị.',
      suggestion: 'Bên đơn phương chấm dứt phải thông báo bằng văn bản cho bên kia ít nhất [số] ngày trước ngày chấm dứt.',
      fallbackRules: [
        {
          contractTypes: CONTRACTS,
          statement:
            'Bên đơn phương chấm dứt phải thông báo ngay cho bên kia; hợp đồng chấm dứt từ thời điểm bên kia nhận được thông báo.',
          article: { sourceCode: BLDS, article: 428, clause: 2, verifyText: 'phải thông báo ngay cho bên kia' },
        },
      ],
      review: APPROVED,
    },
    {
      code: 'CD-03',
      group: 'clarity',
      title: 'Phải nêu rõ cách thanh toán, hoàn trả khi chấm dứt trước hạn',
      appliesTo: { contractTypes: CONTRACTS },
      test: { kind: 'stated', field: 'settlement_on_termination' },
      basis: {
        kind: 'practice',
        statement:
          'Thông lệ là quy định cách thanh toán phần việc đã làm, hoàn trả tiền đã trả trước hoặc tiền cọc khi hợp đồng chấm dứt trước hạn.',
      },
      question: 'Khi hợp đồng chấm dứt trước hạn, tiền đã trả, tiền cọc và phần việc đã làm được thanh toán, hoàn trả thế nào?',
      whyItMatters: 'Đây là điểm thường tranh chấp nhất khi hợp đồng kết thúc sớm.',
      suggestion:
        'Khi hợp đồng chấm dứt trước hạn, các bên đối chiếu và thanh toán phần nghĩa vụ đã thực hiện; khoản [trả trước/cọc] được hoàn trả trong vòng [số] ngày.',
      fallbackRules: [
        {
          contractTypes: CONTRACTS,
          statement: 'Bên đã thực hiện nghĩa vụ có quyền yêu cầu bên kia thanh toán phần nghĩa vụ đã thực hiện.',
          article: { sourceCode: BLDS, article: 428, clause: 3, verifyText: 'thanh toán phần nghĩa vụ đã thực hiện' },
        },
      ],
      review: APPROVED,
    },
    {
      code: 'CD-04',
      group: 'balance',
      title: 'Bên kia được chấm dứt không cần lý do, bên bạn thì không',
      appliesTo: { contractTypes: CONTRACTS, requiresUserParty: true },
      test: {
        kind: 'fails_when_all',
        conditions: [
          { field: 'counterparty_terminates_without_cause', op: 'is_true' },
          { field: 'user_terminates_without_cause', op: 'not_stated' },
        ],
      },
      basis: {
        kind: 'policy',
        statement:
          'Khuyến nghị của hệ thống: quyền chấm dứt không cần lý do nên có ở cả hai bên, hoặc bên được hưởng quyền này phải bồi thường cho bên kia.',
      },
      whyItMatters:
        'Bên kia có thể kết thúc hợp đồng bất cứ lúc nào, trong khi bạn vẫn bị ràng buộc đến hết thời hạn.',
      suggestion:
        'Mỗi bên đều có quyền chấm dứt hợp đồng không cần lý do, với điều kiện thông báo trước [số] ngày và [bồi thường/thanh toán] cho bên kia [khoản cụ thể].',
      review: APPROVED,
    },
    {
      code: 'CD-05',
      group: 'compliance',
      title: 'Người lao động không bị buộc báo trước lâu hơn mức luật định',
      appliesTo: { contractTypes: ['labor'] },
      test: {
        kind: 'at_most_tiered',
        field: 'employee_notice_days',
        tiers: [
          { facts: ['labor_contract_indefinite'], limit: 45 },
          { facts: ['labor_contract_12_to_36_months'], limit: 30 },
          { facts: ['labor_contract_under_12_months'], limit: 3 },
        ],
      },
      basis: {
        kind: 'law',
        statement:
          'Người lao động đơn phương chấm dứt hợp đồng phải báo trước ít nhất 45 ngày (không xác định thời hạn), 30 ngày (từ 12 đến 36 tháng) hoặc 03 ngày làm việc (dưới 12 tháng).',
        articles: [
          { sourceCode: BLLD, article: 35, clause: 1, verifyText: 'Ít nhất 45 ngày nếu làm việc theo hợp đồng lao động không xác định thời hạn' },
        ],
      },
      whyItMatters: 'Thời hạn báo trước dài hơn luật định làm hạn chế quyền nghỉ việc của người lao động.',
      suggestion: 'Người lao động đơn phương chấm dứt hợp đồng phải báo trước [45/30/03 ngày làm việc] theo Điều 35 Bộ luật Lao động.',
      replacesRule: 'BLLD_EMPLOYEE_NOTICE',
      review: {
        status: 'draft',
        note:
          'Điều 35 quy định mức báo trước tối thiểu mà người lao động phải tuân thủ ("ít nhất"), không trực tiếp cấm hợp đồng yêu cầu báo trước lâu hơn; việc kết luận "Vi phạm" cần thêm căn cứ (ví dụ nguyên tắc thoả thuận không được bất lợi hơn luật cho người lao động). Mức 03 ngày tính theo ngày làm việc. Chưa duyệt cho đến khi có căn cứ rõ hơn; nếu không có, chuyển sang nhóm Cân bằng.',
      },
    },
  ],
};
