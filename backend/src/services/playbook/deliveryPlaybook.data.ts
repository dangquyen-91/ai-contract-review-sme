import type { ClausePlaybook } from './playbookSchema';

const LTM = 'commercial_law_2005';
const BLDS = 'civil_code_2015';

const APPROVED = { status: 'approved' } as const;

export const DELIVERY_PLAYBOOK: ClausePlaybook = {
  clauseTypes: ['delivery_handover'],
  title: 'Giao nhận và bàn giao',
  fields: [
    {
      key: 'delivery_time',
      label: 'Thời hạn giao hoặc bàn giao',
      aspect: 'when',
      kind: 'date_or_event',
      deferrable: true,
      extraction:
        'When goods are delivered, the service is completed or the property is handed over: a date, or a period counted from an identifiable event.',
    },
    {
      key: 'delivery_place',
      label: 'Địa điểm giao hàng',
      aspect: 'where',
      kind: 'text',
      deferrable: true,
      extraction: 'Where the goods are delivered.',
    },
    {
      key: 'acceptance',
      label: 'Kiểm tra, nghiệm thu',
      aspect: 'how',
      kind: 'text',
      extraction:
        'How the receiving party inspects and accepts the goods or the work ("kiểm tra", "nghiệm thu"), including any time limit for raising defects.',
    },
    {
      key: 'handover_record',
      label: 'Biên bản bàn giao',
      aspect: 'how',
      kind: 'text',
      extraction:
        'Whether a handover record ("biên bản bàn giao", "biên bản giao nhận") is made, and what it records such as the condition of the property.',
    },
  ],
  notApplicable: [
    { aspect: 'who', reason: 'Bên giao và bên nhận được xác định theo vai trò của các bên trong hợp đồng.' },
    { aspect: 'how_much', reason: 'Số lượng, chất lượng thuộc điều khoản đối tượng hợp đồng.' },
  ],
  checks: [
    {
      code: 'GN-01',
      group: 'clarity',
      title: 'Thời hạn giao hoặc bàn giao phải xác định được',
      appliesTo: { contractTypes: ['sales', 'service', 'office_lease', 'housing_purchase'] },
      test: { kind: 'stated', field: 'delivery_time' },
      basis: {
        kind: 'criterion',
        statement: 'Phải xác định được thời điểm giao, hoàn thành hoặc bàn giao để biết khi nào một bên chậm thực hiện.',
      },
      question: 'Hàng được giao, dịch vụ được hoàn thành hoặc tài sản được bàn giao vào ngày nào, hoặc trong bao lâu kể từ sự kiện nào?',
      whyItMatters: 'Không có thời hạn rõ ràng thì khó xác định bên kia chậm giao và khó áp dụng phạt hay chấm dứt hợp đồng.',
      suggestion: 'Bên [bên giao] giao [hàng/kết quả/tài sản] trong vòng [số] ngày kể từ ngày [sự kiện, ví dụ: hợp đồng có hiệu lực].',
      fallbackRules: [
        {
          contractTypes: ['sales'],
          facts: ['commercial_contract'],
          statement: 'Bên bán phải giao hàng trong một thời hạn hợp lý sau khi giao kết hợp đồng.',
          article: { sourceCode: LTM, article: 37, clause: 3, verifyText: 'trong một thời hạn hợp lý sau khi giao kết hợp đồng' },
        },
        {
          contractTypes: ['housing_purchase'],
          statement:
            'Mỗi bên có quyền yêu cầu bên kia giao hoặc nhận tài sản bất cứ lúc nào, nhưng phải báo trước một thời gian hợp lý.',
          article: { sourceCode: BLDS, article: 434, clause: 2, verifyText: 'phải báo trước cho nhau một thời gian hợp lý' },
        },
      ],
      review: APPROVED,
    },
    {
      code: 'GN-02',
      group: 'clarity',
      title: 'Địa điểm giao hàng phải xác định được',
      appliesTo: { contractTypes: ['sales'] },
      test: { kind: 'stated', field: 'delivery_place' },
      basis: {
        kind: 'criterion',
        statement: 'Phải xác định được hàng được giao ở đâu để biết bên bán đã hoàn thành nghĩa vụ giao hàng hay chưa.',
      },
      question: 'Hàng được giao tại địa điểm nào?',
      whyItMatters: 'Địa điểm giao quyết định ai chịu chi phí vận chuyển và rủi ro khi hàng đang trên đường.',
      suggestion: 'Địa điểm giao hàng: [địa chỉ cụ thể].',
      fallbackRules: [
        {
          contractTypes: ['sales'],
          facts: ['commercial_contract'],
          statement:
            'Địa điểm giao hàng được xác định theo nơi có hàng, người vận chuyển đầu tiên, kho hoặc nơi sản xuất đã biết, hoặc địa điểm kinh doanh của bên bán.',
          article: { sourceCode: LTM, article: 35, clause: 2, verifyText: 'địa điểm giao hàng được xác định như sau' },
        },
      ],
      review: APPROVED,
    },
    {
      code: 'GN-03',
      group: 'clarity',
      title: 'Phải nêu rõ cách kiểm tra, nghiệm thu',
      appliesTo: { contractTypes: ['sales', 'service'] },
      test: { kind: 'stated', field: 'acceptance' },
      basis: {
        kind: 'practice',
        statement:
          'Thông lệ là quy định cách kiểm tra, nghiệm thu và thời hạn khiếu nại để xác định khi nào việc giao hàng hoặc cung ứng dịch vụ được coi là hoàn thành.',
      },
      question: 'Hàng hoặc kết quả công việc được kiểm tra, nghiệm thu thế nào, và phải khiếu nại trong bao lâu nếu có lỗi?',
      whyItMatters: 'Không có thủ tục nghiệm thu thì khó chứng minh hàng hoặc dịch vụ không đạt yêu cầu khi đã nhận.',
      suggestion:
        'Bên [bên nhận] kiểm tra, nghiệm thu trong vòng [số] ngày kể từ ngày nhận; quá thời hạn này mà không có ý kiến bằng văn bản thì coi như đã nghiệm thu.',
      review: APPROVED,
    },
    {
      code: 'GN-04',
      group: 'clarity',
      title: 'Phải có biên bản bàn giao ghi nhận tình trạng tài sản',
      appliesTo: { contractTypes: ['office_lease', 'housing_purchase'] },
      test: { kind: 'stated', field: 'handover_record' },
      basis: {
        kind: 'practice',
        statement:
          'Thông lệ là lập biên bản bàn giao ghi nhận tình trạng tài sản, làm căn cứ khi trả lại tài sản hoặc khi phát sinh hư hỏng.',
      },
      question: 'Khi bàn giao có lập biên bản ghi nhận tình trạng tài sản không?',
      whyItMatters: 'Không có biên bản thì khó chứng minh hư hỏng có từ trước hay phát sinh trong thời gian sử dụng.',
      suggestion: 'Khi bàn giao, hai bên lập biên bản ghi nhận hiện trạng tài sản, trang thiết bị kèm theo và chỉ số điện, nước.',
      review: APPROVED,
    },
  ],
};
