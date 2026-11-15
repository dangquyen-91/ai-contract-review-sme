import { LEGAL_PROVENANCES, LegalSourceModel } from '../../models/legalSource.model';

export const IN_FORCE_STATUSES = ['in_force', 'amended'] as const;

export const OFFICIAL_PUBLISHERS = ['official_gazette', 'national_database', 'issuing_authority'];

export type LegalProvenance = (typeof LEGAL_PROVENANCES)[number];

export interface LegalOriginLike {
  publisher?: string | null;
  url?: string | null;
  retrievedAt?: Date | null;
}

export interface LegalSourceReference {
  legalSourceId?: string;
  documentNumber?: string;
  origin?: { publisher: string; url?: string; retrievedAt?: Date };
  provenance: LegalProvenance;
}

export const provenanceOf = (origin: LegalOriginLike | null | undefined): LegalProvenance =>
  !origin?.publisher ? 'unverified' : OFFICIAL_PUBLISHERS.includes(origin.publisher) ? 'official' : 'declared';

export function sourceReferenceOf(
  source: { _id?: unknown; documentNumber?: string | null; origin?: LegalOriginLike | null } | null | undefined,
): LegalSourceReference {
  const origin = source?.origin?.publisher
    ? {
        publisher: source.origin.publisher,
        ...(source.origin.url ? { url: source.origin.url } : {}),
        ...(source.origin.retrievedAt ? { retrievedAt: source.origin.retrievedAt } : {}),
      }
    : undefined;
  return {
    ...(source?._id ? { legalSourceId: String(source._id) } : {}),
    ...(source?.documentNumber ? { documentNumber: source.documentNumber } : {}),
    ...(origin ? { origin } : {}),
    provenance: provenanceOf(origin),
  };
}

export type LegalSourceAvailability = 'in_force' | 'not_in_force' | 'missing';

export function inForceSourceFilter(now = new Date()) {
  return {
    $and: [
      { status: { $in: [...IN_FORCE_STATUSES] } },
      { $or: [{ effectiveDate: null }, { effectiveDate: { $lte: now } }] },
      { $or: [{ expiryDate: null }, { expiryDate: { $gt: now } }] },
    ],
  };
}

export async function legalSourceAvailability(codes: string[], now = new Date()) {
  const unique = [...new Set(codes)];
  const availability = new Map<string, LegalSourceAvailability>(unique.map((code) => [code, 'missing']));
  if (unique.length === 0) return availability;
  const [known, inForce] = await Promise.all([
    LegalSourceModel.find({ code: { $in: unique } }).select('code').lean(),
    LegalSourceModel.find({ $and: [inForceSourceFilter(now), { code: { $in: unique } }] }).select('code').lean(),
  ]);
  for (const source of known) availability.set(source.code, 'not_in_force');
  for (const source of inForce) availability.set(source.code, 'in_force');
  return availability;
}
