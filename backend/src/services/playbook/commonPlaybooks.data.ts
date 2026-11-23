import type { ClausePlaybook } from './playbookSchema';

const LTM = 'commercial_law_2005';
const BLDS = 'civil_code_2015';
const BLLD = 'labor_code_2019';

const APPROVED = { status: 'approved' } as const;

export const SUBJECT_SCOPE_PLAYBOOK: ClausePlaybook = {
  clauseTypes: ['subject_scope'],
  title: 'Đối tượng hợp đồng',
  fields: [
    {
      key: 'goods_quantity',
      label: 'Số lượng hàng hoá',
      aspect: 'how_much',
      kind: 'text',
      deferrable: true,
      extraction: 'The quantity of goods sold, with its unit (for example "20 chiếc", "500 kg").',
    },
    {
      key: 'goods_quality',
      label: 'Chất lượng, quy cách hàng hoá',
      aspect: 'what',
      kind: 'text',
      deferrable: true,
      extraction:
        'The quality standard, specification, model, origin or technical requirements the goods must meet (for example "model MP-500, mới 100%", "theo TCVN ...").',
    },
    {
      key: 'service_result_standard',
      label: 'Kết quả, tiêu chuẩn của dịch vụ',
      aspect: 'what',
      kind: 'text',
      deferrable: true,
      extraction:
        'The deliverables, result or measurable standard the service must meet and that is used to accept it. A bare description of the work ("tư vấn và vận hành hệ thống") is not a result or standard.',
    },
    {
      key: 'job_and_workplace',
      label: 'Công việc và địa điểm làm việc',
      aspect: 'what',
      kind: 'text',
      extraction: 'The job title or duties of the employee and the place of work.',
    },
    {
      key: 'lease_purpose',
      label: 'Mục đích sử dụng mặt bằng thuê',
      aspect: 'what',
      kind: 'text',
      extraction: 'The purpose for which the lessee may use the leased premises (for example "làm văn phòng", "kinh doanh ăn uống").',
    },
  ],
  notApplicable: [
    { aspect: 'when', reason: 'Thời điểm thực hiện được kiểm tra trong các điều khoản giao nhận, thời hạn và thanh toán.' },
  ],
  checks: [
    {
      code: 'DT-01',
      group: 'clarity',
      title: 'Số lượng hàng hoá phải xác định được',
      appliesTo: { contractTypes: ['sales'] },
      test: { kind: 'stated', field: 'goods_quantity' },
      basis: {
        kind: 'criterion',
        statement: 'Bên bán phải giao hàng đúng số lượng đã thoả thuận, nên số lượng phải xác định được.',
        references: [{ sourceCode: LTM, article: 34, clause: 1, verifyText: 'về số lượng, chất lượng, cách thức đóng gói' }],
      },
      question: 'Bên bán phải giao bao nhiêu hàng, tính theo đơn vị nào?',
      whyItMatters: 'Không rõ số lượng thì không xác định được bên bán đã giao đủ hay thiếu.',
      suggestion: 'Số lượng: [số] [đơn vị], chi tiết theo Phụ lục [số] đính kèm.',
      review: APPROVED,
    },
    {
      code: 'DT-02',
      group: 'clarity',
      title: 'Chất lượng, quy cách hàng hoá phải xác định được',
      appliesTo: { contractTypes: ['sales'] },
      test: { kind: 'stated', field: 'goods_quality' },
      basis: {
        kind: 'criterion',
        statement: 'Bên bán phải giao hàng đúng chất lượng đã thoả thuận, nên tiêu chuẩn hoặc quy cách phải được nêu.',
        references: [{ sourceCode: LTM, article: 34, clause: 1, verifyText: 'về số lượng, chất lượng, cách thức đóng gói' }],
      },
      question: 'Hàng phải đạt tiêu chuẩn, quy cách hoặc model nào?',
      whyItMatters: 'Không có tiêu chuẩn chất lượng thì khó chứng minh hàng giao không đạt và khó đòi đổi, trả.',
      suggestion: 'Hàng hoá đạt tiêu chuẩn [tiêu chuẩn/quy cách], [mới 100%], xuất xứ [nước], theo mô tả tại Phụ lục [số].',
      review: APPROVED,
    },
    {
      code: 'DT-03',
      group: 'clarity',
      title: 'Kết quả hoặc tiêu chuẩn của dịch vụ phải xác định được',
      appliesTo: { contractTypes: ['service'] },
      test: { kind: 'stated', field: 'service_result_standard' },
      basis: {
        kind: 'criterion',
        statement: 'Việc nghiệm thu và thanh toán dịch vụ chỉ có căn cứ khi xác định được dịch vụ phải đạt kết quả hoặc tiêu chuẩn gì.',
      },
      question: 'Dịch vụ phải tạo ra kết quả gì, đạt tiêu chuẩn nào để được nghiệm thu?',
      whyItMatters: 'Không có tiêu chuẩn kết quả thì hai bên dễ bất đồng khi nghiệm thu và khi thanh toán.',
      suggestion: 'Kết quả dịch vụ: [sản phẩm/kết quả bàn giao], đạt các tiêu chí [chỉ số đo được], được nghiệm thu bằng biên bản.',
      review: APPROVED,
    },
    {
      code: 'DT-04',
      group: 'clarity',
      title: 'Công việc và địa điểm làm việc phải xác định được',
      appliesTo: { contractTypes: ['labor'] },
      test: { kind: 'stated', field: 'job_and_workplace' },
      basis: {
        kind: 'criterion',
        statement: 'Người lao động chỉ biết mình phải làm gì và ở đâu khi công việc và địa điểm làm việc được ghi cụ thể.',
        references: [{ sourceCode: BLLD, article: 21, clause: 1, verifyText: 'Công việc và địa điểm làm việc' }],
      },
      question: 'Người lao động làm công việc gì, tại địa điểm nào?',
      whyItMatters: 'Không rõ công việc và địa điểm thì khó xác định khi nào người lao động bị chuyển làm việc khác hoặc nơi khác trái thoả thuận.',
      suggestion: 'Chức danh: [chức danh]; công việc: [mô tả]; địa điểm làm việc: [địa chỉ].',
      review: APPROVED,
    },
    {
      code: 'DT-05',
      group: 'clarity',
      title: 'Mục đích sử dụng mặt bằng thuê phải được nêu rõ',
      appliesTo: { contractTypes: ['office_lease'] },
      test: { kind: 'stated', field: 'lease_purpose' },
      basis: {
        kind: 'criterion',
        statement: 'Bên thuê phải sử dụng tài sản đúng mục đích đã thoả thuận, nên mục đích thuê phải được ghi rõ.',
        references: [{ sourceCode: BLDS, article: 480, clause: 1, verifyText: 'đúng mục đích đã thoả thuận' }],
      },
      question: 'Mặt bằng được thuê để sử dụng vào mục đích gì?',
      whyItMatters: 'Sử dụng sai mục đích đã thoả thuận cho phép bên cho thuê đơn phương chấm dứt hợp đồng và đòi bồi thường.',
      suggestion: 'Mục đích thuê: [làm văn phòng/kinh doanh ngành nghề cụ thể].',
      review: APPROVED,
    },
  ],
};

