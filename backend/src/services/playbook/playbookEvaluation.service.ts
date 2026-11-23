import type { ClauseCategory } from '../../models/clauseTypeTaxonomy.model';
import { DOCUMENT_CHECKS, DocumentCheck, VAGUE_TERMS } from './documentChecks.data';
import { DocumentFinding, runDocumentChecks } from './documentChecks.service';
import {
  ArticleRefResult,
  ArticleRefStatus,
  getClausePlaybook,
  applicableChecks,
  getContractPlaybook,
  playbookArticleRefs,
  verifyPlaybookArticleRefs,
} from './playbook.service';
import {
  ContractEvidence,
  EvidenceClause,
  FactEvidence,
  FieldEvidence,
} from './playbookEvidence.service';
import {
  CheckBasis,
  CheckGroup,
  CONTRACT_FACTS,
  ContractFact,
  FAILED_CHECK_LABELS,
  FieldCondition,
  FieldKind,
  LegalArticleRef,
  LimitTier,
  NOT_CHECKED_LABEL,
  NUMERIC_FIELD_KINDS,
  PlaybookCheck,
  PlaybookField,
  UNVERIFIED_COMPLIANCE_LABEL,
} from './playbookSchema';
import { foldForMatch } from './quoteMatching';

export type CheckOutcome = 'passed' | 'failed' | 'not_applicable' | 'not_checked' | 'unverified';

export interface VerifiedArticle {
  ref: LegalArticleRef;
  status: ArticleRefStatus;
  chunkId?: string;
}

export interface CheckResult {
  code: string;
  group: CheckGroup;
  title: string;
  outcome: CheckOutcome;
  label?: string;
  clauseIndex?: number;
  neutral?: boolean;
  observed?: string | number | boolean;
  limit?: number;
  vagueTerm?: string;
  reason?: string;
  evidence: FieldEvidence[];
  fields: Record<string, FieldInfo>;
  conditions?: FieldCondition[];
  limitKind?: 'at_most' | 'at_least';
  facts: FactEvidence[];
  basis: CheckBasis;
  legalArticles: VerifiedArticle[];
  fallback?: { statement: string; article: VerifiedArticle };
  noVerifiedLegalBasis?: boolean;
  question?: string;
  whyItMatters: string;
  suggestion?: string;
  replacesRule?: string;
}

export interface FieldInfo {
  label: string;
  unit: string;
}

export interface DocumentCheckResult extends DocumentFinding {
  title: string;
  label: string;
  check: DocumentCheck;
}

export interface EvaluationCoverage {
  checks: number;
  passed: number;
  failed: number;
  notApplicable: number;
  notChecked: number;
  unverified: number;
  clauseTypesWithoutPlaybook: ClauseCategory[];
}

export interface PlaybookEvaluation {
  results: CheckResult[];
  documentFindings: DocumentCheckResult[];
  coverage: EvaluationCoverage;
}

export interface EvaluateInput {
  contractType: string;
  userParty?: string;
  clauses: EvidenceClause[];
  evidence: ContractEvidence;
}

type RawStatus = 'pass' | 'fail' | 'na' | 'unknown';

interface RawResult {
  status: RawStatus;
  used: FieldEvidence[];
  observed?: string | number | boolean;
  limit?: number;
  vagueTerm?: string;
  reason?: string;
}

const TEXT_KINDS = new Set(['text', 'date_or_event', 'party']);
const foldedVague = VAGUE_TERMS.map((term) => ({ term, folded: foldForMatch(term) }));
const UNIT_SUFFIX: Partial<Record<FieldKind, string>> = {
  percent: '%',
  interest_rate: '%/năm',
  months: ' tháng',
  days: ' ngày',
  hours: ' giờ',
};
const UNCERTAIN_REASON = 'Không xác minh được thông tin trích từ hợp đồng.';

function vagueTermIn(value: string): string | undefined {
  const folded = ` ${foldForMatch(value)} `;
  return foldedVague.find((entry) => folded.includes(` ${entry.folded} `))?.term;
}

type FactLookup = (fact: ContractFact) => boolean | 'unknown';

function conditionHolds(condition: FieldCondition, evidence: FieldEvidence): boolean | 'unknown' {
  if (evidence.state === 'uncertain') return 'unknown';
  switch (condition.op) {
    case 'not_stated':
      return evidence.state === 'absent' || (evidence.state === 'stated' && evidence.value === false);
    case 'is_true':
      return evidence.state === 'stated' && evidence.value === true;
    case 'greater_than':
      return evidence.state === 'stated' && typeof evidence.value === 'number' && evidence.value > condition.value;
    case 'less_than':
      return evidence.state === 'stated' && typeof evidence.value === 'number' && evidence.value < condition.value;
  }
}

