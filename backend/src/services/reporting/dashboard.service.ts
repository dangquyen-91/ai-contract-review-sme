import { PipelineStage, Types } from 'mongoose';
import { AccessTokenPayload } from '../../middlewares/auth.middleware';
import { AppError } from '../../errors/AppError';
import { ContractModel } from '../../models/contract.model';
import { ReviewModel } from '../../models/review.model';
import { ExpertReviewModel } from '../../models/expertReview.model';
import { ExpertWorkRecordModel } from '../../models/expertWorkRecord.model';
import { LegalSourceModel } from '../../models/legalSource.model';
import { OrganizationModel } from '../../models/organization.model';
import { UserModel } from '../../models/user.model';
import { UsageRunModel } from '../../models/subscription.model';
import { PaymentModel } from '../../models/payment.model';
import { DashboardQuery } from '../../validations/dashboard.validation';
import { resolveReportPeriods, CalendarReportWindow } from './reportPeriods';
import { REPORT_TIMEZONE } from './reportFormulas';
import { getComparedReports } from './reports.service';
import { countStuckAiJobs } from './aiJobs.service';

type Count = { _id: string; count: number };
type TrendRow = { date: string; [key: string]: number | string | null };
type InsightData = {
  metrics: Record<string, number | null>;
  distribution: { key: string; label?: string; value: number }[];
  trend: TrendRow[];
};
const counts = (rows: Count[]) => Object.fromEntries(rows.map((row) => [row._id, row.count]));
const range = (window: CalendarReportWindow) => ({ $gte: window.from, $lt: window.to });
const dateGroup = (field: string, monthly: boolean) => ({
  $dateToString: { date: field, format: monthly ? '%Y-%m' : '%Y-%m-%d', timezone: REPORT_TIMEZONE },
});

function fillTrend(window: CalendarReportWindow, rows: TrendRow[], keys: string[]) {
  const monthly = window.days > 31;
  const dates = [...new Set(window.dates.map((date) => (monthly ? date.slice(0, 7) : date)))];
  const byDate = new Map(rows.map((row) => [row.date, row]));
  return dates.map((date) => ({
    date,
    ...Object.fromEntries(keys.map((key) => [key, byDate.get(date)?.[key] ?? 0])),
  }));
}

