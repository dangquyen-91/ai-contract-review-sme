import { Schema, Type } from '@google/genai';
import { z } from 'zod';
import { describeReviewContext, ReviewContext } from '../contract/contractProfile.service';
import { placeholderInstruction, Redactor } from '../ai/redaction.service';
import { askJson } from '../playbook/playbookEvidence.service';
import { locateQuote } from '../playbook/quoteMatching';
import { checkFaithfulness } from './summaryGrounding.service';

export interface SummaryClause {
  index: number;
  text: string;
  startOffset: number;
}

export interface SummarySource {
  pointIndex: number;
  clauseIndex: number;
  quote: string;
  startOffset: number;
  endOffset: number;
}

export interface ContractSummary {
  points: string[];
  sources: SummarySource[];
}

const MAX_POINTS = 5;
const QUOTE_BREAK = /\s*(?:\.{3,}|…)\s*|\n+/u;

const pointsParser = z.object({
  points: z.array(
    z.object({
      text: z.string().min(1),
      sources: z.array(z.object({ clauseIndex: z.number().int(), quote: z.string().min(1) })).nullable().optional(),
    }),
  ),
});

const pointsResponse: Schema = {
  type: Type.OBJECT,
  properties: {
    points: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          sources: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { clauseIndex: { type: Type.INTEGER }, quote: { type: Type.STRING } },
              required: ['clauseIndex', 'quote'],
            },
          },
        },
        required: ['text', 'sources'],
      },
    },
  },
  required: ['points'],
};

const GROUNDING_RULES = `Rules for every point:
- State only what the contract text says. Plain rewording is fine, but never add a condition, consequence or fact, and never make vague wording precise: keep words such as "hợp lý" or "kịp thời" as they are.
- Keep every number exactly as the contract writes it.
- "sources": 1-4 items, each with the "clauseIndex" and a "quote" copied word for word from that clause (one continuous passage) that states what the point says. When a point draws on separate passages, give each passage as its own source item; never join passages with "...".
- Do not analyze risk here (that is done separately).`;

function summaryPrompt(context: ReviewContext, clauses: SummaryClause[], analysisFocus: string | undefined, redactor: Redactor) {
  const focusBlock = analysisFocus
    ? `\nThe user asked for this analysis direction, so emphasize the parts relevant to it: "${redactor.mask(analysisFocus)}"`
    : '';
  return `You write a plain-language overview of a Vietnamese contract for a reader with no legal background. The key figures (amounts, dates, rates) are listed separately, so explain what the contract is about instead of restating its terms one by one.

${describeReviewContext(context)}

Write 3-${MAX_POINTS} Vietnamese points with full diacritics ("points"). Each point is one or two short sentences that combine related clauses into one idea, in this order when the contract covers them:
- what the contract is for and between whom;
- what each party mainly commits to, and what it gets in return (give the main amount or period only when it is essential to the idea);
- the main working, delivery or service arrangements typical of this kind of contract;
- how long the contract lasts and how it can end or be renewed.
Do not copy clauses one by one and do not list every figure - synthesize. When the user's party is known, address the user as "bạn" for that party (for example "Bạn được hưởng ...", "Bạn phải ..."); otherwise name the parties.${focusBlock}

${GROUNDING_RULES}${placeholderInstruction(redactor)}

Contract:
"""
${clauses.map((clause) => `[index=${clause.index}] ${redactor.mask(clause.text)}`).join('\n\n')}
"""`;
}

function rewritePrompt(
  context: ReviewContext,
  clauses: SummaryClause[],
  rejected: { text: string; problems: string[] }[],
  redactor: Redactor,
) {
  return `Some points of a plain-language overview of a Vietnamese contract were rejected because they did not match the contract text. Write one replacement point for each rejected point, about the same topic and in the same plain, synthesized style, that states only what the contract says and cites every passage it relies on.

${describeReviewContext(context)}

Rejected points:
${rejected.map((item, i) => `${i + 1}. "${redactor.mask(item.text)}" - reasons: ${item.problems.join('; ')}`).join('\n')}

${GROUNDING_RULES}${placeholderInstruction(redactor)}

Contract:
"""
${clauses.map((clause) => `[index=${clause.index}] ${redactor.mask(clause.text)}`).join('\n\n')}
"""`;
}

