import { Schema, Type } from '@google/genai';
import { z } from 'zod';
import { AppError } from '../../errors/AppError';
import type { ClauseCategory } from '../../models/clauseTypeTaxonomy.model';
import { generateJson } from '../ai/llm.service';
import { placeholderInstruction, Redactor } from '../ai/redaction.service';
import { describeReviewContext, ReviewContext } from '../contract/contractProfile.service';
import { applicableChecks, fieldsUsedBy, getClausePlaybook, getContractPlaybook } from './playbook.service';
import {
  CONTRACT_FACTS,
  ClausePlaybook,
  ContractFact,
  FieldKind,
  NUMERIC_FIELD_KINDS,
  PlaybookCheck,
  PlaybookField,
} from './playbookSchema';
import { foldForMatch, locateQuote } from './quoteMatching';
import { containsBlank } from './blanks';
import { numberSupportedByQuote, numericCandidates, textSupportedByQuote } from './valueSupport';

export interface EvidenceClause {
  index: number;
  text: string;
  startOffset: number;
  clauseTypes: ClauseCategory[];
}

export type FieldState = 'stated' | 'deferred' | 'absent' | 'uncertain';
export type UncertainReason = 'quote_not_found' | 'value_not_supported';

export interface FieldEvidence {
  key: string;
  state: FieldState;
  value?: string | number | boolean;
  quote?: string;
  clauseIndex?: number;
  startOffset?: number;
  endOffset?: number;
  exactQuote?: boolean;
  foundBy?: 'clause' | 'contract_search';
  uncertainReason?: UncertainReason;
  blank?: boolean;
  conflicts?: FieldEvidence[];
}

export interface PlaybookEvidence {
  playbook: ClausePlaybook;
  clauseIndexes: number[];
  fields: Record<string, FieldEvidence>;
}

export type FactValue = boolean | 'unknown';

export interface FactEvidence {
  fact: ContractFact;
  value: FactValue;
  quote?: string;
  clauseIndex?: number;
  startOffset?: number;
  endOffset?: number;
}

export interface ClauseCoverage {
  clauseIndex: number;
  quote: string;
  startOffset: number;
  endOffset: number;
}

export interface ContractEvidence {
  playbooks: PlaybookEvidence[];
  contractFields: Record<string, FieldEvidence>;
  facts: Partial<Record<ContractFact, FactEvidence>>;
  clauseCoverage: Partial<Record<ClauseCategory, ClauseCoverage>>;
}

export interface CollectEvidenceInput {
  context: ReviewContext;
  clauses: EvidenceClause[];
  redactor: Redactor;
  signal?: AbortSignal;
}

const MAX_BATCH_ITEMS = 10;
const MAX_BATCH_CHARS = 15000;
const BATCH_CONCURRENCY = 3;
const MAX_SEARCH_REQUESTS = 40;
const MAX_VERIFY_ITEMS = 60;

function neededFields(fields: PlaybookField[], checks: PlaybookCheck[]) {
  const used = new Set(checks.flatMap((check) => fieldsUsedBy(check.test).map((use) => use.field)));
  return fields.filter((field) => used.has(field.key));
}

export function factsUsedBy(checks: PlaybookCheck[], contractType: string): ContractFact[] {
  const facts = new Set<ContractFact>();
  for (const check of checks) {
    for (const fact of check.appliesTo.facts ?? []) facts.add(fact);
    if (check.test.kind === 'at_most_tiered') for (const tier of check.test.tiers) for (const fact of tier.facts) facts.add(fact);
    for (const rule of check.fallbackRules ?? []) {
      if (rule.contractTypes.includes(contractType)) for (const fact of rule.facts ?? []) facts.add(fact);
    }
  }
  return [...facts];
}

const UNIT_GUIDE: Partial<Record<FieldKind, string>> = {
  money: 'a number: the amount as written (in dong when the contract uses dong)',
  number: 'a plain number',
  percent: 'a percentage number, for example 12 for 12%',
  interest_rate: 'a percentage per year: a daily rate times 365, a monthly rate times 12',
  months: 'a number of months (a year = 12)',
  days: 'a number of days (a month = 30, a week = 7; working days count as days)',
  hours: 'a number of hours',
};

