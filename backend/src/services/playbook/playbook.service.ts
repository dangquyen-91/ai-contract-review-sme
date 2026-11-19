import { Types } from 'mongoose';
import { logger } from '../../config/logger';
import type { ClauseCategory } from '../../models/clauseTypeTaxonomy.model';
import { LegalKnowledgeChunkModel } from '../../models/legalKnowledgeChunk.model';
import { LegalSourceModel } from '../../models/legalSource.model';
import { DEFAULT_PROFILES } from '../contract/contractProfile.data';
import { inForceSourceFilter } from '../legal/legalSourceAvailability';
import {
  HOUSING_PURCHASE_CONTRACT_PLAYBOOK,
  LABOR_CONTRACT_PLAYBOOK,
  LIFE_INSURANCE_CONTRACT_PLAYBOOK,
  OFFICE_LEASE_CONTRACT_PLAYBOOK,
  SALES_CONTRACT_PLAYBOOK,
  SERVICE_CONTRACT_PLAYBOOK,
} from './contractPlaybooks.data';
import { DELIVERY_PLAYBOOK } from './deliveryPlaybook.data';
import { CLAIMS_PLAYBOOK, INSURANCE_EXCLUSIONS_PLAYBOOK } from './insurancePlaybooks.data';
import {
  PROBATION_PLAYBOOK,
  SOCIAL_INSURANCE_PLAYBOOK,
  WAGES_PLAYBOOK,
  WORKING_TIME_PLAYBOOK,
} from './laborPlaybooks.data';
import { PAYMENT_PLAYBOOK } from './paymentPlaybook.data';
import { PENALTY_PLAYBOOK } from './penaltyPlaybook.data';
import {
  DEPOSIT_PLAYBOOK,
  MAINTENANCE_PLAYBOOK,
  OWNERSHIP_TRANSFER_PLAYBOOK,
  PROPERTY_STATUS_PLAYBOOK,
  SUBLEASE_PLAYBOOK,
} from './propertyPlaybooks.data';
import {
  CheckTest,
  ClausePlaybook,
  ContractPlaybook,
  FieldKind,
  LegalArticleRef,
  NUMERIC_FIELD_KINDS,
  PLAYBOOK_VERSION,
  PlaybookCheck,
  PlaybookField,
} from './playbookSchema';
import { TERM_PLAYBOOK } from './termPlaybook.data';
import { TERMINATION_PLAYBOOK } from './terminationPlaybook.data';

export const CLAUSE_PLAYBOOKS: ClausePlaybook[] = [
  PAYMENT_PLAYBOOK,
  TERM_PLAYBOOK,
  TERMINATION_PLAYBOOK,
  PENALTY_PLAYBOOK,
  DELIVERY_PLAYBOOK,
  PROBATION_PLAYBOOK,
  WAGES_PLAYBOOK,
  WORKING_TIME_PLAYBOOK,
  SOCIAL_INSURANCE_PLAYBOOK,
  DEPOSIT_PLAYBOOK,
  MAINTENANCE_PLAYBOOK,
  SUBLEASE_PLAYBOOK,
  PROPERTY_STATUS_PLAYBOOK,
  OWNERSHIP_TRANSFER_PLAYBOOK,
  INSURANCE_EXCLUSIONS_PLAYBOOK,
  CLAIMS_PLAYBOOK,
];

export const CONTRACT_PLAYBOOKS: ContractPlaybook[] = [
  SALES_CONTRACT_PLAYBOOK,
  SERVICE_CONTRACT_PLAYBOOK,
  OFFICE_LEASE_CONTRACT_PLAYBOOK,
  LABOR_CONTRACT_PLAYBOOK,
  HOUSING_PURCHASE_CONTRACT_PLAYBOOK,
  LIFE_INSURANCE_CONTRACT_PLAYBOOK,
];

