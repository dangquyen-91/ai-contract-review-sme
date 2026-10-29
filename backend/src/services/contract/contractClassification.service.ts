import { Type } from '@google/genai';
import { z } from 'zod';
import { AppError } from '../../errors/AppError';
import { ContractModel, CLASSIFICATION_OUTCOMES } from '../../models/contract.model';
import { ContractProfileModel, SENSITIVE_DATA_TYPES } from '../../models/contractProfile.model';
import { OrganizationModel } from '../../models/organization.model';
import { ReviewModel } from '../../models/review.model';
import { UserModel } from '../../models/user.model';
import { findBillingAccount } from '../billing/billingAccount.service';
import { generateJson } from '../ai/llm.service';
import { createRedactor, placeholderInstruction } from '../ai/redaction.service';
import { getCurrentVersionWithText } from './contractVersion.service';
import { resolveContractProfile, validateContractContext } from './contractProfile.service';
import {
  assertAccountReviewPolicy,
  BUSINESS_REVIEW_TYPES,
  PERSONAL_REVIEW_TYPES,
} from './personalReviewPolicy';

const EXCERPT_CHARS = 8000;
const RUNNING_STALE_MS = 10 * 60 * 1000;
const NOT_CONTRACT = 'not_contract';
const OTHER_TYPE = 'other';

type ClassificationOutcome = (typeof CLASSIFICATION_OUTCOMES)[number];

interface ProfileOption {
  code: string;
  name: string;
  parties: { code: string; name: string }[];
}

export interface DetectedParty {
  name: string;
  partyCode?: string;
  taxCode?: string;
}

const llmSchema = z.object({
  type: z.string(),
  detectedLabel: z.string().nullable().optional(),
  confidence: z.number().nullable().optional(),
  parties: z
    .array(
      z.object({
        name: z.string(),
        partyCode: z.string().nullable().optional(),
        taxCode: z.string().nullable().optional(),
      }),
    )
    .nullable()
    .optional(),
});

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    type: { type: Type.STRING },
    detectedLabel: { type: Type.STRING },
    confidence: { type: Type.NUMBER },
    parties: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          partyCode: { type: Type.STRING, nullable: true },
          taxCode: { type: Type.STRING, nullable: true },
        },
        required: ['name'],
      },
    },
  },
  required: ['type', 'detectedLabel', 'confidence', 'parties'],
};

function buildPrompt(profiles: ProfileOption[], excerpt: string, redactionNote: string) {
  const options = profiles
    .map((p) => `- "${p.code}": ${p.name}. Party codes: ${p.parties.map((party) => `"${party.code}" (${party.name})`).join(', ')}`)
    .join('\n');
  return `You classify an uploaded Vietnamese document before it is reviewed.

Contract types the system supports:
${options}

Rules:
- "type" is one of the codes above when the document is a contract of that type, "${OTHER_TYPE}" when it is a contract of another type, or "${NOT_CONTRACT}" when it is not a contract at all (for example a CV, an invoice, a letter or an unreadable scan).
- "detectedLabel" names the document kind in Vietnamese in a few words, e.g. "hợp đồng lao động" or "hợp đồng thuê xe ô tô". Use it even when "type" is "${OTHER_TYPE}".
- "confidence" is between 0 and 1.
- "parties" lists the signing parties as written in the document. "name" is the person's or organization's name, "partyCode" is that party's code for the chosen type (null otherwise), and "taxCode" is the tax code written next to the party (null if none).
- Only use what the document says. Do not guess names or tax codes.${redactionNote}

Document (first part):
"""
${excerpt}
"""`;
}

const LEGAL_FORM_WORDS =
  /\b(tong cong ty|cong ty|tap doan|chi nhanh|trach nhiem huu han|tnhh|co phan|cp|mot thanh vien|mtv|hai thanh vien|doanh nghiep tu nhan|dntn|hop tac xa|ho kinh doanh|jsc|ltd|co)\b/g;