const valueSlot = (kind: FieldKind) =>
  kind === 'boolean' ? 'booleanValue (true/false)' : NUMERIC_FIELD_KINDS.includes(kind) ? `numberValue (${UNIT_GUIDE[kind]})` : 'value (the exact words)';

const fieldLine = (field: PlaybookField, id = field.key) =>
  `- key="${id}" → ${valueSlot(field.kind)}${field.deferrable ? ', deferrable' : ''}: ${field.extraction}`;

const rawFieldSchema = z.object({
  key: z.string(),
  state: z.enum(['stated', 'deferred', 'absent', 'blank']),
  quote: z.string().nullable().optional(),
  value: z.string().nullable().optional(),
  numberValue: z.number().nullable().optional(),
  booleanValue: z.boolean().nullable().optional(),
});
type RawField = z.infer<typeof rawFieldSchema>;

const rawFieldResponse: Schema = {
  type: Type.OBJECT,
  properties: {
    key: { type: Type.STRING },
    state: { type: Type.STRING, enum: ['stated', 'deferred', 'absent', 'blank'] },
    quote: { type: Type.STRING, nullable: true },
    value: { type: Type.STRING, nullable: true },
    numberValue: { type: Type.NUMBER, nullable: true },
    booleanValue: { type: Type.BOOLEAN, nullable: true },
  },
  required: ['key', 'state', 'quote'],
};

const clauseBatchParser = z.object({
  items: z.array(z.object({ itemId: z.number().int(), fields: z.array(rawFieldSchema) })),
});

const clauseBatchResponse: Schema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { itemId: { type: Type.INTEGER }, fields: { type: Type.ARRAY, items: rawFieldResponse } },
        required: ['itemId', 'fields'],
      },
    },
  },
  required: ['items'],
};

const searchParser = z.object({
  fields: z.array(rawFieldSchema.extend({ clauseIndex: z.number().int().nullable().optional() })).nullable().optional(),
  facts: z
    .array(
      z.object({
        fact: z.string(),
        value: z.enum(['true', 'false', 'unknown']),
        clauseIndex: z.number().int().nullable().optional(),
        quote: z.string().nullable().optional(),
      }),
    )
    .nullable()
    .optional(),
  coverage: z
    .array(
      z.object({
        id: z.string(),
        covered: z.boolean(),
        clauseIndex: z.number().int().nullable().optional(),
        quote: z.string().nullable().optional(),
      }),
    )
    .nullable()
    .optional(),
});

const searchResponse: Schema = {
  type: Type.OBJECT,
  properties: {
    fields: {
      type: Type.ARRAY,
      items: {
        ...rawFieldResponse,
        properties: { ...rawFieldResponse.properties, clauseIndex: { type: Type.INTEGER, nullable: true } },
      },
    },
    facts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          fact: { type: Type.STRING },
          value: { type: Type.STRING, enum: ['true', 'false', 'unknown'] },
          clauseIndex: { type: Type.INTEGER, nullable: true },
          quote: { type: Type.STRING, nullable: true },
        },
        required: ['fact', 'value'],
      },
    },
    coverage: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          covered: { type: Type.BOOLEAN },
          clauseIndex: { type: Type.INTEGER, nullable: true },
          quote: { type: Type.STRING, nullable: true },
        },
        required: ['id', 'covered'],
      },
    },
  },
  required: ['fields', 'facts', 'coverage'],
};

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

export async function askJson<T>(prompt: string, schema: Schema, parser: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const parsed = parser.safeParse(await generateJson(prompt, schema, signal));
    if (parsed.success) return parsed.data;
    if (attempt >= 2) throw AppError.internal('LLM returned an unexpected playbook extraction format.');
  }
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T, signal: AbortSignal) => Promise<R>,
  parentSignal?: AbortSignal,
): Promise<R[]> {
  const controller = new AbortController();
  const abortFromParent = () => controller.abort(parentSignal?.reason);
  parentSignal?.addEventListener('abort', abortFromParent, { once: true });
  if (parentSignal?.aborted) abortFromParent();
  const results = new Array<R>(items.length);
  let next = 0;
  try {
    await Promise.all(
      Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (next < items.length && !controller.signal.aborted) {
          const index = next++;
          try {
            results[index] = await task(items[index], controller.signal);
          } catch (err) {
            controller.abort(err);
            throw err;
          }
        }
      }),
    );
    controller.signal.throwIfAborted();
    return results;
  } finally {
    parentSignal?.removeEventListener('abort', abortFromParent);
  }
}

