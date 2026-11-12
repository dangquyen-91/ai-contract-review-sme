import { Types } from 'mongoose';
import { AccessTokenPayload } from '../../middlewares/auth.middleware';
import { AppError } from '../../errors/AppError';
import { ContractModel } from '../../models/contract.model';
import { ReviewModel } from '../../models/review.model';
import { OrganizationModel } from '../../models/organization.model';
import { PaymentModel } from '../../models/payment.model';
import { UsageRunModel } from '../../models/subscription.model';
import { percentage, reportWindow, REPORT_TIMEZONE } from './reportFormulas';
import {
  compareReportMetric,
  groupReportDays,
  resolveReportPeriods,
  ReportOptions,
} from './reportPeriods';

type Outcomes = {
  completed: number;
  failed: number;
  cancelled: number;
  timedReviews: number;
  averageDurationMs: number | null;
};
type Day = {
  _id: string;
  completed: number;
  failed: number;
  cancelled: number;
  durationSumMs: number;
  timedReviews: number;
};
type Usage = { _id: Types.ObjectId; completed: number; failed: number };
type ReviewStatistics = {
  outcomes: Outcomes[];
  risks: { _id: string; count: number }[];
  daily: Day[];
  usage: Usage[];
  pending: { _id: string; count: number }[];
};

export function getReports(
  actor: AccessTokenPayload,
  days: number,
  organizationId?: string,
  now = new Date(),
) {
  return getReportSnapshot(actor, reportWindow(days, now), organizationId, now);
}

