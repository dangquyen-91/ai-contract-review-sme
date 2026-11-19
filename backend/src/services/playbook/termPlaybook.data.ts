import type { ClausePlaybook } from './playbookSchema';

const BLDS = 'civil_code_2015';
const BLLD = 'labor_code_2019';

const APPROVED = { status: 'approved' } as const;

export const TERM_PLAYBOOK: ClausePlaybook = {
  clauseTypes: ['term', 'renewal'],
  title: 'Thời hạn hợp đồng',
  fields: [
    {
      key: 'start',
      label: 'Thời điểm bắt đầu',
      aspect: 'when',
      kind: 'date_or_event',
      extraction:
        'When the contract takes effect or its term starts: a calendar date, or an identifiable event such as the signing date.',
    },
    {
      key: 'duration_or_end',
      label: 'Thời hạn hoặc thời điểm kết thúc',
      aspect: 'when',
      kind: 'date_or_event',
      extraction:
        'How long the contract lasts (for example "24 tháng") or when it ends (a date or an event). Use the contract\'s words "không xác định thời hạn" when it states it has no fixed term.',
    },
    {
      key: 'term_months',
      label: 'Thời hạn tính theo tháng',
      aspect: 'when',
      kind: 'months',
      extraction: 'The fixed term converted to months, only when the contract states a fixed term.',
    },
    {
      key: 'auto_renewal',
      label: 'Tự động gia hạn',
      aspect: 'condition',
      kind: 'boolean',
      extraction: 'true when the contract renews or extends automatically unless a party objects.',
    },
    {
      key: 'renewal_opt_out',
      label: 'Cách từ chối gia hạn',
      aspect: 'condition',
      kind: 'text',
      extraction: 'How, and how long in advance, a party can stop an automatic renewal.',
    },
  ],
  notApplicable: [
    { aspect: 'who', reason: 'Thời hạn hợp đồng ràng buộc cả hai bên như nhau.' },
    { aspect: 'where', reason: 'Thời hạn hợp đồng không gắn với địa điểm.' },
  ],
  checks: [
    {
      code: 'TH-01',
      group: 'clarity',
      title: 'Thời điểm bắt đầu phải xác định được',
      appliesTo: { contractTypes: ['service', 'office_lease', 'labor'] },
      test: { kind: 'stated', field: 'start' },
      basis: {
        kind: 'criterion',
        statement: 'Phải xác định được từ khi nào các bên bắt đầu bị ràng buộc bởi quyền và nghĩa vụ trong hợp đồng.',
      },
      question: 'Hợp đồng có hiệu lực, hoặc thời hạn bắt đầu được tính, từ ngày nào?',
      whyItMatters:
        'Không rõ thời điểm bắt đầu thì cũng không tính được thời điểm kết thúc, các mốc thanh toán và thời hạn thực hiện nghĩa vụ.',
      suggestion: 'Hợp đồng có hiệu lực kể từ ngày [ngày/tháng/năm] hoặc [ngày ký].',
      fallbackRules: [
        {
          contractTypes: ['service', 'office_lease'],
          statement: 'Hợp đồng được giao kết hợp pháp có hiệu lực từ thời điểm giao kết.',
          article: { sourceCode: BLDS, article: 401, clause: 1, verifyText: 'có hiệu lực từ thời điểm giao kết' },
        },
      ],
      review: APPROVED,
    },
    {
      code: 'TH-02',
      group: 'clarity',
      title: 'Thời hạn hoặc thời điểm kết thúc phải xác định được',
      appliesTo: { contractTypes: ['service', 'office_lease', 'labor'] },
      test: { kind: 'stated', field: 'duration_or_end' },
      basis: {
        kind: 'criterion',
        statement: 'Phải xác định được hợp đồng kéo dài bao lâu, hoặc ghi rõ là không xác định thời hạn.',
      },
      question: 'Hợp đồng kéo dài bao lâu, hoặc kết thúc vào ngày hay sự kiện nào?',
      whyItMatters:
        'Không rõ thời hạn thì không biết khi nào hợp đồng hết hiệu lực, dễ tranh chấp về việc còn phải tiếp tục thực hiện hay không.',
      suggestion: 'Thời hạn hợp đồng là [số] tháng, kể từ ngày hợp đồng có hiệu lực.',
      fallbackRules: [
        {
          contractTypes: ['office_lease'],
          statement:
            'Thời hạn thuê được xác định theo mục đích thuê; nếu không xác định được thì mỗi bên có quyền chấm dứt hợp đồng bất cứ lúc nào nhưng phải báo trước một thời gian hợp lý.',
          article: { sourceCode: BLDS, article: 474, verifyText: 'được xác định theo mục đích thuê' },
        },
      ],
      review: APPROVED,
    },
    {
      code: 'TH-03',
      group: 'balance',
      title: 'Tự động gia hạn mà không nêu cách từ chối gia hạn',
      appliesTo: { contractTypes: ['service', 'office_lease'] },
      test: {
        kind: 'fails_when_all',
        conditions: [
          { field: 'auto_renewal', op: 'is_true' },
          { field: 'renewal_opt_out', op: 'not_stated' },
        ],
      },
      basis: {
        kind: 'policy',
        statement:
          'Khuyến nghị của hệ thống: hợp đồng tự động gia hạn cần nêu cách và thời hạn thông báo để một bên không muốn tiếp tục có thể dừng gia hạn.',
      },
      whyItMatters: 'Hợp đồng có thể tự kéo dài và tiếp tục phát sinh chi phí khi bạn không còn muốn duy trì.',
      suggestion:
        'Hợp đồng tự động gia hạn thêm [thời hạn], trừ khi một bên thông báo bằng văn bản cho bên kia về việc không gia hạn ít nhất [số] ngày trước ngày hết hạn.',
      review: APPROVED,
    },
    {
      code: 'TH-04',
      group: 'compliance',
      title: 'Hợp đồng lao động xác định thời hạn không quá 36 tháng',
      appliesTo: { contractTypes: ['labor'] },
      test: { kind: 'at_most', field: 'term_months', limit: 36 },
      basis: {
        kind: 'law',
        statement:
          'Hợp đồng lao động xác định thời hạn là hợp đồng mà hai bên xác định thời hạn trong thời gian không quá 36 tháng kể từ thời điểm có hiệu lực.',
        articles: [{ sourceCode: BLLD, article: 20, clause: 1, verifyText: 'không quá 36 tháng' }],
      },
      whyItMatters:
        'Hợp đồng sai loại; quyền lợi của người lao động khi chấm dứt hợp đồng có thể bị xác định theo loại hợp đồng không xác định thời hạn.',
      suggestion: 'Thời hạn hợp đồng là [số, không quá 36] tháng, hoặc chuyển sang hợp đồng lao động không xác định thời hạn.',
      replacesRule: 'BLLD_CONTRACT_TERM_CAP',
      review: APPROVED,
    },
  ],
};
