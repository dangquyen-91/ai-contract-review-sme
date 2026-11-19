import type { ClauseCategory } from '../../models/clauseTypeTaxonomy.model';
import { DocumentCheckCode, VAGUE_TERMS } from './documentChecks.data';
import type { EvidenceClause, FieldEvidence } from './playbookEvidence.service';
import { blankRuns } from './blanks';
import { foldText } from './quoteMatching';
import { parseNumberToken, parseVietnameseNumberWords } from './valueSupport';

export interface DocumentFinding {
  code: DocumentCheckCode;
  clauseIndex: number;
  startOffset: number;
  endOffset: number;
  quote: string;
  detail: string;
  blankCount?: number;
  relatedQuotes?: { clauseIndex?: number; quote?: string; startOffset?: number; endOffset?: number }[];
}

const OBLIGATION_TYPES = new Set<ClauseCategory>([
  'payment',
  'deposit',
  'term',
  'delivery_handover',
  'service_level',
  'warranty',
  'maintenance_repair',
  'termination',
  'renewal',
  'probation',
  'wages',
  'working_time',
  'claims',
  'ownership_transfer',
]);

const ARTICLE_HEADING = /^\s*(?:Điều|ĐIỀU|Ðiều)\s+(\d+)/u;
const ARTICLE_MENTION = /(?<![\p{L}\d])(?:Điều|điều)\s+(\d{1,3})(?![\d])/gu;
const LAW_NAME_AFTER =
  /^(?:\s|[\d.,;:]|khoản)*(?:của\s+|tại\s+)?(?:Bộ\s+luật|Luật|Nghị\s+định|Thông\s+tư|Pháp\s+lệnh|Quyết\s+định|BLDS|BLLĐ|LTM|Hiến\s+pháp)/iu;
const APPENDIX_MENTION =
  /(?<![\p{L}])phụ\s+lục\s+(?:(?:số\s+)?([0-9]+|[IVXLC]+)(?![\p{L}\d])|(?:đính\s+kèm|kèm\s+theo))/giu;
const APPENDIX_HEADING = /^\s*PH[ỤU]\s+L[ỤU]C\b/mu;
const AMOUNT_WITH_WORDS =
  /(\d{1,3}(?:[.,]\d{3})+|\d{4,})\s*(?:đồng|VNĐ|VND|vnđ|đ)?\s*\(\s*(?:bằng\s+chữ\s*:?\s*)?([^()]{4,200})\)/giu;

const MAX_LISTED_BLANK_LINES = 20;

function blankFindings(clause: EvidenceClause): DocumentFinding[] {
  const runs = blankRuns(clause.text);
  if (runs.length === 0) return [];
  const lines: { start: number; end: number; quote: string }[] = [];
  for (const run of runs) {
    const lineStart = clause.text.lastIndexOf('\n', run.start) + 1;
    const lineEndRaw = clause.text.indexOf('\n', run.end);
    const lineEnd = lineEndRaw === -1 ? clause.text.length : lineEndRaw;
    if (lines.some((line) => line.start === lineStart)) continue;
    lines.push({ start: lineStart, end: lineEnd, quote: clause.text.slice(lineStart, lineEnd).trim() });
  }
  const [first, ...rest] = lines;
  return [
    {
      code: 'VB-01',
      clauseIndex: clause.index,
      startOffset: clause.startOffset + first.start,
      endOffset: clause.startOffset + first.end,
      quote: first.quote,
      detail: runs.length === 1 ? 'Còn 1 chỗ trống chưa điền.' : `Còn ${runs.length} chỗ trống chưa điền trên ${lines.length} dòng.`,
      blankCount: runs.length,
      relatedQuotes: rest.slice(0, MAX_LISTED_BLANK_LINES).map((line) => ({
        clauseIndex: clause.index,
        quote: line.quote,
        startOffset: clause.startOffset + line.start,
        endOffset: clause.startOffset + line.end,
      })),
    },
  ];
}

function articleNumbers(clauses: EvidenceClause[]) {
  return new Set(
    clauses.flatMap((clause) => {
      const match = clause.text.match(ARTICLE_HEADING);
      return match ? [Number(match[1])] : [];
    }),
  );
}

function danglingArticleFindings(clauses: EvidenceClause[]): DocumentFinding[] {
  const existing = articleNumbers(clauses);
  if (existing.size < 3) return [];
  const findings: DocumentFinding[] = [];
  for (const clause of clauses) {
    for (const match of clause.text.matchAll(ARTICLE_MENTION)) {
      const start = match.index ?? 0;
      const end = start + match[0].length;
      const number = Number(match[1]);
      if (existing.has(number)) continue;
      if (clause.text.slice(0, start).trim() === '') continue;
      if (LAW_NAME_AFTER.test(clause.text.slice(end, end + 80))) continue;
      findings.push({
        code: 'VB-02',
        clauseIndex: clause.index,
        startOffset: clause.startOffset + start,
        endOffset: clause.startOffset + end,
        quote: match[0],
        detail: `Hợp đồng dẫn chiếu "${match[0]}" nhưng không có điều khoản số ${number}.`,
      });
    }
  }
  return findings;
}

