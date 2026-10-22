import { HydratedDocument } from 'mongoose';
import { AppError } from '../../errors/AppError';
import { ClauseCategory } from '../../models/clauseTypeTaxonomy.model';
import { ContractProfile, ContractProfileModel } from '../../models/contractProfile.model';
import { IndustryModel } from '../../models/industry.model';
import { OrganizationModel } from '../../models/organization.model';
import { LegalSourceModel } from '../../models/legalSource.model';
import { getTaxonomyByCodes } from '../analysis/clauseTypeTaxonomy.service';
import type { SensitiveDataType } from '../ai/redaction.service';
import { DEFAULT_INDUSTRIES, DEFAULT_PROFILES, DefaultProfile } from './contractProfile.data';
import { LEGAL_SOURCE_CATALOG, LegalSourceCode } from '../legal/legalSourceCatalog.data';

function assertProfileConsistency(profile: DefaultProfile) {
  const categories = new Set(profile.clauseCategories);
  const industries = new Set<string>(DEFAULT_INDUSTRIES.map((i) => i.code));
  const problems = [
    ...(categories.has('other') ? [] : ['clauseCategories must include "other"']),
    ...profile.mandatoryClauses
      .filter((code) => !categories.has(code))
      .map((code) => `mandatory clause "${code}" is not in clauseCategories`),
    ...(profile.industryRules ?? []).flatMap((rule) => [
      ...(industries.has(rule.industry) ? [] : [`unknown industry "${rule.industry}"`]),
      ...(rule.extraMandatoryClauses ?? [])
        .filter((code) => !categories.has(code))
        .map((code) => `${rule.industry} extra mandatory clause "${code}" is not in clauseCategories`),
    ]),
    ...(new Set(profile.parties.map((p) => p.code)).size === profile.parties.length
      ? []
      : ['party codes must be unique']),
  ];
  if (problems.length > 0) {
    throw new Error(`Invalid contract profile "${profile.code}": ${problems.join('; ')}`);
  }
}

export async function seedDefaultContractProfiles(): Promise<void> {
  DEFAULT_PROFILES.forEach(assertProfileConsistency);

  await Promise.all(
    DEFAULT_INDUSTRIES.map((industry) =>
      IndustryModel.findOneAndUpdate({ code: industry.code }, { $set: industry }, { upsert: true }),
    ),
  );

  await Promise.all(
    DEFAULT_PROFILES.map(({ legalSources, ...profile }) =>
      ContractProfileModel.findOneAndUpdate(
        { code: profile.code },
        {
          $set: {
            aliases: [],
            industryRules: [],
            ...profile,
            governingLaws: legalSources.map((code) => LEGAL_SOURCE_CATALOG[code]),
            legalSourceCodes: legalSources,
          },
        },
        { upsert: true, runValidators: true },
      ),
    ),
  );
}

type ProfileDocument = HydratedDocument<ContractProfile>;

export async function resolveContractProfile(code: string): Promise<ProfileDocument> {
  const profile = await ContractProfileModel.findOne({ $or: [{ code }, { aliases: code }] });
  if (!profile) {
    throw AppError.badRequest(`Unknown contract type: ${code}`);
  }
  return profile;
}

export async function validateContractContext(
  profile: ProfileDocument,
  context: { ourParty?: string; industry?: string },
) {
  if (context.ourParty && !profile.parties.some((p) => p.code === context.ourParty)) {
    const allowed = profile.parties.map((p) => p.code).join(', ');
    throw AppError.badRequest(`ourParty must be one of: ${allowed}`);
  }
  if (context.industry && !(await IndustryModel.exists({ code: context.industry }))) {
    throw AppError.badRequest(`Unknown industry: ${context.industry}`);
  }
}

export interface ReviewContext {
  profileCode: string;
  contractLabel: string;
  governingLaws: string[];
  legalSourceCodes: string[];
  partyCode?: string;
  partyName?: string;
  industryName?: string;
  industryChecks: string[];
  clauseCategories: ClauseCategory[];
  mandatoryClauses: ClauseCategory[];
  redactionPolicy: SensitiveDataType[];
}

