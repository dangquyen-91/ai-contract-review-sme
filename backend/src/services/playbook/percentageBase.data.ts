import type { PlaybookCheck, PlaybookField } from './playbookSchema';

interface PercentageSubject {
  keyPrefix: string;
  label: string;
  subject: string;
  examples: string;
}

const percentageKey = (keyPrefix: string) => `${keyPrefix}_by_percentage`;
const baseKey = (keyPrefix: string) => `${keyPrefix}_percentage_base_defined`;

export function percentageBaseFields({ keyPrefix, label, subject, examples }: PercentageSubject): PlaybookField[] {
  return [
    {
      key: percentageKey(keyPrefix),
      label,
      aspect: 'how_much',
      kind: 'boolean',
      extraction: `true when the ${subject} is set as a percentage of another quantity (for example ${examples}) instead of a fixed amount or unit price.`,
    },
    {
      key: baseKey(keyPrefix),
      label: 'Cách xác định khoản làm cơ sở tính tỷ lệ',
      aspect: 'how',
      kind: 'boolean',
      extraction:
        'true only when the contract says how the quantity that the percentage applies to is determined: what exactly it covers (for example profit before or after tax, revenue of which activity, which costs are deducted) AND the period it is counted over or the document that fixes it (financial statement, reconciliation report). A quantity already fixed as an amount in this contract, such as the contract value, counts as determined. Naming the quantity alone ("lợi nhuận", "doanh thu", "doanh số") does not make this true.',
    },
  ];
}

interface PercentageBaseCheck {
  code: string;
  keyPrefix: string;
  contractTypes: string[];
  title: string;
  suggestion: string;
}

export function percentageBaseCheck({ code, keyPrefix, contractTypes, title, suggestion }: PercentageBaseCheck): PlaybookCheck {
  return {
    code,
    group: 'clarity',
    title,
    appliesTo: { contractTypes },
    test: {
      kind: 'fails_when_all',
      conditions: [
        { field: percentageKey(keyPrefix), op: 'is_true' },
        { field: baseKey(keyPrefix), op: 'not_stated' },
      ],
    },
    basis: {
      kind: 'criterion',
      statement:
        'Một tỷ lệ phần trăm chỉ cho ra số tiền xác định khi biết nó được tính trên khoản nào, cho kỳ nào và khoản đó được xác định theo cách nào.',
    },
    question:
      'Tỷ lệ này tính trên khoản nào (ví dụ lợi nhuận trước hay sau thuế, doanh thu của hoạt động nào), cho kỳ nào, và khoản đó được xác định theo chứng từ nào, do bên nào lập?',
    whyItMatters:
      'Mỗi bên có thể tính khoản làm cơ sở theo cách có lợi cho mình (trước hay sau thuế, theo quý hay theo năm, có trừ chi phí nào hay không), nên cùng một tỷ lệ nhưng ra hai số tiền khác nhau.',
    suggestion,
    review: { status: 'approved' },
  };
}
