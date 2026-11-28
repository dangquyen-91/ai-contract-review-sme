import { asyncHandler } from '../utils/asyncHandler';
import { ok, paginated } from '../utils/ApiResponse';
import { managerPaymentListSchema } from '../validations/payment.validation';
import { listAllPayments } from '../services/billing/paymentHistory.service';
import { getIdempotencyKey } from '../validations/subscription.validation';
import * as service from '../services/billing/payment.service';

export const createPaymentHandler = asyncHandler(async (req, res) => {
  ok(
    res,
    await service.createPayment(req.user!.sub, req.params.id, req.body, getIdempotencyKey(req)),
    201,
  );
});
export const listPaymentsHandler = asyncHandler(async (req, res) => {
  ok(res, await service.listPayments(req.user!.sub, req.params.id, Number(req.query.page)));
});
export const getPaymentHandler = asyncHandler(async (req, res) => {
  ok(res, await service.getPayment(req.user!.sub, req.params.id, Number(req.params.orderCode)));
});
export const syncPaymentHandler = asyncHandler(async (req, res) => {
  ok(res, await service.syncPayment(req.user!.sub, req.params.id, Number(req.params.orderCode)));
});
export const cancelPaymentHandler = asyncHandler(async (req, res) => {
  ok(res, await service.cancelPayment(req.user!.sub, req.params.id, Number(req.params.orderCode)));
});
export const payosWebhookHandler = asyncHandler(async (req, res) => {
  await service.receivePaymentWebhook(req.body);
  res.status(200).json({ success: true });
});
export const listAllPaymentsHandler = asyncHandler(async (req, res) => {
  const { page, limit, ...filters } = managerPaymentListSchema.parse(req.query);
  const { items, total } = await listAllPayments(page, limit, filters);
  res.setHeader('Cache-Control', 'private, no-store');
  paginated(res, items, { page, limit, total });
});
