import type { ClausePlaybook } from './playbookSchema';

const BLDS = 'civil_code_2015';
const KDBDS = 'real_estate_business_law_2023';

const PROPERTY = ['office_lease', 'housing_purchase'];
const APPROVED = { status: 'approved' } as const;

export const DEPOSIT_PLAYBOOK: ClausePlaybook = {
  clauseTypes: ['deposit'],
  title: 'Đặt cọc',
  fields: [
    {
      key: 'deposit_amount',
      label: 'Số tiền đặt cọc',
      aspect: 'how_much',
      kind: 'money',
      extraction: 'The deposit amount ("tiền đặt cọc", "tiền cọc"), or how it is calculated.',
    },
    {
      key: 'deposit_percent',
      label: 'Tiền cọc theo tỷ lệ giá bán',
      aspect: 'how_much',
      kind: 'percent',
      extraction: 'The deposit as a percentage of the total price. Compute it from the amounts when only amounts are given.',
    },
    {
      key: 'refund_terms',
      label: 'Hoàn trả hoặc khấu trừ tiền cọc',
      aspect: 'when',
      kind: 'text',
      extraction: 'When and how the deposit is returned, or deducted from the payments, when the contract is performed or ends.',
    },
    {
      key: 'depositor_forfeits',
      label: 'Bên đặt cọc mất cọc khi từ chối',
      aspect: 'condition',
      kind: 'boolean',
      extraction: 'true when the depositing party loses the deposit if it refuses to sign or perform.',
    },
    {
      key: 'receiver_penalty_multiple',
      label: 'Bên nhận cọc phải trả bao nhiêu lần tiền cọc khi từ chối',
      aspect: 'condition',
      kind: 'number',
      extraction:
        'If the party receiving the deposit refuses to sign or perform, how many times the deposit it must pay back: 1 = only returns the deposit, 2 = returns the deposit plus an equal amount.',
    },
  ],
  notApplicable: [{ aspect: 'where', reason: 'Đặt cọc không gắn với địa điểm.' }],
  checks: [
    {
      code: 'DC-01',
      group: 'clarity',
      title: 'Số tiền đặt cọc phải xác định được',
      appliesTo: { contractTypes: PROPERTY },
      test: { kind: 'stated', field: 'deposit_amount' },
      basis: { kind: 'criterion', statement: 'Phải xác định được số tiền đã đặt cọc để xử lý cọc khi hợp đồng được hoặc không được thực hiện.' },
      question: 'Số tiền đặt cọc là bao nhiêu?',
      whyItMatters: 'Không rõ số tiền cọc thì khi tranh chấp khó chứng minh đã đặt bao nhiêu và phải trả lại bao nhiêu.',
      suggestion: 'Bên [bên đặt cọc] đặt cọc số tiền [số tiền] đồng (Bằng chữ: [số tiền bằng chữ]).',
      review: APPROVED,
    },
    {
      code: 'DC-02',
      group: 'clarity',
      title: 'Phải nêu rõ khi nào tiền cọc được hoàn trả hoặc trừ vào tiền thanh toán',
      appliesTo: { contractTypes: PROPERTY },
      test: { kind: 'stated', field: 'refund_terms' },
      basis: { kind: 'criterion', statement: 'Phải xác định được tiền cọc được xử lý thế nào khi hợp đồng được thực hiện hoặc kết thúc.' },
      question: 'Khi hợp đồng được thực hiện hoặc kết thúc, tiền cọc được trả lại hay trừ vào tiền thanh toán, và trong bao lâu?',
      whyItMatters: 'Đây là điểm thường tranh chấp khi kết thúc hợp đồng thuê hoặc khi giao dịch mua bán không thành.',
      suggestion: 'Tiền cọc được [trừ vào kỳ thanh toán cuối/hoàn trả] trong vòng [số] ngày kể từ ngày [sự kiện].',
      fallbackRules: [
        {
          contractTypes: PROPERTY,
          statement: 'Khi hợp đồng được giao kết, thực hiện thì tài sản đặt cọc được trả lại cho bên đặt cọc hoặc được trừ để thực hiện nghĩa vụ trả tiền.',
          article: {
            sourceCode: BLDS,
            article: 328,
            clause: 2,
            verifyText: 'được trả lại cho bên đặt cọc hoặc được trừ để thực hiện nghĩa vụ trả tiền',
          },
        },
      ],
      review: APPROVED,
    },
    {
      code: 'DC-03',
      group: 'balance',
      title: 'Phạt cọc không cân bằng, bất lợi cho bên đặt cọc',
      appliesTo: { contractTypes: PROPERTY, partyRoles: ['lessee', 'buyer'] },
      test: {
        kind: 'fails_when_all',
        conditions: [
          { field: 'depositor_forfeits', op: 'is_true' },
          { field: 'receiver_penalty_multiple', op: 'less_than', value: 2 },
        ],
      },
      basis: {
        kind: 'policy',
        statement:
          'Khuyến nghị của hệ thống: chế tài cọc nên ngang nhau cho hai bên, như mức mặc định của Bộ luật Dân sự (bên nhận cọc từ chối thì trả lại cọc và một khoản tương đương).',
        references: [
          { sourceCode: BLDS, article: 328, clause: 2, verifyText: 'một khoản tiền tương đương giá trị tài sản đặt cọc' },
        ],
      },
      whyItMatters:
        'Bên nhận cọc có thể huỷ giao dịch (ví dụ khi giá tăng) mà gần như không bị thiệt, còn bạn thì chịu rủi ro mất cọc.',
      suggestion:
        'Nếu bên nhận đặt cọc từ chối giao kết, thực hiện hợp đồng thì phải trả cho bên đặt cọc tiền cọc và một khoản tiền tương đương tiền cọc.',
      replacesRule: 'BLDS_DEPOSIT_ASYMMETRY',
      review: {
        status: 'approved',
        note: 'Mức mặc định ở khoản 2 Điều 328 áp dụng "trừ trường hợp có thoả thuận khác", nên thoả thuận lệch không trái luật; vì vậy đây là phép kiểm Cân bằng, không phải Tuân thủ. Rule cũ chỉ áp dụng cho mua nhà; nay áp dụng cả bên thuê mặt bằng.',
      },
    },
    {
      code: 'DC-04',
      group: 'compliance',
      title: 'Chủ đầu tư thu tiền đặt cọc không quá 5% giá bán',
      appliesTo: { contractTypes: ['housing_purchase'], facts: ['seller_is_developer'] },
      test: { kind: 'at_most', field: 'deposit_percent', limit: 5 },
      basis: {
        kind: 'law',
        statement:
          'Chủ đầu tư dự án bất động sản chỉ được thu tiền đặt cọc không quá 5% giá bán khi nhà ở đã có đủ các điều kiện đưa vào kinh doanh.',
        articles: [{ sourceCode: KDBDS, article: 23, clause: 5, verifyText: 'chỉ được thu tiền đặt cọc không quá 5% giá bán' }],
      },
      whyItMatters: 'Bên mua bị giữ một khoản tiền lớn hơn mức luật cho phép; nếu dự án có vấn đề, việc đòi lại rất khó.',
      suggestion: 'Tiền đặt cọc là [tỷ lệ, không quá 5]% giá bán.',
      replacesRule: 'KDBDS_DEPOSIT_CAP',
      review: APPROVED,
    },
  ],
};

