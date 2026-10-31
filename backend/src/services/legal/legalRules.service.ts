import { logger } from '../../config/logger';
import { LegalSourceModel } from '../../models/legalSource.model';
import { LegalKnowledgeChunkModel } from '../../models/legalKnowledgeChunk.model';
import type { ReviewContext } from '../contract/contractProfile.service';
import type { ExtractedKeyTerm } from '../analysis/keyTermExtraction.service';
import type { LegalBasisVerification } from './legalRetrieval.service';
import { LEGAL_RULES, LegalRule, RuleCitation, Severity, Terms } from './legalRules.data';

export interface RuleFinding {
  rule: LegalRule;
  severity: Severity;
  clauseIndex?: number;
  title: string;
  problem: string[];
  consequences: string[];
  recommendations: string[];
}

export function hasLegalRules(profileCode: string): boolean {
  return LEGAL_RULES.some((rule) => rule.profiles.includes(profileCode));
}

export function evaluateLegalRules(context: ReviewContext, keyTerms: ExtractedKeyTerm[]): RuleFinding[] {
  const byKey = new Map(keyTerms.map((t) => [t.key, t]));
  const terms: Terms = {
    num: (key) => byKey.get(key)?.numberValue,
    bool: (key) => byKey.get(key)?.booleanValue,
  };

  const findings: RuleFinding[] = [];
  for (const rule of LEGAL_RULES) {
    if (!rule.profiles.includes(context.profileCode)) continue;
    const outcome = rule.evaluate(terms, context);
    if (!outcome) continue;
    const anchor = outcome.anchor ?? rule.anchor;
    findings.push({
      rule,
      severity: outcome.severity ?? rule.severity,
      clauseIndex: anchor ? byKey.get(anchor)?.clauseIndex : undefined,
      title: outcome.title,
      problem: outcome.problem,
      consequences: outcome.consequences,
      recommendations: outcome.recommendations,
    });
  }
  return findings;
}

const citationKey = (c: RuleCitation) => `${c.sourceCode}:${c.article}:${c.clause ?? ''}:${c.verifyText}`;
const normalizeForMatch = (value: string) => value.normalize('NFC').replace(/\s+/g, ' ').toLowerCase();

export interface ResolvedRuleCitations {
  chunkIds: string[];
  verification: LegalBasisVerification;
}

export async function resolveRuleCitations(findings: RuleFinding[]): Promise<Map<string, ResolvedRuleCitations>> {
  const citations = [...new Map(findings.flatMap((f) => f.rule.citations).map((c) => [citationKey(c), c])).values()];
  const resolvedByRule = new Map<string, ResolvedRuleCitations>();
  if (citations.length === 0) return resolvedByRule;

  const sources = await LegalSourceModel.find({
    code: { $in: [...new Set(citations.map((c) => c.sourceCode))] },
    status: { $ne: 'repealed' },
  }).select('code');
  const sourceIdByCode = new Map(sources.map((s) => [s.code, s._id]));
  const chunks = sources.length
    ? await LegalKnowledgeChunkModel.find({
        $or: citations
          .filter((c) => sourceIdByCode.has(c.sourceCode))
          .map((c) => ({ legalSourceId: sourceIdByCode.get(c.sourceCode), articleNumber: c.article })),
      }).select('legalSourceId articleNumber clauseFrom clauseTo chunkText order')
    : [];

  const resolved = new Map<string, string>();
  for (const citation of citations) {
    const sourceId = sourceIdByCode.get(citation.sourceCode);
    if (!sourceId) continue;
    const candidates = chunks
      .filter((c) => String(c.legalSourceId) === String(sourceId) && c.articleNumber === citation.article)
      .sort((a, b) => a.order - b.order);
    if (candidates.length === 0) continue;
    const phrase = normalizeForMatch(citation.verifyText);
    const matching = candidates.filter((c) => normalizeForMatch(c.chunkText).includes(phrase));
    const inClause = citation.clause === undefined
      ? undefined
      : matching.find((c) => c.clauseFrom == null || (c.clauseFrom <= citation.clause! && (c.clauseTo ?? c.clauseFrom) >= citation.clause!));
    const chosen = inClause ?? matching[0];
    if (!chosen) {
      logger.warn('A legal rule cites an article whose text does not contain the expected wording', {
        sourceCode: citation.sourceCode,
        article: citation.article,
        verifyText: citation.verifyText,
      });
      continue;
    }
    resolved.set(citationKey(citation), chosen._id.toString());
  }

  for (const finding of findings) {
    const { citations: ruleCitations } = finding.rule;
    const found = ruleCitations.filter((c) => resolved.has(citationKey(c)));
    const verification: LegalBasisVerification =
      found.length === ruleCitations.length
        ? 'verified'
        : found.length > 0
          ? 'partially_verified'
          : ruleCitations.some((c) => sourceIdByCode.has(c.sourceCode))
            ? 'article_not_found'
            : 'not_in_knowledge_base';
    resolvedByRule.set(finding.rule.code, {
      chunkIds: [...new Set(found.map((c) => resolved.get(citationKey(c))!))],
      verification,
    });
  }
  return resolvedByRule;
}
