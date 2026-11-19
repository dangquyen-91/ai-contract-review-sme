import { Types } from 'mongoose';
import { AppError } from '../../errors/AppError';
import { ClauseModel } from '../../models/clause.model';
import { ContractModel } from '../../models/contract.model';
import { RiskFindingModel } from '../../models/riskFinding.model';
import { RiskCitationModel } from '../../models/riskCitation.model';
import { LegalKnowledgeChunkModel } from '../../models/legalKnowledgeChunk.model';
import { LegalSourceModel } from '../../models/legalSource.model';
import { getCurrentVersion, resolveResultReview } from '../contract/contractVersion.service';
import { LegalSourceReference, provenanceOf, sourceReferenceOf } from '../legal/legalSourceAvailability';

interface ChunkSnapshot {
  citationLabel: string;
  sourceTitle: string;
  articleRef?: string;
  chunkText: string;
  legalSourceId?: string;
  documentNumber?: string;
  origin?: LegalSourceReference['origin'];
}

export async function loadChunkSnapshots(chunkIds: string[]): Promise<Map<string, ChunkSnapshot>> {
  const ids = [...new Set(chunkIds)];
  if (ids.length === 0) return new Map();
  const chunks = await LegalKnowledgeChunkModel.find({ _id: { $in: ids } }).select(
    'legalSourceId articleRef chunkText',
  );
  const sourceIds = [...new Set(chunks.map((c) => c.legalSourceId.toString()))];
  const sources = await LegalSourceModel.find({ _id: { $in: sourceIds } }).select('title citationLabel documentNumber origin');
  const sourceById = new Map(sources.map((s) => [s._id.toString(), s]));

  return new Map(
    chunks.map((chunk) => {
      const source = sourceById.get(chunk.legalSourceId.toString());
      const { provenance: _provenance, ...reference } = sourceReferenceOf(source);
      void _provenance;
      return [
        chunk._id.toString(),
        {
          citationLabel: source?.citationLabel ?? 'Unknown',
          sourceTitle: source?.title ?? 'Unknown',
          articleRef: chunk.articleRef ?? undefined,
          chunkText: chunk.chunkText,
          ...reference,
          legalSourceId: chunk.legalSourceId.toString(),
        },
      ];
    }),
  );
}

async function attachCitations<T extends { _id: unknown; toObject: () => Record<string, unknown> }>(
  findings: T[],
) {
  const findingIds = findings.map((f) => f._id);
  const citations = await RiskCitationModel.find({ riskFindingId: { $in: findingIds } });

  const clauseIds = findings
    .map((f) => (f.toObject() as { clauseId?: Types.ObjectId | null }).clauseId)
    .filter((id): id is Types.ObjectId => Boolean(id));
  const clauseDocs =
    clauseIds.length > 0
      ? await ClauseModel.find({ _id: { $in: clauseIds } }).select('index title startOffset endOffset')
      : [];
  const clauseById = new Map(
    clauseDocs.map((c) => [
      c._id.toString(),
      { index: c.index, title: c.title, startOffset: c.startOffset, endOffset: c.endOffset },
    ]),
  );
  const withClause = (f: T) => {
    const obj = f.toObject() as { clauseId?: Types.ObjectId | null };
    return { ...obj, clause: obj.clauseId ? (clauseById.get(obj.clauseId.toString()) ?? null) : null };
  };

  if (citations.length === 0) {
    return findings.map((f) => ({ ...withClause(f), citations: [] }));
  }

  const current = await loadChunkSnapshots(citations.map((c) => c.legalKnowledgeChunkId.toString()));

  const citationsByFindingId = new Map<string, Record<string, unknown>[]>();
  for (const citation of citations) {
    const chunkId = citation.legalKnowledgeChunkId.toString();
    const live = current.get(chunkId);
    const stored = citation.origin?.publisher
      ? sourceReferenceOf({
          _id: citation.legalSourceId,
          documentNumber: citation.documentNumber,
          origin: citation.origin,
        })
      : undefined;
    const snapshot: ChunkSnapshot | undefined = citation.chunkText
      ? {
          citationLabel: citation.citationLabel ?? 'Unknown',
          sourceTitle: citation.sourceTitle ?? 'Unknown',
          articleRef: citation.articleRef ?? undefined,
          chunkText: citation.chunkText,
          legalSourceId: stored?.legalSourceId ?? live?.legalSourceId,
          documentNumber: stored?.documentNumber ?? citation.documentNumber ?? live?.documentNumber,
          origin: stored?.origin ?? live?.origin,
        }
      : live;
    if (!snapshot) continue;

    const key = citation.riskFindingId.toString();
    const list = citationsByFindingId.get(key) ?? [];
    list.push({
      legalKnowledgeChunkId: chunkId,
      ...snapshot,
      provenance: provenanceOf(snapshot.origin),
      originRecordedAtReview: Boolean(stored),
      relevanceScore: citation.relevanceScore,
      inKnowledgeBase: Boolean(live),
    });
    citationsByFindingId.set(key, list);
  }

  return findings.map((f) => ({
    ...withClause(f),
    citations: citationsByFindingId.get((f._id as { toString(): string }).toString()) ?? [],
  }));
}