interface Candidate {
  text: string;
  sources: Omit<SummarySource, 'pointIndex'>[];
}

function locateSources(
  raw: z.infer<typeof pointsParser>['points'][number],
  clauses: SummaryClause[],
  redactor: Redactor,
): Candidate {
  const fragments = (raw.sources ?? []).flatMap((source) =>
    redactor
      .unmask(source.quote)
      .split(QUOTE_BREAK)
      .map((quote) => ({ clauseIndex: source.clauseIndex, quote: quote.trim() }))
      .filter((fragment) => fragment.quote.length > 0),
  );
  const sources = fragments.flatMap((source) => {
    const quote = source.quote;
    const preferred = clauses.find((clause) => clause.index === source.clauseIndex);
    const ordered = preferred ? [preferred, ...clauses.filter((clause) => clause !== preferred)] : clauses;
    for (const clause of ordered) {
      const location = locateQuote(clause.text, quote, { fuzzy: clause === preferred });
      if (location) {
        return [
          {
            clauseIndex: clause.index,
            quote: clause.text.slice(location.start, location.end),
            startOffset: clause.startOffset + location.start,
            endOffset: clause.startOffset + location.end,
          },
        ];
      }
    }
    return [];
  });
  return { text: redactor.unmask(raw.text).trim(), sources };
}

async function screen(candidates: Candidate[], clauses: SummaryClause[], redactor: Redactor, signal?: AbortSignal) {
  const withSources = candidates.map((candidate, i) => ({ id: String(i), candidate }));
  const preamble = clauses[0];
  const citedText = (candidate: Candidate) => {
    const indexes = new Set([preamble?.index, ...candidate.sources.map((source) => source.clauseIndex)]);
    return clauses.filter((clause) => indexes.has(clause.index)).map((clause) => clause.text);
  };
  const problems = await checkFaithfulness(
    withSources
      .filter(({ candidate }) => candidate.sources.length > 0)
      .map(({ id, candidate }) => ({ id, text: candidate.text, sources: citedText(candidate) })),
    redactor,
    signal,
  );
  return withSources.map(({ id, candidate }) => ({
    candidate,
    problems: candidate.sources.length === 0 ? ['không có câu trích nào khớp nguyên văn hợp đồng'] : (problems.get(id) ?? []),
  }));
}

export async function summarizeContract(
  context: ReviewContext,
  clauses: SummaryClause[],
  analysisFocus: string | undefined,
  redactor: Redactor,
  signal?: AbortSignal,
): Promise<ContractSummary> {
  const first = await askJson(summaryPrompt(context, clauses, analysisFocus, redactor), pointsResponse, pointsParser, signal);
  const screened = await screen(
    first.points.slice(0, MAX_POINTS).map((point) => locateSources(point, clauses, redactor)),
    clauses,
    redactor,
    signal,
  );

  const rejected = screened.filter((item) => item.problems.length > 0);
  let replacements: { candidate: Candidate; problems: string[] }[] = [];
  if (rejected.length > 0) {
    signal?.throwIfAborted();
    const second = await askJson(
      rewritePrompt(context, clauses, rejected.map((item) => ({ text: item.candidate.text, problems: item.problems })), redactor),
      pointsResponse,
      pointsParser,
      signal,
    );
    replacements = await screen(
      second.points.slice(0, rejected.length).map((point) => locateSources(point, clauses, redactor)),
      clauses,
      redactor,
      signal,
    );
  }

  const accepted: Candidate[] = [];
  let replacementCursor = 0;
  for (const item of screened) {
    if (item.problems.length === 0) {
      accepted.push(item.candidate);
      continue;
    }
    const replacement = replacements[replacementCursor++];
    if (replacement && replacement.problems.length === 0) accepted.push(replacement.candidate);
  }

  return {
    points: accepted.map((candidate) => candidate.text),
    sources: accepted.flatMap((candidate, pointIndex) => candidate.sources.map((source) => ({ pointIndex, ...source }))),
  };
}