const playbookByClauseType = new Map(
  CLAUSE_PLAYBOOKS.flatMap((playbook) => playbook.clauseTypes.map((type) => [type, playbook] as const)),
);
const playbookByContractType = new Map(CONTRACT_PLAYBOOKS.map((playbook) => [playbook.contractType, playbook]));

export const getClausePlaybook = (clauseType: ClauseCategory) => playbookByClauseType.get(clauseType);
export const getContractPlaybook = (contractType: string) => playbookByContractType.get(contractType);

const CHECK_CODE_PATTERN = /^[A-Z]{2,4}-\d{2}$/;

type FieldNeed = 'any' | 'numeric' | 'boolean';

function fieldsUsedBy(test: CheckTest): { field: string; need: FieldNeed }[] {
  switch (test.kind) {
    case 'stated':
      return [{ field: test.field, need: 'any' }];
    case 'at_most':
    case 'at_least':
    case 'at_most_tiered':
      return [{ field: test.field, need: 'numeric' }];
    case 'fails_when_all':
      return test.conditions.map((condition) => ({
        field: condition.field,
        need: condition.op === 'is_true' ? 'boolean' : condition.op === 'not_stated' ? 'any' : 'numeric',
      }));
    case 'clause_present':
      return [];
  }
}

function kindFits(kind: FieldKind, need: FieldNeed) {
  if (need === 'numeric') return NUMERIC_FIELD_KINDS.includes(kind);
  if (need === 'boolean') return kind === 'boolean';
  return true;
}

interface CheckScope {
  label: string;
  clauseTypes?: ClauseCategory[];
  contractType?: string;
  fields: Map<string, PlaybookField>;
}

function findCheckProblems(check: PlaybookCheck, scope: CheckScope): string[] {
  const at = `${scope.label} ${check.code}`;
  const problems: string[] = [];

  if (!CHECK_CODE_PATTERN.test(check.code)) problems.push(`${at}: code must look like "TT-01"`);
  if (check.group === 'compliance' && check.basis.kind !== 'law') problems.push(`${at}: a compliance check must rest on a law basis`);
  if ((check.group === 'clarity' || check.group === 'balance') && check.basis.kind === 'law') {
    problems.push(`${at}: a ${check.group} check cannot rest on a law basis; use references instead`);
  }

  for (const { field, need } of fieldsUsedBy(check.test)) {
    const definition = scope.fields.get(field);
    if (!definition) problems.push(`${at}: test uses unknown field "${field}"`);
    else if (!kindFits(definition.kind, need)) {
      problems.push(`${at}: field "${field}" of kind ${definition.kind} cannot be tested as ${need}`);
    }
  }
  if (check.test.kind === 'at_most_tiered') {
    const { tiers, absoluteLimit } = check.test;
    if (tiers.length === 0) problems.push(`${at}: at_most_tiered needs at least one tier`);
    if (absoluteLimit !== undefined && tiers.some((tier) => tier.limit > absoluteLimit)) {
      problems.push(`${at}: a tier limit is above absoluteLimit`);
    }
  }
  if (check.test.kind === 'clause_present' && !scope.contractType) {
    problems.push(`${at}: clause_present is only allowed in contract playbooks`);
  }

  const { contractTypes, partyRoles = [] } = check.appliesTo;
  if (contractTypes.length === 0) problems.push(`${at}: appliesTo.contractTypes is empty`);
  if (scope.contractType && contractTypes.some((code) => code !== scope.contractType)) {
    problems.push(`${at}: a contract playbook check must apply only to "${scope.contractType}"`);
  }
  const profiles = contractTypes.flatMap((code) => {
    const profile = DEFAULT_PROFILES.find((p) => p.code === code);
    if (!profile) {
      problems.push(`${at}: unknown contract type "${code}"`);
      return [];
    }
    if (scope.clauseTypes && !scope.clauseTypes.some((type) => profile.clauseCategories.includes(type))) {
      problems.push(`${at}: contract type "${code}" never has ${scope.clauseTypes.join('/')} clauses`);
    }
    if (check.test.kind === 'clause_present' && !profile.clauseCategories.includes(check.test.clauseType)) {
      problems.push(`${at}: contract type "${code}" never has "${check.test.clauseType}" clauses`);
    }
    return [profile];
  });
  for (const role of partyRoles) {
    if (!profiles.some((profile) => profile.parties.some((party) => party.code === role))) {
      problems.push(`${at}: party role "${role}" belongs to none of its contract types`);
    }
  }

  for (const rule of check.fallbackRules ?? []) {
    const outside = rule.contractTypes.filter((code) => !contractTypes.includes(code));
    if (outside.length > 0) problems.push(`${at}: fallback rule covers contract types outside appliesTo: ${outside.join(', ')}`);
  }
  return problems;
}

