import type { ClausePlaybook } from './playbookSchema';

const LTM = 'commercial_law_2005';
const BLDS = 'civil_code_2015';
const NGOAI_HOI = 'foreign_exchange_ordinance_2005';
const KDBDS = 'real_estate_business_law_2023';

const PAID_CONTRACTS = ['sales', 'service', 'office_lease', 'housing_purchase'];
const APPROVED = { status: 'approved' } as const;

export const PAYMENT_PLAYBOOK: ClausePlaybook = {
  clauseTypes: ['payment'],
  title: 'Giá và thanh toán',
  fields: [
    {
      key: 'payer',
      label: 'Bên thanh toán',
      aspect: 'who',
      kind: 'party',
      extraction: 'The party that must pay, as named in the contract (for example "Bên A" or "Bên mua").',
    },
    {
      key: 'amount',
      label: 'Số tiền hoặc cách tính giá',
      aspect: 'how_much',
      kind: 'money',
      deferrable: true,
      extraction:
        'The price or amount to pay, or the unit price or formula used to compute it. Copy the exact words, including the amount written in words if present.',
    },
    {
      key: 'currency',
      label: 'Đồng tiền thanh toán',
      aspect: 'how_much',
      kind: 'text',
      extraction: 'The currency of the price or payment, for example "đồng", "VNĐ" or "USD".',
    },
    {
      key: 'tax_treatment',
      label: 'Thuế GTGT trong giá',
      aspect: 'how_much',
      kind: 'text',
      extraction:
        'Whether the price includes value added tax ("đã bao gồm thuế GTGT") or excludes it ("chưa bao gồm thuế GTGT").',
    },
    {
      key: 'due_time',
      label: 'Thời hạn thanh toán',
      aspect: 'when',
      kind: 'date_or_event',
      deferrable: true,
      extraction:
        'When payment is due: a calendar date, or a period counted from an identifiable event (for example "trong 30 ngày kể từ ngày nhận hoá đơn"). For instalments, the due time of each instalment.',
    },
    {
      key: 'method',
      label: 'Phương thức thanh toán',
      aspect: 'how',
      kind: 'text',
      extraction: 'How the payment is made (bank transfer, cash) and the receiving account if stated.',
    },
    {
      key: 'late_interest_rate',
      label: 'Lãi chậm thanh toán',
      aspect: 'how_much',
      kind: 'interest_rate',
      extraction:
        'The interest rate charged on late payment together with its period, for example "0,05%/ngày" or "1,5%/tháng".',
    },
    {
      key: 'price_in_foreign_currency',
      label: 'Giá hoặc thanh toán bằng ngoại tệ',
      aspect: 'how_much',
      kind: 'boolean',
      extraction: 'true when the price, the contract value or the payment is stated in a foreign currency.',
    },
    {
      key: 'prepayment_percent',
      label: 'Tỷ lệ trả trước',
      aspect: 'when',
      kind: 'percent',
      extraction:
        'The share of the total contract value paid in advance, before delivery or performance, as a percentage.',
    },
    {
      key: 'refund_guarantee',
      label: 'Bảo đảm hoàn trả khoản trả trước',
      aspect: 'condition',
      kind: 'boolean',
      extraction:
        'true when the payer gets security for recovering an advance payment, such as a bank guarantee ("bảo lãnh hoàn tạm ứng") or a refund commitment with a deadline.',
    },
    {
      key: 'first_payment_percent',
      label: 'Lần thanh toán đầu (gồm cả tiền cọc)',
      aspect: 'when',
      kind: 'percent',
      extraction: 'The first payment including any deposit, as a percentage of the contract value.',
    },
    {
      key: 'paid_before_handover_percent',
      label: 'Tổng số đã trả trước khi bàn giao',
      aspect: 'when',
      kind: 'percent',
      extraction: 'The total share of the contract value the buyer must pay before the home or building is handed over.',
    },
    {
      key: 'paid_before_certificate_percent',
      label: 'Tổng số đã trả trước khi có Giấy chứng nhận',
      aspect: 'when',
      kind: 'percent',
      extraction:
        'The total share of the contract value the buyer must pay before the ownership certificate ("Giấy chứng nhận", "sổ hồng") is issued.',
    },
  ],
  notApplicable: [
    {
      aspect: 'where',
      reason:
        'Khi thanh toán chuyển khoản, nơi thanh toán chính là tài khoản nhận tiền, đã được kiểm tra trong trường "Phương thức thanh toán".',
    },
  ],
  checks: [
    {
      code: 'TT-01',
      group: 'clarity',
      title: 'Số tiền hoặc cách tính giá phải xác định được',
      appliesTo: { contractTypes: PAID_CONTRACTS },
      test: { kind: 'stated', field: 'amount' },
      basis: {
        kind: 'criterion',
        statement: 'Nghĩa vụ thanh toán chỉ thực hiện và chứng minh được khi xác định được số tiền phải trả.',
      },
      question: 'Phải thanh toán bao nhiêu, hoặc số tiền được tính theo cách nào?',
      whyItMatters:
        'Nếu không xác định được số tiền, mỗi bên có thể đưa ra một con số khác nhau khi đối chiếu công nợ; khi tranh chấp, giá sẽ được xác định theo quy định của pháp luật thay vì theo ý định của các bên.',
      suggestion: 'Giá trị hợp đồng là [số tiền] đồng (Bằng chữ: [số tiền bằng chữ]), [đã/chưa] bao gồm thuế GTGT.',
      fallbackRules: [
        {
          contractTypes: ['sales'],
          facts: ['commercial_contract'],
          statement: 'Giá hàng hoá được xác định theo giá của loại hàng hoá đó trong các điều kiện tương tự.',
          article: { sourceCode: LTM, article: 52, verifyText: 'trong các điều kiện tương tự về phương thức giao hàng' },
        },
        {
          contractTypes: ['service'],
          facts: ['commercial_contract'],
          statement: 'Giá dịch vụ được xác định theo giá của loại dịch vụ đó trong các điều kiện tương tự.',
          article: { sourceCode: LTM, article: 86, verifyText: 'trong các điều kiện tương tự về phương thức cung ứng' },
        },
        {
          contractTypes: ['office_lease'],
          statement: 'Giá thuê được xác định theo giá thị trường tại địa điểm và thời điểm giao kết hợp đồng thuê.',
          article: { sourceCode: BLDS, article: 473, clause: 2, verifyText: 'giá thuê được xác định theo giá thị trường' },
        },
        {
          contractTypes: ['housing_purchase'],
          statement: 'Giá được xác định theo giá thị trường.',
          article: { sourceCode: BLDS, article: 433, clause: 2, verifyText: 'giá được xác định theo giá thị trường' },
        },
      ],
      review: APPROVED,
    },
    {
      code: 'TT-02',
      group: 'clarity',
      title: 'Thời hạn thanh toán phải xác định được',
      appliesTo: { contractTypes: PAID_CONTRACTS },
      test: { kind: 'stated', field: 'due_time' },
      basis: {
        kind: 'criterion',
        statement:
          'Thời hạn thanh toán phải là một ngày cụ thể hoặc một khoảng thời gian tính từ sự kiện xác định được, để biết khi nào bên thanh toán bắt đầu chậm trả.',
      },
      question: 'Khi nào phải thanh toán: vào ngày cụ thể nào, hoặc trong bao nhiêu ngày kể từ sự kiện nào?',
      whyItMatters:
        'Không có thời hạn rõ ràng thì không xác định được thời điểm bắt đầu chậm thanh toán, nên khó yêu cầu lãi chậm trả hay áp dụng chế tài.',
      suggestion: 'Bên [bên thanh toán] thanh toán trong vòng [số] ngày kể từ ngày [sự kiện, ví dụ: nhận đủ hàng và hoá đơn hợp lệ].',
      fallbackRules: [
        {
          contractTypes: ['sales'],
          facts: ['commercial_contract'],
          statement: 'Bên mua thanh toán vào thời điểm bên bán giao hàng hoặc giao chứng từ liên quan đến hàng hoá.',
          article: { sourceCode: LTM, article: 55, verifyText: 'vào thời điểm bên bán giao hàng' },
        },
        {
          contractTypes: ['service'],
          facts: ['commercial_contract'],
          statement: 'Thời hạn thanh toán là thời điểm việc cung ứng dịch vụ được hoàn thành.',
          article: { sourceCode: LTM, article: 87, verifyText: 'thời điểm việc cung ứng dịch vụ được hoàn thành' },
        },
        {
          contractTypes: ['office_lease'],
          statement:
            'Thời hạn trả tiền thuê xác định theo tập quán nơi trả tiền; nếu không xác định được thì trả khi trả lại tài sản thuê.',
          article: { sourceCode: BLDS, article: 481, clause: 1, verifyText: 'xác định theo tập quán nơi trả tiền' },
        },
        {
          contractTypes: ['housing_purchase'],
          statement: 'Bên mua thanh toán tại thời điểm nhận tài sản.',
          article: { sourceCode: BLDS, article: 440, clause: 2, verifyText: 'bên mua phải thanh toán tiền tại thời điểm nhận tài sản' },
        },
      ],
      review: APPROVED,
    },
    {
      code: 'TT-03',
      group: 'clarity',
      title: 'Đồng tiền thanh toán phải xác định được',
      appliesTo: { contractTypes: PAID_CONTRACTS },
      test: { kind: 'stated', field: 'currency' },
      basis: {
        kind: 'criterion',
        statement: 'Số tiền chỉ có nghĩa khi biết được tính bằng đồng tiền nào.',
      },
      question: 'Giá và khoản thanh toán được tính bằng đồng tiền nào?',
      whyItMatters: 'Không rõ đồng tiền thì số tiền phải trả có thể bị hiểu khác nhau, nhất là khi có yếu tố nước ngoài.',
      suggestion: 'Đồng tiền thanh toán: Đồng Việt Nam (VNĐ).',
      review: APPROVED,
    },
    {
      code: 'TT-04',
      group: 'clarity',
      title: 'Giá phải ghi rõ đã hay chưa bao gồm thuế GTGT',
      appliesTo: { contractTypes: ['sales', 'service', 'office_lease'] },
      test: { kind: 'stated', field: 'tax_treatment' },
      basis: {
        kind: 'practice',
        statement:
          'Hàng hoá, dịch vụ và cho thuê mặt bằng thường chịu thuế GTGT; thông lệ là ghi rõ giá đã hay chưa bao gồm thuế để tránh chênh lệch đúng bằng phần thuế.',
      },
      question: 'Giá trong hợp đồng đã bao gồm thuế GTGT hay chưa?',
      whyItMatters: 'Hai bên có thể tranh chấp về việc ai phải chịu khoản thuế GTGT trên giá trị hợp đồng.',
      suggestion: 'Giá nêu trên [đã/chưa] bao gồm thuế giá trị gia tăng.',
      review: APPROVED,
    },
    {
      code: 'TT-05',
      group: 'clarity',
      title: 'Phương thức thanh toán phải được nêu rõ',
      appliesTo: { contractTypes: PAID_CONTRACTS },
      test: { kind: 'stated', field: 'method' },
      basis: {
        kind: 'practice',
        statement:
          'Thông lệ là ghi rõ thanh toán bằng chuyển khoản hay tiền mặt và tài khoản nhận tiền, để có chứng từ chứng minh đã thanh toán.',
      },
      question: 'Thanh toán bằng chuyển khoản hay tiền mặt, và vào tài khoản nào?',
      whyItMatters: 'Không rõ phương thức và tài khoản nhận thì khó chứng minh đã thanh toán đúng khi có tranh chấp.',
      suggestion: 'Bên [bên thanh toán] thanh toán bằng chuyển khoản vào tài khoản số [số tài khoản] tại [ngân hàng], chủ tài khoản [tên].',
      fallbackRules: [
        {
          contractTypes: ['sales', 'housing_purchase'],
          statement: 'Phương thức thanh toán được xác định theo tập quán tại địa điểm và thời điểm giao kết hợp đồng.',
          article: { sourceCode: BLDS, article: 433, clause: 2, verifyText: 'theo tập quán tại địa điểm và thời điểm giao kết' },
        },
      ],
      review: APPROVED,
    },
    {
      code: 'TT-06',
      group: 'compliance',
      title: 'Lãi chậm thanh toán không vượt quá 20%/năm',
      appliesTo: { contractTypes: ['office_lease', 'housing_purchase'] },
      test: { kind: 'at_most', field: 'late_interest_rate', limit: 20 },
      basis: {
        kind: 'law',
        statement:
          'Lãi suất phát sinh do chậm trả tiền theo thoả thuận không được vượt quá mức tại khoản 1 Điều 468 Bộ luật Dân sự 2015 (20%/năm); mức vượt quá không có hiệu lực.',
        articles: [
          { sourceCode: BLDS, article: 357, clause: 2, verifyText: 'khoản 1 Điều 468' },
          { sourceCode: BLDS, article: 468, clause: 1, verifyText: '20%/năm' },
        ],
      },
      whyItMatters: 'Phần lãi vượt 20%/năm không có hiệu lực, nên bên đòi lãi không yêu cầu được phần vượt quá.',
      suggestion: 'Lãi chậm thanh toán là [mức, không quá 20]%/năm tính trên số tiền chậm trả, tương ứng với thời gian chậm trả.',
      replacesRule: 'BLDS_LATE_INTEREST_CAP',
      review: APPROVED,
    },
    {
      code: 'TT-07',
      group: 'compliance',
      title: 'Lãi chậm thanh toán trong hợp đồng thương mại không vượt quá 20%/năm',
      appliesTo: { contractTypes: ['sales', 'service'], facts: ['commercial_contract'] },
      test: { kind: 'at_most', field: 'late_interest_rate', limit: 20 },
      basis: {
        kind: 'law',
        statement:
          'Điều 306 Luật Thương mại 2005 cho phép đòi lãi chậm thanh toán theo lãi suất nợ quá hạn trung bình trên thị trường, trừ trường hợp có thoả thuận khác hoặc pháp luật có quy định khác.',
        articles: [
          { sourceCode: LTM, article: 306, verifyText: 'lãi suất nợ quá hạn trung bình trên thị trường' },
          { sourceCode: BLDS, article: 357, clause: 2, verifyText: 'khoản 1 Điều 468' },
          { sourceCode: BLDS, article: 468, clause: 1, verifyText: '20%/năm' },
        ],
      },
      whyItMatters: 'Mức lãi quá cao có nguy cơ không được Toà án hoặc Trọng tài chấp nhận toàn bộ.',
      suggestion: 'Lãi chậm thanh toán là [mức]%/năm tính trên số tiền chậm trả, tương ứng với thời gian chậm trả.',
      replacesRule: 'LTM_LATE_INTEREST_CAP',
      review: {
        status: 'rejected',
        note:
          'Không dùng làm phép kiểm Vi phạm. Điều 306 LTM dẫn chiếu lãi suất nợ quá hạn trung bình trên thị trường và cho phép thoả thuận khác; việc trần 20%/năm của BLDS có áp dụng cho lãi chậm trả trong hợp đồng thương mại hay không chưa có cách hiểu thống nhất (rule cũ tự ghi là "cách áp dụng phổ biến").',
      },
    },
    {
      code: 'TT-08',
      group: 'compliance',
      title: 'Không ghi giá hoặc thanh toán bằng ngoại tệ',
      appliesTo: {
        contractTypes: ['sales', 'service', 'office_lease'],
        facts: ['no_foreign_exchange_exemption'],
      },
      test: { kind: 'fails_when_all', conditions: [{ field: 'price_in_foreign_currency', op: 'is_true' }] },
      basis: {
        kind: 'law',
        statement:
          'Trên lãnh thổ Việt Nam, việc ghi giá trong hợp đồng và thanh toán không được thực hiện bằng ngoại hối, trừ các trường hợp được Ngân hàng Nhà nước cho phép.',
        articles: [{ sourceCode: NGOAI_HOI, article: 22, verifyText: 'ghi giá trong hợp đồng' }],
      },
      whyItMatters:
        'Nếu không thuộc trường hợp được phép, việc ghi giá bằng ngoại tệ vi phạm quy định quản lý ngoại hối và điều khoản giá dễ bị tranh cãi về hiệu lực.',
      suggestion: 'Giá và các khoản thanh toán theo hợp đồng này được ghi và thanh toán bằng Đồng Việt Nam.',
      replacesRule: 'FX_PRICE_IN_FOREIGN_CURRENCY',
      review: {
        status: 'approved',
        note:
          'Ngoại lệ "được Ngân hàng Nhà nước cho phép" nằm ở Thông tư 32/2013/TT-NHNN, chưa có trong kho luật. Điều kiện áp dụng no_foreign_exchange_exemption được xác định từ phần thông tin các bên; trường hợp không xác định được thì kết quả là "Chưa xác minh được".',
      },
    },
    {
      code: 'TT-09',
      group: 'balance',
      title: 'Trả trước quá nửa giá trị mà không có bảo đảm hoàn trả',
      appliesTo: { contractTypes: ['sales', 'service'], partyRoles: ['buyer', 'client'] },
      test: {
        kind: 'fails_when_all',
        conditions: [
          { field: 'prepayment_percent', op: 'greater_than', value: 50 },
          { field: 'refund_guarantee', op: 'not_stated' },
        ],
      },
      basis: {
        kind: 'policy',
        statement:
          'Khuyến nghị của hệ thống: khi trả trước trên 50% giá trị hợp đồng, bên trả tiền nên có bảo đảm hoàn trả. Ngưỡng 50% là lựa chọn chính sách, không phải quy định của pháp luật.',
      },
      whyItMatters:
        'Nếu bên kia không giao hàng hoặc không thực hiện dịch vụ, bạn phải yêu cầu hoặc khởi kiện để đòi lại khoản đã trả trước.',
      suggestion:
        'Trước khi nhận khoản trả trước, Bên [bên nhận tiền] cung cấp bảo lãnh hoàn trả tiền trả trước của ngân hàng với giá trị tương đương, có hiệu lực đến khi hoàn thành nghĩa vụ.',
      review: APPROVED,
    },
    {
      code: 'TT-10',
      group: 'compliance',
      title: 'Lần thanh toán đầu không quá 30% giá trị hợp đồng',
      appliesTo: { contractTypes: ['housing_purchase'], facts: ['seller_is_developer', 'off_plan_home'] },
      test: { kind: 'at_most', field: 'first_payment_percent', limit: 30 },
      basis: {
        kind: 'law',
        statement:
          'Thanh toán mua bán nhà ở hình thành trong tương lai được thực hiện nhiều lần, lần đầu không quá 30% giá trị hợp đồng bao gồm cả tiền đặt cọc.',
        articles: [{ sourceCode: KDBDS, article: 25, verifyText: 'lần đầu không quá 30% giá trị hợp đồng bao gồm cả tiền đặt cọc' }],
      },
      whyItMatters: 'Bên mua phải trả trước quá nhiều khi nhà chưa xây xong, chịu rủi ro lớn nếu dự án chậm hoặc không hoàn thành.',
      suggestion: 'Lần thanh toán đầu tiên, bao gồm cả tiền đặt cọc, là [tỷ lệ, không quá 30]% giá trị hợp đồng.',
      replacesRule: 'KDBDS_FIRST_PAYMENT_CAP',
      review: APPROVED,
    },
    {
      code: 'TT-11',
      group: 'compliance',
      title: 'Tổng số tiền trả trước khi bàn giao không vượt mức luật định',
      appliesTo: { contractTypes: ['housing_purchase'], facts: ['seller_is_developer', 'off_plan_home'] },
      test: {
        kind: 'at_most_tiered',
        field: 'paid_before_handover_percent',
        tiers: [{ facts: ['seller_is_foreign_invested'], limit: 50 }],
        absoluteLimit: 70,
      },
      basis: {
        kind: 'law',
        statement:
          'Tổng số tiền thanh toán không quá 70% giá trị hợp đồng khi chưa bàn giao nhà; trường hợp bên bán là tổ chức kinh tế có vốn đầu tư nước ngoài thì không quá 50%.',
        articles: [
          { sourceCode: KDBDS, article: 25, verifyText: 'tổng số không quá 70% giá trị hợp đồng khi chưa bàn giao' },
          { sourceCode: KDBDS, article: 25, verifyText: 'thì tổng số không quá 50% giá trị hợp đồng' },
        ],
      },
      whyItMatters:
        'Bên mua gần như đã trả đủ tiền nhưng chưa nhận nhà, mất lợi thế để buộc chủ đầu tư bàn giao đúng hạn và đúng chất lượng.',
      suggestion: 'Tổng số tiền thanh toán trước khi bàn giao nhà không vượt quá [70%, hoặc 50% nếu bên bán có vốn đầu tư nước ngoài] giá trị hợp đồng.',
      replacesRule: 'KDBDS_PRE_HANDOVER_CAP',
      review: {
        status: 'approved',
        note: 'Rule cũ chỉ kiểm mức 70%, bỏ sót mức 50% khi bên bán là tổ chức kinh tế có vốn đầu tư nước ngoài (cùng câu trong Điều 25).',
      },
    },
    {
      code: 'TT-12',
      group: 'compliance',
      title: 'Chưa có Giấy chứng nhận thì không thu quá 95% giá trị hợp đồng',
      appliesTo: { contractTypes: ['housing_purchase'], facts: ['seller_is_developer', 'off_plan_home'] },
      test: { kind: 'at_most', field: 'paid_before_certificate_percent', limit: 95 },
      basis: {
        kind: 'law',
        statement:
          'Nếu bên mua chưa được cấp Giấy chứng nhận thì bên bán không được thu quá 95% giá trị hợp đồng.',
        articles: [{ sourceCode: KDBDS, article: 25, verifyText: 'không được thu quá 95% giá trị hợp đồng' }],
      },
      whyItMatters: 'Bên mua mất khoản giữ lại để buộc chủ đầu tư làm thủ tục cấp Giấy chứng nhận; việc cấp sổ có thể bị kéo dài.',
      suggestion: 'Bên mua thanh toán [5]% giá trị hợp đồng còn lại khi được cấp Giấy chứng nhận.',
      replacesRule: 'KDBDS_PRE_CERTIFICATE_CAP',
      review: {
        status: 'approved',
        note: 'Quy định nằm trong Điều 25 về nhà ở hình thành trong tương lai; rule cũ áp dụng cho mọi trường hợp bên bán là chủ đầu tư, kể cả nhà đã hoàn thành.',
      },
    },
  ],
};