function numericValue(evidence: FieldEvidence): number | 'absent' | 'unknown' {
  if (evidence.state === 'uncertain') return 'unknown';
  if (evidence.state !== 'stated' || typeof evidence.value !== 'number') return 'absent';
  return evidence.value;
}

function runTest(
  check: PlaybookCheck,
  fieldOf: (key: string) => FieldEvidence,
  definitionOf: (key: string) => PlaybookField | undefined,
  factOf: FactLookup,
  presentClauseTypes: Set<ClauseCategory>,
  evidence: ContractEvidence,
): RawResult {
  const test = check.test;
  switch (test.kind) {
    case 'stated': {
      const field = fieldOf(test.field);
      if (field.state === 'uncertain') return { status: 'unknown', used: [field], reason: UNCERTAIN_REASON };
      if (field.state === 'absent') return { status: 'fail', used: [field] };
      if (field.state === 'deferred') return { status: 'pass', used: [field], observed: field.value };
      const kind = definitionOf(test.field)?.kind;
      const vague =
        kind && TEXT_KINDS.has(kind) ? (vagueTermIn(String(field.value ?? '')) ?? vagueTermIn(field.quote ?? '')) : undefined;
      return vague ? { status: 'fail', used: [field], observed: field.value, vagueTerm: vague } : { status: 'pass', used: [field], observed: field.value };
    }
    case 'all_stated': {
      const used = test.fields.map(fieldOf);
      if (used.some((field) => field.state === 'absent')) return { status: 'fail', used };
      if (used.some((field) => field.state === 'uncertain')) return { status: 'unknown', used, reason: UNCERTAIN_REASON };
      return { status: 'pass', used };
    }
    case 'at_most':
    case 'at_least': {
      const field = fieldOf(test.field);
      const value = numericValue(field);
      if (value === 'unknown') return { status: 'unknown', used: [field], reason: UNCERTAIN_REASON };
      if (value === 'absent') return { status: 'na', used: [field] };
      const exceeded = test.kind === 'at_most' ? value > test.limit : value < test.limit;
      return { status: exceeded ? 'fail' : 'pass', used: [field], observed: value, limit: test.limit };
    }
    case 'at_most_tiered':
    case 'at_least_tiered': {
      const field = fieldOf(test.field);
      const value = numericValue(field);
      if (value === 'unknown') return { status: 'unknown', used: [field], reason: UNCERTAIN_REASON };
      if (value === 'absent') return { status: 'na', used: [field] };
      const atMost = test.kind === 'at_most_tiered';
      const breaches = (limit: number) => (atMost ? value > limit : value < limit);
      if (test.absoluteLimit !== undefined && breaches(test.absoluteLimit)) {
        return { status: 'fail', used: [field], observed: value, limit: test.absoluteLimit };
      }
      const possible: LimitTier[] = [];
      for (const tier of test.tiers) {
        const states = tier.facts.map(factOf);
        if (states.every((state) => state === true)) {
          return { status: breaches(tier.limit) ? 'fail' : 'pass', used: [field], observed: value, limit: tier.limit };
        }
        if (!states.includes(false)) possible.push(tier);
      }
      const limits = possible.map((tier) => tier.limit);
      if (possible.length === 0 || !breaches(atMost ? Math.min(...limits) : Math.max(...limits))) {
        return { status: 'pass', used: [field], observed: value, limit: test.absoluteLimit };
      }
      const unit = UNIT_SUFFIX[definitionOf(test.field)?.kind ?? 'text'] ?? '';
      const tiers = possible
        .map((tier) => `${tier.limit.toLocaleString('vi-VN')}${unit} nếu ${tier.facts.map((fact) => CONTRACT_FACTS[fact].label.charAt(0).toLocaleLowerCase('vi') + CONTRACT_FACTS[fact].label.slice(1)).join(' và ')}`)
        .join('; ');
      return {
        status: 'unknown',
        used: [field],
        observed: value,
        reason: `Hợp đồng ghi ${value.toLocaleString('vi-VN')}${unit}. Mức tối ${atMost ? 'đa' : 'thiểu'} tuỳ trường hợp: ${tiers}. Hợp đồng chưa cho biết trường hợp nào áp dụng.`,
      };
    }
    case 'fails_when_all': {
      const used = test.conditions.map((condition) => fieldOf(condition.field));
      const states = test.conditions.map((condition, i) => conditionHolds(condition, used[i]));
      if (states.includes(false)) return { status: 'pass', used };
      if (states.includes('unknown')) return { status: 'unknown', used, reason: UNCERTAIN_REASON };
      return { status: 'fail', used };
    }
    case 'clause_present': {
      const covered = presentClauseTypes.has(test.clauseType) || Boolean(evidence.clauseCoverage[test.clauseType]);
      return { status: covered ? 'pass' : 'fail', used: [] };
    }
  }
}