function indexFields(label: string, fields: PlaybookField[], problems: string[]) {
  const byKey = new Map<string, PlaybookField>();
  for (const field of fields) {
    if (byKey.has(field.key)) problems.push(`${label}: duplicate field "${field.key}"`);
    byKey.set(field.key, field);
  }
  return byKey;
}

export function findPlaybookProblems(
  clausePlaybooks: ClausePlaybook[] = CLAUSE_PLAYBOOKS,
  contractPlaybooks: ContractPlaybook[] = CONTRACT_PLAYBOOKS,
): string[] {
  const problems: string[] = [];
  const checkCodes = new Set<string>();
  const claimCode = (label: string, code: string) => {
    if (checkCodes.has(code)) problems.push(`${label} ${code}: duplicate check code`);
    checkCodes.add(code);
  };

  const clauseTypes = new Set<string>();
  for (const playbook of clausePlaybooks) {
    const label = playbook.clauseTypes.join('/');
    if (playbook.clauseTypes.length === 0) problems.push(`${playbook.title}: clauseTypes is empty`);
    for (const type of playbook.clauseTypes) {
      if (clauseTypes.has(type)) problems.push(`${label}: clause type "${type}" has more than one playbook`);
      clauseTypes.add(type);
    }
    const fields = indexFields(label, playbook.fields, problems);
    for (const { aspect } of playbook.notApplicable) {
      if (playbook.fields.some((field) => field.aspect === aspect)) {
        problems.push(`${label}: aspect "${aspect}" is marked not applicable but has fields`);
      }
    }
    for (const check of playbook.checks) {
      claimCode(label, check.code);
      problems.push(...findCheckProblems(check, { label, clauseTypes: playbook.clauseTypes, fields }));
    }
  }

  const contractTypes = new Set<string>();
  for (const playbook of contractPlaybooks) {
    const label = `contract ${playbook.contractType}`;
    if (contractTypes.has(playbook.contractType)) problems.push(`${label}: more than one contract playbook`);
    contractTypes.add(playbook.contractType);
    if (!DEFAULT_PROFILES.some((profile) => profile.code === playbook.contractType)) {
      problems.push(`${label}: unknown contract type`);
    }
    const fields = indexFields(label, playbook.fields, problems);
    for (const check of playbook.checks) {
      claimCode(label, check.code);
      problems.push(...findCheckProblems(check, { label, contractType: playbook.contractType, fields }));
    }
  }
  return problems;
}

export function allPlaybookChecks(
  clausePlaybooks: ClausePlaybook[] = CLAUSE_PLAYBOOKS,
  contractPlaybooks: ContractPlaybook[] = CONTRACT_PLAYBOOKS,
): PlaybookCheck[] {
  return [...clausePlaybooks, ...contractPlaybooks].flatMap((playbook) => playbook.checks);
}

export function playbookArticleRefs(checks: PlaybookCheck[] = allPlaybookChecks()) {
  return checks.flatMap((check) =>
    [
      ...(check.basis.kind === 'law' ? check.basis.articles : (check.basis.references ?? [])),
      ...(check.fallbackRules ?? []).map((rule) => rule.article),
    ].map((ref) => ({ checkCode: check.code, ref })),
  );
}