export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const normalizeOrgName = (value: string) =>
  normalizeName(value).replace(LEGAL_FORM_WORDS, ' ').replace(/\s+/g, ' ').trim();

const digitsOf = (value?: string | null) => (value ?? '').replace(/\D/g, '');

export function matchOrganizationParty(
  parties: DetectedParty[],
  org: { name: string; taxCode?: string | null },
): string | undefined {
  const withCode = parties.filter((p) => p.partyCode);
  const orgTax = digitsOf(org.taxCode);
  if (orgTax.length >= 10) {
    const byTax = withCode.filter((p) => digitsOf(p.taxCode).startsWith(orgTax.slice(0, 10)));
    if (byTax.length === 1) return byTax[0].partyCode;
  }
  const orgName = normalizeOrgName(org.name);
  if (orgName.length < 3) return undefined;
  const byName = withCode.filter((p) => {
    const name = normalizeOrgName(p.name);
    return name.length >= 3 && (name.includes(orgName) || orgName.includes(name));
  });
  const codes = new Set(byName.map((p) => p.partyCode));
  return codes.size === 1 ? byName[0].partyCode : undefined;
}

export function matchPersonParty(parties: DetectedParty[], personName: string): string | undefined {
  const target = normalizeName(personName);
  if (!target) return undefined;
  const codes = new Set(
    parties.filter((p) => p.partyCode && normalizeName(p.name) === target).map((p) => p.partyCode),
  );
  return codes.size === 1 ? [...codes][0] : undefined;
}

const PERSONAL_DEFAULT_PARTY: Record<string, string> = {
  labor: 'employee',
  life_insurance: 'policyholder',
};

export function decideOutcome(type: string, allowedTypes: readonly string[], supportedTypes: Set<string>): ClassificationOutcome {
  if (type === NOT_CONTRACT) return 'not_contract';
  if (!supportedTypes.has(type)) return 'unsupported_type';
  return allowedTypes.includes(type) ? 'supported' : 'not_allowed_for_account';
}

export function classificationClaimable(staleBefore = new Date(Date.now() - RUNNING_STALE_MS)) {
  return {
    $or: [
      { 'classification.status': { $in: ['pending', 'failed'] } },
      { 'classification.status': 'running', 'classification.startedAt': { $lt: staleBefore } },
    ],
  };
}

export async function claimClassification(contractId: string) {
  return ContractModel.findOneAndUpdate(
    {
      _id: contractId,
      type: null,
      ...classificationClaimable(),
    },
    {
      $set: { 'classification.status': 'running', 'classification.startedAt': new Date() },
      $unset: { 'classification.error': '' },
    },
    { new: true },
  );
}

