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
- "sources": 1-3 items, each with the "clauseIndex" and a "quote" copied word for word from that clause (one continuous passage) that states what the point says.
- Do not analyze risk here (that is done separately).`;

function summaryPrompt(context: ReviewContext, clauses: SummaryClause[], analysisFocus: string | undefined, redactor: Redactor) {
  const focusBlock = analysisFocus
    ? `\nThe user asked for this analysis direction, so emphasize the parts relevant to it: "${redactor.mask(analysisFocus)}"`
    : '';
  return `You write a plain-language overview of a Vietnamese contract for a reader with no legal background.

${describeReviewContext(context)}

Write 3-${MAX_POINTS} Vietnamese points with full diacritics ("points"), each one or two short sentences, covering: the purpose of the contract and the parties, the money involved (value, price, deposit, payment schedule), the duration and key dates, and how the contract ends or renews if stated.${focusBlock}

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
  return `Some points of a plain-language overview of a Vietnamese contract were rejected because they did not match the contract text. Write one replacement point for each rejected point, about the same topic, that states only what the contract says.

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
  const sources = (raw.sources ?? []).flatMap((source) => {
    const quote = redactor.unmask(source.quote).trim();
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

async function screen(candidates: Candidate[], redactor: Redactor, signal?: AbortSignal) {
  const withSources = candidates.map((candidate, i) => ({ id: String(i), candidate }));
  const problems = await checkFaithfulness(
    withSources
      .filter(({ candidate }) => candidate.sources.length > 0)
      .map(({ id, candidate }) => ({ id, text: candidate.text, sources: candidate.sources.map((source) => source.quote) })),
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