export const WARRANTY_PLAYBOOK: ClausePlaybook = {
  clauseTypes: ['warranty'],
  title: 'Bảo hành',
  fields: [
    {
      key: 'warranty_period',
      label: 'Thời hạn bảo hành',
      aspect: 'when',
      kind: 'text',
      deferrable: true,
      extraction: 'How long the warranty lasts and from which event it is counted (for example "12 tháng kể từ ngày nghiệm thu").',
    },
    {
      key: 'warranty_scope',
      label: 'Phạm vi, điều kiện bảo hành',
      aspect: 'condition',
      kind: 'text',
      deferrable: true,
      extraction: 'Which defects or parts are covered by the warranty and the conditions or exclusions that apply.',
    },
    {
      key: 'warranty_response_time',
      label: 'Thời hạn xử lý yêu cầu bảo hành',
      aspect: 'when',
      kind: 'text',
      extraction: 'How soon the warrantor must respond to, repair or replace after a warranty request.',
    },
    {
      key: 'buyer_pays_warranty_cost',
      label: 'Bên mua chịu chi phí bảo hành',
      aspect: 'how_much',
      kind: 'boolean',
      extraction: 'true when the buyer must bear the cost of warranty repairs, replacement or transport for warranty.',
    },
  ],
  notApplicable: [
    { aspect: 'who', reason: 'Bên bảo hành là bên bán hoặc bên cung ứng theo bản chất hợp đồng.' },
    { aspect: 'where', reason: 'Nơi bảo hành không ảnh hưởng đến quyền được bảo hành; thủ tục được xét trong thời hạn xử lý.' },
  ],
  checks: [
    {
      code: 'BHN-01',
      group: 'clarity',
      title: 'Thời hạn bảo hành phải xác định được',
      appliesTo: { contractTypes: ['sales', 'service', 'housing_purchase'] },
      test: { kind: 'stated', field: 'warranty_period' },
      basis: { kind: 'criterion', statement: 'Phải xác định được bảo hành kéo dài bao lâu và tính từ thời điểm nào.' },
      question: 'Bảo hành kéo dài bao lâu, tính từ ngày nào?',
      whyItMatters: 'Không rõ thời hạn bảo hành thì bên kia có thể từ chối bảo hành với lý do đã hết hạn.',
      suggestion: 'Thời hạn bảo hành là [số] tháng kể từ ngày [bàn giao/nghiệm thu].',
      review: APPROVED,
    },
    {
      code: 'BHN-02',
      group: 'clarity',
      title: 'Phải nêu rõ phạm vi và điều kiện được bảo hành',
      appliesTo: { contractTypes: ['sales', 'service', 'housing_purchase'] },
      test: { kind: 'stated', field: 'warranty_scope' },
      basis: { kind: 'practice', statement: 'Thông lệ là nêu những hư hỏng nào được bảo hành và trường hợp nào bị loại trừ.' },
      question: 'Những hư hỏng, bộ phận nào được bảo hành và trường hợp nào không được bảo hành?',
      whyItMatters: 'Không rõ phạm vi thì bên bảo hành dễ từ chối với lý do hư hỏng không thuộc diện bảo hành.',
      suggestion: 'Bảo hành các lỗi [kỹ thuật/vật liệu/thi công]; không bảo hành hư hỏng do [sử dụng sai hướng dẫn, thiên tai].',
      review: APPROVED,
    },
    {
      code: 'BHN-03',
      group: 'clarity',
      title: 'Phải nêu thời hạn sửa chữa, thay thế khi có yêu cầu bảo hành',
      appliesTo: { contractTypes: ['sales', 'service', 'housing_purchase'] },
      test: { kind: 'stated', field: 'warranty_response_time' },
      basis: { kind: 'practice', statement: 'Thông lệ là nêu thời hạn bên bảo hành phải có mặt và khắc phục sau khi nhận yêu cầu.' },
      question: 'Sau khi nhận yêu cầu bảo hành, bên bảo hành phải sửa chữa hoặc thay thế trong bao lâu?',
      whyItMatters: 'Không có thời hạn xử lý thì việc bảo hành có thể kéo dài mà không có căn cứ để yêu cầu bồi thường.',
      suggestion: 'Bên [bên bảo hành] khắc phục trong vòng [số] ngày kể từ ngày nhận yêu cầu bảo hành bằng văn bản.',
      fallbackRules: [
        {
          contractTypes: ['sales'],
          facts: ['commercial_contract'],
          statement: 'Bên bán phải thực hiện nghĩa vụ bảo hành trong thời gian ngắn nhất mà hoàn cảnh thực tế cho phép.',
          article: { sourceCode: LTM, article: 49, clause: 2, verifyText: 'trong thời gian ngắn nhất mà hoàn cảnh thực tế cho phép' },
        },
      ],
      review: APPROVED,
    },
    {
      code: 'BHN-04',
      group: 'balance',
      title: 'Bên mua phải chịu chi phí bảo hành',
      appliesTo: { contractTypes: ['sales'], partyRoles: ['buyer'] },
      test: { kind: 'fails_when_all', conditions: [{ field: 'buyer_pays_warranty_cost', op: 'is_true' }] },
      basis: {
        kind: 'policy',
        statement:
          'Khuyến nghị của hệ thống: chi phí bảo hành nên do bên bán chịu như quy định mặc định của Luật Thương mại; thoả thuận khác là hợp lệ nhưng bất lợi cho bên mua.',
        references: [{ sourceCode: LTM, article: 49, clause: 3, verifyText: 'Bên bán phải chịu các chi phí về việc bảo hành' }],
      },
      whyItMatters: 'Bạn phải trả thêm tiền để được sửa chữa những lỗi thuộc trách nhiệm của bên bán.',
      suggestion: 'Bên bán chịu toàn bộ chi phí bảo hành, kể cả chi phí vận chuyển hàng đi và về để bảo hành.',
      review: APPROVED,
    },
  ],
};