function missingAppendixFindings(clauses: EvidenceClause[]): DocumentFinding[] {
  if (clauses.some((clause) => APPENDIX_HEADING.test(clause.text))) return [];
  const findings: DocumentFinding[] = [];
  const reported = new Set<string>();
  for (const clause of clauses) {
    for (const match of clause.text.matchAll(APPENDIX_MENTION)) {
      const key = (match[1] ?? '').toUpperCase();
      if (reported.has(key)) continue;
      reported.add(key);
      const start = match.index ?? 0;
      findings.push({
        code: 'VB-03',
        clauseIndex: clause.index,
        startOffset: clause.startOffset + start,
        endOffset: clause.startOffset + start + match[0].length,
        quote: match[0],
        detail: `Hợp đồng dẫn chiếu "${match[0]}" nhưng tài liệu tải lên không có phụ lục này.`,
      });
    }
  }
  return findings;
}

function amountWordsFindings(clause: EvidenceClause): DocumentFinding[] {
  const findings: DocumentFinding[] = [];
  for (const match of clause.text.matchAll(AMOUNT_WITH_WORDS)) {
    const digits = parseNumberToken(match[1]);
    const words = parseVietnameseNumberWords(match[2]);
    if (digits === undefined || words === undefined || words === 0) continue;
    if (Math.abs(digits - words) <= Math.max(1, digits * 1e-9)) continue;
    const start = match.index ?? 0;
    findings.push({
      code: 'VB-04',
      clauseIndex: clause.index,
      startOffset: clause.startOffset + start,
      endOffset: clause.startOffset + start + match[0].length,
      quote: match[0].trim(),
      detail: `Bằng số là ${digits.toLocaleString('vi-VN')}, bằng chữ là ${words.toLocaleString('vi-VN')}.`,
    });
  }
  return findings;
}

const foldedVagueTerms = VAGUE_TERMS.map((term) => ({ term, folded: foldText(term).folded }));

function vagueTermFindings(clause: EvidenceClause, definedTerms: Set<string>): DocumentFinding[] {
  if (!clause.clauseTypes.some((type) => OBLIGATION_TYPES.has(type))) return [];
  const folded = foldText(clause.text);
  const findings: DocumentFinding[] = [];
  for (const { term, folded: needle } of foldedVagueTerms) {
    if (definedTerms.has(needle)) continue;
    let from = 0;
    for (;;) {
      const index = folded.folded.indexOf(needle, from);
      if (index === -1) break;
      from = index + needle.length;
      const before = folded.folded[index - 1];
      const after = folded.folded[index + needle.length];
      if ((before && before !== ' ') || (after && after !== ' ')) continue;
      const start = folded.starts[index];
      const end = folded.ends[index + needle.length - 1];
      findings.push({
        code: 'VB-05',
        clauseIndex: clause.index,
        startOffset: clause.startOffset + start,
        endOffset: clause.startOffset + end,
        quote: clause.text.slice(start, end),
        detail: `Cụm từ "${term}" không cho biết cụ thể mức độ hoặc thời gian.`,
      });
    }
  }
  return findings;
}

function definedVagueTerms(clauses: EvidenceClause[]) {
  const defined = new Set<string>();
  for (const clause of clauses) {
    const folded = foldText(clause.text).folded;
    for (const { folded: needle } of foldedVagueTerms) {
      if (new RegExp(`${needle} (?:duoc hieu la|co nghia la|la khong qua|la trong vong)`).test(folded)) defined.add(needle);
    }
  }
  return defined;
}

function conflictFindings(fields: { label: string; evidence: FieldEvidence }[]): DocumentFinding[] {
  return fields.flatMap(({ label, evidence }) => {
    if (!evidence.conflicts?.length || evidence.clauseIndex === undefined) return [];
    return [
      {
        code: 'VB-06' as const,
        clauseIndex: evidence.clauseIndex,
        startOffset: evidence.startOffset ?? 0,
        endOffset: evidence.endOffset ?? 0,
        quote: evidence.quote ?? '',
        detail: `"${label}" được ghi là "${evidence.value}" nhưng ở chỗ khác lại là ${evidence.conflicts.map((c) => `"${c.value}"`).join(', ')}.`,
        relatedQuotes: evidence.conflicts.map((c) => ({
          clauseIndex: c.clauseIndex,
          quote: c.quote,
          startOffset: c.startOffset,
          endOffset: c.endOffset,
        })),
      },
    ];
  });
}

export function runDocumentChecks(
  clauses: EvidenceClause[],
  conflictFields: { label: string; evidence: FieldEvidence }[] = [],
): DocumentFinding[] {
  const defined = definedVagueTerms(clauses);
  return [
    ...clauses.flatMap(blankFindings),
    ...danglingArticleFindings(clauses),
    ...missingAppendixFindings(clauses),
    ...clauses.flatMap(amountWordsFindings),
    ...clauses.flatMap((clause) => vagueTermFindings(clause, defined)),
    ...conflictFindings(conflictFields),
  ].sort((a, b) => a.startOffset - b.startOffset);
}
