import { Type } from '@google/genai';
import { z } from 'zod';
import { AppError } from '../../errors/AppError';
import { ClauseModel } from '../../models/clause.model';
import { ContractModel } from '../../models/contract.model';
import { generateJson } from '../ai/llm.service';
import { describeReviewContext, ReviewContext } from '../contract/contractProfile.service';
import { placeholderInstruction, Redactor } from '../ai/redaction.service';
import { getCurrentVersion } from '../contract/contractVersion.service';
import { KEY_TERMS, KEY_TERMS_BY_PROFILE, KeyTermDefinition } from './keyTermExtraction.data';

export interface ExtractedKeyTerm {
  key: string;
  numberValue?: number;
  booleanValue?: boolean;
  clauseIndex?: number;
  quote?: string;
}

const extractionSchema = z.object({
  terms: z
    .array(
      z.object({
        key: z.string(),
        numberValue: z.number().nullable().optional(),
        booleanValue: z.boolean().nullable().optional(),
        clauseIndex: z.number().int().nullable().optional(),
        quote: z.string().nullable().optional(),
      }),
    )
    .nullable()
    .optional(),
});

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    terms: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          key: { type: Type.STRING },
          numberValue: { type: Type.NUMBER, nullable: true },
          booleanValue: { type: Type.BOOLEAN, nullable: true },
          clauseIndex: { type: Type.INTEGER },
          quote: { type: Type.STRING },
        },
        required: ['key', 'clauseIndex', 'quote'],
      },
    },
  },
  required: ['terms'],
};

function buildPrompt(
  context: ReviewContext,
  definitions: KeyTermDefinition[],
  clauses: { index: number; text: string }[],
  redactionNote: string,
) {
  const termList = definitions
    .map((d) => `- key="${d.key}" (${d.type === 'number' ? 'numberValue' : 'booleanValue'}): ${d.description}`)
    .join('\n');
  const clauseList = clauses.map((c) => `[index=${c.index}] ${c.text}`).join('\n\n');

  return `You extract key terms from a Vietnamese contract so they can be checked against Vietnamese law by fixed rules.

${describeReviewContext(context)}

Terms to extract:
${termList}

Rules:
- Return a term only when the contract actually states it. Never guess or apply legal defaults; leave out terms the contract does not address.
- Put numbers in "numberValue" and true/false in "booleanValue", following each term's type.
- "clauseIndex" is the index of the clause that states the term.
- "quote" is the shortest exact sentence or phrase copied verbatim from that clause that states the term. It must appear word for word in the clause.
- Return each key at most once.${redactionNote}

Clauses:
"""
${clauseList}
"""`;
}

const normalizeForMatch = (value: string) => value.normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();

export async function extractKeyTerms(
  context: ReviewContext,
  clauses: { index: number; text: string }[],
  redactor: Redactor,
  signal?: AbortSignal,
): Promise<ExtractedKeyTerm[]> {
  const definitions = KEY_TERMS_BY_PROFILE[context.profileCode] ?? [];
  if (definitions.length === 0 || clauses.length === 0) return [];

  const raw = await generateJson(
    buildPrompt(
      context,
      definitions,
      clauses.map((c) => ({ index: c.index, text: redactor.mask(c.text) })),
      placeholderInstruction(redactor),
    ),
    responseSchema,
    signal,
  );
  const parsed = extractionSchema.safeParse(raw);
  if (!parsed.success) {
    throw AppError.internal('LLM returned an unexpected key term format.');
  }

  const definitionByKey = new Map(definitions.map((d) => [d.key, d]));
  const clauseTextByIndex = new Map(clauses.map((c) => [c.index, normalizeForMatch(c.text)]));
  const terms = new Map<string, ExtractedKeyTerm>();

  for (const item of parsed.data.terms ?? []) {
    const definition = definitionByKey.get(item.key);
    if (!definition || terms.has(item.key)) continue;
    const quote = item.quote ? redactor.unmask(item.quote).trim() : '';
    const clauseText = item.clauseIndex == null ? undefined : clauseTextByIndex.get(item.clauseIndex);
    if (!quote || !clauseText || !clauseText.includes(normalizeForMatch(quote))) continue;

    if (definition.type === 'number') {
      const value = item.numberValue;
      if (typeof value !== 'number' || !Number.isFinite(value)) continue;
      if ((definition.min !== undefined && value < definition.min) || (definition.max !== undefined && value > definition.max)) continue;
      terms.set(item.key, { key: item.key, numberValue: value, clauseIndex: item.clauseIndex!, quote });
    } else {
      if (typeof item.booleanValue !== 'boolean') continue;
      terms.set(item.key, { key: item.key, booleanValue: item.booleanValue, clauseIndex: item.clauseIndex!, quote });
    }
  }

  for (const definition of definitions) {
    if (definition.absentValue !== undefined && !terms.has(definition.key)) {
      terms.set(definition.key, { key: definition.key, booleanValue: definition.absentValue });
    }
  }
  return [...terms.values()];
}

export async function listKeyTerms(orgId: string, contractId: string) {
  const contract = await ContractModel.findOne({ _id: contractId, orgId });
  if (!contract) throw AppError.notFound('Contract not found');
  const version = await getCurrentVersion(contractId);
  const terms = version.keyTerms ?? [];
  const clauseIds = terms.flatMap((t) => (t.clauseId ? [t.clauseId] : []));
  const clauses = clauseIds.length
    ? await ClauseModel.find({ _id: { $in: clauseIds } }).select('index title')
    : [];
  const clauseById = new Map(clauses.map((c) => [c._id.toString(), c]));
  const labelOf = (key: string) => (KEY_TERMS as Record<string, { label: string }>)[key]?.label ?? key;

  return {
    extractedAt: version.keyTermsExtractedAt ?? null,
    terms: terms.map((t) => {
      const clause = t.clauseId ? clauseById.get(t.clauseId.toString()) : undefined;
      return {
        key: t.key,
        label: labelOf(t.key),
        value: t.numberValue ?? t.booleanValue ?? null,
        inferredFromSilence: !t.clauseId,
        clause: clause ? { index: clause.index, title: clause.title ?? null } : null,
        quote: t.quote ?? null,
      };
    }),
  };
}
