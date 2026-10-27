import type { RISK_SEVERITIES } from '../../models/riskFinding.model';
import type { ReviewContext } from '../contract/contractProfile.service';
import type { KeyTermKey } from '../analysis/keyTermExtraction.data';
import type { RiskCode } from '../analysis/riskCatalog.data';

export type Severity = (typeof RISK_SEVERITIES)[number];

export interface RuleCitation {
  sourceCode: string;
  article: number;
  clause?: number;
  verifyText: string;
}

interface RuleOutcome {
  severity?: Severity;
  anchor?: KeyTermKey;
  title: string;
  problem: string[];
  consequences: string[];
  recommendations: string[];
}

export interface Terms {
  num(key: KeyTermKey): number | undefined;
  bool(key: KeyTermKey): boolean | undefined;
}

export interface LegalRule {
  code: string;
  version: number;
  profiles: string[];
  severity: Severity;
  riskCode?: RiskCode;
  anchor?: KeyTermKey;
  legalBasis: string;
  citations: RuleCitation[];
  evaluate(terms: Terms, context: ReviewContext): RuleOutcome | null;
}

const fmt = (value: number) => Number(value.toFixed(2)).toLocaleString('vi-VN');

const LTM = 'commercial_law_2005';
const BLDS = 'civil_code_2015';
const BLLD = 'labor_code_2019';
const KDBDS = 'real_estate_business_law_2023';
const NHA_O = 'housing_law_2023';
const NGOAI_HOI = 'foreign_exchange_ordinance_2005';

