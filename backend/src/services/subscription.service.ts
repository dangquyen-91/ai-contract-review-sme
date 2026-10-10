import mongoose, { ClientSession } from 'mongoose';
import { AppError } from '../errors/AppError';
import { OrganizationModel } from '../models/organization.model';
import { UserModel } from '../models/user.model';
import { Role } from '../models/role.model';
import {
  OrganizationSubscriptionModel,
  PlanModel,
  PlanCode,
  SubscriptionPeriodModel,
  UsageRunModel,
} from '../models/subscription.model';
import { addSubscriptionMonth, vietnamCalendarMonth } from '../utils/subscriptionPeriods';

export const DEFAULT_PLANS = [
  {
    code: 'personal_free',
    name: 'Personal Free',
    audience: 'personal',
    price: 0,
    currency: 'VND',
    analysisLimit: 3,
    chatLimit: 10,
    memberLimit: 1,
  },
  {
    code: 'personal_pro',
    name: 'Personal Pro',
    audience: 'personal',
    price: 99000,
    currency: 'VND',
    analysisLimit: 30,
    chatLimit: 200,
    memberLimit: 1,
  },
  {
    code: 'business_starter',
    name: 'Business Starter',
    audience: 'business',
    price: 499000,
    currency: 'VND',
    analysisLimit: 200,
    chatLimit: 500,
    memberLimit: 5,
  },
  {
    code: 'business_pro',
    name: 'Business Pro',
    audience: 'business',
    price: 999000,
    currency: 'VND',
    analysisLimit: 600,
    chatLimit: 1500,
    memberLimit: 15,
  },
] as const;

export async function seedPlans() {
  for (const plan of DEFAULT_PLANS) {
    await PlanModel.updateOne({ code: plan.code }, { $setOnInsert: plan }, { upsert: true });
  }
}

export const listPlans = () => PlanModel.find().sort({ price: 1 }).select('-__v').lean();

// Shared organization lock: payments, downgrade changes and invitation acceptance serialize here.
export async function lockSubscriptionOrganization(orgId: string, session: ClientSession) {
  const organization = await OrganizationModel.findByIdAndUpdate(
    orgId,
    { $inc: { __v: 1 } },
    { new: true, session },
  );
  if (!organization) throw AppError.notFound('Organization not found');
  return organization;
}

export async function requireSubscriptionAccess(userId: string, orgId: string, ownerOnly = false) {
  const user = await UserModel.findOne({ _id: userId, orgId, isActive: true }).populate('roleId');
  if (!user) throw AppError.forbidden('You do not belong to this organization');
  const organization = await OrganizationModel.findById(orgId);
  if (!organization) throw AppError.notFound('Organization not found');
  const role = (user.roleId as unknown as Role).code;
  if (ownerOnly && role !== 'owner' && !(organization.isPersonal && role === 'user')) {
    throw AppError.forbidden('Only the owner can manage the subscription');
  }
  return organization;
}

export async function resolveSubscription(orgId: string, session: ClientSession, now = new Date()) {
  // Recover reservations left by a terminated process. Heartbeats protect live requests.
  const expiredRuns = await UsageRunModel.find({
    orgId,
    status: 'reserved',
    leaseExpiresAt: { $lte: now },
  }).session(session);
  for (const run of expiredRuns) {
    await SubscriptionPeriodModel.updateOne(
      { _id: run.periodId },
      { $inc: { [`${run.kind}Reserved`]: -1 } },
      { session },
    );
    run.status = 'failed';
    run.error = 'Worker lease expired; quota released';
    await run.save({ session });
  }
  const organization = await OrganizationModel.findById(orgId).session(session);
  if (!organization) throw AppError.notFound('Organization not found');
  const subscription = await OrganizationSubscriptionModel.findOneAndUpdate(
    { orgId },
    { $setOnInsert: { orgId } },
    { upsert: true, new: true, session },
  );
  const audience = organization.isPersonal ? 'personal' : 'business';
  let period = await SubscriptionPeriodModel.findOne({
    orgId,
    cancelledAt: null,
    'plan.audience': audience,
    'plan.price': { $gt: 0 },
    startsAt: { $lte: now },
    endsAt: { $gt: now },
  })
    .sort({ startsAt: -1 })
    .session(session);

  if (!period && organization.isPersonal) {
    const free = await PlanModel.findOne({ code: 'personal_free' }).session(session).lean();
    if (!free) throw AppError.internal('Subscription plans have not been initialized');
    const dates = vietnamCalendarMonth(now);
    const personalUser = await UserModel.findOne({ orgId }).select('_id').session(session);
    if (!personalUser) throw AppError.conflict('Personal workspace has no account');
    // Free credits belong to the account: recreating a workspace must not reset them.
    const key = `free:${personalUser.id}:${dates.startsAt.toISOString()}`;
    period = await SubscriptionPeriodModel.findOneAndUpdate(
      { key },
      {
        $set: { orgId },
        $setOnInsert: { key, plan: free, ...dates },
      },
      { upsert: true, new: true, session },
    );
  }

  const scheduled = subscription.scheduledDowngrade;
  // Paid downgrade activates only after its next period has actually been paid.
  if (scheduled && scheduled.effectiveAt <= now && period?.plan.code === scheduled.planCode) {
    subscription.scheduledDowngrade = undefined;
    await subscription.save({ session });
  }
  let memberLimit = period?.plan.memberLimit ?? 1;
  if (subscription.scheduledDowngrade) {
    const target = await PlanModel.findOne({
      code: subscription.scheduledDowngrade.planCode,
    }).session(session);
    if (target) memberLimit = Math.min(memberLimit, target.memberLimit);
  }
  return { organization, subscription, period, memberLimit };
}