export const CONFIDENTIALITY_PLAYBOOK: ClausePlaybook = {
  clauseTypes: ['confidentiality'],
  title: 'Bảo mật',
  fields: [
    {
      key: 'confidential_scope',
      label: 'Phạm vi thông tin phải bảo mật',
      aspect: 'what',
      kind: 'text',
      extraction: 'Which information must be kept confidential (for example customer data, source code, unpublished business information).',
    },
    {
      key: 'confidentiality_period',
      label: 'Thời hạn nghĩa vụ bảo mật',
      aspect: 'when',
      kind: 'text',
      extraction: 'How long the confidentiality obligation lasts, including any period after the contract ends.',
    },
    {
      key: 'non_compete',
      label: 'Hạn chế làm việc cho đối thủ sau khi nghỉ việc',
      aspect: 'condition',
      kind: 'boolean',
      extraction:
        'true when the employee is barred, after the contract ends, from working for, advising or setting up a competing business. Only keeping information secret is NOT this.',
    },
    {
      key: 'non_compete_benefit',
      label: 'Quyền lợi bù đắp cho việc hạn chế',
      aspect: 'how_much',
      kind: 'boolean',
      extraction: 'true when the contract gives the employee a payment or other benefit in return for the post-employment restriction.',
    },
  ],
  notApplicable: [
    { aspect: 'where', reason: 'Nghĩa vụ bảo mật không phụ thuộc nơi thực hiện.' },
    { aspect: 'how', reason: 'Cách thức bảo mật là nghiệp vụ nội bộ; hợp đồng cần xác định phạm vi và thời hạn.' },
  ],
  checks: [
    {
      code: 'BM-01',
      group: 'clarity',
      title: 'Phạm vi thông tin phải bảo mật phải xác định được',
      appliesTo: { contractTypes: ['sales', 'service', 'labor'] },
      test: { kind: 'stated', field: 'confidential_scope' },
      basis: { kind: 'criterion', statement: 'Một bên chỉ biết mình vi phạm nghĩa vụ bảo mật hay không khi xác định được thông tin nào phải bảo mật.' },
      question: 'Những thông tin nào phải giữ bí mật?',
      whyItMatters: 'Phạm vi không rõ thì bên có nghĩa vụ có thể bị cáo buộc vi phạm với cả những thông tin thông thường.',
      suggestion: 'Thông tin bảo mật gồm: [danh mục cụ thể]; không bao gồm thông tin đã công khai hoặc được cung cấp theo yêu cầu của cơ quan có thẩm quyền.',
      review: APPROVED,
    },
    {
      code: 'BM-02',
      group: 'clarity',
      title: 'Thời hạn nghĩa vụ bảo mật phải xác định được',
      appliesTo: { contractTypes: ['sales', 'service', 'labor'] },
      test: { kind: 'stated', field: 'confidentiality_period' },
      basis: { kind: 'criterion', statement: 'Phải xác định được nghĩa vụ bảo mật kéo dài đến khi nào, nhất là sau khi hợp đồng chấm dứt.' },
      question: 'Nghĩa vụ bảo mật kéo dài bao lâu, kể cả sau khi hợp đồng chấm dứt?',
      whyItMatters: 'Không rõ thời hạn thì nghĩa vụ bảo mật có thể bị hiểu là kéo dài vô thời hạn.',
      suggestion: 'Nghĩa vụ bảo mật có hiệu lực trong thời hạn hợp đồng và [số] tháng sau khi hợp đồng chấm dứt.',
      review: APPROVED,
    },
    {
      code: 'BM-03',
      group: 'balance',
      title: 'Hạn chế làm việc cho đối thủ sau khi nghỉ việc mà không có quyền lợi bù đắp',
      appliesTo: { contractTypes: ['labor'], partyRoles: ['employee'] },
      test: {
        kind: 'fails_when_all',
        conditions: [
          { field: 'non_compete', op: 'is_true' },
          { field: 'non_compete_benefit', op: 'not_stated' },
        ],
      },
      basis: {
        kind: 'policy',
        statement:
          'Khuyến nghị của hệ thống: thoả thuận bảo vệ bí mật kinh doanh với người lao động nên ghi rõ quyền lợi của người lao động; hạn chế quyền làm việc mà không có quyền lợi bù đắp là bất lợi cho người lao động.',
        references: [{ sourceCode: BLLD, article: 21, clause: 2, verifyText: 'quyền lợi và việc bồi thường trong trường hợp vi phạm' }],
      },
      whyItMatters: 'Bạn bị hạn chế tìm việc trong lĩnh vực của mình sau khi nghỉ mà không được bù đắp gì.',
      suggestion: 'Trong thời gian hạn chế [số] tháng, Người sử dụng lao động trả cho Người lao động khoản bù đắp [số tiền/tỷ lệ lương] mỗi tháng.',
      review: APPROVED,
    },
  ],
};

