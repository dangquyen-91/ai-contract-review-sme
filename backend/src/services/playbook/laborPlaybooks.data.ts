import type { ClausePlaybook } from './playbookSchema';

const BLLD = 'labor_code_2019';

const LABOR = ['labor'];
const APPROVED = { status: 'approved' } as const;

export const PROBATION_PLAYBOOK: ClausePlaybook = {
  clauseTypes: ['probation'],
  title: 'Thử việc',
  fields: [
    {
      key: 'probation_days',
      label: 'Thời gian thử việc',
      aspect: 'when',
      kind: 'days',
      extraction: 'Probation length in days (a month = 30 days). 0 when the contract states there is no probation.',
    },
    {
      key: 'probation_wage_percent',
      label: 'Lương thử việc so với lương chính thức',
      aspect: 'how_much',
      kind: 'percent',
      extraction:
        'Probation wage as a percentage of the official wage for the job. Compute it from the amounts when both are given.',
    },
  ],
  notApplicable: [
    { aspect: 'who', reason: 'Thử việc luôn giữa người sử dụng lao động và người lao động trong hợp đồng.' },
    { aspect: 'where', reason: 'Địa điểm làm việc thuộc điều khoản công việc, địa điểm làm việc.' },
  ],
  checks: [
    {
      code: 'TV-01',
      group: 'clarity',
      title: 'Thời gian thử việc phải xác định được',
      appliesTo: { contractTypes: LABOR },
      test: { kind: 'stated', field: 'probation_days' },
      basis: {
        kind: 'criterion',
        statement: 'Phải xác định được thời gian thử việc để biết khi nào kết thúc thử việc và áp dụng mức lương chính thức.',
      },
      question: 'Thời gian thử việc là bao nhiêu ngày?',
      whyItMatters: 'Không rõ thời gian thử việc thì người lao động có thể bị kéo dài thử việc với mức lương thấp hơn.',
      suggestion: 'Thời gian thử việc là [số] ngày, kể từ ngày [ngày bắt đầu].',
      review: APPROVED,
    },
    {
      code: 'TV-02',
      group: 'compliance',
      title: 'Không áp dụng thử việc với hợp đồng dưới 01 tháng',
      appliesTo: { contractTypes: LABOR, facts: ['contract_term_under_one_month'] },
      test: { kind: 'fails_when_all', conditions: [{ field: 'probation_days', op: 'greater_than', value: 0 }] },
      basis: {
        kind: 'law',
        statement: 'Không áp dụng thử việc đối với người lao động giao kết hợp đồng lao động có thời hạn dưới 01 tháng.',
        articles: [{ sourceCode: BLLD, article: 24, clause: 3, verifyText: 'có thời hạn dưới 01 tháng' }],
      },
      whyItMatters: 'Thời gian thử việc trong trường hợp này trái quy định; người lao động bị trả lương thử việc thấp hơn mà không có căn cứ.',
      suggestion: 'Bỏ nội dung thử việc khỏi hợp đồng.',
      replacesRule: 'BLLD_PROBATION_SHORT_CONTRACT',
      review: APPROVED,
    },
    {
      code: 'TV-03',
      group: 'compliance',
      title: 'Thời gian thử việc không vượt mức tối đa theo vị trí công việc',
      appliesTo: { contractTypes: LABOR },
      test: {
        kind: 'at_most_tiered',
        field: 'probation_days',
        tiers: [
          { facts: ['employee_is_enterprise_manager'], limit: 180 },
          { facts: ['job_requires_college_degree'], limit: 60 },
          { facts: ['job_requires_intermediate_or_technical'], limit: 30 },
        ],
        absoluteLimit: 180,
      },
      basis: {
        kind: 'law',
        statement:
          'Thời gian thử việc không quá 180 ngày với người quản lý doanh nghiệp, 60 ngày với công việc cần trình độ cao đẳng trở lên, 30 ngày với công việc cần trình độ trung cấp, công nhân kỹ thuật, nhân viên nghiệp vụ và 06 ngày làm việc với công việc khác.',
        articles: [
          { sourceCode: BLLD, article: 25, verifyText: 'Không quá 180 ngày đối với công việc của người quản lý doanh nghiệp' },
          { sourceCode: BLLD, article: 25, verifyText: 'Không quá 60 ngày đối với công việc có chức danh nghề nghiệp cần trình độ chuyên môn, kỹ thuật từ cao đẳng trở lên' },
          { sourceCode: BLLD, article: 25, verifyText: 'Không quá 30 ngày đối với công việc có chức danh nghề nghiệp cần trình độ chuyên môn, kỹ thuật trung cấp' },
        ],
      },
      whyItMatters: 'Thử việc quá thời hạn luật định khiến người lao động bị trả lương thử việc lâu hơn mức được phép.',
      suggestion: 'Thời gian thử việc là [số] ngày, không vượt mức tối đa theo Điều 25 Bộ luật Lao động cho vị trí này.',
      replacesRule: 'BLLD_PROBATION_MAX',
      review: {
        status: 'approved',
        note:
          'Mức 06 ngày làm việc cho "công việc khác" chưa được kiểm tra vì đơn vị là ngày làm việc, khác đơn vị ngày của trường probation_days. Khi không xác định được vị trí công việc, chỉ kết luận Vi phạm khi vượt 180 ngày; dưới mức đó là "Chưa xác minh được".',
      },
    },
    {
      code: 'TV-04',
      group: 'compliance',
      title: 'Lương thử việc ít nhất 85% lương của công việc',
      appliesTo: { contractTypes: LABOR },
      test: { kind: 'at_least', field: 'probation_wage_percent', limit: 85 },
      basis: {
        kind: 'law',
        statement: 'Tiền lương thử việc do hai bên thoả thuận nhưng ít nhất phải bằng 85% mức lương của công việc đó.',
        articles: [{ sourceCode: BLLD, article: 26, verifyText: 'ít nhất phải bằng 85% mức lương của công việc đó' }],
      },
      whyItMatters: 'Người lao động bị trả thấp hơn mức tối thiểu luật định trong thời gian thử việc.',
      suggestion: 'Tiền lương thử việc bằng [tỷ lệ, ít nhất 85]% mức lương của công việc.',
      replacesRule: 'BLLD_PROBATION_WAGE',
      review: APPROVED,
    },
  ],
};

