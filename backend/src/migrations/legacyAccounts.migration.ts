import mongoose, { ClientSession, Collection, Document, Types } from 'mongoose';
import { UserModel, PLATFORM_ROLES } from '../models/user.model';
import { RoleModel } from '../models/role.model';
import { OrganizationModel } from '../models/organization.model';
import { MembershipModel } from '../models/membership.model';
import { OrganizationInvitationModel } from '../models/organizationInvitation.model';
import { ContractModel } from '../models/contract.model';
import { ContractDraftModel } from '../models/contractDraft.model';
import { DraftAssistantProposalModel } from '../models/draftAssistantProposal.model';
import { ChatMessageModel } from '../models/chatMessage.model';
import { ClauseModel } from '../models/clause.model';
import { RiskFindingModel } from '../models/riskFinding.model';
import { ReviewModel } from '../models/review.model';
import { ExpertReviewModel } from '../models/expertReview.model';
import { ExpertActionModel } from '../models/expertAction.model';
import { PaymentModel } from '../models/payment.model';
import { ContractReviewPurchaseModel } from '../models/contractReviewPurchase.model';
import {
  SubscriptionModel,
  SubscriptionPeriodModel,
  UsageRunModel,
} from '../models/subscription.model';

/*
 * Converts data written before the membership refactor (Nov 12 2026):
 *  1. User.roleId/User.orgId -> Membership (owner/staff) or User.platformRole.
 *  2. Legacy personal organizations (Organization.isPersonal) -> the owner's
 *     standalone personal scope (user ID; drafts and proposals use orgId null).
 *  3. Contracts without ownerType.
 *  4. Pending invitations for roles other than Staff are revoked.
 *
 * Legacy fields are read through the raw collections because they are no longer
 * part of the schemas. Each account is migrated in its own transaction; in
 * dry-run mode that transaction is rolled back, so the report reflects exactly
 * what --apply would do, including conflicts. Re-running is a no-op: migrated
 * users are marked with `legacyAccountMigratedAt` and legacy fields are kept.
 */

type Raw = Document & { _id: Types.ObjectId; [field: string]: unknown };
type Outcome = { userId: string; email?: string; action: string; detail?: string };

export interface LegacyMigrationReport {
  applied: boolean;
  memberships: number;
  platformRoles: number;
  personalWorkspaces: number;
  personalAccounts: number;
  contractOwnerTypes: { personal: number; organization: number };
  revokedInvitations: number;
  skipped: Outcome[];
}

const PLATFORM = new Set<string>(PLATFORM_ROLES);
const LEGACY_ROLE_ALIASES: Record<string, string> = { reviewer: 'expert' };
const DRY_RUN = Symbol('dry-run');

// Records keyed by a personal organization that move to the owner's user ID.
const PERSONAL_SCOPED = [
  ContractModel,
  ChatMessageModel,
  ClauseModel,
  RiskFindingModel,
  ReviewModel,
  ExpertReviewModel,
  ExpertActionModel,
  PaymentModel,
  SubscriptionPeriodModel,
  UsageRunModel,
  ContractReviewPurchaseModel,
].map((model) => model.collection);
// Personal drafts and their assistant proposals are stored without an orgId.
const PERSONAL_UNSCOPED = [ContractDraftModel, DraftAssistantProposalModel].map(
  (model) => model.collection,
);

const raw = (model: { collection: Collection }) => model.collection;

async function inTransaction(apply: boolean, work: (session: ClientSession) => Promise<void>) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await work(session);
      if (!apply) throw DRY_RUN;
    });
  } catch (error) {
    if (error !== DRY_RUN) throw error;
  } finally {
    await session.endSession();
  }
}

const isDuplicateKey = (error: unknown) => (error as { code?: number })?.code === 11000;