export const MAINTENANCE_PLAYBOOK: ClausePlaybook = {
  clauseTypes: ['maintenance_repair'],
  title: 'Sửa chữa và bảo trì',
  fields: [
    {
      key: 'repair_responsibility',
      label: 'Trách nhiệm sửa chữa',
      aspect: 'who',
      kind: 'text',
      extraction: 'Which party repairs which damage (major and minor repairs, structure, equipment) and who bears the cost.',
    },
  ],
  notApplicable: [{ aspect: 'where', reason: 'Việc sửa chữa thực hiện tại chính tài sản thuê.' }],
  checks: [
    {
      code: 'SC-01',
      group: 'clarity',
      title: 'Phải nêu rõ bên nào sửa chữa hư hỏng nào và ai chịu chi phí',
      appliesTo: { contractTypes: ['office_lease'] },
      test: { kind: 'stated', field: 'repair_responsibility' },
      basis: { kind: 'criterion', statement: 'Phải xác định được bên chịu trách nhiệm và chi phí khi tài sản thuê hư hỏng.' },
      question: 'Khi mặt bằng hoặc trang thiết bị hư hỏng, bên nào sửa chữa và ai chịu chi phí?',
      whyItMatters: 'Không rõ trách nhiệm thì khi hư hỏng, hai bên dễ đùn đẩy và việc kinh doanh bị gián đoạn.',
      suggestion: 'Bên cho thuê sửa chữa hư hỏng về kết cấu và hệ thống kỹ thuật chung; bên thuê sửa chữa hư hỏng nhỏ do mình sử dụng gây ra.',
      fallbackRules: [
        {
          contractTypes: ['office_lease'],
          statement: 'Bên cho thuê phải sửa chữa những hư hỏng, khuyết tật của tài sản thuê, trừ hư hỏng nhỏ mà theo tập quán bên thuê phải tự sửa chữa.',
          article: { sourceCode: BLDS, article: 477, clause: 1, verifyText: 'phải sửa chữa những hư hỏng, khuyết tật của tài sản thuê' },
        },
      ],
      review: APPROVED,
    },
  ],
};