const GROUP_ORDER: Record<string, number> = { compliance: 0, clarity: 1, completeness: 2, balance: 3, referral: 4 };
const LEGACY_SEVERITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

type ListedFinding = {
  checkGroup?: string | null;
  severity?: string | null;
  createdAt?: Date;
  clause: { index: number } | null;
};

function sortFindings<T extends ListedFinding>(findings: T[]) {
  const clauseOrder = (f: T) => f.clause?.index ?? Number.MAX_SAFE_INTEGER;
  return [...findings].sort((a, b) => {
    if (a.checkGroup || b.checkGroup) {
      return (
        clauseOrder(a) - clauseOrder(b) ||
        (GROUP_ORDER[a.checkGroup ?? ''] ?? 9) - (GROUP_ORDER[b.checkGroup ?? ''] ?? 9) ||
        (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0)
      );
    }
    return (
      (LEGACY_SEVERITY_ORDER[a.severity ?? ''] ?? 9) - (LEGACY_SEVERITY_ORDER[b.severity ?? ''] ?? 9) ||
      (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0)
    );
  });
}

export async function listRiskFindings(
  orgId: string,
  contractId: string,
  versionId?: string,
  reviewId?: string,
) {
  const contract = await ContractModel.findOne({ _id: contractId, orgId });
  if (!contract) {
    throw AppError.notFound('Contract not found');
  }
  const scope = await resolveResultReview(contractId, versionId, reviewId);
  if (!scope.reviewId) return [];
  return listReviewFindings(scope.reviewId.toString());
}

export async function listReviewFindings(reviewId: string) {
  const findings = await RiskFindingModel.find({ reviewId }).populate('expectedClauseTypeId');
  return sortFindings(await attachCitations(findings));
}

async function loadFindingOfCurrentVersion(orgId: string, contractId: string, findingId: string) {
  const contract = await ContractModel.findOne({ _id: contractId, orgId });
  if (!contract) {
    throw AppError.notFound('Contract not found');
  }
  const version = await getCurrentVersion(contractId);
  const finding = await RiskFindingModel.findOne({
    _id: findingId,
    orgId,
    contractVersionId: version._id,
  }).populate('expectedClauseTypeId');
  if (!finding) {
    throw AppError.notFound('Risk finding not found');
  }
  return finding;
}

export async function updateProposedRevision(
  orgId: string,
  contractId: string,
  findingId: string,
  input: { revisedText?: string; reason?: string },
) {
  const finding = await loadFindingOfCurrentVersion(orgId, contractId, findingId);
  if (!finding.proposedRevision) {
    throw AppError.notFound('This finding has no proposed revision');
  }

  if (input.revisedText !== undefined) finding.proposedRevision.revisedText = input.revisedText;
  if (input.reason !== undefined) finding.proposedRevision.reason = input.reason;
  finding.proposedRevision.isEdited = true;
  await finding.save();

  return (await attachCitations([finding]))[0];
}

export async function removeProposedRevision(orgId: string, contractId: string, findingId: string) {
  const finding = await loadFindingOfCurrentVersion(orgId, contractId, findingId);
  finding.proposedRevision = undefined;
  await finding.save();

  return (await attachCitations([finding]))[0];
}
