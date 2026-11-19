import mongoose from 'mongoose';
import { AppError } from '../../errors/AppError';
import {
  SubscriptionPeriodModel,
  TopUpPackCode,
  TopUpPackModel,
  UsageTopUpModel,
} from '../../models/subscription.model';
import { lockSubscriptionOrganization, resolveSubscription } from './subscription.service';

export const DEFAULT_TOP_UP_PACKS = [
  { code: 'personal_analysis_10', name: '+10 lượt rà soát', audience: 'personal', kind: 'analysis', units: 10, price: 49000 },
  { code: 'personal_chat_100', name: '+100 lượt chat', audience: 'personal', kind: 'chat', units: 100, price: 29000 },
  { code: 'personal_drafting_10', name: '+10 lượt soạn AI', audience: 'personal', kind: 'drafting', units: 10, price: 49000 },
  { code: 'business_analysis_50', name: '+50 lượt rà soát', audience: 'business', kind: 'analysis', units: 50, price: 199000 },
  { code: 'business_chat_300', name: '+300 lượt chat', audience: 'business', kind: 'chat', units: 300, price: 99000 },
  { code: 'business_drafting_30', name: '+30 lượt soạn AI', audience: 'business', kind: 'drafting', units: 30, price: 149000 },
] as const;

// A checkout stays payable for 15 minutes; refuse top-ups that would likely
// settle after the period they are meant to extend has ended.
const MIN_REMAINING_MS = 30 * 60 * 1000;

export async function seedTopUpPacks() {
  for (const pack of DEFAULT_TOP_UP_PACKS) {
    // Keep prices configured in the database; only add missing packs.
    await TopUpPackModel.updateOne(
      { code: pack.code },
      { $setOnInsert: { ...pack, currency: 'VND' } },
      { upsert: true },
    );
  }
}

export const listTopUpPacks = () =>
  TopUpPackModel.find().sort({ audience: 1, kind: 1, price: 1 }).select('-__v -_id').lean();

/** Validates a checkout: the account needs an active paid plan of the same audience. */
export async function quoteTopUp(orgId: string, packCode: TopUpPackCode, now = new Date()) {
  return mongoose.connection.transaction(async (session) => {
    await lockSubscriptionOrganization(orgId, session);
    const pack = await TopUpPackModel.findOne({ code: packCode }).session(session).lean();
    const { organization, period } = await resolveSubscription(orgId, session, now);
    if (!pack || pack.audience !== (organization.isPersonal ? 'personal' : 'business'))
      throw AppError.badRequest('Gói mua thêm lượt không phù hợp với tài khoản này.');
    if (!period || period.plan.price <= 0)
      throw AppError.forbidden(
        'Cần gói trả phí đang hoạt động để mua thêm lượt. Vui lòng mua hoặc nâng cấp gói.',
        'PAID_PLAN_REQUIRED',
      );
    if (period.endsAt.getTime() - now.getTime() < MIN_REMAINING_MS)
      throw AppError.conflict(
        'Kỳ hiện tại sắp kết thúc. Vui lòng gia hạn gói thay vì mua thêm lượt.',
        'PERIOD_ENDING',
      );
    return { pack, periodId: period.id as string };
  });
}

export interface TopUpSettlement {
  orgId: string;
  packCode: TopUpPackCode;
  amount: number;
  paymentReference: string;
  // Period the owner was topping up at checkout.
  periodId?: string;
}

/** INTERNAL ONLY: a verified payment adapter must call this after settlement. */
export async function activateTopUp(input: TopUpSettlement, now = new Date()) {
  return mongoose.connection.transaction(async (session) => {
    await lockSubscriptionOrganization(input.orgId, session);
    const existing = await UsageTopUpModel.findOne({
      paymentReference: input.paymentReference,
    }).session(session);
    if (existing) {
      if (existing.orgId.toString() !== input.orgId || existing.packCode !== input.packCode)
        throw AppError.conflict('Mã tham chiếu thanh toán đã được dùng cho giao dịch khác.');
      return existing;
    }
    const pack = await TopUpPackModel.findOne({ code: input.packCode }).session(session).lean();
    if (!pack) throw AppError.conflict('Gói mua thêm lượt không còn tồn tại.');
    // Credit the paid period active now (e.g. a renewal that has just started);
    // fall back to the period bought for so a late settlement is never stranded.
    const { period: active } = await resolveSubscription(input.orgId, session, now);
    const target =
      active && active.plan.price > 0
        ? active
        : input.periodId
          ? await SubscriptionPeriodModel.findOne({
              _id: input.periodId,
              orgId: input.orgId,
            }).session(session)
          : null;
    if (!target) throw AppError.conflict('Không tìm thấy kỳ gói để cộng lượt mua thêm.');
    await SubscriptionPeriodModel.updateOne(
      { _id: target._id },
      { $inc: { [`${pack.kind}Bonus`]: pack.units } },
      { session },
    );
    const [credit] = await UsageTopUpModel.create(
      [
        {
          orgId: input.orgId,
          periodId: target._id,
          packCode: pack.code,
          kind: pack.kind,
          units: pack.units,
          amount: input.amount,
          paymentReference: input.paymentReference,
        },
      ],
      { session },
    );
    return credit;
  });
}
