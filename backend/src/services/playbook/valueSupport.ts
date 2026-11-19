import type { FieldKind } from './playbookSchema';
import { containsFolded } from './quoteMatching';

export function parseNumberToken(token: string): number | undefined {
  const value = token.replace(/\s/g, '');
  let normalized: string | undefined;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(value)) normalized = value.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(value)) normalized = value.replace(/,/g, '');
  else if (/^\d+,\d+$/.test(value)) normalized = value.replace(',', '.');
  else if (/^\d+(\.\d+)?$/.test(value)) normalized = value;
  if (normalized === undefined) return undefined;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : undefined;
}

interface NumberMention {
  value: number;
  unit: string;
  period?: string;
}

const NUMBER_PATTERN =
  /(\d[\d.,]*\d|\d)\s*(%|phan tram|ty|ti|trieu|nghin|ngan|dong|vnd|usd|thang|nam|ngay lam viec|ngay|tuan|gio)?(?:\s*(?:\/|mot|moi|1)\s*(ngay|thang|nam))?(?![\p{L}\d])/gu;

const foldForNumbers = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ');

export function numberMentions(quote: string): NumberMention[] {
  const mentions: NumberMention[] = [];
  for (const match of foldForNumbers(quote).matchAll(NUMBER_PATTERN)) {
    const value = parseNumberToken(match[1]);
    if (value === undefined) continue;
    mentions.push({ value, unit: match[2] ?? '', period: match[3] });
  }
  return mentions;
}

const MONEY_MULTIPLIER: Record<string, number> = { ty: 1e9, ti: 1e9, trieu: 1e6, nghin: 1e3, ngan: 1e3 };
const PER_YEAR: Record<string, number> = { ngay: 365, thang: 12, nam: 1 };
const isPercent = (unit: string) => unit === '%' || unit === 'phan tram';

export function numericCandidates(kind: FieldKind, quote: string): number[] {
  const mentions = numberMentions(quote);
  switch (kind) {
    case 'money':
      return mentions.map((m) => m.value * (MONEY_MULTIPLIER[m.unit] ?? 1));
    case 'percent':
      return mentions.filter((m) => isPercent(m.unit)).map((m) => m.value);
    case 'interest_rate':
      return mentions.filter((m) => isPercent(m.unit)).map((m) => m.value * (m.period ? PER_YEAR[m.period] : 1));
    case 'months':
      return mentions.flatMap((m) =>
        m.unit === 'thang' ? [m.value] : m.unit === 'nam' ? [m.value * 12] : m.unit === 'ngay' ? [m.value / 30] : m.unit === 'tuan' ? [(m.value * 7) / 30] : [],
      );
    case 'days':
      return mentions.flatMap((m) =>
        m.unit === 'ngay' || m.unit === 'ngay lam viec'
          ? [m.value]
          : m.unit === 'tuan'
            ? [m.value * 7]
            : m.unit === 'thang'
              ? [m.value * 30]
              : m.unit === 'nam'
                ? [m.value * 365]
                : [],
      );
    case 'hours':
      return mentions.filter((m) => m.unit === 'gio').map((m) => m.value);
    case 'number':
      return mentions.map((m) => m.value);
    default:
      return [];
  }
}

const DIGIT_WORDS: Record<string, number> = {
  khong: 0,
  mot: 1,
  hai: 2,
  ba: 3,
  bon: 4,
  tu: 4,
  nam: 5,
  lam: 5,
  nham: 5,
  sau: 6,
  bay: 7,
  tam: 8,
  chin: 9,
};
const SCALE_WORDS: Record<string, number> = { nghin: 1e3, ngan: 1e3, trieu: 1e6, ty: 1e9, ti: 1e9 };

export function parseVietnameseNumberWords(text: string): number | undefined {
  const words = foldForNumbers(text).match(/\p{L}+/gu) ?? [];
  let total = 0;
  let section = 0;
  let pending = 0;
  let numberWords = 0;
  for (const word of words) {
    if (word in DIGIT_WORDS) {
      pending = DIGIT_WORDS[word];
      numberWords++;
    } else if (word === 'muoi' && pending === 0) {
      section += 10;
      numberWords++;
    } else if (word === 'muoi') {
      section += pending * 10;
      pending = 0;
      numberWords++;
    } else if (word === 'tram') {
      section += pending * 100;
      pending = 0;
      numberWords++;
    } else if (word in SCALE_WORDS) {
      total += (section + pending || 1) * SCALE_WORDS[word];
      section = 0;
      pending = 0;
      numberWords++;
    } else if (word === 'linh' || word === 'le') {
      numberWords++;
    }
  }
  if (numberWords < 2) return undefined;
  return total + section + pending;
}

const closeTo = (a: number, b: number) => Math.abs(a - b) <= Math.max(1e-6, Math.abs(b) * 0.005);

export const numberSupportedByQuote = (kind: FieldKind, quote: string, value: number) =>
  numericCandidates(kind, quote).some((candidate) => closeTo(candidate, value));

export const textSupportedByQuote = (quote: string, value: string) => containsFolded(quote, value);
