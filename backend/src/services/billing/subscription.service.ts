import mongoose, { ClientSession } from 'mongoose';
import { AppError } from '../../errors/AppError';
import { OrganizationModel } from '../../models/organization.model';
import { OrganizationInvitationModel } from '../../models/organizationInvitation.model';
import { UserModel } from '../../models/user.model';
import { Role } from '../../models/role.model';
import {
  OrganizationSubscriptionModel,
  PlanModel,
  PlanCode,
  SubscriptionPeriodModel,
  UsageRunModel,
} from '../../models/subscription.model';
import { readUsageCounter } from './usagePolicy';
import { REVIEW_PAGES_PER_UNIT } from './reviewCost';
import { env } from '../../config/env';
import { addSubscriptionMonth, vietnamCalendarMonth } from '../../utils/subscriptionPeriods';
import { findBillingAccount } from './billingAccount.service';
import { ContractReviewPurchaseModel } from '../../models/contractReviewPurchase.model';

export const DEFAULT_PLANS = [
  {
    code: 'personal_free',
    name: 'Personal Free',
    audience: 'personal',
    price: 0,
    currency: 'VND',
    analysisLimit: 3,
    draftingLimit: 0,
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
    draftingLimit: 0,
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
    draftingLimit: 50,
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
    draftingLimit: 150,
    chatLimit: 1500,
    memberLimit: 15,
  },
] as const;

const FREE_BUSINESS_MEMBER_LIMIT = 3;

export async function seedPlans() {
  for (const plan of DEFAULT_PLANS) {
    await PlanModel.updateOne({ code: plan.code }, { $setOnInsert: plan }, { upsert: true });
    // Add the new benefit without overwriting configured prices, limits or historical usage.
    await PlanModel.updateOne(
      { code: plan.code, draftingLimit: { $exists: false } },
      { $set: { draftingLimit: plan.draftingLimit } },
    );
    await SubscriptionPeriodModel.updateMany(
      { 'plan.code': plan.code, 'plan.draftingLimit': { $exists: false } },
      { $set: { 'plan.draftingLimit': plan.draftingLimit } },
    );
  }
}

export const listPlans = () => PlanModel.find().sort({ price: 1 }).select('-__v').lean();

// Shared organization lock: payments, downgrade changes and invitation acceptance serialize here.
export async function lockSubscriptionOrganization(orgId: string, session: ClientSession) {
  return findBillingAccount(orgId, session, true);
}