export const WAGES_PLAYBOOK: ClausePlaybook = {
  clauseTypes: ['wages'],
  title: 'Tiền lương',
  fields: [
    {
      key: 'wage_amount',
      label: 'Mức lương',
      aspect: 'how_much',
      kind: 'money',
      extraction: 'The wage for the job or title, or how it is calculated.',
    },
    {
      key: 'pay_schedule',
      label: 'Kỳ hạn và thời điểm trả lương',
      aspect: 'when',
      kind: 'date_or_event',
      extraction: 'How often and on which day the wage is paid (for example "ngày 05 hằng tháng").',
    },
    {
      key: 'wage_in_foreign_currency',
      label: 'Lương ghi hoặc trả bằng ngoại tệ',
      aspect: 'how_much',
      kind: 'boolean',
      extraction: 'true when the wage is stated or paid in a foreign currency (USD, EUR, ...).',
    },
    {
      key: 'wage_deduction_percent',
      label: 'Mức khấu trừ lương tối đa',
      aspect: 'how_much',
      kind: 'percent',
      extraction: 'The maximum share of the monthly wage the employer may deduct, as a percentage.',
    },
  ],
  notApplicable: [
    { aspect: 'who', reason: 'Người trả lương luôn là người sử dụng lao động.' },
    { aspect: 'where', reason: 'Nơi trả lương không ảnh hưởng đến quyền nhận lương; hình thức trả lương thuộc phương thức trả.' },
  ],
  checks: [
    {
      code: 'TL-01',
      group: 'clarity',
      title: 'Mức lương phải xác định được',
      appliesTo: { contractTypes: LABOR },
      test: { kind: 'stated', field: 'wage_amount' },
      basis: {
        kind: 'criterion',
        statement: 'Phải xác định được người lao động được trả bao nhiêu.',
        references: [{ sourceCode: BLLD, article: 21, clause: 1, verifyText: 'Mức lương theo công việc hoặc chức danh' }],
      },
      question: 'Mức lương của công việc là bao nhiêu?',
      whyItMatters: 'Không rõ mức lương thì không có căn cứ để trả lương, đóng bảo hiểm và giải quyết tranh chấp.',
      suggestion: 'Mức lương: [số tiền] đồng/tháng.',
      review: APPROVED,
    },
    {
      code: 'TL-02',
      group: 'clarity',
      title: 'Kỳ hạn và thời điểm trả lương phải xác định được',
      appliesTo: { contractTypes: LABOR },
      test: { kind: 'stated', field: 'pay_schedule' },
      basis: {
        kind: 'criterion',
        statement: 'Thời điểm trả lương phải là một thời điểm cố định, lặp lại theo chu kỳ.',
        references: [{ sourceCode: BLLD, article: 97, clause: 2, verifyText: 'phải được ấn định vào một thời điểm có tính chu kỳ' }],
      },
      question: 'Lương được trả mấy lần mỗi tháng và vào ngày nào?',
      whyItMatters: 'Không rõ thời điểm trả lương thì khó xác định người sử dụng lao động có trả lương chậm hay không.',
      suggestion: 'Tiền lương được trả một tháng một lần, vào ngày [ngày] hằng tháng.',
      review: APPROVED,
    },
    {
      code: 'TL-03',
      group: 'compliance',
      title: 'Lương của người lao động Việt Nam phải bằng Đồng Việt Nam',
      appliesTo: { contractTypes: LABOR, facts: ['employee_is_vietnamese'] },
      test: { kind: 'fails_when_all', conditions: [{ field: 'wage_in_foreign_currency', op: 'is_true' }] },
      basis: {
        kind: 'law',
        statement:
          'Tiền lương ghi trong hợp đồng và trả cho người lao động bằng tiền Đồng Việt Nam; chỉ người lao động nước ngoài tại Việt Nam mới có thể được trả bằng ngoại tệ.',
        articles: [{ sourceCode: BLLD, article: 95, clause: 2, verifyText: 'bằng tiền Đồng Việt Nam' }],
      },
      whyItMatters: 'Điều khoản tiền lương trái quy định; số tiền thực nhận, cơ sở đóng bảo hiểm và tính thuế dễ tranh chấp khi tỷ giá biến động.',
      suggestion: 'Tiền lương được ghi và trả bằng Đồng Việt Nam.',
      replacesRule: 'BLLD_WAGE_FOREIGN_CURRENCY',
      review: APPROVED,
    },
    {
      code: 'TL-04',
      group: 'compliance',
      title: 'Khấu trừ lương hằng tháng không quá 30%',
      appliesTo: { contractTypes: LABOR },
      test: { kind: 'at_most', field: 'wage_deduction_percent', limit: 30 },
      basis: {
        kind: 'law',
        statement:
          'Mức khấu trừ tiền lương hằng tháng không được quá 30% tiền lương thực trả hằng tháng sau khi trích nộp bảo hiểm và thuế thu nhập cá nhân.',
        articles: [{ sourceCode: BLLD, article: 102, clause: 3, verifyText: 'không được quá 30% tiền lương thực trả hằng tháng' }],
      },
      whyItMatters: 'Người lao động có thể bị trừ quá nhiều lương, ảnh hưởng đến thu nhập tối thiểu hằng tháng.',
      suggestion: 'Mức khấu trừ tiền lương hằng tháng không quá 30% tiền lương thực trả sau khi trích nộp bảo hiểm và thuế.',
      replacesRule: 'BLLD_WAGE_DEDUCTION_CAP',
      review: APPROVED,
    },
  ],
};