const RULES_BLOCK = `Rules:
- Only report what the contract text says. Never apply legal defaults, never guess, never judge whether a term is fair or lawful.
- Every "stated" or "deferred" field MUST have a "quote": the shortest sentence or phrase copied word for word from the contract that states the information, including for number and true/false fields. It must appear verbatim in the text as ONE continuous passage: never join separate parts with "..." or "…"; if the information is spread out, quote the single most relevant passage. Use null only for "absent".
- A true/false field is "stated" only when the text says so; if the text is silent, the field is "absent", not false.
- For text fields, "value" uses the exact words of the contract. For number fields, follow the unit given for the field.
- "blank" when the contract has a place for this information but leaves it to be filled in with dots or underscores (for example "Mức lương: .............. đồng"); quote that line. When the information is written and only another part of the line is blank, the field is "stated".
- "deferred" is only for fields marked deferrable, when the text explicitly says the information is fixed in another document (an appendix, a purchase order, a price list); quote that reference.`;

interface ClauseItem {
  itemId: number;
  clause: EvidenceClause;
  playbook: ClausePlaybook;
  fields: PlaybookField[];
}

function buildClauseBatchPrompt(context: ReviewContext, items: ClauseItem[], redactor: Redactor) {
  const blocks = items.map(
    (item) =>
      `[itemId=${item.itemId}] Clause index=${item.clause.index}, read as "${item.playbook.title}":\n"""\n${redactor.mask(item.clause.text)}\n"""\nFields:\n${item.fields.map((field) => fieldLine(field)).join('\n')}`,
  );
  return `You extract information from clauses of a Vietnamese contract into fixed fields.

${describeReviewContext(context)}

For every field of every item, return "state": "stated" when that clause itself states the information, "deferred" or "blank" (see rules), or "absent" when that clause does not state it. Use only the clause of the item, not other clauses.
${RULES_BLOCK}
- Return every field of every item exactly once.${placeholderInstruction(redactor)}

${blocks.join('\n\n')}`;
}