export const SUBLEASE_PLAYBOOK: ClausePlaybook = {
  clauseTypes: ['sublease_transfer'],
  title: 'Cho thuê lại, chuyển nhượng',
  fields: [
    {
      key: 'sublease_terms',
      label: 'Quyền cho thuê lại',
      aspect: 'condition',
      kind: 'text',
      extraction: 'Whether and on what conditions the lessee may sublease the premises or transfer the lease.',
    },
  ],
  notApplicable: [{ aspect: 'where', reason: 'Cho thuê lại áp dụng cho chính tài sản thuê.' }],
  checks: [
    {
      code: 'CL-01',
      group: 'clarity',
      title: 'Phải nêu rõ bên thuê có được cho thuê lại hay không',
      appliesTo: { contractTypes: ['office_lease'] },
      test: { kind: 'stated', field: 'sublease_terms' },
      basis: { kind: 'criterion', statement: 'Phải xác định được bên thuê có được cho thuê lại mặt bằng và trong điều kiện nào.' },
      question: 'Bên thuê có được cho thuê lại một phần hoặc toàn bộ mặt bằng không, và cần điều kiện gì?',
      whyItMatters: 'Bên thuê tự cho thuê lại khi chưa được đồng ý có thể bị coi là vi phạm hợp đồng.',
      suggestion: 'Bên thuê được cho thuê lại [một phần/toàn bộ] mặt bằng khi có sự đồng ý bằng văn bản của bên cho thuê.',
      fallbackRules: [
        {
          contractTypes: ['office_lease'],
          statement: 'Bên thuê có quyền cho thuê lại tài sản mà mình đã thuê, nếu được bên cho thuê đồng ý.',
          article: { sourceCode: BLDS, article: 475, verifyText: 'nếu được bên cho thuê đồng ý' },
        },
      ],
      review: APPROVED,
    },
  ],
};