async function operational(
  actor: AccessTokenPayload,
  query: DashboardQuery,
  now: Date,
): Promise<InsightData> {
  // Reuse the report formulas, including latest review per contract, billing
  // settlement and the exact same Vietnam calendar boundaries.
  const report = await getComparedReports(actor, { ...query, comparison: 'none' }, now);
  const orgId = actor.role === 'owner' ? new Types.ObjectId(actor.orgId) : undefined;
  const scope = orgId ? { orgId } : {};
  const [states, openVerification, organizations, users, unfulfilled, stuck] = await Promise.all([
    ReviewModel.aggregate<Count>([
      { $match: { ...scope, status: { $in: ['queued', 'running'] } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    orgId
      ? ExpertReviewModel.countDocuments({ orgId, status: { $in: ['requested', 'in_progress'] } })
      : 0,
    actor.role === 'administrator' ? OrganizationModel.countDocuments({}) : 0,
    actor.role === 'administrator' ? UserModel.countDocuments({ deletedAt: null }) : 0,
    actor.role === 'administrator'
      ? PaymentModel.countDocuments({ status: 'paid', fulfilledAt: null })
      : 0,
    actor.role === 'administrator' ? countStuckAiJobs(now) : 0,
  ]);
  const state = counts(states);
  return {
    metrics: {
      uploads: report.uploadedContracts,
      completed: report.reviews.completed,
      failed: report.reviews.failed,
      successRate: report.reviews.successRate,
      averageDurationMs: report.reviews.averageDurationMs,
      withViolations: report.issues.withViolations,
      queued: state.queued ?? 0,
      running: state.running ?? 0,
      ...(actor.role === 'administrator'
        ? {
            organizations,
            users,
            receivedAmount: report.payments?.amount ?? 0,
            paidOrders: report.payments?.count ?? 0,
            unfulfilled,
            stuck,
          }
        : { openVerification }),
    },
    distribution:
      actor.role === 'administrator'
        ? report.usage.map((row) => ({ key: row.id, label: row.name, value: row.total }))
        : (['withViolations', 'withIssues', 'noIssues'] as const).map((key) => ({ key, value: report.issues[key] })),
    trend: (report.trend?.buckets ?? []).map((bucket) => ({
      date: bucket.label,
      uploads: bucket.current?.uploads ?? 0,
      completed: bucket.current?.completed ?? 0,
      failed: bucket.current?.failed ?? 0,
    })),
  };
}

async function workspace(
  actor: AccessTokenPayload,
  window: CalendarReportWindow,
  mine = false,
): Promise<InsightData> {
  const orgId = new Types.ObjectId(actor.role === 'user' ? actor.sub : actor.orgId);
  const scope = { orgId };
  // "Mine": what this person uploaded, requested or used, inside the same organization.
  const me = new Types.ObjectId(actor.sub);
  const own = (field: string) => (mine ? { [field]: me } : {});
  const monthly = window.days > 31;
  const [contractStates, uploads, reviews, openVerification, usage] = await Promise.all([
    ContractModel.aggregate<Count>([
      { $match: { ...scope, ...own('uploadedBy') } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    ContractModel.aggregate<{ _id: string; count: number }>([
      { $match: { ...scope, ...own('uploadedBy'), createdAt: range(window) } },
      { $group: { _id: dateGroup('$createdAt', monthly), count: { $sum: 1 } } },
    ]),
    ReviewModel.aggregate<{ _id: { date: string; status: string }; count: number }>([
      { $match: { ...scope, ...own('requestedBy'), finishedAt: range(window), status: { $in: ['completed', 'failed'] } } },
      {
        $group: {
          _id: { date: dateGroup('$finishedAt', monthly), status: '$status' },
          count: { $sum: 1 },
        },
      },
    ]),
    ExpertReviewModel.countDocuments({ ...scope, ...own('requestedBy'), status: { $in: ['requested', 'in_progress'] } }),
    UsageRunModel.aggregate<{ _id: string; count: number }>([
      { $match: { ...scope, ...own('userId'), updatedAt: range(window), status: 'succeeded' } },
      { $group: { _id: '$kind', count: { $sum: '$units' } } },
    ]),
  ]);
  const states = counts(contractStates);
  const trend = new Map<string, TrendRow>();
  for (const row of uploads) trend.set(row._id, { date: row._id, uploads: row.count });
  for (const row of reviews) {
    const point = trend.get(row._id.date) ?? { date: row._id.date };
    point[row._id.status] = row.count;
    trend.set(row._id.date, point);
  }
  return {
    metrics: {
      contracts: contractStates.reduce((sum, row) => sum + row.count, 0),
      processing: states.processing ?? 0,
      openVerification,
      uploads: uploads.reduce((sum, row) => sum + row.count, 0),
      completed: reviews
        .filter((row) => row._id.status === 'completed')
        .reduce((sum, row) => sum + row.count, 0),
      failed: reviews
        .filter((row) => row._id.status === 'failed')
        .reduce((sum, row) => sum + row.count, 0),
      ...Object.fromEntries(usage.map((row) => [`${row._id}Units`, row.count])),
    },
    distribution: contractStates.map((row) => ({ key: row._id, value: row.count })),
    trend: fillTrend(window, [...trend.values()], ['uploads', 'completed', 'failed']),
  };
}

async function expert(
  actor: AccessTokenPayload,
  window: CalendarReportWindow,
): Promise<InsightData> {
  const expertId = new Types.ObjectId(actor.sub);
  const monthly = window.days > 31;
  const duration = {
    $and: [
      { $eq: [{ $type: '$assignedAt' }, 'date'] },
      { $eq: [{ $type: '$completedAt' }, 'date'] },
      { $gte: ['$completedAt', '$assignedAt'] },
    ],
  };
  // Current sessions and immutable attempts are deduplicated before counting.
  // A reopened request must not erase or double-count a previous expert's work.
  const pipeline: PipelineStage[] = [
    { $match: { expertId, status: { $in: ['approved', 'returned'] }, completedAt: range(window) } },
    {
      $project: {
        expertReviewId: '$_id',
        attempt: { $ifNull: ['$attempt', 1] },
        status: 1,
        assignedAt: 1,
        completedAt: 1,
        archived: { $literal: false },
      },
    },
    {
      $unionWith: {
        coll: ExpertWorkRecordModel.collection.name,
        pipeline: [
          { $match: { expertId, completedAt: range(window) } },
          {
            $project: {
              expertReviewId: 1,
              attempt: 1,
              status: 1,
              assignedAt: 1,
              completedAt: 1,
              archived: { $literal: true },
            },
          },
        ],
      },
    },
    { $sort: { archived: -1 } },
    {
      $group: {
        _id: { session: '$expertReviewId', attempt: '$attempt' },
        row: { $first: '$$ROOT' },
      },
    },
    { $replaceRoot: { newRoot: '$row' } },
    {
      $facet: {
        statuses: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        duration: [
          {
            $group: {
              _id: null,
              average: {
                $avg: { $cond: [duration, { $subtract: ['$completedAt', '$assignedAt'] }, null] },
              },
            },
          },
        ],
        trend: [
          {
            $group: {
              _id: { date: dateGroup('$completedAt', monthly), status: '$status' },
              count: { $sum: 1 },
            },
          },
        ],
      },
    },
  ];
  const [waiting, inProgress, [result]] = await Promise.all([
    ExpertReviewModel.countDocuments({ status: 'requested' }),
    ExpertReviewModel.countDocuments({ status: 'in_progress', expertId }),
    ExpertReviewModel.aggregate<{
      statuses: Count[];
      duration: { average: number | null }[];
      trend: { _id: { date: string; status: string }; count: number }[];
    }>(pipeline),
  ]);
  const state = counts(result?.statuses ?? []);
  const trend = new Map<string, TrendRow>();
  for (const row of result?.trend ?? []) {
    const point = trend.get(row._id.date) ?? { date: row._id.date };
    point[row._id.status] = row.count;
    trend.set(row._id.date, point);
  }
  return {
    metrics: {
      waiting,
      inProgress,
      approved: state.approved ?? 0,
      returned: state.returned ?? 0,
      averageDurationMs: result?.duration[0]?.average ?? null,
    },
    distribution: ['approved', 'returned'].map((key) => ({ key, value: state[key] ?? 0 })),
    trend: fillTrend(window, [...trend.values()], ['approved', 'returned']),
  };
}

async function management(window: CalendarReportWindow): Promise<InsightData> {
  const monthly = window.days > 31;
  const [organizations, [sources], [payments], unfulfilled] = await Promise.all([
    OrganizationModel.countDocuments({}),
    LegalSourceModel.aggregate<{
      statuses: Count[];
      ingestion: Count[];
      updated: { _id: string; count: number }[];
    }>([
      {
        $facet: {
          statuses: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          ingestion: [{ $group: { _id: '$ingestion.status', count: { $sum: 1 } } }],
          updated: [
            { $match: { updatedAt: range(window) } },
            { $group: { _id: dateGroup('$updatedAt', monthly), count: { $sum: 1 } } },
          ],
        },
      },
    ]),
    // Same receipts as the reports: paid in the period, in VND.
    PaymentModel.aggregate<{ amount: number; count: number }>([
      { $match: { status: 'paid', currency: 'VND', paidAt: range(window) } },
      { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    // Paid but not yet activated, right now; the Manager follows these up in the payment history.
    PaymentModel.countDocuments({ paidAt: { $ne: null }, fulfilledAt: null }),
  ]);
  const statuses = counts(sources?.statuses ?? []);
  const ingestion = counts(sources?.ingestion ?? []);
  return {
    metrics: {
      organizations,
      legalSources: (sources?.statuses ?? []).reduce((sum, row) => sum + row.count, 0),
      inForce: statuses.in_force ?? 0,
      ingestionFailed: ingestion.failed ?? 0,
      ingestionPending:
        (ingestion.queued ?? 0) + (ingestion.running ?? 0) + (ingestion.paused ?? 0),
      updated: (sources?.updated ?? []).reduce((sum, row) => sum + row.count, 0),
      paidAmount: payments?.amount ?? 0,
      paidOrders: payments?.count ?? 0,
      unfulfilled,
    },
    distribution: ['in_force', 'amended', 'repealed', 'not_yet_effective'].map((key) => ({
      key,
      value: statuses[key] ?? 0,
    })),
    trend: fillTrend(
      window,
      (sources?.updated ?? []).map((row) => ({ date: row._id, updated: row.count })),
      ['updated'],
    ),
  };
}

export async function getDashboardInsights(
  actor: AccessTokenPayload,
  query: DashboardQuery,
  now = new Date(),
) {
  if (!['administrator', 'owner', 'staff', 'expert', 'manager', 'user'].includes(actor.role))
    throw AppError.forbidden('Vai trò không có trang tổng quan.');
  if (['owner', 'staff'].includes(actor.role) && !actor.orgId)
    throw AppError.forbidden('Cần chọn không gian tổ chức.');
  const mine = query.mine === 'true';
  if (mine && actor.role !== 'staff')
    throw AppError.badRequest('Chỉ nhân viên tổ chức xem được báo cáo công việc của riêng mình.');
  const { current } = resolveReportPeriods({ period: query.period, comparison: 'none' }, now);
  const data =
    actor.role === 'administrator' || actor.role === 'owner'
      ? await operational(actor, query, now)
      : actor.role === 'expert'
        ? await expert(actor, current)
        : actor.role === 'manager'
          ? await management(current)
          : await workspace(actor, current, mine);
  return {
    role: actor.role,
    scope: {
      type:
        actor.role === 'user'
          ? 'personal'
          : ['owner', 'staff'].includes(actor.role)
            ? 'organization'
            : actor.role === 'expert'
              ? 'expert'
              : 'system',
      id: actor.role === 'user' || actor.role === 'expert' ? actor.sub : (actor.orgId ?? null),
      mine,
    },
    computedAt: now.toISOString(),
    timezone: REPORT_TIMEZONE,
    period: {
      kind: query.period,
      startDate: current.startDate,
      endDate: current.endDate,
      toExclusive: current.to.toISOString(),
      partial: current.partial,
    },
    ...data,
  };
}