export async function getSubscription(userId: string, orgId: string) {
  await requireSubscriptionAccess(userId, orgId);
  return mongoose.connection.transaction(async (session) => {
    await lockSubscriptionOrganization(orgId, session);
    const state = await resolveSubscription(orgId, session);
    const memberCount = await UserModel.countDocuments({ orgId }).session(session);
    const futurePeriods = await SubscriptionPeriodModel.find({
      orgId,
      cancelledAt: null,
      'plan.audience': state.organization.isPersonal ? 'personal' : 'business',
      startsAt: { $gt: new Date() },
    })
      .sort({ startsAt: 1 })
      .select('plan startsAt endsAt')
      .session(session);
    const previouslyPaid = await SubscriptionPeriodModel.exists({
      orgId,
      'plan.price': { $gt: 0 },
    }).session(session);
    const period = state.period;
    return {
      orgId,
      status: period ? 'active' : previouslyPaid ? 'expired' : 'unsubscribed',
      plan: period?.plan ?? null,
      periodId: period?.id ?? null,
      startsAt: period?.startsAt ?? null,
      endsAt: period?.endsAt ?? null,
      scheduledDowngrade: state.subscription.scheduledDowngrade ?? null,
      futurePeriods,
      members: {
        count: memberCount,
        limit: state.memberLimit,
        available: Math.max(0, state.memberLimit - memberCount),
      },
      analysis: {
        used: period?.analysisUsed ?? 0,
        reserved: period?.analysisReserved ?? 0,
        limit: period?.plan.analysisLimit ?? 0,
        available: period
          ? Math.max(0, period.plan.analysisLimit - period.analysisUsed - period.analysisReserved)
          : 0,
      },
      chat: {
        used: period?.chatUsed ?? 0,
        reserved: period?.chatReserved ?? 0,
        limit: period?.plan.chatLimit ?? 0,
        available: period
          ? Math.max(0, period.plan.chatLimit - period.chatUsed - period.chatReserved)
          : 0,
      },
    };
  });
}

// Caller must hold the organization lock inside the same transaction as joining.
export async function assertMemberCapacity(orgId: string, session: ClientSession) {
  const state = await resolveSubscription(orgId, session);
  const count = await UserModel.countDocuments({ orgId }).session(session);
  if (count >= state.memberLimit)
    throw new AppError('Member limit reached. Upgrade the organization plan or free a seat.', 403);
}

export async function scheduleDowngrade(userId: string, orgId: string, planCode: PlanCode) {
  await requireSubscriptionAccess(userId, orgId, true);
  return mongoose.connection.transaction(async (session) => {
    await lockSubscriptionOrganization(orgId, session);
    const { subscription, period } = await resolveSubscription(orgId, session);
    if (
      subscription.scheduledDowngrade &&
      (await SubscriptionPeriodModel.exists({
        orgId,
        cancelledAt: null,
        startsAt: { $gte: subscription.scheduledDowngrade.effectiveAt },
        'plan.code': subscription.scheduledDowngrade.planCode,
        'plan.price': { $gt: 0 },
      }).session(session))
    ) {
      throw AppError.conflict(
        'The scheduled downgrade has already been paid and cannot be replaced',
      );
    }
    const target = await PlanModel.findOne({ code: planCode }).session(session);
    if (
      !period ||
      !target ||
      target.audience !== period.plan.audience ||
      target.price >= period.plan.price
    ) {
      throw AppError.badRequest(
        'Choose a lower plan in the same plan family while your paid plan is active',
      );
    }
    const count = await UserModel.countDocuments({ orgId }).session(session);
    if (count > target.memberLimit)
      throw AppError.conflict('Reduce organization members before scheduling this downgrade');
    const lastPaidPeriod = await SubscriptionPeriodModel.findOne({
      orgId,
      cancelledAt: null,
      'plan.price': { $gt: 0 },
      endsAt: { $gt: new Date() },
    })
      .sort({ endsAt: -1 })
      .session(session);
    subscription.scheduledDowngrade = { planCode, effectiveAt: lastPaidPeriod!.endsAt };
    await subscription.save({ session });
    return subscription.scheduledDowngrade;
  });
}