async function getReportSnapshot(
  actor: AccessTokenPayload,
  window: ReturnType<typeof reportWindow>,
  organizationId?: string,
  now = new Date(),
) {
  if (actor.role !== 'administrator' && !(actor.role === 'owner' && actor.orgId))
    throw AppError.forbidden('Chỉ Admin hoặc Owner được xem báo cáo.');
  if (actor.role === 'owner' && organizationId && organizationId !== actor.orgId)
    throw AppError.forbidden('Bạn chỉ được xem báo cáo của tổ chức mình.');

  const scopeId = actor.role === 'owner' ? actor.orgId : organizationId;
  const scope = scopeId ? { orgId: new Types.ObjectId(scopeId) } : {};
  const range = { $gte: window.from, $lt: window.to };
  const finished = { finishedAt: range, status: { $in: ['completed', 'failed'] } };
  const timed = {
    $and: [
      { $eq: ['$status', 'completed'] },
      { $eq: [{ $type: '$startedAt' }, 'date'] },
      { $eq: [{ $type: '$finishedAt' }, 'date'] },
      { $gte: ['$finishedAt', '$startedAt'] },
    ],
  };

  const dateGroup = (field: string) => ({
    $dateToString: { date: field, format: '%Y-%m-%d', timezone: REPORT_TIMEZONE },
  });
  const [uploadRows, statistics, paymentRows, unitRows, organizations] = await Promise.all([
    ContractModel.aggregate<{ _id: string; count: number }>([
      { $match: { ...scope, createdAt: range } },
      { $group: { _id: dateGroup('$createdAt'), count: { $sum: 1 } } },
    ]),
    ReviewModel.aggregate<ReviewStatistics>([
      {
        $match: {
          ...scope,
          $or: [
            { finishedAt: range },
            { createdAt: range, status: { $in: ['queued', 'running'] } },
          ],
        },
      },
      {
        $facet: {
          outcomes: [
            {
              $match: { finishedAt: range, status: { $in: ['completed', 'failed', 'cancelled'] } },
            },
            {
              $group: {
                _id: null,
                completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
                cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
                timedReviews: { $sum: { $cond: [timed, 1, 0] } },
                averageDurationMs: {
                  $avg: { $cond: [timed, { $subtract: ['$finishedAt', '$startedAt'] }, null] },
                },
              },
            },
          ],
          risks: [
            { $match: { finishedAt: range, status: 'completed' } },
            { $sort: { finishedAt: -1, _id: -1 } },
            {
              $group: {
                _id: '$contractId',
                risk: {
                  $first: {
                    $cond: [
                      { $in: ['$result.overallRiskLevel', ['high', 'medium', 'low', 'none']] },
                      '$result.overallRiskLevel',
                      'unknown',
                    ],
                  },
                },
              },
            },
            { $group: { _id: { $ifNull: ['$risk', 'unknown'] }, count: { $sum: 1 } } },
          ],
          daily: [
            {
              $match: { finishedAt: range, status: { $in: ['completed', 'failed', 'cancelled'] } },
            },
            {
              $group: {
                _id: {
                  $dateToString: {
                    date: '$finishedAt',
                    format: '%Y-%m-%d',
                    timezone: REPORT_TIMEZONE,
                  },
                },
                completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
                cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
                durationSumMs: {
                  $sum: { $cond: [timed, { $subtract: ['$finishedAt', '$startedAt'] }, 0] },
                },
                timedReviews: { $sum: { $cond: [timed, 1, 0] } },
              },
            },
          ],
          usage: [
            { $match: finished },
            {
              $group: {
                _id: '$orgId',
                completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
                total: { $sum: 1 },
              },
            },
            { $sort: { total: -1, _id: 1 } },
            { $limit: 10 },
          ],
          pending: [
            { $match: { createdAt: range, status: { $in: ['queued', 'running'] } } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
          ],
        },
      },
    ]),
    actor.role === 'administrator'
      ? PaymentModel.aggregate<{ _id: string; amount: number; count: number; unfulfilled: number }>(
          [
            { $match: { ...scope, status: 'paid', currency: 'VND', paidAt: range } },
            {
              $group: {
                _id: dateGroup('$paidAt'),
                amount: { $sum: '$amount' },
                count: { $sum: 1 },
                unfulfilled: { $sum: { $cond: [{ $ifNull: ['$fulfilledAt', false] }, 0, 1] } },
              },
            },
          ],
        )
      : Promise.resolve(null),
    UsageRunModel.aggregate<{ _id: { kind: string; date: string }; units: number }>([
      { $match: { ...scope, status: 'succeeded', updatedAt: range } },
      {
        $group: {
          _id: { kind: '$kind', date: dateGroup('$updatedAt') },
          units: { $sum: { $ifNull: ['$units', 1] } },
        },
      },
    ]),
    OrganizationModel.find(actor.role === 'owner' ? { _id: actor.orgId } : {})
      .select('_id name')
      .sort({ name: 1, _id: 1 })
      .limit(200)
      .lean(),
  ]);

  const stats = statistics[0];
  const outcomes = stats?.outcomes[0] ?? {
    completed: 0,
    failed: 0,
    cancelled: 0,
    timedReviews: 0,
    averageDurationMs: null,
  };
  const riskCounts = Object.fromEntries((stats?.risks ?? []).map((row) => [row._id, row.count]));
  const risks = {
    high: riskCounts.high ?? 0,
    medium: riskCounts.medium ?? 0,
    low: riskCounts.low ?? 0,
    none: riskCounts.none ?? 0,
    unknown: riskCounts.unknown ?? 0,
  };
  const assessedContracts = risks.high + risks.medium + risks.low + risks.none;
  const daysByDate = new Map(stats?.daily.map((row) => [row._id, row]));
  const names = new Map(organizations.map((org) => [String(org._id), org.name]));
  // Resolve only organization names. Never include individual users' names or emails in aggregate reports.
  const usageIds = stats?.usage.map((row) => row._id) ?? [];
  const usageOrganizations = await OrganizationModel.find({ _id: { $in: usageIds } })
    .select('_id name')
    .lean();
  for (const org of usageOrganizations) names.set(String(org._id), org.name);
  const units = { analysis: 0, chat: 0, drafting: 0 };
  for (const row of unitRows)
    if (row._id.kind in units) units[row._id.kind as keyof typeof units] += row.units;
  const payments =
    paymentRows?.reduce(
      (sum, row) => ({
        amount: sum.amount + row.amount,
        count: sum.count + row.count,
        unfulfilled: sum.unfulfilled + row.unfulfilled,
      }),
      { amount: 0, count: 0, unfulfilled: 0 },
    ) ?? null;
  const uploadsByDate = new Map(uploadRows.map((row) => [row._id, row.count]));
  const paymentsByDate = new Map(paymentRows?.map((row) => [row._id, row.amount]));
  const unitsByDate = new Map(
    unitRows.map((row) => [`${row._id.date}:${row._id.kind}`, row.units]),
  );
  return {
    computedAt: now,
    timezone: REPORT_TIMEZONE,
    period: {
      days: window.days,
      from: window.from,
      toExclusive: window.to,
      startDate: window.dates[0],
      endDate: window.dates.at(-1)!,
    },
    scope: { type: scopeId ? 'organization' : 'system', organizationId: scopeId ?? null },
    uploadedContracts: uploadRows.reduce((sum, row) => sum + row.count, 0),
    reviews: {
      ...outcomes,
      finished: outcomes.completed + outcomes.failed,
      successRate: percentage(outcomes.completed, outcomes.completed + outcomes.failed),
      queued: stats?.pending.find((row) => row._id === 'queued')?.count ?? 0,
      running: stats?.pending.find((row) => row._id === 'running')?.count ?? 0,
    },
    risks: {
      ...risks,
      assessedContracts,
      highRiskRate: percentage(risks.high, assessedContracts),
      percentages: {
        high: percentage(risks.high, assessedContracts),
        medium: percentage(risks.medium, assessedContracts),
        low: percentage(risks.low, assessedContracts),
        none: percentage(risks.none, assessedContracts),
      },
    },
    payments,
    consumedUnits: {
      analysis: units.analysis ?? 0,
      chat: units.chat ?? 0,
      drafting: units.drafting ?? 0,
    },
    daily: window.dates.map((date) => ({
      date,
      completed: daysByDate.get(date)?.completed ?? 0,
      failed: daysByDate.get(date)?.failed ?? 0,
    })),
    chartDays: window.dates.map((date) => ({
      date,
      uploads: uploadsByDate.get(date) ?? 0,
      completed: daysByDate.get(date)?.completed ?? 0,
      failed: daysByDate.get(date)?.failed ?? 0,
      cancelled: daysByDate.get(date)?.cancelled ?? 0,
      receivedAmount: payments === null ? null : (paymentsByDate.get(date) ?? 0),
      analysis: unitsByDate.get(`${date}:analysis`) ?? 0,
      chat: unitsByDate.get(`${date}:chat`) ?? 0,
      drafting: unitsByDate.get(`${date}:drafting`) ?? 0,
      durationSumMs: daysByDate.get(date)?.durationSumMs ?? 0,
      timedReviews: daysByDate.get(date)?.timedReviews ?? 0,
    })),
    usage: (stats?.usage ?? []).map((row) => ({
      id: String(row._id),
      name: names.get(String(row._id)) ?? 'Không gian cá nhân',
      completed: row.completed,
      failed: row.failed,
      total: row.completed + row.failed,
    })),
    organizations: organizations.map((org) => ({ id: String(org._id), name: org.name })),
  };
}

export async function getComparedReports(
  actor: AccessTokenPayload,
  options: ReportOptions,
  now = new Date(),
) {
  const periods = resolveReportPeriods(options, now);
  const [current, previous] = await Promise.all([
    getReportSnapshot(actor, periods.current, options.organizationId, now),
    periods.previous
      ? getReportSnapshot(actor, periods.previous, options.organizationId, now)
      : Promise.resolve(null),
  ]);
  const currentBuckets = groupReportDays(current.chartDays, periods.granularity);
  const previousBuckets = previous ? groupReportDays(previous.chartDays, periods.granularity) : [];
  const values = (report: typeof current) => ({
    uploads: report.uploadedContracts,
    completed: report.reviews.completed,
    failed: report.reviews.failed,
    success: report.reviews.successRate,
    risk: report.risks.highRiskRate,
    duration: report.reviews.averageDurationMs,
    units: report.consumedUnits.analysis,
    chat: report.consumedUnits.chat,
    drafting: report.consumedUnits.drafting,
    payments: report.payments?.amount ?? null,
  });
  const currentValues = values(current);
  const previousValues = previous ? values(previous) : null;
  const metricKeys = Object.keys(currentValues) as (keyof typeof currentValues)[];
  const changes = Object.fromEntries(
    metricKeys.map((key) => [
      key,
      compareReportMetric(
        currentValues[key],
        previousValues?.[key] ?? null,
        ['success', 'risk'].includes(key),
      ),
    ]),
  );
  return {
    ...current,
    period: {
      ...current.period,
      kind: periods.period,
      anchorDate: periods.anchorDate,
      partial: periods.current.partial,
      nominalEndDate: periods.current.nominalEndDate,
    },
    comparison: {
      mode: periods.comparison,
      period:
        previous && periods.previous
          ? { ...previous.period, partial: periods.previous.partial }
          : null,
      changes,
      previousRisk: previous?.risks ?? null,
    },
    trend: {
      granularity: periods.granularity,
      buckets: Array.from(
        { length: Math.max(currentBuckets.length, previousBuckets.length) },
        (_, index) => ({
          index: index + 1,
          label: currentBuckets[index]?.date ?? previousBuckets[index]?.date ?? '',
          current: currentBuckets[index] ?? null,
          previous: previousBuckets[index] ?? null,
        }),
      ),
    },
  };
}