export const PROPERTY_STATUS_PLAYBOOK: ClausePlaybook = {
  clauseTypes: ['property_legal_status'],
  title: 'Tình trạng pháp lý tài sản',
  fields: [
    {
      key: 'ownership_documents',
      label: 'Giấy tờ về quyền sở hữu, quyền cho thuê',
      aspect: 'what',
      kind: 'text',
      extraction:
        'The documents proving the right to sell or lease the property, such as the number of the land use right and ownership certificate.',
    },
    {
      key: 'encumbrance_status',
      label: 'Tình trạng thế chấp, tranh chấp',
      aspect: 'condition',
      kind: 'text',
      extraction: 'Whether the property is mortgaged, disputed or seized, as stated in the contract.',
    },
  ],
  notApplicable: [{ aspect: 'when', reason: 'Tình trạng pháp lý được xác định tại thời điểm giao kết.' }],
  checks: [
    {
      code: 'PL-01',
      group: 'clarity',
      title: 'Phải nêu giấy tờ chứng minh quyền bán hoặc cho thuê tài sản',
      appliesTo: { contractTypes: PROPERTY },
      test: { kind: 'stated', field: 'ownership_documents' },
      basis: {
        kind: 'practice',
        statement: 'Thông lệ là ghi số Giấy chứng nhận hoặc giấy tờ chứng minh quyền của bên bán, bên cho thuê đối với tài sản.',
      },
      question: 'Bên bán hoặc bên cho thuê có giấy tờ gì chứng minh quyền đối với tài sản (số Giấy chứng nhận, ngày cấp)?',
      whyItMatters: 'Nếu bên kia không có quyền đối với tài sản, hợp đồng có thể bị vô hiệu và bạn khó đòi lại tiền.',
      suggestion: 'Tài sản thuộc quyền sở hữu của Bên [bên] theo Giấy chứng nhận số [số], cấp ngày [ngày] tại [cơ quan cấp].',
      review: APPROVED,
    },
    {
      code: 'PL-02',
      group: 'clarity',
      title: 'Phải nêu tài sản có đang thế chấp hay tranh chấp không',
      appliesTo: { contractTypes: PROPERTY },
      test: { kind: 'stated', field: 'encumbrance_status' },
      basis: {
        kind: 'practice',
        statement: 'Thông lệ là bên bán, bên cho thuê cam kết tài sản không bị thế chấp, tranh chấp, kê biên tại thời điểm giao kết.',
      },
      question: 'Tài sản có đang bị thế chấp, tranh chấp hay kê biên không?',
      whyItMatters: 'Tài sản đang thế chấp hoặc tranh chấp có thể không giao được hoặc bị bên thứ ba yêu cầu thu hồi.',
      suggestion: 'Bên [bên] cam kết tài sản không bị thế chấp, tranh chấp, kê biên tại thời điểm ký hợp đồng.',
      review: APPROVED,
    },
  ],
};

export const OWNERSHIP_TRANSFER_PLAYBOOK: ClausePlaybook = {
  clauseTypes: ['ownership_transfer'],
  title: 'Chuyển quyền sở hữu',
  fields: [
    {
      key: 'certificate_procedure',
      label: 'Thủ tục cấp Giấy chứng nhận',
      aspect: 'who',
      kind: 'text',
      extraction: 'Which party carries out the procedure for the buyer to receive the ownership certificate, and the deadline.',
    },
  ],
  notApplicable: [{ aspect: 'where', reason: 'Thủ tục được thực hiện tại cơ quan có thẩm quyền theo quy định.' }],
  checks: [
    {
      code: 'CQ-01',
      group: 'clarity',
      title: 'Phải nêu rõ ai làm thủ tục cấp Giấy chứng nhận và trong thời hạn nào',
      appliesTo: { contractTypes: ['housing_purchase'] },
      test: { kind: 'stated', field: 'certificate_procedure' },
      basis: {
        kind: 'practice',
        statement: 'Thông lệ là ghi rõ bên làm thủ tục cấp Giấy chứng nhận cho bên mua, thời hạn hoàn thành và bên chịu thuế, lệ phí.',
      },
      question: 'Bên nào làm thủ tục cấp Giấy chứng nhận cho bên mua, trong thời hạn bao lâu, ai chịu thuế và lệ phí?',
      whyItMatters: 'Không rõ trách nhiệm và thời hạn thì việc cấp sổ có thể bị kéo dài mà bên mua không có căn cứ để yêu cầu.',
      suggestion: 'Bên [bên] làm thủ tục cấp Giấy chứng nhận cho bên mua trong vòng [số] ngày kể từ ngày bàn giao nhà.',
      review: APPROVED,
    },
  ],
};