export const FORCE_MAJEURE_PLAYBOOK: ClausePlaybook = {
  clauseTypes: ['force_majeure'],
  title: 'Sự kiện bất khả kháng',
  fields: [
    {
      key: 'force_majeure_notice',
      label: 'Thông báo khi gặp sự kiện bất khả kháng',
      aspect: 'how',
      kind: 'text',
      extraction: 'What the affected party must do to notify the other party of a force majeure event, and by when.',
    },
    {
      key: 'force_majeure_prolonged',
      label: 'Xử lý khi sự kiện bất khả kháng kéo dài',
      aspect: 'condition',
      kind: 'text',
      extraction: 'What happens when the force majeure event lasts long: suspension, extension of deadlines, or a right to terminate after a stated period.',
    },
  ],
  notApplicable: [
    { aspect: 'how_much', reason: 'Sự kiện bất khả kháng là căn cứ miễn trách nhiệm, không phát sinh khoản tiền riêng.' },
    { aspect: 'where', reason: 'Nơi xảy ra sự kiện không ảnh hưởng đến cách xử lý giữa các bên.' },
  ],
  checks: [
    {
      code: 'BKK-01',
      group: 'clarity',
      title: 'Phải nêu cách và thời hạn thông báo khi gặp sự kiện bất khả kháng',
      appliesTo: { contractTypes: ['sales', 'service', 'office_lease', 'housing_purchase'] },
      test: { kind: 'stated', field: 'force_majeure_notice' },
      basis: { kind: 'practice', statement: 'Thông lệ là quy định bên gặp sự kiện bất khả kháng phải thông báo bằng văn bản trong một thời hạn cụ thể.' },
      question: 'Bên gặp sự kiện bất khả kháng phải thông báo cho bên kia bằng cách nào và trong bao lâu?',
      whyItMatters: 'Không có thủ tục thông báo thì bên kia không biết để hạn chế thiệt hại, và việc miễn trách nhiệm dễ bị tranh chấp.',
      suggestion: 'Bên gặp sự kiện bất khả kháng thông báo bằng văn bản cho bên kia trong vòng [số] ngày kể từ khi sự kiện xảy ra, kèm tài liệu chứng minh.',
      fallbackRules: [
        {
          contractTypes: ['sales', 'service'],
          facts: ['commercial_contract'],
          statement: 'Bên vi phạm phải thông báo ngay bằng văn bản cho bên kia về trường hợp được miễn trách nhiệm và hậu quả có thể xảy ra.',
          article: { sourceCode: LTM, article: 295, clause: 1, verifyText: 'phải thông báo ngay bằng văn bản cho bên kia' },
        },
      ],
      review: APPROVED,
    },
    {
      code: 'BKK-02',
      group: 'clarity',
      title: 'Phải nêu cách xử lý khi sự kiện bất khả kháng kéo dài',
      appliesTo: { contractTypes: ['sales', 'service', 'office_lease', 'housing_purchase'] },
      test: { kind: 'stated', field: 'force_majeure_prolonged' },
      basis: { kind: 'practice', statement: 'Thông lệ là quy định quá một thời hạn nhất định thì các bên được gia hạn, tạm ngừng hoặc chấm dứt hợp đồng.' },
      question: 'Nếu sự kiện bất khả kháng kéo dài, sau bao lâu thì các bên được chấm dứt hợp đồng và thanh toán thế nào?',
      whyItMatters: 'Không có cách xử lý thì hợp đồng có thể bị treo vô thời hạn khi sự kiện kéo dài.',
      suggestion: 'Nếu sự kiện bất khả kháng kéo dài quá [số] ngày, mỗi bên có quyền chấm dứt hợp đồng bằng văn bản; các bên thanh toán phần nghĩa vụ đã thực hiện.',
      review: APPROVED,
    },
  ],
};

