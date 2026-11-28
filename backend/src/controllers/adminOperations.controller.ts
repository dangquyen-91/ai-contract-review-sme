import { asyncHandler } from '../utils/asyncHandler';
import { ok, paginated } from '../utils/ApiResponse';
import { aiJobListSchema, auditListSchema } from '../validations/adminOperations.validation';
import { getAiJobOverview, listAiJobs } from '../services/reporting/aiJobs.service';
import { cancelReviewAsAdministrator } from '../services/review/review.service';
import { listAuditEvents, recordAudit, requestActor } from '../services/audit/audit.service';

// Vietnam is UTC+7 all year: a calendar day starts at 17:00 UTC the day before.
const vietnamDayStart = (day: string) => new Date(`${day}T00:00:00+07:00`);
const nextDay = (date: Date) => new Date(date.getTime() + 24 * 60 * 60 * 1000);

export const aiJobOverviewHandler = asyncHandler(async (_req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  ok(res, await getAiJobOverview());
});

export const listAiJobsHandler = asyncHandler(async (req, res) => {
  const { page, limit, ...filters } = aiJobListSchema.parse(req.query);
  const { items, total } = await listAiJobs(page, limit, filters);
  res.setHeader('Cache-Control', 'private, no-store');
  paginated(res, items, { page, limit, total });
});

export const cancelAiJobHandler = asyncHandler(async (req, res) => {
  const { orgId, contractTitle, previousStatus, ...result } = await cancelReviewAsAdministrator(req.params.id);
  await recordAudit({
    action: 'ai_job.cancel',
    actor: requestActor(req.user),
    target: { type: 'review', id: req.params.id, label: contractTitle },
    orgId,
    changes: { status: { from: previousStatus, to: result.status }, refunded: result.status === 'cancelled' },
  });
  ok(res, result);
});

export const listAuditEventsHandler = asyncHandler(async (req, res) => {
  const { page, limit, from, to, ...filters } = auditListSchema.parse(req.query);
  const { items, total } = await listAuditEvents(page, limit, {
    ...filters,
    from: from ? vietnamDayStart(from) : undefined,
    to: to ? nextDay(vietnamDayStart(to)) : undefined,
  });
  res.setHeader('Cache-Control', 'private, no-store');
  paginated(res, items, { page, limit, total });
});