export const LEGAL_RULES: LegalRule[] = [
  {
    code: 'LTM_PENALTY_CAP',
    version: 1,
    profiles: ['sales', 'service'],
    severity: 'high',
    anchor: 'penalty_percent',
    legalBasis:
      'Điều 301 Luật Thương mại 2005: mức phạt đối với vi phạm nghĩa vụ hợp đồng hoặc tổng mức phạt đối với nhiều vi phạm do các bên thoả thuận, nhưng không quá 8% giá trị phần nghĩa vụ hợp đồng bị vi phạm.',
    citations: [{ sourceCode: LTM, article: 301, verifyText: '8%' }],
    evaluate(t) {
      const p = t.num('penalty_percent');
      if (p === undefined || p <= 8) return null;
      return {
        title: `Mức phạt vi phạm ${fmt(p)}% vượt mức trần 8%`,
        problem: [`Hợp đồng quy định mức phạt vi phạm ${fmt(p)}% giá trị phần nghĩa vụ bị vi phạm, cao hơn mức tối đa 8% mà Luật Thương mại cho phép.`],
        consequences: [
          'Khi có tranh chấp, Toà án hoặc Trọng tài thường chỉ chấp nhận mức phạt tối đa 8%; phần vượt quá không được bảo vệ.',
          'Bên trông chờ khoản phạt cao để bù đắp tổn thất có thể nhận ít hơn nhiều so với tính toán.',
        ],
        recommendations: [
          'Điều chỉnh mức phạt vi phạm xuống không quá 8% giá trị phần nghĩa vụ hợp đồng bị vi phạm.',
          'Nếu cần bù đắp tổn thất lớn hơn, thoả thuận rõ quyền yêu cầu bồi thường thiệt hại thay vì nâng mức phạt.',
        ],
      };
    },
  },
  {
    code: 'LTM_LATE_INTEREST_CAP',
    version: 1,
    profiles: ['sales', 'service'],
    severity: 'medium',
    anchor: 'late_payment_interest_percent_per_year',
    legalBasis:
      'Điều 306 Luật Thương mại 2005 cho phép đòi lãi chậm thanh toán theo thoả thuận, "trừ trường hợp có thoả thuận khác hoặc pháp luật có quy định khác"; Điều 357 khoản 2 và Điều 468 khoản 1 Bộ luật Dân sự 2015 giới hạn lãi suất chậm trả theo thoả thuận không quá 20%/năm, phần vượt quá không có hiệu lực.',
    citations: [
      { sourceCode: LTM, article: 306, verifyText: 'pháp luật có quy định khác' },
      { sourceCode: BLDS, article: 357, clause: 2, verifyText: 'Điều 468' },
      { sourceCode: BLDS, article: 468, clause: 1, verifyText: '20%/năm' },
    ],
    evaluate(t) {
      const rate = t.num('late_payment_interest_percent_per_year');
      if (rate === undefined || rate <= 20) return null;
      return {
        title: `Lãi chậm thanh toán ${fmt(rate)}%/năm vượt mức 20%/năm`,
        problem: [
          `Hợp đồng tính lãi chậm thanh toán tương đương ${fmt(rate)}%/năm. Theo cách áp dụng phổ biến, lãi chậm trả trong hợp đồng thương mại cũng bị giới hạn 20%/năm theo Bộ luật Dân sự.`,
        ],
        consequences: ['Khi có tranh chấp, Toà án có thể chỉ chấp nhận mức lãi tối đa 20%/năm; phần vượt quá có nguy cơ không được bảo vệ.'],
        recommendations: ['Đặt lãi chậm thanh toán không quá 20%/năm (khoảng 1,67%/tháng) để tránh tranh chấp về hiệu lực.'],
      };
    },
  },
  {
    code: 'FX_PRICE_IN_FOREIGN_CURRENCY',
    version: 1,
    profiles: ['sales', 'service', 'office_lease'],
    severity: 'medium',
    anchor: 'price_in_foreign_currency',
    legalBasis:
      'Điều 22 Pháp lệnh Ngoại hối 2005 (sửa đổi, bổ sung năm 2013): trên lãnh thổ Việt Nam, mọi giao dịch, thanh toán, niêm yết, quảng cáo, báo giá, định giá, ghi giá trong hợp đồng, thỏa thuận và các hình thức tương tự khác của người cư trú, người không cư trú không được thực hiện bằng ngoại hối, trừ các trường hợp được phép theo quy định của Ngân hàng Nhà nước Việt Nam (Điều 4 Thông tư 32/2013/TT-NHNN).',
    citations: [{ sourceCode: NGOAI_HOI, article: 22, verifyText: 'ghi giá trong hợp đồng' }],
    evaluate(t) {
      if (t.bool('price_in_foreign_currency') !== true) return null;
      return {
        title: 'Hợp đồng ghi giá hoặc thanh toán bằng ngoại tệ',
        problem: [
          'Hợp đồng ghi giá, giá trị hoặc thanh toán bằng ngoại tệ. Pháp lệnh Ngoại hối cấm ghi giá trong hợp đồng và thanh toán bằng ngoại hối trên lãnh thổ Việt Nam, trừ các trường hợp được Ngân hàng Nhà nước cho phép.',
        ],
        consequences: [
          'Nếu không thuộc trường hợp được phép, việc ghi giá và thanh toán bằng ngoại tệ vi phạm quy định quản lý ngoại hối và có thể bị xử phạt vi phạm hành chính.',
          'Khi có tranh chấp, hiệu lực của điều khoản giá và cách quy đổi tỷ giá dễ bị tranh cãi.',
        ],
        recommendations: [
          'Ghi giá và thanh toán bằng Đồng Việt Nam.',
          'Nếu thuộc trường hợp được phép theo Điều 4 Thông tư 32/2013/TT-NHNN (ví dụ một bên là người không cư trú, doanh nghiệp chế xuất, uỷ thác xuất nhập khẩu), ghi rõ căn cứ đó trong hợp đồng.',
        ],
      };
    },
  },
  {
    code: 'BLDS_LATE_INTEREST_CAP',
    version: 1,
    profiles: ['office_lease', 'housing_purchase'],
    severity: 'high',
    anchor: 'late_payment_interest_percent_per_year',
    legalBasis:
      'Điều 357 khoản 2 và Điều 468 khoản 1 Bộ luật Dân sự 2015: lãi suất đối với khoản tiền chậm trả do các bên thoả thuận nhưng không được vượt quá 20%/năm; phần lãi suất vượt quá không có hiệu lực.',
    citations: [
      { sourceCode: BLDS, article: 357, clause: 2, verifyText: 'Điều 468' },
      { sourceCode: BLDS, article: 468, clause: 1, verifyText: '20%/năm' },
    ],
    evaluate(t) {
      const rate = t.num('late_payment_interest_percent_per_year');
      if (rate === undefined || rate <= 20) return null;
      return {
        title: `Lãi chậm thanh toán ${fmt(rate)}%/năm vượt mức 20%/năm`,
        problem: [`Hợp đồng tính lãi chậm thanh toán tương đương ${fmt(rate)}%/năm, cao hơn mức tối đa 20%/năm theo Bộ luật Dân sự.`],
        consequences: ['Phần lãi vượt 20%/năm không có hiệu lực; bên đòi lãi không thể yêu cầu Toà án buộc trả phần vượt quá.'],
        recommendations: ['Giảm lãi chậm thanh toán xuống không quá 20%/năm (khoảng 1,67%/tháng).'],
      };
    },
  },
  {
    code: 'BLDS_PENALTY_WITHOUT_DAMAGES',
    version: 1,
    profiles: ['office_lease', 'housing_purchase'],
    severity: 'medium',
    riskCode: 'MISSING_PROTECTION',
    anchor: 'penalty_agreed',
    legalBasis:
      'Điều 418 khoản 3 Bộ luật Dân sự 2015: trường hợp các bên có thoả thuận về phạt vi phạm nhưng không thoả thuận về việc vừa phải chịu phạt vi phạm vừa phải bồi thường thiệt hại thì bên vi phạm nghĩa vụ chỉ phải chịu phạt vi phạm.',
    citations: [{ sourceCode: BLDS, article: 418, clause: 3, verifyText: 'chỉ phải chịu phạt vi phạm' }],
    evaluate(t) {
      if (t.bool('penalty_agreed') !== true || t.bool('damages_also_claimable') !== false) return null;
      return {
        title: 'Có phạt vi phạm nhưng không thoả thuận được đòi thêm bồi thường thiệt hại',
        problem: ['Hợp đồng có điều khoản phạt vi phạm nhưng không nêu rõ bên bị vi phạm được yêu cầu cả tiền phạt lẫn bồi thường thiệt hại.'],
        consequences: ['Khi một bên vi phạm, bên kia chỉ đòi được tiền phạt, kể cả khi thiệt hại thực tế lớn hơn nhiều.'],
        recommendations: ['Bổ sung: "Ngoài tiền phạt vi phạm, bên vi phạm còn phải bồi thường toàn bộ thiệt hại thực tế phát sinh do hành vi vi phạm."'],
      };
    },
  },
  {
    code: 'BLDS_DEPOSIT_ASYMMETRY',
    version: 1,
    profiles: ['housing_purchase'],
    severity: 'medium',
    riskCode: 'ONE_SIDED_OBLIGATION',
    anchor: 'buyer_forfeits_deposit',
    legalBasis:
      'Điều 328 khoản 2 Bộ luật Dân sự 2015: nếu bên nhận đặt cọc từ chối việc giao kết, thực hiện hợp đồng thì phải trả cho bên đặt cọc tài sản đặt cọc và một khoản tiền tương đương giá trị tài sản đặt cọc, trừ trường hợp có thoả thuận khác.',
    citations: [{ sourceCode: BLDS, article: 328, clause: 2, verifyText: 'tương đương' }],
    evaluate(t, context) {
      const multiple = t.num('seller_deposit_refund_multiple');
      if (context.partyCode === 'seller') return null;
      if (t.bool('buyer_forfeits_deposit') !== true || multiple === undefined || multiple >= 2) return null;
      return {
        title: 'Phạt cọc không cân bằng, bất lợi cho bên mua',
        problem: [
          multiple <= 1
            ? 'Bên mua mất toàn bộ tiền cọc nếu không thực hiện, nhưng nếu bên bán từ chối thì bên bán chỉ phải trả lại tiền cọc, không chịu khoản phạt tương đương.'
            : `Bên mua mất toàn bộ tiền cọc nếu không thực hiện, nhưng nếu bên bán từ chối thì bên bán chỉ phải trả ${fmt(multiple)} lần tiền cọc, thấp hơn mức mặc định của Bộ luật Dân sự.`,
        ],
        consequences: ['Bên bán có thể dễ dàng huỷ giao dịch (ví dụ khi giá nhà tăng) mà gần như không bị thiệt, còn bên mua thì chịu rủi ro mất cọc.'],
        recommendations: ['Thoả thuận phạt cọc ngang nhau: bên bán từ chối thì phải trả lại tiền cọc và một khoản tiền tương đương tiền cọc.'],
      };
    },
  },
  {
    code: 'KDBDS_DEPOSIT_CAP',
    version: 1,
    profiles: ['housing_purchase'],
    severity: 'high',
    anchor: 'deposit_percent',
    legalBasis:
      'Điều 23 Luật Kinh doanh bất động sản 2023: chủ đầu tư dự án chỉ được thu tiền đặt cọc không quá 5% giá bán, giá thuê mua nhà ở khi nhà ở đã có đủ các điều kiện đưa vào kinh doanh.',
    citations: [{ sourceCode: KDBDS, article: 23, verifyText: '5%' }],
    evaluate(t) {
      const deposit = t.num('deposit_percent');
      if (t.bool('seller_is_developer') !== true || deposit === undefined || deposit <= 5) return null;
      return {
        title: `Chủ đầu tư thu đặt cọc ${fmt(deposit)}%, vượt mức 5%`,
        problem: [`Bên bán là chủ đầu tư nhưng thu tiền đặt cọc bằng ${fmt(deposit)}% giá bán, vượt mức tối đa 5% theo Luật Kinh doanh bất động sản.`],
        consequences: ['Bên mua bị giữ một khoản tiền lớn trái quy định; nếu dự án chậm hoặc có vấn đề, việc đòi lại tiền rất khó khăn.'],
        recommendations: ['Yêu cầu giảm tiền đặt cọc xuống không quá 5% giá bán.', 'Kiểm tra dự án đã đủ điều kiện đưa vào kinh doanh trước khi đặt cọc.'],
      };
    },
  },
  {
    code: 'KDBDS_FIRST_PAYMENT_CAP',
    version: 1,
    profiles: ['housing_purchase'],
    severity: 'high',
    anchor: 'first_payment_percent',
    legalBasis:
      'Điều 25 Luật Kinh doanh bất động sản 2023: thanh toán trong mua bán nhà ở hình thành trong tương lai được thực hiện nhiều lần, lần đầu không quá 30% giá trị hợp đồng, bao gồm cả tiền đặt cọc.',
    citations: [{ sourceCode: KDBDS, article: 25, verifyText: '30%' }],
    evaluate(t) {
      const first = t.num('first_payment_percent');
      if (t.bool('seller_is_developer') !== true || t.bool('off_plan') !== true || first === undefined || first <= 30) return null;
      return {
        title: `Thanh toán lần đầu ${fmt(first)}%, vượt mức 30%`,
        problem: [`Hợp đồng mua nhà hình thành trong tương lai yêu cầu thanh toán lần đầu ${fmt(first)}% giá trị hợp đồng (gồm cả cọc), vượt mức tối đa 30%.`],
        consequences: ['Bên mua phải trả trước quá nhiều khi nhà chưa xây xong, chịu rủi ro lớn nếu dự án chậm tiến độ hoặc không hoàn thành.'],
        recommendations: ['Yêu cầu giảm lần thanh toán đầu (kể cả tiền cọc) xuống không quá 30% giá trị hợp đồng.'],
      };
    },
  },
  {
    code: 'KDBDS_PRE_HANDOVER_CAP',
    version: 1,
    profiles: ['housing_purchase'],
    severity: 'high',
    anchor: 'paid_before_handover_percent',
    legalBasis:
      'Điều 25 Luật Kinh doanh bất động sản 2023: các lần thanh toán tiếp theo phải phù hợp với tiến độ xây dựng nhưng tổng số không quá 70% giá trị hợp đồng khi chưa bàn giao nhà ở.',
    citations: [{ sourceCode: KDBDS, article: 25, verifyText: '70%' }],
    evaluate(t) {
      const paid = t.num('paid_before_handover_percent');
      if (t.bool('seller_is_developer') !== true || t.bool('off_plan') !== true || paid === undefined || paid <= 70) return null;
      return {
        title: `Phải trả ${fmt(paid)}% trước khi nhận nhà, vượt mức 70%`,
        problem: [`Hợp đồng yêu cầu bên mua thanh toán ${fmt(paid)}% giá trị trước khi bàn giao nhà, vượt mức tối đa 70%.`],
        consequences: ['Bên mua gần như đã trả đủ tiền nhưng chưa nhận nhà, mất lợi thế để buộc chủ đầu tư bàn giao đúng hạn và đúng chất lượng.'],
        recommendations: ['Điều chỉnh tiến độ thanh toán để tổng số tiền trước khi bàn giao không quá 70% giá trị hợp đồng.'],
      };
    },
  },
  {
    code: 'KDBDS_PRE_CERTIFICATE_CAP',
    version: 1,
    profiles: ['housing_purchase'],
    severity: 'medium',
    anchor: 'paid_before_certificate_percent',
    legalBasis:
      'Điều 25 Luật Kinh doanh bất động sản 2023: bên mua chỉ phải thanh toán không quá 95% giá trị hợp đồng khi chưa được cấp Giấy chứng nhận; phần còn lại thanh toán khi đã được cấp Giấy chứng nhận.',
    citations: [{ sourceCode: KDBDS, article: 25, verifyText: '95%' }],
    evaluate(t) {
      const paid = t.num('paid_before_certificate_percent');
      if (t.bool('seller_is_developer') !== true || paid === undefined || paid <= 95) return null;
      return {
        title: `Phải trả ${fmt(paid)}% trước khi có sổ, vượt mức 95%`,
        problem: [`Hợp đồng yêu cầu thanh toán ${fmt(paid)}% giá trị trước khi được cấp Giấy chứng nhận, trong khi luật chỉ cho thu tối đa 95%.`],
        consequences: ['Bên mua mất khoản giữ lại 5% để buộc chủ đầu tư làm thủ tục cấp sổ; việc cấp sổ có thể bị kéo dài.'],
        recommendations: ['Giữ lại ít nhất 5% giá trị hợp đồng cho đến khi được cấp Giấy chứng nhận.'],
      };
    },
  },
  {
    code: 'HOUSING_NOTARIZATION',
    version: 2,
    profiles: ['housing_purchase'],
    severity: 'high',
    riskCode: 'MISSING_MANDATORY_FORM',
    legalBasis:
      'Điều 164 khoản 1 Luật Nhà ở 2023: mua bán nhà ở phải thực hiện công chứng hoặc chứng thực hợp đồng, trừ các trường hợp tại khoản 2 (nhà ở thuộc tài sản công; nhà ở xã hội, nhà ở cho lực lượng vũ trang nhân dân, nhà ở phục vụ tái định cư mà một bên là tổ chức). Điều 44 Luật Kinh doanh bất động sản 2023: hợp đồng mà ít nhất một bên là doanh nghiệp kinh doanh bất động sản được công chứng, chứng thực theo yêu cầu của các bên (khoản 4); hợp đồng mua bán nhà ở mà các bên là cá nhân phải công chứng hoặc chứng thực (khoản 5).',
    citations: [
      { sourceCode: NHA_O, article: 164, clause: 1, verifyText: 'phải thực hiện công chứng hoặc chứng thực' },
      { sourceCode: KDBDS, article: 44, clause: 5, verifyText: 'phải công chứng hoặc chứng thực' },
    ],
    evaluate(t) {
      if (t.bool('seller_is_developer') !== false || t.bool('notarization_agreed') !== false) return null;
      return {
        title: 'Hợp đồng mua bán nhà giữa cá nhân chưa được công chứng, chứng thực',
        problem: ['Bên bán không phải tổ chức kinh doanh bất động sản nhưng hợp đồng không nêu việc công chứng hoặc chứng thực.'],
        consequences: [
          'Hợp đồng mua bán nhà ở không được công chứng, chứng thực có thể bị tuyên vô hiệu về hình thức.',
          'Không thể làm thủ tục sang tên trên Giấy chứng nhận nếu không có hợp đồng đã công chứng.',
        ],
        recommendations: ['Ghi rõ các bên sẽ công chứng hợp đồng tại tổ chức hành nghề công chứng và ai chịu phí công chứng, thuế, lệ phí.'],
      };
    },
  },
  {
    code: 'BLLD_CONTRACT_TERM_CAP',
    version: 1,
    profiles: ['labor'],
    severity: 'high',
    anchor: 'term_months',
    legalBasis:
      'Điều 20 khoản 1 Bộ luật Lao động 2019: hợp đồng lao động xác định thời hạn có thời hạn không quá 36 tháng kể từ thời điểm có hiệu lực của hợp đồng.',
    citations: [{ sourceCode: BLLD, article: 20, clause: 1, verifyText: '36 tháng' }],
    evaluate(t) {
      const months = t.num('term_months');
      if (t.bool('indefinite_term') === true || months === undefined || months <= 36) return null;
      return {
        title: `Hợp đồng xác định thời hạn ${fmt(months)} tháng, vượt mức 36 tháng`,
        problem: [`Hợp đồng lao động xác định thời hạn ${fmt(months)} tháng, dài hơn mức tối đa 36 tháng.`],
        consequences: ['Hợp đồng sai loại; người lao động có thể yêu cầu coi là hợp đồng không xác định thời hạn, với quyền lợi khi chấm dứt khác hẳn.'],
        recommendations: ['Giảm thời hạn xuống không quá 36 tháng hoặc ký hợp đồng lao động không xác định thời hạn.'],
      };
    },
  },
  {
    code: 'BLLD_PROBATION_SHORT_CONTRACT',
    version: 1,
    profiles: ['labor'],
    severity: 'high',
    anchor: 'probation_days',
    legalBasis: 'Điều 24 Bộ luật Lao động 2019: không áp dụng thử việc đối với người lao động giao kết hợp đồng lao động có thời hạn dưới 01 tháng.',
    citations: [{ sourceCode: BLLD, article: 24, verifyText: 'dưới 01 tháng' }],
    evaluate(t) {
      const months = t.num('term_months');
      const probation = t.num('probation_days');
      if (months === undefined || months >= 1 || probation === undefined || probation <= 0) return null;
      return {
        title: 'Có thử việc dù hợp đồng dưới 01 tháng',
        problem: [`Hợp đồng chỉ kéo dài khoảng ${fmt(months * 30)} ngày nhưng vẫn quy định thử việc ${fmt(probation)} ngày.`],
        consequences: ['Thoả thuận thử việc không hợp lệ; người lao động phải được hưởng đầy đủ lương và quyền lợi chính thức ngay từ đầu.'],
        recommendations: ['Bỏ điều khoản thử việc đối với hợp đồng dưới 01 tháng.'],
      };
    },
  },
  {
    code: 'BLLD_PROBATION_MAX',
    version: 1,
    profiles: ['labor'],
    severity: 'high',
    anchor: 'probation_days',
    legalBasis:
      'Điều 25 Bộ luật Lao động 2019: thời gian thử việc chỉ được thử một lần và không quá 180 ngày với người quản lý doanh nghiệp, 60 ngày với công việc cần trình độ cao đẳng trở lên, 30 ngày với công việc cần trình độ trung cấp, công nhân kỹ thuật, nhân viên nghiệp vụ và 06 ngày làm việc với công việc khác.',
    citations: [{ sourceCode: BLLD, article: 25, verifyText: '180 ngày' }],
    evaluate(t) {
      const days = t.num('probation_days');
      if (days === undefined || days <= 60) return null;
      if (days > 180) {
        return {
          title: `Thử việc ${fmt(days)} ngày, vượt mức tối đa 180 ngày`,
          problem: [`Thời gian thử việc ${fmt(days)} ngày dài hơn mức tối đa 180 ngày cho mọi vị trí.`],
          consequences: ['Phần thời gian thử việc vượt quá không hợp lệ; người sử dụng lao động có thể phải trả bù lương chính thức cho khoảng thời gian đó.'],
          recommendations: ['Rút ngắn thời gian thử việc theo đúng trình độ công việc: tối đa 60 ngày (cao đẳng trở lên), 30 ngày (trung cấp, kỹ thuật, nghiệp vụ) hoặc 180 ngày (người quản lý doanh nghiệp).'],
        };
      }
      return {
        severity: 'medium',
        title: `Thử việc ${fmt(days)} ngày chỉ hợp lệ với người quản lý doanh nghiệp`,
        problem: [`Thời gian thử việc ${fmt(days)} ngày vượt mức 60 ngày áp dụng cho công việc cần trình độ cao đẳng trở lên; chỉ người quản lý doanh nghiệp mới được thử việc đến 180 ngày.`],
        consequences: ['Nếu vị trí không phải người quản lý doanh nghiệp, phần thử việc vượt quá không hợp lệ.'],
        recommendations: ['Xác định đúng trình độ của vị trí và rút ngắn thời gian thử việc tương ứng (60, 30 hoặc 6 ngày làm việc).'],
      };
    },
  },
  {
    code: 'BLLD_PROBATION_WAGE',
    version: 1,
    profiles: ['labor'],
    severity: 'high',
    anchor: 'probation_wage_percent',
    legalBasis: 'Điều 26 Bộ luật Lao động 2019: tiền lương của người lao động trong thời gian thử việc do hai bên thoả thuận nhưng ít nhất phải bằng 85% mức lương của công việc đó.',
    citations: [{ sourceCode: BLLD, article: 26, verifyText: '85%' }],
    evaluate(t) {
      const wage = t.num('probation_wage_percent');
      if (wage === undefined || wage >= 85) return null;
      return {
        title: `Lương thử việc ${fmt(wage)}%, thấp hơn mức 85%`,
        problem: [`Lương thử việc chỉ bằng ${fmt(wage)}% lương chính thức, thấp hơn mức tối thiểu 85%.`],
        consequences: ['Người sử dụng lao động có thể bị xử phạt và phải trả bù phần chênh lệch cho người lao động.'],
        recommendations: ['Nâng lương thử việc lên ít nhất 85% mức lương của công việc.'],
      };
    },
  },
  {
    code: 'BLLD_WORKING_HOURS',
    version: 1,
    profiles: ['labor'],
    severity: 'high',
    anchor: 'working_hours_per_week',
    legalBasis:
      'Điều 105 khoản 1 Bộ luật Lao động 2019: thời giờ làm việc bình thường không quá 08 giờ trong 01 ngày và không quá 48 giờ trong 01 tuần; nếu làm việc theo tuần thì không quá 10 giờ trong 01 ngày.',
    citations: [{ sourceCode: BLLD, article: 105, clause: 1, verifyText: '48 giờ' }],
    evaluate(t) {
      const week = t.num('working_hours_per_week');
      const day = t.num('working_hours_per_day');
      const weekOver = week !== undefined && week > 48;
      const dayOver = day !== undefined && day > 10;
      if (!weekOver && !dayOver) return null;
      return {
        anchor: weekOver ? 'working_hours_per_week' : 'working_hours_per_day',
        title: weekOver ? `Làm việc ${fmt(week!)} giờ/tuần, vượt mức 48 giờ` : `Làm việc ${fmt(day!)} giờ/ngày, vượt mức 10 giờ`,
        problem: [
          weekOver
            ? `Thời giờ làm việc bình thường ${fmt(week!)} giờ/tuần, vượt mức tối đa 48 giờ/tuần.`
            : `Thời giờ làm việc bình thường ${fmt(day!)} giờ/ngày, vượt mức tối đa 10 giờ/ngày kể cả khi làm việc theo tuần.`,
        ],
        consequences: ['Số giờ vượt quá phải được tính là làm thêm giờ và trả lương làm thêm; người sử dụng lao động có thể bị xử phạt.'],
        recommendations: ['Điều chỉnh thời giờ làm việc bình thường về không quá 08 giờ/ngày và 48 giờ/tuần; phần vượt tính là làm thêm giờ.'],
      };
    },
  },
  {
    code: 'BLLD_OVERTIME_CAP',
    version: 1,
    profiles: ['labor'],
    severity: 'high',
    anchor: 'overtime_hours_per_month',
    legalBasis:
      'Điều 107 khoản 2 Bộ luật Lao động 2019: số giờ làm thêm không quá 40 giờ trong 01 tháng và không quá 200 giờ trong 01 năm, trừ một số ngành, nghề được làm thêm không quá 300 giờ trong 01 năm.',
    citations: [{ sourceCode: BLLD, article: 107, clause: 2, verifyText: '40 giờ' }],
    evaluate(t) {
      const month = t.num('overtime_hours_per_month');
      const year = t.num('overtime_hours_per_year');
      if (month !== undefined && month > 40) {
        return {
          title: `Làm thêm ${fmt(month)} giờ/tháng, vượt mức 40 giờ`,
          problem: [`Hợp đồng cho phép làm thêm đến ${fmt(month)} giờ/tháng, vượt mức tối đa 40 giờ/tháng.`],
          consequences: ['Người sử dụng lao động có thể bị xử phạt; người lao động có quyền từ chối phần làm thêm vượt mức.'],
          recommendations: ['Giới hạn làm thêm giờ không quá 40 giờ/tháng và 200 giờ/năm (300 giờ/năm với ngành, nghề được phép).'],
        };
      }
      if (year === undefined || year <= 200) return null;
      return {
        anchor: 'overtime_hours_per_year',
        severity: year > 300 ? 'high' : 'medium',
        title: `Làm thêm ${fmt(year)} giờ/năm, vượt mức ${year > 300 ? '300' : '200'} giờ`,
        problem: [
          year > 300
            ? `Hợp đồng cho phép làm thêm ${fmt(year)} giờ/năm, vượt cả mức 300 giờ/năm dành cho các ngành, nghề đặc thù.`
            : `Hợp đồng cho phép làm thêm ${fmt(year)} giờ/năm; mức trên 200 giờ chỉ hợp lệ với một số ngành, nghề được pháp luật cho phép làm đến 300 giờ.`,
        ],
        consequences: ['Nếu không thuộc ngành, nghề được phép, thoả thuận làm thêm vượt mức không hợp lệ và người sử dụng lao động có thể bị xử phạt.'],
        recommendations: ['Giới hạn làm thêm giờ không quá 200 giờ/năm, hoặc 300 giờ/năm nếu thuộc ngành, nghề được pháp luật cho phép.'],
      };
    },
  },
  {
    code: 'BLLD_ANNUAL_LEAVE',
    version: 1,
    profiles: ['labor'],
    severity: 'high',
    anchor: 'annual_leave_days',
    legalBasis: 'Điều 113 khoản 1 Bộ luật Lao động 2019: người lao động làm việc đủ 12 tháng được nghỉ hằng năm, hưởng nguyên lương ít nhất 12 ngày làm việc với công việc trong điều kiện bình thường.',
    citations: [{ sourceCode: BLLD, article: 113, clause: 1, verifyText: '12 ngày' }],
    evaluate(t) {
      const days = t.num('annual_leave_days');
      if (days === undefined || days >= 12) return null;
      return {
        title: `Chỉ ${fmt(days)} ngày nghỉ hằng năm, thấp hơn mức 12 ngày`,
        problem: [`Hợp đồng chỉ cho ${fmt(days)} ngày nghỉ phép năm hưởng nguyên lương, thấp hơn mức tối thiểu 12 ngày làm việc.`],
        consequences: ['Thoả thuận thấp hơn luật không có hiệu lực; người lao động vẫn được nghỉ đủ 12 ngày hoặc được thanh toán tiền ngày phép chưa nghỉ.'],
        recommendations: ['Quy định ít nhất 12 ngày nghỉ hằng năm hưởng nguyên lương (nhiều hơn với công việc nặng nhọc, độc hại).'],
      };
    },
  },
  {
    code: 'BLLD_EMPLOYEE_NOTICE',
    version: 1,
    profiles: ['labor'],
    severity: 'medium',
    anchor: 'employee_notice_days',
    legalBasis:
      'Điều 35 khoản 1 Bộ luật Lao động 2019: người lao động đơn phương chấm dứt hợp đồng chỉ cần báo trước ít nhất 45 ngày (hợp đồng không xác định thời hạn), 30 ngày (hợp đồng từ 12 đến 36 tháng) hoặc 03 ngày làm việc (hợp đồng dưới 12 tháng).',
    citations: [{ sourceCode: BLLD, article: 35, clause: 1, verifyText: '45 ngày' }],
    evaluate(t) {
      const notice = t.num('employee_notice_days');
      if (notice === undefined) return null;
      const indefinite = t.bool('indefinite_term') === true;
      const months = t.num('term_months');
      const statutory = indefinite ? 45 : months === undefined ? undefined : months >= 12 ? 30 : 3;
      const threshold = statutory === 3 ? 5 : statutory;
      if (threshold === undefined || notice <= threshold) return null;
      return {
        title: `Người lao động phải báo trước ${fmt(notice)} ngày, dài hơn luật quy định`,
        problem: [`Hợp đồng buộc người lao động báo trước ${fmt(notice)} ngày khi nghỉ việc, trong khi luật chỉ yêu cầu ${statutory === 3 ? '03 ngày làm việc' : `${statutory} ngày`} cho loại hợp đồng này.`],
        consequences: ['Thoả thuận bất lợi hơn luật cho người lao động không có hiệu lực ở phần vượt quá; dễ phát sinh tranh chấp khi người lao động nghỉ việc.'],
        recommendations: [`Điều chỉnh thời hạn báo trước về đúng mức luật định (${statutory === 3 ? '03 ngày làm việc' : `${statutory} ngày`}).`],
      };
    },
  },
  {
    code: 'BLLD_WAGE_DEDUCTION_CAP',
    version: 1,
    profiles: ['labor'],
    severity: 'high',
    anchor: 'wage_deduction_percent',
    legalBasis: 'Điều 102 Bộ luật Lao động 2019: mức khấu trừ tiền lương hằng tháng không được quá 30% tiền lương thực trả hằng tháng của người lao động sau khi trích nộp các khoản bảo hiểm và thuế thu nhập cá nhân.',
    citations: [{ sourceCode: BLLD, article: 102, verifyText: '30%' }],
    evaluate(t) {
      const deduction = t.num('wage_deduction_percent');
      if (deduction === undefined || deduction <= 30) return null;
      return {
        title: `Khấu trừ lương đến ${fmt(deduction)}%/tháng, vượt mức 30%`,
        problem: [`Hợp đồng cho phép khấu trừ đến ${fmt(deduction)}% tiền lương hằng tháng, vượt mức tối đa 30%.`],
        consequences: ['Phần khấu trừ vượt mức là trái luật; người lao động có quyền đòi lại.'],
        recommendations: ['Giới hạn mức khấu trừ không quá 30% tiền lương thực trả hằng tháng.'],
      };
    },
  },
  {
    code: 'BLLD_KEEP_ORIGINAL_DOCUMENTS',
    version: 1,
    profiles: ['labor'],
    severity: 'high',
    anchor: 'keeps_original_documents',
    legalBasis: 'Điều 17 khoản 1 Bộ luật Lao động 2019: người sử dụng lao động không được giữ bản chính giấy tờ tuỳ thân, văn bằng, chứng chỉ của người lao động.',
    citations: [{ sourceCode: BLLD, article: 17, clause: 1, verifyText: 'bản chính' }],
    evaluate(t) {
      if (t.bool('keeps_original_documents') !== true) return null;
      return {
        title: 'Người sử dụng lao động giữ bản chính giấy tờ của người lao động',
        problem: ['Hợp đồng cho phép người sử dụng lao động giữ bản chính giấy tờ tuỳ thân, văn bằng hoặc chứng chỉ của người lao động.'],
        consequences: ['Đây là hành vi bị cấm; người sử dụng lao động có thể bị xử phạt và phải trả lại giấy tờ.'],
        recommendations: ['Bỏ điều khoản này; chỉ nhận bản sao có chứng thực khi cần lưu hồ sơ.'],
      };
    },
  },
  {
    code: 'BLLD_EMPLOYEE_DEPOSIT',
    version: 1,
    profiles: ['labor'],
    severity: 'high',
    anchor: 'employee_deposit_required',
    legalBasis: 'Điều 17 khoản 2 Bộ luật Lao động 2019: người sử dụng lao động không được yêu cầu người lao động phải thực hiện biện pháp bảo đảm bằng tiền hoặc tài sản khác cho việc thực hiện hợp đồng lao động.',
    citations: [{ sourceCode: BLLD, article: 17, clause: 2, verifyText: 'bảo đảm' }],
    evaluate(t) {
      if (t.bool('employee_deposit_required') !== true) return null;
      return {
        title: 'Người lao động phải đặt cọc hoặc ký quỹ',
        problem: ['Hợp đồng yêu cầu người lao động nộp tiền cọc, ký quỹ hoặc tài sản bảo đảm cho việc thực hiện hợp đồng.'],
        consequences: ['Đây là hành vi bị cấm; người lao động có quyền đòi lại toàn bộ khoản đã nộp.'],
        recommendations: ['Bỏ yêu cầu đặt cọc, ký quỹ; dùng cam kết bồi thường theo quy định thay thế nếu cần.'],
      };
    },
  },
  {
    code: 'BLLD_MONETARY_FINES',
    version: 1,
    profiles: ['labor'],
    severity: 'high',
    anchor: 'monetary_fines',
    legalBasis: 'Điều 127 Bộ luật Lao động 2019: nghiêm cấm phạt tiền, cắt lương thay việc xử lý kỷ luật lao động.',
    citations: [{ sourceCode: BLLD, article: 127, verifyText: 'cắt lương' }],
    evaluate(t) {
      if (t.bool('monetary_fines') !== true) return null;
      return {
        title: 'Phạt tiền, trừ lương thay cho xử lý kỷ luật',
        problem: ['Hợp đồng cho phép phạt tiền hoặc cắt lương người lao động khi vi phạm nội quy, kỷ luật.'],
        consequences: ['Đây là hành vi bị nghiêm cấm; khoản tiền đã phạt hoặc cắt phải trả lại và người sử dụng lao động có thể bị xử phạt.'],
        recommendations: ['Thay bằng các hình thức kỷ luật luật định: khiển trách, kéo dài thời hạn nâng lương, cách chức, sa thải.'],
      };
    },
  },
  {
    code: 'BLLD_SOCIAL_INSURANCE',
    version: 1,
    profiles: ['labor'],
    severity: 'high',
    anchor: 'social_insurance_excluded',
    legalBasis: 'Điều 168 khoản 1 Bộ luật Lao động 2019: người lao động, người sử dụng lao động phải tham gia bảo hiểm xã hội bắt buộc, bảo hiểm y tế bắt buộc, bảo hiểm thất nghiệp theo quy định của pháp luật.',
    citations: [{ sourceCode: BLLD, article: 168, clause: 1, verifyText: 'bảo hiểm xã hội bắt buộc' }],
    evaluate(t) {
      if (t.bool('social_insurance_excluded') !== true) return null;
      return {
        title: 'Không tham gia bảo hiểm xã hội bắt buộc',
        problem: ['Hợp đồng thoả thuận không đóng bảo hiểm xã hội bắt buộc hoặc trả khoản đóng bảo hiểm vào lương.'],
        consequences: [
          'Người lao động mất quyền lợi ốm đau, thai sản, tai nạn lao động, hưu trí và trợ cấp thất nghiệp.',
          'Người sử dụng lao động có thể bị truy thu, phạt chậm đóng và xử phạt hành chính.',
        ],
        recommendations: ['Đăng ký và đóng đầy đủ bảo hiểm xã hội, bảo hiểm y tế, bảo hiểm thất nghiệp bắt buộc.'],
      };
    },
  },
];