export async function buildReviewContext(contract: {
  orgId?: { toString(): string } | null;
  type?: string | null;
  ourParty?: string | null;
  industry?: string | null;
}): Promise<ReviewContext> {
  if (!contract.type) {
    throw AppError.conflict('Confirm the contract type before analyzing it', 'CONTRACT_NOT_CONFIRMED');
  }
  const profile = await resolveContractProfile(contract.type);
  const industryCode =
    contract.industry ??
    (contract.orgId
      ? (await OrganizationModel.findById(contract.orgId.toString()).select('industry'))?.industry
      : undefined);
  const rule = industryCode
    ? profile.industryRules.find((r) => r.industry === industryCode)
    : undefined;
  const industry = industryCode ? await IndustryModel.findOne({ code: industryCode }) : null;

  return {
    profileCode: profile.code,
    contractLabel: profile.promptLabel,
    governingLaws: profile.governingLaws,
    legalSourceCodes: profile.legalSourceCodes,
    partyCode: contract.ourParty ?? undefined,
    partyName: profile.parties.find((p) => p.code === contract.ourParty)?.name,
    industryName: industry?.name,
    industryChecks: rule?.checks ?? [],
    clauseCategories: profile.clauseCategories as ClauseCategory[],
    mandatoryClauses: [
      ...new Set([...profile.mandatoryClauses, ...(rule?.extraMandatoryClauses ?? [])]),
    ] as ClauseCategory[],
    redactionPolicy: profile.redactionPolicy as SensitiveDataType[],
  };
}

export function describeReviewContext(context: ReviewContext): string {
  return [
    `Contract type: Vietnamese ${context.contractLabel}.`,
    context.governingLaws.length > 0
      ? `Main governing Vietnamese law: ${context.governingLaws.join(', ')}.`
      : '',
    context.partyName
      ? `The user is "${context.partyName}" in this contract. Judge every clause from this party's point of view and protect its interests.`
      : 'The user has not said which party they are. When a clause favors one side, say which side it hurts.',
    context.industryName ? `The user's business is in the "${context.industryName}" industry.` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export async function listContractProfiles() {
  const [profiles, industries] = await Promise.all([
    ContractProfileModel.find().sort({ segment: 1, code: 1 }),
    IndustryModel.find().sort({ code: 1 }),
  ]);
  const taxonomy = await getTaxonomyByCodes([
    ...new Set(
      profiles.flatMap((p) => [
        ...p.mandatoryClauses,
        ...p.industryRules.flatMap((r) => r.extraMandatoryClauses),
      ]),
    ),
  ]);
  const clauseName = (code: string) => ({
    code,
    name: taxonomy.find((t) => t.code === code)?.name ?? code,
  });
  const sources = await LegalSourceModel.find({
    code: { $in: [...new Set(profiles.flatMap((p) => p.legalSourceCodes))] },
  }).select('code title status ingestion.status ingestion.embeddedChunks');
  const legalSource = (code: string) => {
    const source = sources.find((s) => s.code === code);
    return {
      code,
      name: source?.title ?? LEGAL_SOURCE_CATALOG[code as LegalSourceCode] ?? code,
      inKnowledgeBase: Boolean(source),
      searchable: Boolean(source && source.status !== 'repealed' && (source.ingestion?.embeddedChunks ?? 0) > 0),
      ingestionStatus: source?.ingestion?.status,
    };
  };

  return profiles.map((profile) => ({
    code: profile.code,
    aliases: profile.aliases,
    name: profile.name,
    segment: profile.segment,
    parties: profile.parties.map(({ code, name }) => ({ code, name })),
    governingLaws: profile.governingLaws,
    legalSources: profile.legalSourceCodes.map(legalSource),
    mandatoryClauses: profile.mandatoryClauses.map(clauseName),
    redactionPolicy: profile.redactionPolicy,
    industries: industries.map((industry) => {
      const rule = profile.industryRules.find((r) => r.industry === industry.code);
      return {
        code: industry.code,
        name: industry.name,
        checks: rule?.checks ?? [],
        extraMandatoryClauses: (rule?.extraMandatoryClauses ?? []).map(clauseName),
      };
    }),
  }));
}