function toBatches(items: ClauseItem[], redactor: Redactor): ClauseItem[][] {
  const batches: ClauseItem[][] = [];
  let current: ClauseItem[] = [];
  let chars = 0;
  for (const item of items) {
    const size = redactor.mask(item.clause.text).length;
    if (current.length > 0 && (current.length >= MAX_BATCH_ITEMS || chars + size > MAX_BATCH_CHARS)) {
      batches.push(current);
      current = [];
      chars = 0;
    }
    current.push(item);
    chars += size;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

interface Located {
  clause: EvidenceClause;
  start: number;
  end: number;
  exact: boolean;
}

const quoteFragments = (quote: string) =>
  quote
    .split(/\s*(?:\.{3,}|…)\s*/)
    .map((part) => part.trim())
    .filter((part) => foldForMatch(part).length >= 4);

function locateFragmentsInClause(clause: EvidenceClause, fragments: string[], fuzzy: boolean): Located | null {
  let cursor = 0;
  let first: Located | null = null;
  let end = 0;
  for (const fragment of fragments) {
    const location = locateQuote(clause.text.slice(cursor), fragment, { fuzzy });
    if (!location) return null;
    const start = cursor + location.start;
    cursor = cursor + location.end;
    first ??= { clause, start, end: cursor, exact: false };
    end = cursor;
  }
  return first && { ...first, end };
}

function locateInClause(clause: EvidenceClause, quote: string, fuzzy = true): Located | null {
  const location = locateQuote(clause.text, quote, { fuzzy });
  if (location) return { clause, ...location };
  const fragments = quoteFragments(quote);
  return fragments.length > 1 ? locateFragmentsInClause(clause, fragments, fuzzy) : null;
}

function locateInContract(clauses: EvidenceClause[], quote: string, clauseIndex?: number | null): Located | null {
  const preferred = clauses.find((clause) => clause.index === clauseIndex);
  const fromPreferred = preferred && locateInClause(preferred, quote);
  if (fromPreferred) return fromPreferred;
  for (const clause of clauses) {
    const location = locateInClause(clause, quote, false);
    if (location) return location;
  }
  const fragments = quoteFragments(quote);
  if (fragments.length < 2) return null;
  const located = fragments.map((fragment) => {
    for (const clause of clauses) {
      const location = locateQuote(clause.text, fragment, { fuzzy: false });
      if (location) return { clause, ...location, exact: false };
    }
    return null;
  });
  return located.every(Boolean) ? located[0] : null;
}

interface PendingClaim {
  id: string;
  quote: string;
  claim: string;
  apply: (verdict: 'supported' | 'contradicted' | 'unclear') => void;
}

interface Acceptance {
  evidence: FieldEvidence;
  pending?: Omit<PendingClaim, 'id' | 'apply'>;
}

function fieldClaim(field: PlaybookField, value: number | boolean) {
  const stated = typeof value === 'boolean' ? (value ? 'TRUE' : 'FALSE') : `equal to ${value}`;
  return `For this contract, the field "${field.label}" (meaning: ${field.extraction}) is ${stated}.`;
}

function acceptField(
  raw: RawField,
  field: PlaybookField,
  locate: (quote: string) => Located | null,
  redactor: Redactor,
  foundBy: FieldEvidence['foundBy'],
): Acceptance | null {
  if (raw.state === 'absent' || (raw.state === 'deferred' && !field.deferrable)) return null;
  if (raw.state === 'blank') {
    const blankQuote = raw.quote ? redactor.unmask(raw.quote).trim() : '';
    const blankLocated = blankQuote ? locate(blankQuote) : null;
    if (!blankLocated) return null;
    const blankOriginal = blankLocated.clause.text.slice(blankLocated.start, blankLocated.end);
    if (!containsBlank(blankOriginal)) return null;
    return {
      evidence: {
        key: field.key,
        state: 'absent',
        blank: true,
        quote: blankOriginal,
        clauseIndex: blankLocated.clause.index,
        startOffset: blankLocated.clause.startOffset + blankLocated.start,
        endOffset: blankLocated.clause.startOffset + blankLocated.end,
        exactQuote: blankLocated.exact,
        foundBy,
      },
    };
  }
  const textKind = field.kind !== 'boolean' && !NUMERIC_FIELD_KINDS.includes(field.kind);
  const quoteSource = raw.quote || (textKind ? raw.value : null);
  const quote = quoteSource ? redactor.unmask(quoteSource).trim() : '';
  const located = quote ? locate(quote) : null;
  if (!located) return null;

  const original = located.clause.text.slice(located.start, located.end);
  const base: FieldEvidence = {
    key: field.key,
    state: raw.state,
    quote: original,
    clauseIndex: located.clause.index,
    startOffset: located.clause.startOffset + located.start,
    endOffset: located.clause.startOffset + located.end,
    exactQuote: located.exact,
    foundBy,
  };
  if (raw.state === 'deferred') return { evidence: { ...base, value: original } };
  const blankField = { evidence: { ...base, state: 'absent' as const, blank: true } };

  if (field.kind === 'boolean') {
    if (typeof raw.booleanValue !== 'boolean') return null;
    const evidence = { ...base, value: raw.booleanValue };
    return { evidence, pending: { quote: original, claim: fieldClaim(field, raw.booleanValue) } };
  }

  if (NUMERIC_FIELD_KINDS.includes(field.kind)) {
    const candidates = numericCandidates(field.kind, original);
    const value = typeof raw.numberValue === 'number' && Number.isFinite(raw.numberValue)
      ? raw.numberValue
      : candidates.length === 1
        ? candidates[0]
        : undefined;
    if (value === undefined) {
      if (containsBlank(original)) return blankField;
      return { evidence: { ...base, state: 'uncertain', uncertainReason: 'value_not_supported' } };
    }
    const evidence = { ...base, value };
    if (numberSupportedByQuote(field.kind, original, value)) return { evidence };
    return { evidence, pending: { quote: original, claim: fieldClaim(field, value) } };
  }

  const text = raw.value ? redactor.unmask(raw.value).trim() : '';
  const supported = text && textSupportedByQuote(original, text);
  if (supported && containsBlank(text)) return blankField;
  return { evidence: { ...base, value: supported ? text : original } };
}

const STATE_RANK: Record<FieldState, number> = { stated: 3, deferred: 2, uncertain: 1, absent: 0 };

function mergeFieldEvidence(key: string, candidates: FieldEvidence[]): FieldEvidence {
  const ranked = [...candidates].sort((a, b) => STATE_RANK[b.state] - STATE_RANK[a.state] || (a.clauseIndex ?? 0) - (b.clauseIndex ?? 0));
  const best = ranked[0];
  if (!best) return { key, state: 'absent' };
  const conflicts = ranked.filter(
    (other) => other !== best && other.state === 'stated' && best.state === 'stated' && String(other.value) !== String(best.value),
  );
  return conflicts.length ? { ...best, conflicts } : best;
}

function searchPrompt(
  context: ReviewContext,
  clauses: EvidenceClause[],
  requests: { id: string; field: PlaybookField; scope: string }[],
  facts: ContractFact[],
  coverage: { id: ClauseCategory; topic: string }[],
  redactor: Redactor,
) {
  const contract = clauses.map((clause) => `[index=${clause.index}] ${redactor.mask(clause.text)}`).join('\n\n');
  const coverageBlock = coverage.length
    ? `Task 3, "coverage": the topics below were not found as separate clauses. For each topic id, set "covered" to true only if some clause actually sets out the parties' terms on that topic (a passing mention is not enough), with its "clauseIndex" and a verbatim "quote" showing those terms; otherwise false.\n${coverage
        .map((item) => `- id="${item.id}": ${item.topic}`)
        .join('\n')}`
    : 'Task 3, "coverage": return an empty array.';
  const requestBlock = requests.length
    ? `Task 1, "fields": search the WHOLE contract for each request and return one item per request with "key" set to the request key, "state", "clauseIndex" of the clause containing the quote, "quote" and the value.\n${requests
        .map((request) => `${fieldLine(request.field, request.id)} (about: ${request.scope})`)
        .join('\n')}`
    : 'Task 1, "fields": return an empty array.';
  const factBlock = facts.length
    ? `Task 2, "facts": for each fact decide "true" or "false" only when the contract text shows it, otherwise "unknown". For "true" or "false" give "clauseIndex" and a verbatim "quote" that shows it.\n${facts
        .map((fact) => `- fact="${fact}": ${CONTRACT_FACTS[fact].extraction}`)
        .join('\n')}`
    : 'Task 2, "facts": return an empty array.';
  return `You look up information in a whole Vietnamese contract.

${describeReviewContext(context)}

${requestBlock}

${factBlock}

${coverageBlock}

${RULES_BLOCK}${placeholderInstruction(redactor)}

Contract:
"""
${contract}
"""`;
}

function verifyPrompt(items: PendingClaim[], redactor: Redactor) {
  return `You check claims against quotes from a Vietnamese contract. Judge each item using ONLY its quote:
- "supported" when the quote clearly establishes the claim,
- "contradicted" when the quote shows the claim is false,
- "unclear" when the quote alone does not settle it.
Return one verdict per item id.${placeholderInstruction(redactor)}

${items.map((item) => `[id=${item.id}] Quote: "${redactor.mask(item.quote)}"\nClaim: ${item.claim}`).join('\n\n')}`;
}

const chunk = <T>(items: T[], size: number) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));

