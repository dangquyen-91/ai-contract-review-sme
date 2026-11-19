import { Schema, Type } from '@google/genai';
import { z } from 'zod';
import { placeholderInstruction, Redactor } from '../ai/redaction.service';
import { VAGUE_TERMS } from '../playbook/documentChecks.data';
import { askJson } from '../playbook/playbookEvidence.service';
import { foldForMatch } from '../playbook/quoteMatching';
import { numberMentions } from '../playbook/valueSupport';

export type FaithfulnessVerdict = 'supported' | 'contradicted' | 'unclear';

const MAX_VERIFY_ITEMS = 40;
const EXCERPT_LENGTH = 300;
const REFERENCE_PATTERN = /(?:Điều|ĐIỀU|điều|Khoản|khoản|Điểm|điểm|Mục|mục|Phụ lục|phụ lục|Chương|chương)\s+\d+[a-zđ]?/gu;
const MONEY_MULTIPLIER: Record<string, number> = { ty: 1e9, ti: 1e9, trieu: 1e6, nghin: 1e3, ngan: 1e3 };

const numbersIn = (text: string) =>
  numberMentions(text.replace(REFERENCE_PATTERN, ' ')).map((mention) => ({
    value: mention.value,
    candidates: [mention.value, mention.value * (MONEY_MULTIPLIER[mention.unit] ?? 1)],
  }));

const closeTo = (a: number, b: number) => Math.abs(a - b) <= Math.max(1e-6, Math.abs(b) * 0.005);

export function faithfulnessProblems(text: string, sources: string[]): string[] {
  const problems: string[] = [];
  const sourceNumbers = sources.flatMap((source) => numbersIn(source).flatMap((n) => n.candidates));
  for (const mention of numbersIn(text)) {
    if (!mention.candidates.some((candidate) => sourceNumbers.some((source) => closeTo(source, candidate)))) {
      problems.push(`con số ${mention.value.toLocaleString('vi-VN')} không có trong nội dung hợp đồng được trích`);
    }
  }
  const foldedText = ` ${foldForMatch(text)} `;
  for (const term of VAGUE_TERMS) {
    const folded = foldForMatch(term);
    if (foldedText.includes(` ${folded} `)) continue;
    const hardened = sources.some((source) =>
      vagueContexts(foldForMatch(source), folded).some((context) => foldedText.includes(` ${context} `)),
    );
    if (hardened) problems.push(`bỏ mất cụm từ "${term}" mà hợp đồng dùng, làm nội dung có vẻ cụ thể hơn thực tế`);
  }
  return [...new Set(problems)];
}

const CONTEXT_WORDS = 3;

function vagueContexts(foldedSource: string, foldedTerm: string): string[] {
  const words = foldedSource.split(' ');
  const termWords = foldedTerm.split(' ');
  const contexts: string[] = [];
  for (let i = 0; i + termWords.length <= words.length; i++) {
    if (termWords.some((word, k) => words[i + k] !== word)) continue;
    const after = words.slice(i + termWords.length, i + termWords.length + CONTEXT_WORDS);
    const before = words.slice(Math.max(0, i - CONTEXT_WORDS), i);
    if (after.length === CONTEXT_WORDS) contexts.push(after.join(' '));
    if (before.length === CONTEXT_WORDS) contexts.push(before.join(' '));
  }
  return contexts;
}

const verifyParser = z.object({
  verdicts: z.array(z.object({ id: z.string(), verdict: z.enum(['supported', 'contradicted', 'unclear']) })),
});

const verifyResponse: Schema = {
  type: Type.OBJECT,
  properties: {
    verdicts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          verdict: { type: Type.STRING, enum: ['supported', 'contradicted', 'unclear'] },
        },
        required: ['id', 'verdict'],
      },
    },
  },
  required: ['verdicts'],
};

export interface FaithfulnessItem {
  id: string;
  text: string;
  sources: string[];
}

function verifyPrompt(items: FaithfulnessItem[], redactor: Redactor) {
  return `You check plain-language summaries against the exact text of a Vietnamese contract. For each item, judge the summary using ONLY its source text:
- "supported" when every fact, party, number, deadline and condition in the summary is stated in the source text. Plain rewording is fine.
- "contradicted" when the summary changes, adds or hardens anything: a different value, a condition or consequence the source does not state, or vague wording (such as "hợp lý", "kịp thời") turned into something precise (such as "ngay", "trong 7 ngày").
- "unclear" when the source text alone does not settle it.
Return one verdict per item id.${placeholderInstruction(redactor)}

${items
  .map((item) => `[id=${item.id}]\nSource text:\n"""\n${item.sources.map((source) => redactor.mask(source)).join('\n…\n')}\n"""\nSummary: ${redactor.mask(item.text)}`)
  .join('\n\n')}`;
}