export type ArticleRefStatus = 'verified' | 'source_unavailable' | 'article_not_found' | 'anchor_not_found';

export interface ArticleRefResult {
  checkCode: string;
  ref: LegalArticleRef;
  status: ArticleRefStatus;
}

const normalizeForMatch = (value: string) => value.normalize('NFC').replace(/\s+/g, ' ').toLowerCase();

interface StoredArticleChunk {
  legalSourceId: Types.ObjectId;
  articleNumber?: number | null;
  clauseFrom?: number | null;
  clauseTo?: number | null;
  chunkText: string;
}

const coversClause = (chunk: StoredArticleChunk, clause?: number) =>
  clause === undefined ||
  chunk.clauseFrom == null ||
  (chunk.clauseFrom <= clause && (chunk.clauseTo ?? chunk.clauseFrom) >= clause);

export async function verifyPlaybookArticleRefs(
  refs: { checkCode: string; ref: LegalArticleRef }[] = playbookArticleRefs(),
): Promise<ArticleRefResult[]> {
  if (refs.length === 0) return [];
  const sources = await LegalSourceModel.find({
    $and: [inForceSourceFilter(), { code: { $in: [...new Set(refs.map(({ ref }) => ref.sourceCode))] } }],
  }).select('code');
  const sourceIdByCode = new Map(sources.map((source) => [source.code, source._id]));

  const articleKeys = [
    ...new Map(
      refs
        .filter(({ ref }) => sourceIdByCode.has(ref.sourceCode))
        .map(({ ref }) => [
          `${ref.sourceCode}:${ref.article}`,
          { legalSourceId: sourceIdByCode.get(ref.sourceCode), articleNumber: ref.article },
        ]),
    ).values(),
  ];
  const chunks = articleKeys.length
    ? ((await LegalKnowledgeChunkModel.find({ $or: articleKeys })
        .select('legalSourceId articleNumber clauseFrom clauseTo chunkText')
        .lean()) as unknown as StoredArticleChunk[])
    : [];

  return refs.map(({ checkCode, ref }) => {
    const sourceId = sourceIdByCode.get(ref.sourceCode);
    if (!sourceId) return { checkCode, ref, status: 'source_unavailable' as const };
    const article = chunks.filter(
      (chunk) => String(chunk.legalSourceId) === String(sourceId) && chunk.articleNumber === ref.article,
    );
    if (article.length === 0) return { checkCode, ref, status: 'article_not_found' as const };
    const phrase = normalizeForMatch(ref.verifyText);
    const found = article.some((chunk) => coversClause(chunk, ref.clause) && normalizeForMatch(chunk.chunkText).includes(phrase));
    return { checkCode, ref, status: found ? ('verified' as const) : ('anchor_not_found' as const) };
  });
}

export async function checkPlaybooksOnStartup(): Promise<void> {
  const problems = findPlaybookProblems();
  if (problems.length > 0) {
    throw new Error(`Invalid review playbook ${PLAYBOOK_VERSION}:\n- ${problems.join('\n- ')}`);
  }

  const results = await verifyPlaybookArticleRefs();
  const unverified = results.filter((result) => result.status !== 'verified');
  if (unverified.length > 0) {
    logger.warn('Some playbook legal references cannot be verified in the legal knowledge base', {
      references: unverified.map(
        ({ checkCode, ref, status }) => `${checkCode} ${ref.sourceCode} Điều ${ref.article}: ${status}`,
      ),
    });
  }

  const checks = allPlaybookChecks();
  logger.info(
    `Review playbook ${PLAYBOOK_VERSION}: ${CLAUSE_PLAYBOOKS.length} clause playbooks, ${CONTRACT_PLAYBOOKS.length} contract playbooks, ` +
      `${checks.length} checks (${checks.filter((check) => check.review.status === 'approved').length} approved), ` +
      `${results.length - unverified.length}/${results.length} legal references verified`,
  );
}
