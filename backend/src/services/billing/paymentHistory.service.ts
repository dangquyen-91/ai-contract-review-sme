import type { FilterQuery } from 'mongoose';
import { OrganizationModel } from '../../models/organization.model';
import { PaymentModel, Payment } from '../../models/payment.model';
import { UserModel } from '../../models/user.model';
import { searchPattern } from '../../utils/regex';

/** Statuses as people read them, not the raw provider states. */
export const PAYMENT_HISTORY_STATUSES = ['fulfilled', 'activating', 'pending', 'cancelled', 'expired', 'failed'] as const;
export const PAYMENT_HISTORY_PURPOSES = ['subscription', 'top_up', 'contract_review'] as const;

export type PaymentHistoryFilters = {
  status?: (typeof PAYMENT_HISTORY_STATUSES)[number] | '';
  purpose?: (typeof PAYMENT_HISTORY_PURPOSES)[number] | '';
  search?: string;
};

const statusQuery: Record<(typeof PAYMENT_HISTORY_STATUSES)[number], FilterQuery<Payment>> = {
  fulfilled: { fulfilledAt: { $ne: null } },
  activating: { paidAt: { $ne: null }, fulfilledAt: null },
  pending: { status: { $in: ['creating', 'pending'] }, paidAt: null },
  cancelled: { status: 'cancelled' },
  expired: { status: 'expired' },
  failed: { status: 'failed' },
};


/** Accounts (organizations or personal users) whose name or email matches `search`. */
async function matchingAccounts(search: string) {
  const pattern = searchPattern(search);
  const [organizations, users] = await Promise.all([
    OrganizationModel.find({ name: pattern }).select('_id').limit(200).lean(),
    UserModel.find({ $or: [{ name: pattern }, { email: pattern }] }).select('_id').limit(200).lean(),
  ]);
  return [...organizations, ...users].map((account) => account._id);
}

/** Every payment order on the platform, newest first, for read-only review by a Manager. */
export async function listAllPayments(page: number, limit: number, filters: PaymentHistoryFilters = {}) {
  const query: FilterQuery<Payment> = {};
  if (filters.status) Object.assign(query, statusQuery[filters.status]);
  if (filters.purpose === 'subscription') query.purpose = { $in: ['subscription', null] };
  else if (filters.purpose) query.purpose = filters.purpose;
  const search = filters.search?.trim();
  if (search && /^\d{1,16}$/.test(search)) query.orderCode = Number(search);
  else if (search) {
    const accounts = await matchingAccounts(search);
    // The paying account, or the person who placed the order.
    query.$or = [{ orgId: { $in: accounts } }, { createdBy: { $in: accounts } }];
  }
  const [orders, total] = await Promise.all([
    PaymentModel.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    PaymentModel.countDocuments(query),
  ]);
  const accountIds = [...new Set(orders.flatMap((order) => [String(order.orgId), String(order.createdBy)]))];
  const [organizations, users] = await Promise.all([
    OrganizationModel.find({ _id: { $in: accountIds } }).select('name').lean(),
    UserModel.find({ _id: { $in: accountIds } }).select('name email').lean(),
  ]);
  const organizationNames = new Map(organizations.map((item) => [String(item._id), item.name]));
  const people = new Map(users.map((item) => [String(item._id), item]));
  const items = orders.map((order) => {
    const orgId = String(order.orgId);
    const owner = people.get(orgId);
    const creator = people.get(String(order.createdBy));
    return {
      orderCode: order.orderCode,
      account: {
        id: orgId,
        type: organizationNames.has(orgId) ? ('organization' as const) : ('personal' as const),
        name: organizationNames.get(orgId) ?? owner?.name ?? 'Tài khoản đã xóa',
      },
      createdBy: creator ? { name: creator.name, email: creator.email } : null,
      purpose: order.purpose ?? 'subscription',
      planCode: order.planCode ?? null,
      packCode: order.packCode ?? null,
      topUpKind: order.topUpKind ?? null,
      topUpUnits: order.topUpUnits ?? null,
      reviewUnits: order.reviewUnits ?? null,
      action: order.action,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
      providerError: order.providerError ?? null,
      createdAt: order.createdAt,
      paidAt: order.paidAt ?? null,
      fulfilledAt: order.fulfilledAt ?? null,
    };
  });
  return { items, total };
}