export async function verifyFaithful(
  items: FaithfulnessItem[],
  redactor: Redactor,
  signal?: AbortSignal,
): Promise<Map<string, FaithfulnessVerdict>> {
  const verdicts = new Map<string, FaithfulnessVerdict>();
  for (let start = 0; start < items.length; start += MAX_VERIFY_ITEMS) {
    signal?.throwIfAborted();
    const batch = items.slice(start, start + MAX_VERIFY_ITEMS);
    const result = await askJson(verifyPrompt(batch, redactor), verifyResponse, verifyParser, signal);
    for (const verdict of result.verdicts) verdicts.set(verdict.id, verdict.verdict);
  }
  return verdicts;
}

export async function checkFaithfulness(
  items: FaithfulnessItem[],
  redactor: Redactor,
  signal?: AbortSignal,
): Promise<Map<string, string[]>> {
  const problems = new Map(items.map((item) => [item.id, faithfulnessProblems(item.text, item.sources)]));
  const toVerify = items.filter((item) => problems.get(item.id)?.length === 0);
  if (toVerify.length) {
    const verdicts = await verifyFaithful(toVerify, redactor, signal);
    for (const item of toVerify) {
      const verdict = verdicts.get(item.id) ?? 'unclear';
      if (verdict !== 'supported') {
        problems.set(item.id, [
          verdict === 'contradicted'
            ? 'nội dung tóm tắt thêm, đổi hoặc làm cụ thể hơn điều hợp đồng ghi'
            : 'nội dung tóm tắt không được nguồn trích xác nhận',
        ]);
      }
    }
  }
  return problems;
}

export interface ClauseSummaryInput {
  index: number;
  text: string;
  summary: string;
}

export type ClauseSummaryKind = 'ai_verified' | 'excerpt';

export function clauseExcerpt(text: string): string {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const body = (lines.length > 1 ? lines.slice(1) : lines).join(' ').replace(/\s+/g, ' ');
  if (body.length <= EXCERPT_LENGTH) return body;
  const cut = body.slice(0, EXCERPT_LENGTH);
  const sentenceEnd = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('; '));
  return sentenceEnd > EXCERPT_LENGTH / 2 ? cut.slice(0, sentenceEnd + 1) : `${cut.trimEnd()}…`;
}

const rewriteParser = z.object({ summaries: z.array(z.object({ index: z.number().int(), summary: z.string().min(1) })) });

const rewriteResponse: Schema = {
  type: Type.OBJECT,
  properties: {
    summaries: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { index: { type: Type.INTEGER }, summary: { type: Type.STRING } },
        required: ['index', 'summary'],
      },
    },
  },
  required: ['summaries'],
};

function rewritePrompt(items: { clause: ClauseSummaryInput; problems: string[] }[], redactor: Redactor) {
  return `Rewrite the plain-language Vietnamese summary of each contract clause below. The previous summary was rejected for the reasons given. The new summary must be 1-3 short sentences with full Vietnamese diacritics, state only what the clause says, keep every number exactly as written, keep vague wording such as "hợp lý" or "kịp thời" instead of making it precise, and add no condition or consequence the clause does not state.${placeholderInstruction(redactor)}

${items
  .map(
    ({ clause, problems }) =>
      `[index=${clause.index}]\nClause:\n"""\n${redactor.mask(clause.text)}\n"""\nRejected summary: ${redactor.mask(clause.summary)}\nReasons: ${problems.join('; ')}`,
  )
  .join('\n\n')}`;
}

export async function groundClauseSummaries(
  clauses: ClauseSummaryInput[],
  redactor: Redactor,
  signal?: AbortSignal,
): Promise<Map<number, { summary: string; kind: ClauseSummaryKind }>> {
  const result = new Map<number, { summary: string; kind: ClauseSummaryKind }>();
  const firstPass = await checkFaithfulness(
    clauses.map((clause) => ({ id: String(clause.index), text: clause.summary, sources: [clause.text] })),
    redactor,
    signal,
  );
  const rejected = clauses.flatMap((clause) => {
    const problems = firstPass.get(String(clause.index)) ?? [];
    if (problems.length === 0) {
      result.set(clause.index, { summary: clause.summary, kind: 'ai_verified' });
      return [];
    }
    return [{ clause, problems }];
  });
  if (rejected.length === 0) return result;

  const rewrites = new Map<number, string>();
  try {
    const { summaries } = await askJson(rewritePrompt(rejected, redactor), rewriteResponse, rewriteParser, signal);
    for (const item of summaries) rewrites.set(item.index, redactor.unmask(item.summary).trim());
  } catch (err) {
    if (signal?.aborted) throw err;
  }
  const candidates = rejected.flatMap(({ clause }) => {
    const summary = rewrites.get(clause.index);
    return summary ? [{ id: String(clause.index), text: summary, sources: [clause.text] }] : [];
  });
  const secondPass = candidates.length ? await checkFaithfulness(candidates, redactor, signal) : new Map<string, string[]>();
  for (const { clause } of rejected) {
    const summary = rewrites.get(clause.index);
    if (summary && secondPass.get(String(clause.index))?.length === 0) result.set(clause.index, { summary, kind: 'ai_verified' });
    else result.set(clause.index, { summary: clauseExcerpt(clause.text), kind: 'excerpt' });
  }
  return result;
}