const refKey = (ref: LegalArticleRef) => `${ref.sourceCode}:${ref.article}:${ref.clause ?? ''}:${ref.verifyText}`;

function labelFor(group: CheckGroup, outcome: CheckOutcome) {
  if (outcome === 'failed') return FAILED_CHECK_LABELS[group];
  if (outcome === 'unverified') return UNVERIFIED_COMPLIANCE_LABEL;
  if (outcome === 'not_checked') return NOT_CHECKED_LABEL;
  return undefined;
}

interface CheckContext {
  contractType: string;
  userParty?: string;
  fieldOf: (key: string) => FieldEvidence;
  definitionOf: (key: string) => PlaybookField | undefined;
  defaultClauseIndex?: number;
  evidence: ContractEvidence;
  presentClauseTypes: Set<ClauseCategory>;
  articleStatus: Map<string, ArticleRefResult>;
}

function evaluateCheck(check: PlaybookCheck, ctx: CheckContext): CheckResult {
  const factOf: FactLookup = (fact) => {
    const value = ctx.evidence.facts[fact]?.value;
    return value === undefined ? 'unknown' : value;
  };
  const verified = (ref: LegalArticleRef): VerifiedArticle => {
    const found = ctx.articleStatus.get(refKey(ref));
    return { ref, status: found?.status ?? 'source_unavailable', chunkId: found?.chunkId };
  };
  const base: Omit<CheckResult, 'outcome'> = {
    code: check.code,
    group: check.group,
    title: check.title,
    evidence: [],
    fields: {},
    facts: [],
    basis: check.basis,
    legalArticles: [],
    question: check.question,
    whyItMatters: check.whyItMatters,
    suggestion: check.suggestion,
    replacesRule: check.replacesRule,
  };

  const { partyRoles, requiresUserParty, facts = [] } = check.appliesTo;
  if (partyRoles && ctx.userParty && !partyRoles.includes(ctx.userParty)) return { ...base, outcome: 'not_applicable' };
  const neutral = Boolean((partyRoles || requiresUserParty) && !ctx.userParty) || undefined;

  const raw = runTest(check, ctx.fieldOf, ctx.definitionOf, factOf, ctx.presentClauseTypes, ctx.evidence);
  let outcome: CheckOutcome =
    raw.status === 'pass' ? 'passed' : raw.status === 'na' ? 'not_applicable' : raw.status === 'unknown' ? 'not_checked' : 'failed';
  let reason = raw.reason;
  if (outcome === 'not_checked' && check.group === 'compliance' && raw.observed !== undefined) outcome = 'unverified';

  const factEvidence = facts.map((fact) => ctx.evidence.facts[fact] ?? { fact, value: 'unknown' as const });
  if (outcome === 'failed' && facts.length > 0) {
    const states = facts.map(factOf);
    if (states.includes(false)) outcome = 'not_applicable';
    else if (states.includes('unknown')) {
      outcome = check.group === 'compliance' ? 'unverified' : 'not_checked';
      reason = `Chưa xác định được: ${factEvidence.filter((f) => f.value === 'unknown').map((f) => f.fact).join(', ')}.`;
    }
  }

  const lawArticles = check.basis.kind === 'law' ? check.basis.articles.map(verified) : [];
  if (outcome === 'failed' && check.group === 'compliance' && lawArticles.some((article) => article.status !== 'verified')) {
    outcome = 'unverified';
    reason = 'Điều luật làm căn cứ chưa xác minh được trong kho luật.';
  }
  const references = check.basis.kind === 'law' ? [] : (check.basis.references ?? []).map(verified).filter((a) => a.status === 'verified');

  const anchor = raw.used.find((field) => field.clauseIndex !== undefined)?.clauseIndex ?? ctx.defaultClauseIndex;
  const result: CheckResult = {
    ...base,
    outcome,
    label: labelFor(check.group, outcome),
    clauseIndex: check.test.kind === 'clause_present' ? ctx.evidence.clauseCoverage[check.test.clauseType]?.clauseIndex : anchor,
    neutral: outcome === 'failed' ? neutral : undefined,
    observed: raw.observed,
    limit: raw.limit,
    vagueTerm: raw.vagueTerm,
    reason,
    evidence: raw.used,
    fields: Object.fromEntries(
      raw.used.map((field) => {
        const definition = ctx.definitionOf(field.key);
        return [field.key, { label: definition?.label ?? field.key, unit: (definition && UNIT_SUFFIX[definition.kind]) ?? '' }];
      }),
    ),
    conditions: check.test.kind === 'fails_when_all' ? check.test.conditions : undefined,
    limitKind:
      check.test.kind === 'at_least' || check.test.kind === 'at_least_tiered' ? 'at_least' : raw.limit !== undefined ? 'at_most' : undefined,
    facts: factEvidence,
    legalArticles: [...lawArticles, ...references],
  };

  if (outcome === 'failed' && check.group !== 'compliance') {
    const fallback = (check.fallbackRules ?? []).find(
      (rule) =>
        rule.contractTypes.includes(ctx.contractType) &&
        (rule.facts ?? []).every((fact) => factOf(fact) === true) &&
        verified(rule.article).status === 'verified',
    );
    if (fallback) result.fallback = { statement: fallback.statement, article: verified(fallback.article) };
    else if (check.basis.kind !== 'law' && references.length === 0) result.noVerifiedLegalBasis = true;
  }
  return result;
}

