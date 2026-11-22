import type { CheckBasis, IssueGroup } from './playbookSchema';

export const DOCUMENT_CHECK_CODES = ['VB-01', 'VB-02', 'VB-03', 'VB-04', 'VB-05', 'VB-06'] as const;
export type DocumentCheckCode = (typeof DOCUMENT_CHECK_CODES)[number];

export interface DocumentCheck {
  code: DocumentCheckCode;
  group: Extract<IssueGroup, 'drafting' | 'clarity'>;
  title: string;
  basis: CheckBasis;
  question: string;
  whyItMatters: string;
}

export const DOCUMENT_CHECKS: Record<DocumentCheckCode, DocumentCheck> = {
  'VB-01': {
    code: 'VB-01',
    group: 'drafting',
    title: 'Còn chỗ trống chưa điền',
    basis: { kind: 'criterion', statement: 'Hợp đồng ký kết không được còn chỗ trống chờ điền thông tin.' },
    question: 'Thông tin còn để trống ở đây là gì?',
    whyItMatters: 'Chỗ trống có thể bị điền sau khi ký hoặc làm nội dung đó không xác định được.',
  },
  'VB-02': {
    code: 'VB-02',
    group: 'drafting',
    title: 'Dẫn chiếu đến điều khoản không tồn tại',
    basis: { kind: 'criterion', statement: 'Điều khoản được dẫn chiếu phải có trong hợp đồng.' },
    question: 'Điều khoản được dẫn chiếu ở đây là điều nào?',
    whyItMatters: 'Dẫn chiếu sai khiến nội dung liên quan không áp dụng được hoặc bị hiểu theo nhiều cách.',
  },
  'VB-03': {
    code: 'VB-03',
    group: 'drafting',
    title: 'Dẫn chiếu đến phụ lục không có trong tài liệu',
    basis: { kind: 'criterion', statement: 'Phụ lục được dẫn chiếu là một phần của hợp đồng và cần được đính kèm.' },
    question: 'Phụ lục được dẫn chiếu ở đây đã được ký kèm hợp đồng chưa?',
    whyItMatters: 'Thiếu phụ lục thì nội dung dẫn chiếu sang phụ lục chưa được xác định.',
  },
  'VB-04': {
    code: 'VB-04',
    group: 'drafting',
    title: 'Số tiền bằng số và bằng chữ không khớp',
    basis: { kind: 'criterion', statement: 'Số tiền ghi bằng số và bằng chữ phải giống nhau.' },
    question: 'Số tiền đúng là số ghi bằng số hay số ghi bằng chữ?',
    whyItMatters: 'Hai cách ghi khác nhau làm số tiền phải trả không xác định được và dễ phát sinh tranh chấp.',
  },
  'VB-05': {
    code: 'VB-05',
    group: 'clarity',
    title: 'Dùng từ ngữ không xác định được',
    basis: {
      kind: 'criterion',
      statement: 'Thời hạn, mức độ và nghĩa vụ phải đo hoặc kiểm chứng được, không dùng từ ngữ để ngỏ cách hiểu.',
    },
    question: 'Cụm từ này cụ thể là bao nhiêu, hoặc được xác định thế nào?',
    whyItMatters: 'Mỗi bên có thể hiểu cụm từ này khác nhau; khi tranh chấp, cách hiểu sẽ do bên giải quyết tranh chấp quyết định.',
  },
  'VB-06': {
    code: 'VB-06',
    group: 'clarity',
    title: 'Cùng một nội dung nhưng ghi khác nhau',
    basis: { kind: 'criterion', statement: 'Một nội dung chỉ được có một giá trị trong toàn bộ hợp đồng.' },
    question: 'Giá trị nào là giá trị các bên thực sự thoả thuận?',
    whyItMatters: 'Hai giá trị khác nhau làm nghĩa vụ không xác định được; mỗi bên sẽ viện dẫn giá trị có lợi cho mình.',
  },
};

export const VAGUE_TERMS = [
  'hợp lý',
  'kịp thời',
  'sớm nhất có thể',
  'trong thời gian sớm nhất',
  'sẽ thoả thuận sau',
  'sẽ thống nhất sau',
  'thoả thuận bổ sung sau',
  'tương đối',
  'đáng kể',
  'các chi phí khác',
  'và các khoản khác',
];
