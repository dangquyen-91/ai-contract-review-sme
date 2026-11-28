import type { FilterQuery } from 'mongoose';
import { ContractModel } from '../../models/contract.model';
import { OrganizationModel } from '../../models/organization.model';
import { REVIEW_ERROR_CODES, REVIEW_STATUSES, ReviewModel } from '../../models/review.model';
import { UsageRunModel } from '../../models/subscription.model';
import { UserModel } from '../../models/user.model';
import { searchPattern } from '../../utils/regex';

type Review = InstanceType<typeof ReviewModel>;

const DAY_MS = 24 * 60 * 60 * 1000;
// A review normally finishes in a few minutes; past these limits it is worth a look.
export const STUCK_RUNNING_MS = 20 * 60 * 1000;
export const STUCK_QUEUED_MS = 30 * 60 * 1000;

export type AiJobFilters = {
  status?: (typeof REVIEW_STATUSES)[number] | 'stuck' | '';
  errorCode?: (typeof REVIEW_ERROR_CODES)[number] | '';
  search?: string;
};

const stuckQuery = (now: Date): FilterQuery<Review> => ({
  $or: [
    { status: 'running', startedAt: { $lt: new Date(now.getTime() - STUCK_RUNNING_MS) } },
    { status: 'queued', createdAt: { $lt: new Date(now.getTime() - STUCK_QUEUED_MS) } },
  ],
});

const isStuck = (review: { status: string; startedAt?: Date | null; createdAt: Date }, now: Date) =>
  (review.status === 'running' && Boolean(review.startedAt) && now.getTime() - review.startedAt!.getTime() > STUCK_RUNNING_MS) ||
  (review.status === 'queued' && now.getTime() - review.createdAt.getTime() > STUCK_QUEUED_MS);

/** Review jobs running or waiting far longer than usual, across the platform. */
export const countStuckAiJobs = (now = new Date()) => ReviewModel.countDocuments(stuckQuery(now));

