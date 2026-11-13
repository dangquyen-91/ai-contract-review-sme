import { Types } from 'mongoose';
import { logger } from '../../config/logger';
import { AppError } from '../../errors/AppError';
import { ContractModel } from '../../models/contract.model';
import { ContractVersionModel } from '../../models/contractVersion.model';
import { ReviewModel } from '../../models/review.model';
import { TEXT_SIGNATURE_VERSION, signatureSimilarity, textSignature } from '../../utils/textFingerprint';

export const VERSION_MATCH_THRESHOLD = 0.35;
const CANDIDATE_LIMIT = 300;
const SAME_TYPE_MARGIN = 0.05;
const BACKFILL_BATCH = 25;

export type VersionMatch = {
  contractId: string;
  title: string;
  similarity: number;
  matchedVersionNumber: number;
  currentVersionNumber: number;
  nextVersionNumber: number;
  sameType: boolean | null;
  sameParties: boolean | null;
};

type DetectedParty = { name?: string | null };

const partyKey = (name: string) =>
  name.normalize('NFC').toLocaleLowerCase('vi').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

function partiesOverlap(a?: DetectedParty[] | null, b?: DetectedParty[] | null) {
  const left = new Set((a ?? []).map((party) => partyKey(party.name ?? '')).filter(Boolean));
  const right = (b ?? []).map((party) => partyKey(party.name ?? '')).filter(Boolean);
  if (left.size === 0 || right.length === 0) return null;
  return right.some((name) => left.has(name));
}

const round = (value: number) => Math.round(value * 100) / 100;

export async function findVersionMatch(orgId: string, contractId: string) {
  const contract = await ContractModel.findOne({ _id: contractId, orgId })
    .select('type classification.type classification.parties')
    .lean();
  if (!contract) throw AppError.notFound('Không tìm thấy hợp đồng.');

  const versions = await ContractVersionModel.find({ contractId })
    .select('+textSignature +textSignatureVersion extractionStatus')
    .lean();
  const notEligible = { ready: true, eligible: false, match: null };
  if (versions.length !== 1 || (await ReviewModel.exists({ contractId }))) return notEligible;

  const [version] = versions;
  if (version.extractionStatus === 'pending' || version.extractionStatus === 'processing') {
    return { ready: false, eligible: true, match: null };
  }
  if (!version.textSignature?.length || version.textSignatureVersion !== TEXT_SIGNATURE_VERSION) {
    return { ready: true, eligible: true, match: null };
  }

  const candidates = await ContractModel.find({
    orgId,
    _id: { $ne: contract._id },
    status: { $nin: ['unsupported', 'archived'] },
  })
    .sort({ updatedAt: -1 })
    .limit(CANDIDATE_LIMIT)
    .select('title type classification.parties')
    .lean();
  if (candidates.length === 0) return { ready: true, eligible: true, match: null };

  const candidateVersions = await ContractVersionModel.find({
    contractId: { $in: candidates.map((candidate) => candidate._id) },
    textSignature: { $exists: true, $ne: [] },
    textSignatureVersion: TEXT_SIGNATURE_VERSION,
  })
    .select('+textSignature contractId versionNumber')
    .lean();

  const best = new Map<string, { similarity: number; versionNumber: number }>();
  for (const candidate of candidateVersions) {
    const similarity = signatureSimilarity(version.textSignature, candidate.textSignature);
    if (similarity === null) continue;
    const key = String(candidate.contractId);
    const current = best.get(key);
    if (!current || similarity > current.similarity) {
      best.set(key, { similarity, versionNumber: candidate.versionNumber });
    }
  }

  const ownType = contract.type ?? contract.classification?.type ?? null;
  const ranked = candidates
    .flatMap((candidate) => {
      const score = best.get(String(candidate._id));
      if (!score || score.similarity < VERSION_MATCH_THRESHOLD) return [];
      const sameType = ownType && candidate.type ? candidate.type === ownType : null;
      const sameParties = partiesOverlap(contract.classification?.parties, candidate.classification?.parties);
      return [{ candidate, ...score, sameType, sameParties }];
    })
    .sort((a, b) => {
      if (Math.abs(a.similarity - b.similarity) <= SAME_TYPE_MARGIN) {
        if (a.sameParties !== b.sameParties) return a.sameParties ? -1 : 1;
        if (a.sameType !== b.sameType) return a.sameType ? -1 : 1;
      }
      return b.similarity - a.similarity;
    });
  const top = ranked[0];
  if (!top) return { ready: true, eligible: true, match: null };

  const latest = await ContractVersionModel.findOne({ contractId: top.candidate._id })
    .sort({ versionNumber: -1 })
    .select('versionNumber')
    .lean();
  const currentVersionNumber = latest?.versionNumber ?? top.versionNumber;
  const match: VersionMatch = {
    contractId: String(top.candidate._id),
    title: top.candidate.title,
    similarity: round(top.similarity),
    matchedVersionNumber: top.versionNumber,
    currentVersionNumber,
    nextVersionNumber: currentVersionNumber + 1,
    sameType: top.sameType,
    sameParties: top.sameParties,
  };
  return { ready: true, eligible: true, match };
}

export function similarityToPrevious(
  versions: { textSignature?: number[] | null; textSignatureVersion?: number | null }[],
  index: number,
) {
  const previous = versions[index + 1];
  if (!previous) return null;
  if (versions[index].textSignatureVersion !== TEXT_SIGNATURE_VERSION || previous.textSignatureVersion !== TEXT_SIGNATURE_VERSION) return null;
  const similarity = signatureSimilarity(versions[index].textSignature, previous.textSignature);
  return similarity === null ? null : round(similarity);
}

export async function backfillTextSignatures() {
  let updated = 0;
  let lastId: Types.ObjectId | null = null;
  for (;;) {
    const batch: { _id: Types.ObjectId; extractedText?: string | null }[] = await ContractVersionModel.find({
      extractionStatus: 'completed',
      textSignatureVersion: { $ne: TEXT_SIGNATURE_VERSION },
      ...(lastId ? { _id: { $gt: lastId } } : {}),
    })
      .sort({ _id: 1 })
      .limit(BACKFILL_BATCH)
      .select('+extractedText');
    if (batch.length === 0) break;
    for (const version of batch) {
      const signature = textSignature(version.extractedText);
      if (signature) {
        await ContractVersionModel.updateOne(
          { _id: version._id },
          { $set: { textSignature: signature, textSignatureVersion: TEXT_SIGNATURE_VERSION } },
        );
        updated++;
      }
    }
    lastId = batch[batch.length - 1]._id;
  }
  if (updated) logger.info('Backfilled contract text signatures', { updated });
}