export async function cancelDowngrade(userId: string, orgId: string) {
  await requireSubscriptionAccess(userId, orgId, true);
  return mongoose.connection.transaction(async (session) => {
    await lockSubscriptionOrganization(orgId, session);
    const sub = await OrganizationSubscriptionModel.findOne({ orgId }).session(session);
    if (!sub?.scheduledDowngrade) throw AppError.notFound('No downgrade is scheduled');
    const paid = await SubscriptionPeriodModel.exists({
      orgId,
      cancelledAt: null,
      startsAt: { $gte: sub.scheduledDowngrade.effectiveAt },
      'plan.code': sub.scheduledDowngrade.planCode,
      'plan.price': { $gt: 0 },
    }).session(session);
    if (paid)
      throw AppError.conflict('The downgrade has already been paid; it cannot be cancelled here');
    sub.scheduledDowngrade = undefined;
    await sub.save({ session });
  });
}

/** INTERNAL ONLY: a verified payment adapter must call this; never expose as an owner activation API. */
export async function activatePaidSubscription(
  input: {
    orgId: string;
    planCode: PlanCode;
    amount: number;
    paymentReference: string;
    action: 'purchase' | 'renew' | 'upgrade' | 'downgrade';
  },
  now = new Date(),
) {
  if (!input.paymentReference.trim()) throw AppError.badRequest('Payment reference is required');
  return mongoose.connection.transaction(async (session) => {
    const organization = await lockSubscriptionOrganization(input.orgId, session);
    const existing = await SubscriptionPeriodModel.findOne({
      paymentReference: input.paymentReference,
    }).session(session);
    if (existing) {
      if (
        existing.orgId.toString() !== input.orgId ||
        existing.plan.code !== input.planCode ||
        existing.plan.price !== input.amount ||
        existing.paymentAction !== input.action
      ) {
        throw AppError.conflict('Payment reference was already applied to another purchase');
      }
      return existing;
    }
    const plan = await PlanModel.findOne({ code: input.planCode }).session(session).lean();
    if (
      !plan ||
      plan.price <= 0 ||
      plan.price !== input.amount ||
      plan.audience !== (organization.isPersonal ? 'personal' : 'business')
    ) {
      throw AppError.badRequest('Payment amount or plan does not match this organization');
    }
    const { period: current, subscription } = await resolveSubscription(input.orgId, session, now);
    const last = await SubscriptionPeriodModel.findOne({
      orgId: input.orgId,
      cancelledAt: null,
      'plan.price': { $gt: 0 },
      endsAt: { $gt: now },
    })
      .sort({ endsAt: -1 })
      .session(session);
    let startsAt = now;
    if (input.action === 'purchase') {
      if (last) throw AppError.conflict('An active or prepaid subscription already exists');
      if (subscription.scheduledDowngrade)
        throw AppError.conflict('Complete or cancel the scheduled downgrade first');
    } else if (input.action === 'renew') {
      if (!current || current.plan.code !== plan.code || subscription.scheduledDowngrade) {
        throw AppError.conflict(
          'Renewal requires the same active plan without a scheduled downgrade',
        );
      }
      startsAt = last!.endsAt;
    } else if (input.action === 'upgrade') {
      if (!current || plan.price <= current.plan.price)
        throw AppError.conflict('This is not an upgrade');
      await SubscriptionPeriodModel.updateMany(
        { orgId: input.orgId, cancelledAt: null, endsAt: { $gt: now } },
        { $set: { cancelledAt: now } },
        { session },
      );
      subscription.scheduledDowngrade = undefined;
      await subscription.save({ session });
    } else {
      const scheduled = subscription.scheduledDowngrade;
      if (
        !scheduled ||
        scheduled.planCode !== plan.code ||
        now >= addSubscriptionMonth(scheduled.effectiveAt)
      ) {
        throw AppError.conflict('A matching, payable downgrade must be scheduled first');
      }
      const alreadyPaid = await SubscriptionPeriodModel.exists({
        orgId: input.orgId,
        cancelledAt: null,
        startsAt: scheduled.effectiveAt,
        'plan.code': plan.code,
        'plan.price': { $gt: 0 },
      }).session(session);
      if (alreadyPaid) throw AppError.conflict('The scheduled downgrade period is already paid');
      startsAt = scheduled.effectiveAt > now ? scheduled.effectiveAt : now;
    }
    const members = await UserModel.countDocuments({ orgId: input.orgId }).session(session);
    if (members > plan.memberLimit)
      throw AppError.conflict('Organization exceeds the target member limit');
    const [period] = await SubscriptionPeriodModel.create(
      [
        {
          orgId: input.orgId,
          key: `payment:${input.paymentReference}`,
          paymentReference: input.paymentReference,
          paymentAction: input.action,
          plan,
          startsAt,
          endsAt: addSubscriptionMonth(startsAt),
        },
      ],
      { session },
    );
    return period;
  });
}