export const WORKING_TIME_PLAYBOOK: ClausePlaybook = {
  clauseTypes: ['working_time'],
  title: 'Thời giờ làm việc, nghỉ ngơi',
  fields: [
    {
      key: 'working_schedule',
      label: 'Thời giờ làm việc',
      aspect: 'when',
      kind: 'text',
      extraction: 'The normal working hours and working days as stated (for example "8 giờ/ngày, từ thứ Hai đến thứ Sáu").',
    },
    {
      key: 'working_hours_per_day',
      label: 'Số giờ làm việc mỗi ngày',
      aspect: 'when',
      kind: 'hours',
      extraction: 'Normal working hours per day, excluding overtime.',
    },
    {
      key: 'working_hours_per_week',
      label: 'Số giờ làm việc mỗi tuần',
      aspect: 'when',
      kind: 'hours',
      extraction: 'Normal working hours per week, excluding overtime. Compute it from hours per day times working days when both are given.',
    },
    {
      key: 'overtime_hours_per_month',
      label: 'Số giờ làm thêm tối đa mỗi tháng',
      aspect: 'how_much',
      kind: 'hours',
      extraction: 'Maximum overtime hours per month the employee may be required or agrees to work.',
    },
    {
      key: 'overtime_hours_per_year',
      label: 'Số giờ làm thêm tối đa mỗi năm',
      aspect: 'how_much',
      kind: 'hours',
      extraction: 'Maximum overtime hours per year.',
    },
    {
      key: 'annual_leave_days',
      label: 'Số ngày nghỉ hằng năm',
      aspect: 'how_much',
      kind: 'days',
      extraction: 'Paid annual leave days per full year of work.',
    },
  ],
  notApplicable: [
    { aspect: 'who', reason: 'Thời giờ làm việc áp dụng cho người lao động trong hợp đồng.' },
    { aspect: 'where', reason: 'Địa điểm làm việc thuộc điều khoản công việc, địa điểm làm việc.' },
  ],
  checks: [
    {
      code: 'TG-01',
      group: 'clarity',
      title: 'Thời giờ làm việc phải xác định được',
      appliesTo: { contractTypes: LABOR },
      test: { kind: 'stated', field: 'working_schedule' },
      basis: {
        kind: 'criterion',
        statement: 'Phải xác định được người lao động làm việc bao nhiêu giờ, vào những ngày nào.',
        references: [{ sourceCode: BLLD, article: 21, clause: 1, verifyText: 'Thời giờ làm việc, thời giờ nghỉ ngơi' }],
      },
      question: 'Người lao động làm việc bao nhiêu giờ mỗi ngày, những ngày nào trong tuần?',
      whyItMatters: 'Không rõ thời giờ làm việc thì không xác định được giờ làm thêm và tiền lương làm thêm giờ.',
      suggestion: 'Thời giờ làm việc: [số] giờ/ngày, từ [thứ] đến [thứ], từ [giờ] đến [giờ].',
      review: APPROVED,
    },
    {
      code: 'TG-02',
      group: 'compliance',
      title: 'Thời giờ làm việc bình thường không quá 48 giờ mỗi tuần',
      appliesTo: { contractTypes: LABOR },
      test: { kind: 'at_most', field: 'working_hours_per_week', limit: 48 },
      basis: {
        kind: 'law',
        statement: 'Thời giờ làm việc bình thường không quá 48 giờ trong 01 tuần.',
        articles: [{ sourceCode: BLLD, article: 105, clause: 1, verifyText: 'không quá 48 giờ trong 01 tuần' }],
      },
      whyItMatters: 'Phần giờ vượt quá phải được tính là làm thêm giờ và trả lương làm thêm.',
      suggestion: 'Thời giờ làm việc bình thường không quá 48 giờ/tuần.',
      replacesRule: 'BLLD_WORKING_HOURS',
      review: APPROVED,
    },
    {
      code: 'TG-03',
      group: 'compliance',
      title: 'Thời giờ làm việc bình thường không quá 10 giờ mỗi ngày',
      appliesTo: { contractTypes: LABOR },
      test: { kind: 'at_most', field: 'working_hours_per_day', limit: 10 },
      basis: {
        kind: 'law',
        statement:
          'Thời giờ làm việc bình thường không quá 08 giờ trong 01 ngày; nếu quy định theo tuần thì không quá 10 giờ trong 01 ngày.',
        articles: [{ sourceCode: BLLD, article: 105, clause: 2, verifyText: 'không quá 10 giờ trong 01 ngày' }],
      },
      whyItMatters: 'Phần giờ vượt quá phải được tính là làm thêm giờ và trả lương làm thêm.',
      suggestion: 'Thời giờ làm việc bình thường không quá 08 giờ/ngày (hoặc 10 giờ/ngày nếu quy định theo tuần).',
      replacesRule: 'BLLD_WORKING_HOURS',
      review: {
        status: 'approved',
        note: 'Chỉ kiểm mức 10 giờ/ngày (áp dụng khi quy định theo tuần) vì đây là mức trần chắc chắn; mức 08 giờ/ngày phụ thuộc cách người sử dụng lao động quy định thời giờ làm việc.',
      },
    },
    {
      code: 'TG-04',
      group: 'compliance',
      title: 'Làm thêm giờ không quá 40 giờ mỗi tháng',
      appliesTo: { contractTypes: LABOR },
      test: { kind: 'at_most', field: 'overtime_hours_per_month', limit: 40 },
      basis: {
        kind: 'law',
        statement: 'Số giờ làm thêm của người lao động không quá 40 giờ trong 01 tháng.',
        articles: [{ sourceCode: BLLD, article: 107, clause: 2, verifyText: 'không quá 40 giờ trong 01 tháng' }],
      },
      whyItMatters: 'Người lao động có thể bị yêu cầu làm thêm vượt giới hạn luật cho phép.',
      suggestion: 'Số giờ làm thêm không quá 40 giờ/tháng và phải được người lao động đồng ý.',
      replacesRule: 'BLLD_OVERTIME_CAP',
      review: APPROVED,
    },
    {
      code: 'TG-05',
      group: 'compliance',
      title: 'Làm thêm giờ không vượt mức tối đa mỗi năm',
      appliesTo: { contractTypes: LABOR },
      test: {
        kind: 'at_most_tiered',
        field: 'overtime_hours_per_year',
        tiers: [{ facts: ['standard_overtime_sector'], limit: 200 }],
        absoluteLimit: 300,
      },
      basis: {
        kind: 'law',
        statement:
          'Số giờ làm thêm không quá 200 giờ trong 01 năm; một số ngành, nghề, công việc được làm thêm không quá 300 giờ trong 01 năm.',
        articles: [
          { sourceCode: BLLD, article: 107, clause: 2, verifyText: 'không quá 200 giờ trong 01 năm' },
          { sourceCode: BLLD, article: 107, clause: 3, verifyText: 'làm thêm không quá 300 giờ trong 01 năm' },
        ],
      },
      whyItMatters: 'Người lao động có thể bị yêu cầu làm thêm vượt giới hạn luật cho phép.',
      suggestion: 'Số giờ làm thêm không quá 200 giờ/năm (hoặc 300 giờ/năm với ngành, nghề được pháp luật cho phép).',
      replacesRule: 'BLLD_OVERTIME_CAP',
      review: APPROVED,
    },
    {
      code: 'TG-06',
      group: 'compliance',
      title: 'Nghỉ hằng năm ít nhất 12 ngày làm việc',
      appliesTo: { contractTypes: LABOR },
      test: { kind: 'at_least', field: 'annual_leave_days', limit: 12 },
      basis: {
        kind: 'law',
        statement:
          'Người lao động làm việc đủ 12 tháng được nghỉ hằng năm hưởng nguyên lương ít nhất 12 ngày làm việc trong điều kiện bình thường (nhiều hơn với công việc nặng nhọc, độc hại).',
        articles: [{ sourceCode: BLLD, article: 113, clause: 1, verifyText: '12 ngày làm việc đối với người làm công việc trong điều kiện bình thường' }],
      },
      whyItMatters: 'Người lao động bị cắt bớt số ngày nghỉ có lương mà luật bảo đảm.',
      suggestion: 'Người lao động làm việc đủ 12 tháng được nghỉ hằng năm [số, ít nhất 12] ngày làm việc, hưởng nguyên lương.',
      replacesRule: 'BLLD_ANNUAL_LEAVE',
      review: {
        status: 'approved',
        note: 'Chỉ kiểm mức tối thiểu 12 ngày; mức 14 và 16 ngày cho công việc nặng nhọc, độc hại hoặc người lao động đặc thù chưa được kiểm tra.',
      },
    },
  ],
};