export async function classifyContract(contractId: string, signal?: AbortSignal): Promise<ClassificationOutcome | null> {
  const contract = await claimClassification(contractId);
  if (!contract) return null;

  try {
    const [organization, uploader, version, profileDocs] = await Promise.all([
      OrganizationModel.findById(contract.orgId),
      UserModel.findById(contract.uploadedBy).select('name'),
      getCurrentVersionWithText(contractId),
      ContractProfileModel.find().select('code name parties'),
    ]);
    const org = organization ?? {
      ...(await findBillingAccount(contract.orgId.toString())),
      name: uploader?.name ?? '',
      taxCode: undefined,
    };
    const text = version.extractedText ?? '';
    if (version.extractionStatus !== 'completed' || !text.trim()) {
      throw AppError.badRequest('The contract text has not been extracted');
    }

    const profiles: ProfileOption[] = profileDocs.map((p) => ({
      code: p.code,
      name: p.name,
      parties: p.parties.map((party) => ({ code: party.code, name: party.name })),
    }));
    const excerpt = text.slice(0, EXCERPT_CHARS);
    const redactor = createRedactor(excerpt, SENSITIVE_DATA_TYPES);
    const raw = await generateJson(
      buildPrompt(profiles, redactor.mask(excerpt), placeholderInstruction(redactor)),
      responseSchema,
      signal,
    );
    const parsed = llmSchema.safeParse(raw);
    if (!parsed.success) throw AppError.internal('LLM returned an unexpected classification format.');

    const supportedTypes = new Set(profiles.map((p) => p.code));
    const type = parsed.data.type.trim();
    const profile = profiles.find((p) => p.code === type);
    const partyCodes = new Set(profile?.parties.map((p) => p.code) ?? []);
    const parties: DetectedParty[] = (parsed.data.parties ?? [])
      .map((p) => ({
        name: redactor.unmask(p.name).trim(),
        partyCode: p.partyCode && partyCodes.has(p.partyCode) ? p.partyCode : undefined,
        taxCode: p.taxCode ? redactor.unmask(p.taxCode).trim() : undefined,
      }))
      .filter((p) => p.name);

    const allowedTypes = org.isPersonal ? PERSONAL_REVIEW_TYPES : BUSINESS_REVIEW_TYPES;
    const outcome = decideOutcome(type, allowedTypes, supportedTypes);
    const ourParty =
      outcome !== 'supported'
        ? undefined
        : org.isPersonal
          ? type === 'labor'
            ? 'employee'
            : (uploader ? matchPersonParty(parties, uploader.name) : undefined) ?? PERSONAL_DEFAULT_PARTY[type]
          : matchOrganizationParty(parties, org);
    const confidence = Math.min(1, Math.max(0, parsed.data.confidence ?? 0));

    await ContractModel.updateOne(
      { _id: contract._id, type: null },
      {
        $set: {
          'classification.status': 'completed',
          'classification.outcome': outcome,
          'classification.detectedLabel': parsed.data.detectedLabel?.trim() || undefined,
          'classification.type': profile ? type : undefined,
          'classification.ourParty': ourParty,
          'classification.confidence': confidence,
          'classification.parties': parties.map(({ name, partyCode }) => ({ name, partyCode })),
          'classification.source': 'ai',
          'classification.finishedAt': new Date(),
          ...(outcome === 'supported' ? {} : { status: 'unsupported' }),
        },
      },
    );
    return outcome;
  } catch (err) {
    await ContractModel.updateOne(
      { _id: contract._id, type: null },
      {
        $set: {
          'classification.status': 'failed',
          'classification.error': err instanceof Error ? err.message : String(err),
          'classification.finishedAt': new Date(),
        },
      },
    );
    throw err;
  }
}

export async function confirmContractProfile(
  orgId: string,
  contractId: string,
  input: { type: string; ourParty?: string },
  isPersonal: boolean,
) {
  const contract = await ContractModel.findOne({ _id: contractId, orgId });
  if (!contract) throw AppError.notFound('Contract not found');
  if (await ReviewModel.exists({ contractId, activeLock: true })) {
    throw AppError.conflict('A review is running for this contract', 'REVIEW_RUNNING');
  }

  const profile = await resolveContractProfile(input.type);
  const ourParty = input.ourParty ?? (isPersonal ? PERSONAL_DEFAULT_PARTY[profile.code] : undefined);
  await validateContractContext(profile, { ourParty });
  assertAccountReviewPolicy(isPersonal, profile.code, ourParty);

  const suggestion = contract.classification;
  const acceptedSuggestion =
    suggestion?.status === 'completed' &&
    suggestion.source === 'ai' &&
    suggestion.type === profile.code &&
    (suggestion.ourParty ?? undefined) === ourParty;
  const settled = suggestion?.status === 'completed';

  await ContractModel.updateOne(
    { _id: contract._id },
    {
      $set: {
        type: profile.code,
        ...(ourParty ? { ourParty } : {}),
        ...(contract.status === 'unsupported' ? { status: 'uploaded' } : {}),
        'classification.status': 'completed',
        'classification.outcome': settled ? suggestion.outcome : 'supported',
        'classification.source': acceptedSuggestion ? 'ai' : 'user',
        'classification.confirmedAt': new Date(),
      },
      ...(ourParty ? {} : { $unset: { ourParty: '' } }),
    },
  );
}
