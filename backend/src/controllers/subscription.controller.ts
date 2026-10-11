import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/ApiResponse';
import * as service from '../services/subscription.service';

export const listPlansHandler = asyncHandler(async (_req, res) => {
  ok(res, await service.listPlans());
});
export const getSubscriptionHandler = asyncHandler(async (req, res) => {
  ok(res, await service.getSubscription(req.user!.sub, req.params.id));
});
export const scheduleDowngradeHandler = asyncHandler(async (req, res) => {
  ok(res, await service.scheduleDowngrade(req.user!.sub, req.params.id, req.body.planCode));
});
export const cancelDowngradeHandler = asyncHandler(async (req, res) => {
  await service.cancelDowngrade(req.user!.sub, req.params.id);
  res.status(204).send();
});