export const SOCIAL_INSURANCE_PLAYBOOK: ClausePlaybook = {
  clauseTypes: ['social_insurance'],
  title: 'Bảo hiểm xã hội',
  fields: [
    {
      key: 'social_insurance_excluded',
      label: 'Không tham gia bảo hiểm bắt buộc',
      aspect: 'condition',
      kind: 'boolean',
      extraction:
        'true when the contract says the employee will not join compulsory social insurance, or receives the contribution as cash in the salary instead.',
    },
  ],
  notApplicable: [
    { aspect: 'where', reason: 'Bảo hiểm xã hội không gắn với địa điểm.' },
    { aspect: 'when', reason: 'Kỳ đóng bảo hiểm do pháp luật về bảo hiểm xã hội quy định.' },
  ],
  checks: [
    {
      code: 'BH-01',
      group: 'compliance',
      title: 'Không được thoả thuận bỏ bảo hiểm xã hội bắt buộc',
      appliesTo: { contractTypes: LABOR, facts: ['employee_in_compulsory_insurance'] },
      test: { kind: 'fails_when_all', conditions: [{ field: 'social_insurance_excluded', op: 'is_true' }] },
      basis: {
        kind: 'law',
        statement:
          'Người sử dụng lao động, người lao động phải tham gia bảo hiểm xã hội bắt buộc, bảo hiểm y tế, bảo hiểm thất nghiệp.',
        articles: [{ sourceCode: BLLD, article: 168, clause: 1, verifyText: 'phải tham gia bảo hiểm xã hội bắt buộc' }],
      },
      whyItMatters:
        'Người lao động mất quyền lợi ốm đau, thai sản, tai nạn lao động, hưu trí, thất nghiệp; người sử dụng lao động có thể bị truy thu và xử phạt.',
      suggestion: 'Hai bên tham gia bảo hiểm xã hội bắt buộc, bảo hiểm y tế, bảo hiểm thất nghiệp theo quy định của pháp luật.',
      replacesRule: 'BLLD_SOCIAL_INSURANCE',
      review: {
        status: 'approved',
        note: 'Chỉ áp dụng khi xác định được người lao động thuộc diện bắt buộc; người không thuộc diện này được nhận khoản tiền tương đương theo khoản 3 Điều 168.',
      },
    },
  ],
};