export async function requireSubscriptionAccess(userId: string, orgId: string, ownerOnly = false) {
  if (userId === orgId) {
    const account = await findBillingAccount(orgId);
    if (account.userId === userId) return account;
    throw AppError.forbidden('Bạn không có quyền quản lý gói dịch vụ này.');
  }
  const user = await UserModel.findOne({ _id: userId, orgId, isActive: true }).populate('roleId');
  if (!user)
    throw AppError.forbidden('Bạn không thuộc tổ chức này hoặc tài khoản đã bị vô hiệu hóa.');
  const organization = await OrganizationModel.findById(orgId);
  if (!organization) throw AppError.notFound('Không tìm thấy tổ chức.');
  const role = (user.roleId as unknown as Role).code;
  if (ownerOnly && role !== 'owner' && !(organization.isPersonal && role === 'user')) {
    throw AppError.forbidden(
      'Chỉ chủ tổ chức hoặc chủ tài khoản cá nhân được quản lý gói dịch vụ.',
    );
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
    if (run.reviewPurchaseId)
      await ContractReviewPurchaseModel.updateOne(
        {
          _id: run.reviewPurchaseId,
          status: 'reserved',
          runId: run._id,
        },
        { $set: { status: 'available' }, $unset: { runId: '' } },
        { session },
      );
    else
      await SubscriptionPeriodModel.updateOne(
        { _id: run.periodId },
        { $inc: { [`${run.kind}Reserved`]: -(run.units ?? 1) } },
        { session },
      );
    run.status = 'failed';
    run.error = 'Tác vụ đã hết thời gian xử lý; các lượt đã giữ được hoàn lại.';
    await run.save({ session });
  }
  const organization = await findBillingAccount(orgId, session);
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
    if (!free)
      throw AppError.internal(
        'Các gói dịch vụ chưa được khởi tạo. Vui lòng liên hệ quản trị viên.',
      );
    const dates = vietnamCalendarMonth(now);
    const personalUser = await UserModel.findOne(
      organization.userId ? { _id: organization.userId } : { orgId },
    )
      .select('_id')
      .session(session);
    if (!personalUser)
      throw AppError.conflict('Không tìm thấy tài khoản của không gian cá nhân này.');
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
  // An unpaid organization can collaborate with two invitees plus its owner.
  // Personal workspaces remain single-user until converted to an organization.
  let memberLimit =
    period?.plan.memberLimit ?? (organization.isPersonal ? 1 : FREE_BUSINESS_MEMBER_LIMIT);
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
    const memberCount = state.organization.userId
      ? 1
      : await UserModel.countDocuments({ orgId }).session(session);
    const pendingInvitations = await OrganizationInvitationModel.countDocuments({
      orgId,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    }).session(session);
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
        pending: pendingInvitations,
        limit: state.memberLimit,
        available: Math.max(0, state.memberLimit - memberCount - pendingInvitations),
      },
      analysis: readUsageCounter(period, 'analysis'),
      chat: readUsageCounter(period, 'chat'),
      drafting: readUsageCounter(period, 'drafting'),
      reviewPagesPerUnit: REVIEW_PAGES_PER_UNIT,
      ...(state.organization.isPersonal ? {
        contractReviewPricing: { unitPrice: env.PERSONAL_REVIEW_PRICE_PER_UNIT, pagesPerUnit: REVIEW_PAGES_PER_UNIT },
      } : {}),
    };
  });
}

// Caller must hold the organization lock inside the same transaction as joining.
export async function assertMemberCapacity(orgId: string, session: ClientSession) {
  const state = await resolveSubscription(orgId, session);
  const count = await UserModel.countDocuments({ orgId }).session(session);
  if (count >= state.memberLimit)
    throw AppError.forbidden(
      'Đã đạt giới hạn thành viên. Vui lòng nâng cấp gói hoặc xóa bớt thành viên.',
      'MEMBER_LIMIT_REACHED',
    );
}

// Call after locking the organization; pending invitations reserve seats until accepted,
// revoked, expired, or marked delivery_failed.
export async function assertInvitationCapacity(orgId: string, session: ClientSession) {
  const state = await resolveSubscription(orgId, session);
  const members = await UserModel.countDocuments({ orgId }).session(session);
  const pending = await OrganizationInvitationModel.countDocuments({
    orgId,
    status: 'pending',
    expiresAt: { $gt: new Date() },
  }).session(session);
  if (members + pending >= state.memberLimit)
    throw AppError.forbidden(
      'Đã đạt giới hạn thành viên. Vui lòng nâng cấp gói hoặc xóa bớt thành viên.',
      'MEMBER_LIMIT_REACHED',
    );
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
      throw AppError.conflict('Lịch hạ gói đã được thanh toán nên không thể thay thế.');
    }
    const target = await PlanModel.findOne({ code: planCode }).session(session);
    if (
      !period ||
      !target ||
      target.audience !== period.plan.audience ||
      target.price >= period.plan.price
    ) {
      throw AppError.badRequest(
        'Vui lòng chọn gói thấp hơn, cùng loại cá nhân hoặc doanh nghiệp, khi gói trả phí hiện tại còn hiệu lực.',
      );
    }
    const count = await UserModel.countDocuments({ orgId }).session(session);
    if (count > target.memberLimit)
      throw AppError.conflict(
        'Vui lòng giảm số thành viên cho phù hợp với gói mới trước khi lên lịch hạ gói.',
      );
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
    if (!sub?.scheduledDowngrade) throw AppError.notFound('Chưa có lịch hạ gói.');
    const paid = await SubscriptionPeriodModel.exists({
      orgId,
      cancelledAt: null,
      startsAt: { $gte: sub.scheduledDowngrade.effectiveAt },
      'plan.code': sub.scheduledDowngrade.planCode,
      'plan.price': { $gt: 0 },
    }).session(session);
    if (paid) throw AppError.conflict('Kỳ hạ gói đã được thanh toán nên không thể hủy tại đây.');
    sub.scheduledDowngrade = undefined;
    await sub.save({ session });
  });
}