export async function collectContractEvidence({
  context,
  clauses,
  redactor,
  signal,
}: CollectEvidenceInput): Promise<ContractEvidence> {
  const contractType = context.profileCode;
  const pending: PendingClaim[] = [];
  const queueClaim = (claim: Omit<PendingClaim, 'id'>) => pending.push({ ...claim, id: `c${pending.length + 1}` });

  const groups = new Map<ClausePlaybook, { clauses: EvidenceClause[]; fields: PlaybookField[]; checks: PlaybookCheck[] }>();
  for (const clause of clauses) {
    for (const type of clause.clauseTypes) {
      const playbook = getClausePlaybook(type);
      if (!playbook) continue;
      let group = groups.get(playbook);
      if (!group) {
        const checks = applicableChecks(playbook.checks, contractType);
        group = { clauses: [], fields: neededFields(playbook.fields, checks), checks };
        groups.set(playbook, group);
      }
      if (!group.clauses.includes(clause)) group.clauses.push(clause);
    }
  }

  let itemId = 0;
  const items: ClauseItem[] = [];
  for (const [playbook, group] of groups) {
    if (group.fields.length === 0) continue;
    for (const clause of group.clauses) items.push({ itemId: ++itemId, clause, playbook, fields: group.fields });
  }

  const candidatesByGroup = new Map<ClausePlaybook, Map<string, FieldEvidence[]>>();
  const addCandidate = (playbook: ClausePlaybook, evidence: FieldEvidence) => {
    const byKey = candidatesByGroup.get(playbook) ?? new Map<string, FieldEvidence[]>();
    byKey.set(evidence.key, [...(byKey.get(evidence.key) ?? []), evidence]);
    candidatesByGroup.set(playbook, byKey);
  };
  const keepAcceptance = (playbook: ClausePlaybook | null, acceptance: Acceptance, sink?: Record<string, FieldEvidence>) => {
    const { evidence } = acceptance;
    if (playbook) addCandidate(playbook, evidence);
    else if (sink) sink[evidence.key] = evidence;
    if (acceptance.pending) {
      queueClaim({
        ...acceptance.pending,
        apply: (verdict) => {
          if (verdict === 'supported') return;
          if (evidence.value === false || (evidence.value === true && verdict === 'contradicted')) {
            evidence.state = 'absent';
            delete evidence.value;
            return;
          }
          evidence.state = 'uncertain';
          evidence.uncertainReason = 'value_not_supported';
        },
      });
    }
  };

  const batchResults = await runWithConcurrency(
    toBatches(items, redactor),
    BATCH_CONCURRENCY,
    (batch, batchSignal) => askJson(buildClauseBatchPrompt(context, batch, redactor), clauseBatchResponse, clauseBatchParser, batchSignal),
    signal,
  );
  const itemById = new Map(items.map((item) => [item.itemId, item]));
  for (const result of batchResults.flatMap((batch) => batch.items)) {
    const item = itemById.get(result.itemId);
    if (!item) continue;
    for (const raw of result.fields) {
      const field = item.fields.find((f) => f.key === raw.key);
      if (!field) continue;
      const acceptance = acceptField(raw, field, (quote) => locateInClause(item.clause, quote), redactor, 'clause');
      if (acceptance) keepAcceptance(item.playbook, acceptance);
    }
  }

  const requests: { id: string; field: PlaybookField; scope: string; playbook: ClausePlaybook | null }[] = [];
  for (const [playbook, group] of groups) {
    const found = candidatesByGroup.get(playbook);
    for (const field of group.fields) {
      if (!found?.get(field.key)?.length) requests.push({ id: `${playbook.clauseTypes[0]}.${field.key}`, field, scope: playbook.title, playbook });
    }
  }
  const contractPlaybook = getContractPlaybook(contractType);
  const contractChecks = contractPlaybook ? applicableChecks(contractPlaybook.checks, contractType) : [];
  const contractFieldList = contractPlaybook ? neededFields(contractPlaybook.fields, contractChecks) : [];
  for (const field of contractFieldList) {
    requests.push({ id: `contract.${field.key}`, field, scope: 'the whole contract', playbook: null });
  }

  const allChecks = [...[...groups.values()].flatMap((group) => group.checks), ...contractChecks];
  const neededFacts = factsUsedBy(allChecks, contractType);
  const contractFields: Record<string, FieldEvidence> = {};
  const facts: Partial<Record<ContractFact, FactEvidence>> = Object.fromEntries(
    neededFacts.map((fact) => [fact, { fact, value: 'unknown' as const }]),
  );

  const presentTypes = new Set(clauses.flatMap((clause) => clause.clauseTypes));
  const coverageRequests = contractChecks.flatMap((check) =>
    check.test.kind === 'clause_present' && !presentTypes.has(check.test.clauseType)
      ? [{ id: check.test.clauseType, topic: check.title }]
      : [],
  );
  const clauseCoverage: Partial<Record<ClauseCategory, ClauseCoverage>> = {};

  const requestChunks = requests.length
    ? chunk(requests, MAX_SEARCH_REQUESTS)
    : neededFacts.length || coverageRequests.length
      ? [[]]
      : [];
  for (const [chunkIndex, requestChunk] of requestChunks.entries()) {
    signal?.throwIfAborted();
    const askFacts = chunkIndex === 0 ? neededFacts : [];
    const askCoverage = chunkIndex === 0 ? coverageRequests : [];
    if (requestChunk.length === 0 && askFacts.length === 0 && askCoverage.length === 0) continue;
    const result = await askJson(
      searchPrompt(context, clauses, requestChunk, askFacts, askCoverage, redactor),
      searchResponse,
      searchParser,
      signal,
    );
    const requestById = new Map(requestChunk.map((request) => [request.id, request]));
    for (const raw of result.fields ?? []) {
      const request = requestById.get(raw.key);
      if (!request) continue;
      requestById.delete(raw.key);
      const acceptance = acceptField(
        { ...raw, key: request.field.key },
        request.field,
        (quote) => locateInContract(clauses, quote, raw.clauseIndex),
        redactor,
        'contract_search',
      );
      if (acceptance) keepAcceptance(request.playbook, acceptance, contractFields);
      else if (raw.state !== 'absent' && raw.state !== 'blank' && !(raw.state === 'deferred' && !request.field.deferrable)) {
        const missing: FieldEvidence = { key: request.field.key, state: 'uncertain', uncertainReason: 'quote_not_found', foundBy: 'contract_search' };
        if (request.playbook) addCandidate(request.playbook, missing);
        else contractFields[missing.key] = missing;
      }
    }
    for (const raw of result.facts ?? []) {
      const fact = raw.fact as ContractFact;
      if (!(fact in facts) || raw.value === 'unknown') continue;
      const quote = raw.quote ? redactor.unmask(raw.quote).trim() : '';
      const located = quote ? locateInContract(clauses, quote, raw.clauseIndex) : null;
      if (!located) continue;
      const original = located.clause.text.slice(located.start, located.end);
      const evidence: FactEvidence = {
        fact,
        value: raw.value === 'true',
        quote: original,
        clauseIndex: located.clause.index,
        startOffset: located.clause.startOffset + located.start,
        endOffset: located.clause.startOffset + located.end,
      };
      facts[fact] = evidence;
      queueClaim({
        quote: original,
        claim: `It is ${raw.value === 'true' ? 'TRUE' : 'FALSE'} that: ${CONTRACT_FACTS[fact].extraction}`,
        apply: (verdict) => {
          if (verdict !== 'supported') facts[fact] = { fact, value: 'unknown' };
        },
      });
    }
    for (const raw of result.coverage ?? []) {
      const request = askCoverage.find((item) => item.id === raw.id);
      if (!request || !raw.covered) continue;
      const quote = raw.quote ? redactor.unmask(raw.quote).trim() : '';
      const located = quote ? locateInContract(clauses, quote, raw.clauseIndex) : null;
      if (!located) continue;
      const covered: ClauseCoverage = {
        clauseIndex: located.clause.index,
        quote: located.clause.text.slice(located.start, located.end),
        startOffset: located.clause.startOffset + located.start,
        endOffset: located.clause.startOffset + located.end,
      };
      clauseCoverage[request.id] = covered;
      queueClaim({
        quote: covered.quote,
        claim: `This text sets out the parties' terms on the following topic: ${request.topic}`,
        apply: (verdict) => {
          if (verdict !== 'supported') delete clauseCoverage[request.id];
        },
      });
    }
  }

  for (const claims of chunk(pending, MAX_VERIFY_ITEMS)) {
    signal?.throwIfAborted();
    const { verdicts } = await askJson(verifyPrompt(claims, redactor), verifyResponse, verifyParser, signal);
    const verdictById = new Map(verdicts.map((v) => [v.id, v.verdict]));
    for (const claim of claims) claim.apply(verdictById.get(claim.id) ?? 'unclear');
  }

  const playbooks: PlaybookEvidence[] = [...groups].map(([playbook, group]) => {
    const found = candidatesByGroup.get(playbook);
    return {
      playbook,
      clauseIndexes: group.clauses.map((clause) => clause.index),
      fields: Object.fromEntries(group.fields.map((field) => [field.key, mergeFieldEvidence(field.key, found?.get(field.key) ?? [])])),
    };
  });
  for (const field of contractFieldList) contractFields[field.key] ??= { key: field.key, state: 'absent' };

  return { playbooks, contractFields, facts, clauseCoverage };
}