export const DISPUTE_PLAYBOOK: ClausePlaybook = {
  clauseTypes: ['dispute_resolution'],
  title: 'Giải quyết tranh chấp',
  fields: [
    {
      key: 'dispute_forum',
      label: 'Cơ quan giải quyết tranh chấp',
      aspect: 'where',
      kind: 'text',
      extraction:
        'Which body resolves disputes: a court ("Toà án nhân dân ..." or "Toà án có thẩm quyền"), commercial arbitration, or labor conciliation and arbitration.',
    },
    {
      key: 'arbitration_chosen',
      label: 'Chọn trọng tài thương mại',
      aspect: 'where',
      kind: 'boolean',
      extraction: 'true when the parties choose commercial arbitration ("trọng tài thương mại") to resolve disputes.',
    },
    {
      key: 'arbitration_centre',
      label: 'Trung tâm trọng tài được chọn',
      aspect: 'where',
      kind: 'text',
      extraction: 'The name of the arbitration centre chosen (for example "Trung tâm Trọng tài Quốc tế Việt Nam (VIAC)").',
    },
    {
      key: 'court_chosen',
      label: 'Đưa tranh chấp ra Toà án',
      aspect: 'where',
      kind: 'boolean',
      extraction: 'true when the contract says disputes are resolved by a court ("Toà án").',
    },
    {
      key: 'labor_conciliation',
      label: 'Hoà giải viên lao động, Hội đồng trọng tài lao động',
      aspect: 'how',
      kind: 'text',
      extraction:
        'What the contract says about conciliation by a labor mediator ("hoà giải viên lao động"), the labor arbitration council ("Hội đồng trọng tài lao động"), or resolving disputes under the procedure of the Labor Code. Negotiation or conciliation between the parties themselves does NOT count.',
    },
  ],
  notApplicable: [
    { aspect: 'how_much', reason: 'Chi phí giải quyết tranh chấp do luật tố tụng hoặc quy tắc trọng tài điều chỉnh.' },
  ],
  checks: [
    {
      code: 'GQ-01',
      group: 'clarity',
      title: 'Phải nêu cơ quan giải quyết tranh chấp',
      appliesTo: { contractTypes: ['sales', 'service', 'office_lease', 'labor', 'housing_purchase', 'life_insurance'] },
      test: { kind: 'stated', field: 'dispute_forum' },
      basis: { kind: 'criterion', statement: 'Khi có tranh chấp, các bên phải biết đưa vụ việc ra Toà án hay Trọng tài nào.' },
      question: 'Tranh chấp được giải quyết tại Toà án hay Trọng tài, cụ thể là cơ quan nào?',
      whyItMatters: 'Không rõ cơ quan giải quyết thì khi tranh chấp, các bên có thể tranh cãi cả về nơi khởi kiện.',
      suggestion: 'Tranh chấp không thương lượng được sẽ được giải quyết tại [Toà án nhân dân có thẩm quyền/Trung tâm trọng tài cụ thể].',
      review: APPROVED,
    },
    {
      code: 'GQ-02',
      group: 'clarity',
      title: 'Chọn trọng tài thì phải nêu tên trung tâm trọng tài',
      appliesTo: { contractTypes: ['sales', 'service', 'office_lease', 'housing_purchase'] },
      test: {
        kind: 'fails_when_all',
        conditions: [
          { field: 'arbitration_chosen', op: 'is_true' },
          { field: 'arbitration_centre', op: 'not_stated' },
        ],
      },
      basis: {
        kind: 'practice',
        statement: 'Thông lệ: thoả thuận trọng tài không xác định được trung tâm trọng tài thì có thể không thực hiện được, và tranh chấp lại phải đưa ra Toà án.',
      },
      question: 'Tranh chấp được giải quyết tại trung tâm trọng tài nào, theo quy tắc tố tụng nào?',
      whyItMatters: 'Thoả thuận trọng tài không rõ ràng có thể bị coi là không thực hiện được, làm mất thời gian khi có tranh chấp.',
      suggestion: 'Tranh chấp được giải quyết tại [tên trung tâm trọng tài] theo Quy tắc tố tụng trọng tài của Trung tâm này.',
      review: APPROVED,
    },
    {
      code: 'GQ-03',
      group: 'completeness',
      title: 'Điều khoản tranh chấp lao động phải nêu bước hoà giải viên lao động trước khi khởi kiện',
      appliesTo: { contractTypes: ['labor'] },
      test: {
        kind: 'fails_when_all',
        conditions: [
          { field: 'court_chosen', op: 'is_true' },
          { field: 'labor_conciliation', op: 'not_stated' },
        ],
      },
      basis: {
        kind: 'practice',
        statement:
          'Thông lệ: tranh chấp lao động cá nhân phải qua hoà giải viên lao động trước khi yêu cầu Hội đồng trọng tài lao động hoặc Toà án giải quyết (trừ một số loại tranh chấp), nên điều khoản giải quyết tranh chấp nêu đủ các bước này.',
        references: [
          { sourceCode: BLLD, article: 187, verifyText: 'Hòa giải viên lao động' },
          { sourceCode: BLLD, article: 188, clause: 1, verifyText: 'phải được giải quyết thông qua thủ tục hòa giải của hòa giải viên lao động' },
        ],
      },
      question: 'Khi có tranh chấp, các bên có phải qua hoà giải viên lao động trước khi đưa ra Hội đồng trọng tài lao động hoặc Toà án không?',
      whyItMatters:
        'Điều khoản chỉ nêu Toà án dễ khiến các bên bỏ qua bước hoà giải bắt buộc với phần lớn tranh chấp lao động, mất thời gian khi cần giải quyết tranh chấp.',
      suggestion:
        'Tranh chấp được giải quyết theo trình tự của Bộ luật Lao động: qua hoà giải viên lao động, sau đó Hội đồng trọng tài lao động hoặc Toà án nhân dân có thẩm quyền, trừ các tranh chấp không bắt buộc hoà giải theo khoản 1 Điều 188.',
      review: {
        status: 'approved',
        note: 'Thoả thuận chọn một Toà án cố định (ví dụ nơi người sử dụng lao động đặt trụ sở) chưa được kiểm tra vì Bộ luật Tố tụng dân sự chưa có trong kho luật.',
      },
    },
  ],
};
