import { SENSITIVE_DATA_TYPES } from '../models/contractProfile.model';

export type SensitiveDataType = (typeof SENSITIVE_DATA_TYPES)[number];

export interface SensitiveSpan {
  type: SensitiveDataType;
  start: number;
  end: number;
  value: string;
}

const TOKEN_PREFIX: Record<SensitiveDataType, string> = {
  person_name: 'PERSON',
  national_id: 'ID_NUMBER',
  passport: 'PASSPORT',
  date_of_birth: 'DOB',
  phone: 'PHONE',
  email: 'EMAIL',
  bank_account: 'BANK_ACCOUNT',
  personal_address: 'ADDRESS',
  tax_code: 'TAX_CODE',
  land_certificate: 'LAND_CERT',
};

const NAME_WORD = '(?:\\p{Lu}{2,}|\\p{Lu}[\\p{Ll}\\p{M}]*)(?![\\p{L}\\p{M}])';
const NAME_LABEL =
  '(?<![\\p{L}\\p{M}])(?:Ông|ÔNG|Bà|BÀ|Họ và tên|HỌ VÀ TÊN|Họ tên|HỌ TÊN|Người đại diện(?: theo pháp luật)?|NGƯỜI ĐẠI DIỆN|Đại diện|ĐẠI DIỆN)(?![\\p{L}\\p{M}])';
const NOT_A_PERSON =
  '(?!(?:Bên|BÊN|Công ty|CÔNG TY|Ngân hàng|NGÂN HÀNG|Chi nhánh|CHI NHÁNH|Hộ kinh doanh|HỘ KINH DOANH|Doanh nghiệp|DOANH NGHIỆP)(?![\\p{L}\\p{M}]))';

interface Detector {
  type: SensitiveDataType;
  pattern: RegExp;
  accept?: (value: string) => boolean;
  isPublic?: (value: string, match: string) => boolean;
}

const digitsOf = (value: string) => value.replace(/\D/g, '');

const DETECTORS: Detector[] = [
  {
    type: 'person_name',
    pattern: new RegExp(
      `${NAME_LABEL}[ \\t]*[:.]?[ \\t]*(?:(?:Ông|Bà|ÔNG|BÀ)\\.?[ \\t]+)?${NOT_A_PERSON}(${NAME_WORD}(?:[ \\t]+${NAME_WORD}){1,5})`,
      'gu',
    ),
  },
  {
    type: 'national_id',
    pattern:
      /(?:CCCD|CMND|CMT|căn cước(?: công dân)?|chứng minh(?: nhân dân| thư)?|số định danh(?: cá nhân)?)(?:\s*số)?\s*[:.]?\s*(\d{12}|\d{9})(?!\d)/giu,
  },
  {
    type: 'passport',
    pattern: /(?:hộ chiếu|passport)(?:\s*(?:số|no\.?))?\s*[:.]?\s*([A-Z]\d{7,8})(?!\d)/giu,
  },
  {
    type: 'date_of_birth',
    pattern:
      /(?:sinh ngày|ngày sinh|ngày, tháng, năm sinh)\s*[:.]?\s*(\d{1,2}[/.-]\d{1,2}[/.-]\d{4}|\d{1,2}\s+tháng\s+\d{1,2}\s+năm\s+\d{4})/giu,
  },
  {
    type: 'email',
    pattern: /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/gu,
  },
  {
    type: 'bank_account',
    pattern: /(?:số tài khoản|tài khoản số|STK|số TK|TK số)\s*[:.]?\s*(\d(?:[\s.-]?\d){5,18})(?!\d)/giu,
  },
  {
    type: 'tax_code',
    pattern: /(?:mã số thuế|MST|mã số doanh nghiệp|MSDN)(?: cá nhân)?\s*[:.]?\s*(\d{10}(?:-\d{3})?|\d{12})(?!\d)/giu,
    isPublic: (value, match) => !/cá nhân/iu.test(match) && value.startsWith('0') && value.length !== 12,
  },
  {
    type: 'personal_address',
    pattern:
      /(?:địa chỉ thường trú|nơi thường trú|thường trú tại|hộ khẩu thường trú|chỗ ở hiện (?:tại|nay)|nơi cư trú|địa chỉ liên hệ)\s*[:.]?\s*([^\n;]{5,200})/giu,
  },
  {
    type: 'land_certificate',
    pattern:
      /(?:giấy chứng nhận[^\n]{0,100}?\bsố|GCN(?:QSDĐ)?\s*số|sổ (?:đỏ|hồng) số)\s*[:.]?\s*([A-Z]{1,2}\s?\d{5,8})(?!\d)/giu,
  },
  {
    type: 'phone',
    pattern: /(?<![\d+])((?:\+84|84|0)(?:[\s.-]?\d){8,10})(?!\d)/gu,
    accept: (value) => {
      const digits = digitsOf(value).replace(/^84/, '0');
      return (digits.length === 10 && /^0[35789]/.test(digits)) || (digits.length === 11 && digits.startsWith('02'));
    },
  },
  {
    type: 'national_id',
    pattern: /(?<![\d.,])(0(?:0[1-9]|[1-8]\d|9[0-6])\d{9})(?![\d.,])/gu,
  },
];