export interface PaidSubscriptionInput {
  orgId: string;
  planCode: PlanCode;
  amount: number;
  paymentReference: string;
  action: 'purchase' | 'renew' | 'upgrade' | 'downgrade';
}

// The same validation runs before checkout and again after verified settlement.
export async function validatePaidSubscriptionPurchase(input: PaidSubscriptionInput) {
  await applyPaidSubscription(input, new Date(), true);
}

/** INTERNAL ONLY: a verified payment adapter must call this; never expose as an owner activation API. */
export async function activatePaidSubscription(input: PaidSubscriptionInput, now = new Date()) {
  return (await applyPaidSubscription(input, now, false))!;
}

async function applyPaidSubscription(
  input: PaidSubscriptionInput,
  now = new Date(),
  validateOnly = false,
) {
  if (!input.paymentReference.trim()) throw AppError.badRequest('Thiếu mã tham chiếu thanh toán.');
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
        throw AppError.conflict('Mã tham chiếu thanh toán đã được dùng cho giao dịch khác.');
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
      throw AppError.badRequest(
        'Số tiền thanh toán hoặc gói dịch vụ không phù hợp với tài khoản này.',
      );
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
      if (last)
        throw AppError.conflict('Đã có gói đang hoạt động hoặc kỳ gói đã thanh toán trước.');
      if (subscription.scheduledDowngrade)
        throw AppError.conflict('Vui lòng hoàn tất hoặc hủy lịch hạ gói trước.');
    } else if (input.action === 'renew') {
      if (!current || current.plan.code !== plan.code || subscription.scheduledDowngrade) {
        throw AppError.conflict(
          'Chỉ có thể gia hạn cùng gói đang hoạt động khi chưa có lịch hạ gói.',
        );
      }
      startsAt = last!.endsAt;
    } else if (input.action === 'upgrade') {
      if (!current || plan.price <= current.plan.price)
        throw AppError.conflict('Gói được chọn không phải là gói nâng cấp.');
    } else {
      const scheduled = subscription.scheduledDowngrade;
      if (
        !scheduled ||
        scheduled.planCode !== plan.code ||
        now >= addSubscriptionMonth(scheduled.effectiveAt)
      ) {
        throw AppError.conflict('Vui lòng lên lịch hạ gói phù hợp trước khi thanh toán.');
      }
      const alreadyPaid = await SubscriptionPeriodModel.exists({
        orgId: input.orgId,
        cancelledAt: null,
        startsAt: scheduled.effectiveAt,
        'plan.code': plan.code,
        'plan.price': { $gt: 0 },
      }).session(session);
      if (alreadyPaid) throw AppError.conflict('Kỳ hạ gói đã được thanh toán.');
      startsAt = scheduled.effectiveAt > now ? scheduled.effectiveAt : now;
    }
    const members = await UserModel.countDocuments({ orgId: input.orgId }).session(session);
    if (members > plan.memberLimit)
      throw AppError.conflict('Số thành viên hiện tại vượt giới hạn của gói được chọn.');
    if (validateOnly) return null;
    if (input.action === 'upgrade') {
      await SubscriptionPeriodModel.updateMany(
        { orgId: input.orgId, cancelledAt: null, endsAt: { $gt: now } },
        { $set: { cancelledAt: now } },
        { session },
      );
      subscription.scheduledDowngrade = undefined;
      await subscription.save({ session });
    }
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