function overlaps(a: { startOffset?: number; endOffset?: number }, b: { startOffset: number; endOffset: number }) {
  return a.startOffset !== undefined && a.endOffset !== undefined && a.startOffset < b.endOffset && b.startOffset < a.endOffset;
}

export async function evaluateContract({ contractType, userParty, clauses, evidence }: EvaluateInput): Promise<PlaybookEvaluation> {
  const presentClauseTypes = new Set(clauses.flatMap((clause) => clause.clauseTypes));
  const contractPlaybook = getContractPlaybook(contractType);

  const units = [
    ...evidence.playbooks.map((group) => ({
      checks: applicableChecks(group.playbook.checks, contractType),
      fields: group.fields,
      definitions: group.playbook.fields,
      defaultClauseIndex: group.clauseIndexes[0],
    })),
    ...(contractPlaybook
      ? [
          {
            checks: applicableChecks(contractPlaybook.checks, contractType),
            fields: evidence.contractFields,
            definitions: contractPlaybook.fields,
            defaultClauseIndex: undefined,
          },
        ]
      : []),
  ];

  const statuses = await verifyPlaybookArticleRefs(playbookArticleRefs(units.flatMap((unit) => unit.checks)));
  const articleStatus = new Map(statuses.map((result) => [refKey(result.ref), result]));

  const results = units.flatMap((unit) =>
    unit.checks.map((check) =>
      evaluateCheck(check, {
        contractType,
        userParty,
        fieldOf: (key) => unit.fields[key] ?? { key, state: 'absent' },
        definitionOf: (key) => unit.definitions.find((field) => field.key === key),
        defaultClauseIndex: unit.defaultClauseIndex,
        evidence,
        presentClauseTypes,
        articleStatus,
      }),
    ),
  );

  const conflictFields = evidence.playbooks.flatMap((group) =>
    group.playbook.fields.flatMap((field) => {
      const found = group.fields[field.key];
      const comparable = field.kind === 'boolean' || NUMERIC_FIELD_KINDS.includes(field.kind);
      return comparable && found?.conflicts?.length ? [{ label: field.label, evidence: found }] : [];
    }),
  );
  const vagueFailures = results.filter((result) => result.vagueTerm).flatMap((result) => result.evidence);
  const documentFindings = runDocumentChecks(clauses, conflictFields)
    .filter((finding) => finding.code !== 'VB-05' || !vagueFailures.some((evidenceItem) => overlaps(evidenceItem, finding)))
    .map((finding) => ({
      ...finding,
      title: DOCUMENT_CHECKS[finding.code].title,
      label: FAILED_CHECK_LABELS[DOCUMENT_CHECKS[finding.code].group],
      check: DOCUMENT_CHECKS[finding.code],
    }));

  const count = (outcome: CheckOutcome) => results.filter((result) => result.outcome === outcome).length;
  return {
    results,
    documentFindings,
    coverage: {
      checks: results.length,
      passed: count('passed'),
      failed: count('failed'),
      notApplicable: count('not_applicable'),
      notChecked: count('not_checked'),
      unverified: count('unverified'),
      clauseTypesWithoutPlaybook: [...presentClauseTypes].filter((type) => type !== 'other' && !getClausePlaybook(type)),
    },
  };
}