/** Live state of AI work across the platform: queue, the last 24 hours and failures by cause. */
export async function getAiJobOverview(now = new Date()) {
  const since = new Date(now.getTime() - DAY_MS);
  const [states, finished, errors, stuck, usage] = await Promise.all([
    ReviewModel.aggregate<{ _id: string; count: number }>([
      { $match: { status: { $in: ['queued', 'running'] } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    ReviewModel.aggregate<{ _id: string; count: number; durationMs: number | null }>([
      { $match: { finishedAt: { $gte: since, $lte: now }, status: { $in: ['completed', 'failed', 'cancelled'] } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          durationMs: {
            $avg: { $cond: [{ $and: ['$startedAt', { $eq: ['$status', 'completed'] }] }, { $subtract: ['$finishedAt', '$startedAt'] }, null] },
          },
        },
      },
    ]),
    ReviewModel.aggregate<{ _id: string; count: number }>([
      { $match: { finishedAt: { $gte: since, $lte: now }, status: 'failed' } },
      { $group: { _id: { $ifNull: ['$errorCode', 'UNKNOWN'] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    countStuckAiJobs(now),
    UsageRunModel.aggregate<{ _id: { kind: string; status: string }; runs: number; units: number }>([
      { $match: { updatedAt: { $gte: since, $lte: now }, status: { $in: ['succeeded', 'failed'] } } },
      { $group: { _id: { kind: '$kind', status: '$status' }, runs: { $sum: 1 }, units: { $sum: '$units' } } },
    ]),
  ]);
  const count = (rows: { _id: string; count: number }[], key: string) => rows.find((row) => row._id === key)?.count ?? 0;
  const completed = count(finished, 'completed');
  const failed = count(finished, 'failed');
  const kinds = ['analysis', 'chat', 'drafting'] as const;
  return {
    computedAt: now,
    queued: count(states, 'queued'),
    running: count(states, 'running'),
    stuck,
    last24h: {
      completed,
      failed,
      cancelled: count(finished, 'cancelled'),
      successRate: completed + failed ? (completed / (completed + failed)) * 100 : null,
      averageDurationMs: finished.find((row) => row._id === 'completed')?.durationMs ?? null,
    },
    errors: errors.map((row) => ({ code: row._id, count: row.count })),
    // Every AI request, including chat and drafting, by kind.
    usage: kinds.map((kind) => {
      const pick = (status: string) => usage.find((row) => row._id.kind === kind && row._id.status === status);
      return { kind, succeeded: pick('succeeded')?.runs ?? 0, failed: pick('failed')?.runs ?? 0, units: pick('succeeded')?.units ?? 0 };
    }),
  };
}

/** Review jobs across all workspaces, newest first. Only titles are shown, never contract text. */
export async function listAiJobs(page: number, limit: number, filters: AiJobFilters = {}, now = new Date()) {
  const query: FilterQuery<Review> = {};
  if (filters.status === 'stuck') Object.assign(query, stuckQuery(now));
  else if (filters.status) query.status = filters.status;
  if (filters.errorCode) query.errorCode = filters.errorCode;
  const search = filters.search?.trim();
  if (search) {
    const pattern = searchPattern(search);
    const [organizations, users, contracts] = await Promise.all([
      OrganizationModel.find({ name: pattern }).select('_id').limit(200).lean(),
      UserModel.find({ $or: [{ name: pattern }, { email: pattern }] }).select('_id').limit(200).lean(),
      ContractModel.find({ title: pattern }).select('_id').limit(200).lean(),
    ]);
    const accounts = [...organizations, ...users].map((item) => item._id);
    query.$and = [
      ...((query.$and as FilterQuery<Review>[]) ?? []),
      { $or: [{ orgId: { $in: accounts } }, { requestedBy: { $in: accounts } }, { contractId: { $in: contracts.map((item) => item._id) } }] },
    ];
  }
  const [reviews, total] = await Promise.all([
    ReviewModel.find(query)
      .select('orgId contractId requestedBy status currentStage stageDetail stages errorCode error startedAt finishedAt createdAt')
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ReviewModel.countDocuments(query),
  ]);
  const ids = (key: 'orgId' | 'requestedBy' | 'contractId') => [...new Set(reviews.map((review) => String(review[key])))];
  const [organizations, users, contracts] = await Promise.all([
    OrganizationModel.find({ _id: { $in: ids('orgId') } }).select('name').lean(),
    UserModel.find({ _id: { $in: [...ids('orgId'), ...ids('requestedBy')] } }).select('name email').lean(),
    ContractModel.find({ _id: { $in: ids('contractId') } }).select('title').lean(),
  ]);
  const orgNames = new Map(organizations.map((item) => [String(item._id), item.name]));
  const people = new Map(users.map((item) => [String(item._id), item]));
  const titles = new Map(contracts.map((item) => [String(item._id), item.title]));
  const items = reviews.map((review) => {
    const orgId = String(review.orgId);
    const requester = people.get(String(review.requestedBy));
    return {
      id: String(review._id),
      account: {
        id: orgId,
        type: orgNames.has(orgId) ? ('organization' as const) : ('personal' as const),
        name: orgNames.get(orgId) ?? people.get(orgId)?.name ?? 'Tài khoản đã xóa',
      },
      contractTitle: titles.get(String(review.contractId)) ?? 'Hợp đồng đã xóa',
      requestedBy: requester ? { name: requester.name, email: requester.email } : null,
      status: review.status,
      stuck: isStuck(review, now),
      currentStage: review.currentStage ?? null,
      stageDetail: review.stageDetail ?? null,
      stages: review.stages ?? null,
      errorCode: review.errorCode ?? null,
      error: review.error ?? null,
      createdAt: review.createdAt,
      startedAt: review.startedAt ?? null,
      finishedAt: review.finishedAt ?? null,
      durationMs:
        review.startedAt && review.finishedAt ? review.finishedAt.getTime() - review.startedAt.getTime() : null,
    };
  });
  return { items, total };
}