export async function migrateLegacyAccounts({
  apply = false,
  now = new Date(),
}: { apply?: boolean; now?: Date } = {}): Promise<LegacyMigrationReport> {
  const report: LegacyMigrationReport = {
    applied: apply,
    memberships: 0,
    platformRoles: 0,
    personalWorkspaces: 0,
    personalAccounts: 0,
    contractOwnerTypes: { personal: 0, organization: 0 },
    revokedInvitations: 0,
    skipped: [],
  };
  const roles = new Map<string, string>();
  for (const role of await raw(RoleModel).find({}).toArray())
    roles.set(String(role._id), LEGACY_ROLE_ALIASES[role.code as string] ?? (role.code as string));

  // Personal workspaces migrated in this run; dry-run rolls them back, so their
  // contracts are counted here rather than by the uploader comparison below.
  const personalOrgIds: Types.ObjectId[] = [];
  // Owners assigned earlier in this run. Dry-run rolls each account back, so the
  // second legacy owner of an organization must be detected here, not by the index.
  const plannedOwners = new Set<string>();
  const legacyUsers = (await raw(UserModel)
    .find({
      $or: [{ roleId: { $exists: true } }, { orgId: { $exists: true } }],
      legacyAccountMigratedAt: { $exists: false },
    })
    .toArray()) as Raw[];

  for (const user of legacyUsers) {
    const outcome: Outcome = { userId: String(user._id), email: user.email as string | undefined, action: '' };
    const role = user.roleId ? roles.get(String(user.roleId)) : undefined;
    const orgId = user.orgId as Types.ObjectId | undefined;
    const organization = orgId
      ? ((await raw(OrganizationModel).findOne({ _id: orgId })) as Raw | null)
      : null;
    try {
      await inTransaction(apply, async (session) => {
        const users = raw(UserModel);
        const mark = (extra: Record<string, unknown> = {}) =>
          users.updateOne(
            { _id: user._id },
            { $set: { legacyAccountMigratedAt: now, ...extra } },
            { session },
          );

        if (role && PLATFORM.has(role)) {
          // System accounts never belong to an organization.
          await mark(user.platformRole ? {} : { platformRole: role });
          outcome.action = 'platformRole';
          return;
        }
        if (organization?.isPersonal) {
          await migratePersonalWorkspace(user, organization, session);
          await mark({ hasCompletedOnboarding: true });
          outcome.action = 'personalWorkspace';
          return;
        }
        if (orgId && !organization && (role === 'owner' || role === 'staff')) {
          outcome.action = 'skipped';
          outcome.detail = 'organization no longer exists';
          await mark();
          return;
        }
        if (organization && (role === 'owner' || role === 'staff')) {
          const existing = await MembershipModel.findOne({ userId: user._id }).session(session);
          if (!existing) {
            const orgKey = String(organization._id);
            if (
              role === 'owner' &&
              (plannedOwners.has(orgKey) ||
                (await MembershipModel.exists({ orgId: organization._id, role: 'owner' }).session(session)))
            )
              // A second legacy Owner of the same organization: leave for manual review.
              throw Object.assign(new Error('organization already has an owner'), { skip: true });
            await MembershipModel.create(
              [{ userId: user._id, orgId: organization._id, role, joinedAt: user.createdAt ?? now }],
              { session },
            );
            if (role === 'owner') plannedOwners.add(orgKey);
          }
          await mark();
          outcome.action = existing ? 'alreadyMember' : 'membership';
          return;
        }
        // Personal users and owners left without an organization keep a personal scope.
        await mark();
        outcome.action = 'personalAccount';
      });
    } catch (error) {
      outcome.action = 'skipped';
      outcome.detail =
        (error as { skip?: boolean }).skip || isDuplicateKey(error)
          ? (error as Error).message.split(' dup key')[0]
          : `failed: ${(error as Error).message}`;
    }
    if (outcome.action === 'membership') report.memberships++;
    else if (outcome.action === 'platformRole') report.platformRoles++;
    else if (outcome.action === 'personalWorkspace') {
      report.personalWorkspaces++;
      personalOrgIds.push(organization!._id);
    }
    else if (outcome.action === 'personalAccount') report.personalAccounts++;
    else if (outcome.action === 'skipped') report.skipped.push(outcome);
  }

  // Contracts written before ownerType existed: personal when scoped to the uploader.
  const contracts = raw(ContractModel);
  const missing = { ownerType: { $exists: false } };
  const personalFilter = { ...missing, $expr: { $eq: ['$orgId', '$uploadedBy'] } };
  report.contractOwnerTypes.personal =
    (await contracts.countDocuments(personalFilter)) +
    (apply ? 0 : await contracts.countDocuments({ ...missing, orgId: { $in: personalOrgIds } }));
  report.contractOwnerTypes.organization =
    (await contracts.countDocuments(missing)) - report.contractOwnerTypes.personal;
  const invitations = raw(OrganizationInvitationModel);
  const strayInvitations = { status: 'pending', role: { $ne: 'staff' } };
  report.revokedInvitations = await invitations.countDocuments(strayInvitations);
  if (apply) {
    await contracts.updateMany(personalFilter, { $set: { ownerType: 'personal' } });
    await contracts.updateMany(missing, { $set: { ownerType: 'organization' } });
    await invitations.updateMany(strayInvitations, { $set: { status: 'revoked' } });
  }
  return report;
}

async function migratePersonalWorkspace(user: Raw, organization: Raw, session: ClientSession) {
  const occupants = await raw(UserModel).countDocuments({ orgId: organization._id }, { session });
  if (occupants !== 1)
    throw Object.assign(new Error(`personal workspace shared by ${occupants} accounts`), { skip: true });
  const from = { orgId: organization._id };
  const userId = user._id;

  // A user ID may already have its own subscription record; keep it and carry over
  // a scheduled downgrade only when it has none.
  const subscriptions = raw(SubscriptionModel);
  const legacy = await subscriptions.findOne(from, { session });
  if (legacy) {
    const own = await subscriptions.findOne({ orgId: userId }, { session });
    if (own) {
      if (!own.scheduledDowngrade && legacy.scheduledDowngrade)
        await subscriptions.updateOne(
          { _id: own._id },
          { $set: { scheduledDowngrade: legacy.scheduledDowngrade } },
          { session },
        );
      await subscriptions.deleteOne({ _id: legacy._id }, { session });
    } else {
      await subscriptions.updateOne(
        { _id: legacy._id },
        { $set: { orgId: userId, accountType: 'personal' } },
        { session },
      );
    }
  }
  for (const collection of PERSONAL_SCOPED)
    await collection.updateMany(from, { $set: { orgId: userId } }, { session });
  await raw(ContractModel).updateMany(
    { orgId: userId, ownerType: { $exists: false } },
    { $set: { ownerType: 'personal' } },
    { session },
  );
  for (const collection of PERSONAL_UNSCOPED)
    await collection.updateMany(from, { $set: { orgId: null } }, { session });
  await raw(OrganizationInvitationModel).updateMany(
    { ...from, status: 'pending' },
    { $set: { status: 'revoked' } },
    { session },
  );
  // Keep a copy of the emptied workspace record before removing it.
  await mongoose.connection
    .collection('legacymigrations')
    .insertOne(
      { kind: 'personalWorkspace', userId, organization, migratedAt: new Date() },
      { session },
    );
  await raw(OrganizationModel).deleteOne({ _id: organization._id }, { session });
}
