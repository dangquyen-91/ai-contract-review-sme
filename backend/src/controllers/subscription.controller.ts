import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/ApiResponse';
import * as service from '../services/billing/subscription.service';
import { listTopUpPacks } from '../services/billing/topUp.service';
import { recordAudit, requestActor } from '../services/audit/audit.service';

export const listPlansHandler = asyncHandler(async (_req, res) => {
  ok(res, await service.listPlans());
});
export const listTopUpPacksHandler = asyncHandler(async (_req, res) => {
  ok(res, await listTopUpPacks());
});
export const getSubscriptionHandler = asyncHandler(async (req, res) => {
  ok(res, await service.getSubscription(req.user!.sub, req.params.id));
});
export const planQuoteHandler = asyncHandler(async (req, res) => {
  ok(res, await service.quotePlanCheckout(req.user!.sub, req.params.id, req.query.planCode as never));
});
export const scheduleDowngradeHandler = asyncHandler(async (req, res) => {
  const scheduled = await service.scheduleDowngrade(req.user!.sub, req.params.id, req.body.planCode);
  await recordAudit({ action: 'subscription.schedule_downgrade', actor: requestActor(req.user), orgId: req.params.id, target: { type: 'subscription', id: req.params.id, label: req.body.planCode }, changes: { planCode: req.body.planCode, effectiveAt: scheduled.effectiveAt } });
  ok(res, scheduled);
});
export const cancelDowngradeHandler = asyncHandler(async (req, res) => {
  await service.cancelDowngrade(req.user!.sub, req.params.id);
  await recordAudit({ action: 'subscription.cancel_downgrade', actor: requestActor(req.user), orgId: req.params.id, target: { type: 'subscription', id: req.params.id } });
  res.status(204).send();
});