export function detectSensitiveData(
  text: string,
  types: ReadonlySet<SensitiveDataType>,
): SensitiveSpan[] {
  const spans: (SensitiveSpan & { isPublic: boolean })[] = [];
  for (const detector of DETECTORS) {
    for (const match of text.matchAll(detector.pattern)) {
      const raw = match[1];
      const value = raw.replace(/[\s,.;:]+$/u, '');
      if (!value || (detector.accept && !detector.accept(value))) continue;
      const start = (match.index ?? 0) + match[0].lastIndexOf(raw);
      const isPublic = detector.isPublic?.(value, match[0]) ?? false;
      spans.push({ type: detector.type, start, end: start + value.length, value, isPublic });
    }
  }

  spans.sort((a, b) => a.start - b.start || b.end - a.end);
  const kept: typeof spans = [];
  for (const span of spans) {
    const previous = kept.at(-1);
    if (previous && span.start < previous.end) continue;
    kept.push(span);
  }
  return kept
    .filter((span) => !span.isPublic && types.has(span.type))
    .map(({ isPublic: _isPublic, ...span }) => span);
}

export function summarizeSensitiveData(spans: SensitiveSpan[]) {
  const counts: Partial<Record<SensitiveDataType, number>> = {};
  for (const span of spans) counts[span.type] = (counts[span.type] ?? 0) + 1;
  return { total: spans.length, counts };
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function boundedPattern(value: string): string {
  const escaped = escapeRegExp(value);
  const before = /^\d/.test(value) ? '(?<!\\d)' : /^[\p{L}\p{M}]/u.test(value) ? '(?<![\\p{L}\\p{M}])' : '';
  const after = /\d$/.test(value) ? '(?!\\d)' : /[\p{L}\p{M}]$/u.test(value) ? '(?![\\p{L}\\p{M}])' : '';
  return `${before}${escaped}${after}`;
}

const TOKEN_PATTERN = new RegExp(`\\[(?:${Object.values(TOKEN_PREFIX).join('|')})_\\d+\\]`, 'g');
const MAX_TOKEN_LENGTH = 24;

interface Replacement {
  originalStart: number;
  originalEnd: number;
  maskedStart: number;
  maskedEnd: number;
}

export interface MaskedText {
  masked: string;
  toOriginalOffset(maskedOffset: number): number;
}

export interface StreamUnmasker {
  push(chunk: string): string;
  flush(): string;
}

export interface Redactor {
  readonly size: number;
  readonly spans: SensitiveSpan[];
  mask(text: string): string;
  maskWithOffsets(text: string): MaskedText;
  unmask(text: string): string;
  createStreamUnmasker(): StreamUnmasker;
}

export function createRedactor(sourceText: string, types: Iterable<SensitiveDataType>): Redactor {
  const spans = detectSensitiveData(sourceText, new Set(types));
  const tokenByValue = new Map<string, string>();
  const valueByToken = new Map<string, string>();
  const counters: Partial<Record<SensitiveDataType, number>> = {};
  for (const span of spans) {
    if (tokenByValue.has(span.value)) continue;
    const n = (counters[span.type] = (counters[span.type] ?? 0) + 1);
    const token = `[${TOKEN_PREFIX[span.type]}_${n}]`;
    tokenByValue.set(span.value, token);
    valueByToken.set(token, span.value);
  }

  const values = [...tokenByValue.keys()].sort((a, b) => b.length - a.length);
  const valuePattern = values.length > 0 ? new RegExp(values.map(boundedPattern).join('|'), 'gu') : null;

  const maskWithOffsets = (text: string): MaskedText => {
    if (!valuePattern) return { masked: text, toOriginalOffset: (offset) => offset };
    const replacements: Replacement[] = [];
    let masked = '';
    let cursor = 0;
    for (const match of text.matchAll(valuePattern)) {
      const index = match.index ?? 0;
      const token = tokenByValue.get(match[0]) ?? match[0];
      masked += text.slice(cursor, index);
      replacements.push({
        originalStart: index,
        originalEnd: index + match[0].length,
        maskedStart: masked.length,
        maskedEnd: masked.length + token.length,
      });
      masked += token;
      cursor = index + match[0].length;
    }
    masked += text.slice(cursor);

    const toOriginalOffset = (offset: number) => {
      let shift = 0;
      for (const r of replacements) {
        if (offset < r.maskedStart) break;
        if (offset < r.maskedEnd) return offset === r.maskedStart ? r.originalStart : r.originalEnd;
        shift = r.originalEnd - r.maskedEnd;
      }
      return offset + shift;
    };
    return { masked, toOriginalOffset };
  };

  const unmask = (text: string) => text.replace(TOKEN_PATTERN, (token) => valueByToken.get(token) ?? token);

  return {
    size: tokenByValue.size,
    spans,
    mask: (text) => maskWithOffsets(text).masked,
    maskWithOffsets,
    unmask,
    createStreamUnmasker() {
      let pending = '';
      return {
        push(chunk) {
          pending += chunk;
          const open = pending.lastIndexOf('[');
          const hold = open !== -1 && !pending.includes(']', open) && pending.length - open < MAX_TOKEN_LENGTH;
          const ready = hold ? pending.slice(0, open) : pending;
          pending = hold ? pending.slice(open) : '';
          return unmask(ready);
        },
        flush() {
          const rest = unmask(pending);
          pending = '';
          return rest;
        },
      };
    },
  };
}

export const PLACEHOLDER_INSTRUCTION =
  'Personal data in the contract has been replaced by placeholders such as [PERSON_1], [ID_NUMBER_1], [PHONE_1] or [BANK_ACCOUNT_1]. Treat each placeholder as the real value it stands for, copy placeholders exactly as written whenever you refer to them, and never guess or invent the real values.';

export function placeholderInstruction(redactor: Redactor): string {
  return redactor.size > 0 ? `\n\n${PLACEHOLDER_INSTRUCTION}` : '';
}
