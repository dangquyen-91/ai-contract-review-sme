import { createHash } from 'crypto';
import mongoose, { ClientSession } from 'mongoose';
import { AppError } from '../../errors/AppError';
import { UsageRunModel, SubscriptionPeriodModel } from '../../models/subscription.model';
import { assertUsageAvailable, type UsageKind } from './usagePolicy';
import { assertUsageAccess, assertNoActiveReview, calculateUsageCost } from './usageAccess.service';
import { lockSubscriptionOrganization, resolveSubscription } from './subscription.service';
import { ContractReviewPurchaseModel } from '../../models/contractReviewPurchase.model';

export interface UsageInput {
  orgId: string;
  userId: string;
  contractId?: string;
  draftId?: string;
  versionId?: string;
  confirmedUnits?: number;
  kind: UsageKind;
  idempotencyKey: string;
  payload: unknown;
}
const LEASE_MS = 5 * 60 * 1000;

function usageFingerprint(input: UsageInput) {
  return createHash('sha256')
    .update(
      JSON.stringify({
        userId: input.userId,
        contractId: input.contractId,
        draftId: input.draftId,
        versionId: input.versionId,
        payload: input.payload,
      }),
    )
    .digest('hex');
}

async function findCompletedRun(input: UsageInput, fingerprint: string, session: ClientSession) {
  const existing = await UsageRunModel.findOne({
    orgId: input.orgId,
    kind: input.kind,
    idempotencyKey: input.idempotencyKey,
  })
    .select('+result')
    .session(session);
  if (!existing) return null;
  if (existing.fingerprint !== fingerprint) {
    throw AppError.conflict(
      'Mã yêu cầu đã được dùng cho thao tác khác. Vui lòng tải lại và thử lại.',
    );
  }
  if (existing.status === 'succeeded') return existing;
  if (existing.status === 'reserved') {
    throw AppError.conflict('Yêu cầu đang được xử lý. Vui lòng chờ hoàn tất.');
  }
  throw AppError.conflict('Yêu cầu trước chưa thành công. Vui lòng bắt đầu lại thao tác.');
}

export async function reserveUsage(input: UsageInput, now = new Date(), leaseMs = LEASE_MS) {
  const fingerprint = usageFingerprint(input);
  return mongoose.connection.transaction(async (session) => {
    await lockSubscriptionOrganization(input.orgId, session);
    await assertUsageAccess(input, session);
    const { period } = await resolveSubscription(input.orgId, session, now);
    const existing = await findCompletedRun(input, fingerprint, session);
    if (existing) return { run: existing, replayed: true };
    const cost = await calculateUsageCost(input, session);
    await assertNoActiveReview(input, session);
    const purchase =
      input.kind === 'analysis'
        ? await ContractReviewPurchaseModel.findOne({
            orgId: input.orgId,
            userId: input.userId,
            contractId: input.contractId,
            versionId: cost.versionId,
          }).session(session)
        : null;
    if (purchase) {
      if (purchase.status !== 'available')
        throw AppError.conflict(
          purchase.status === 'consumed'
            ? 'Hợp đồng đã được rà soát bằng lần thanh toán này. Hãy mở kết quả đã lưu.'
            : 'Lần rà soát đã thanh toán đang được xử lý.',
          purchase.status === 'consumed' ? 'PAID_REVIEW_COMPLETED' : 'REVIEW_RUNNING',
        );
      const [run] = await UsageRunModel.create(
        [
          {
            orgId: input.orgId,
            userId: input.userId,
            contractId: input.contractId,
            ...cost,
            reviewPurchaseId: purchase._id,
            kind: input.kind,
            idempotencyKey: input.idempotencyKey,
            fingerprint,
            leaseExpiresAt: new Date(now.getTime() + leaseMs),
          },
        ],
        { session },
      );
      purchase.status = 'reserved';
      purchase.runId = run._id;
      await purchase.save({ session });
      return { run, replayed: false };
    }
    if (!period) {
      const message =
        input.kind === 'drafting'
          ? 'Cần gói doanh nghiệp đang hoạt động để soạn hợp đồng bằng AI.'
          : 'Cần gói dịch vụ AI đang hoạt động để thực hiện thao tác này.';
      throw AppError.forbidden(message, 'AI_PLAN_REQUIRED');
    }
    assertUsageAvailable(period, input.kind, cost.units);
    await SubscriptionPeriodModel.updateOne(
      { _id: period._id },
      { $inc: { [`${input.kind}Reserved`]: cost.units } },
      { session },
    );
    const [run] = await UsageRunModel.create(
      [
        {
          orgId: input.orgId,
          userId: input.userId,
          contractId: input.contractId,
          draftId: input.draftId,
          ...cost,
          periodId: period._id,
          kind: input.kind,
          idempotencyKey: input.idempotencyKey,
          fingerprint,
          leaseExpiresAt: new Date(now.getTime() + leaseMs),
        },
      ],
      { session },
    );
    return { run, replayed: false };
  });
}

export async function extendUsageLease(runId: string, leaseMs = LEASE_MS): Promise<boolean> {
  const updated = await UsageRunModel.updateOne(
    { _id: runId, status: 'reserved', leaseExpiresAt: { $gt: new Date() } },
    { $set: { leaseExpiresAt: new Date(Date.now() + leaseMs) } },
  );
  return updated.matchedCount > 0;
}

export function keepUsageLeaseAlive(runId: string, onLost: () => void, leaseMs = LEASE_MS) {
  const heartbeat = setInterval(() => {
    extendUsageLease(runId, leaseMs)
      .then((alive) => {
        if (!alive) onLost();
      })
      .catch(onLost);
  }, 60_000);
  heartbeat.unref();
  return () => clearInterval(heartbeat);
}

export async function isUsageSucceeded(runId: string): Promise<boolean> {
  return Boolean(await UsageRunModel.exists({ _id: runId, status: 'succeeded' }));
}

export async function finishUsage(
  orgId: string,
  runId: string,
  success: boolean,
  result?: unknown,
  commit?: (session: ClientSession) => Promise<void>,
) {
  return mongoose.connection.transaction(async (session) => {
    await lockSubscriptionOrganization(orgId, session);
    const run = await UsageRunModel.findOne({ _id: runId, orgId }).session(session);
    if (!run) throw AppError.notFound('Không tìm thấy yêu cầu sử dụng AI.');
    if (run.status === 'succeeded') return;
    if (run.status !== 'reserved' || run.leaseExpiresAt <= new Date()) {
      if (success)
        throw AppError.conflict(
          'Yêu cầu AI đã hết thời gian xử lý. Kết quả chưa được lưu; vui lòng thử lại.',
        );
      if (run.status !== 'reserved') return;
    }
    if (success && commit) await commit(session);
    if (run.reviewPurchaseId)
      await ContractReviewPurchaseModel.updateOne(
        {
          _id: run.reviewPurchaseId,
          status: 'reserved',
          runId: run._id,
        },
        {
          $set: { status: success ? 'consumed' : 'available' },
          ...(!success ? { $unset: { runId: '' } } : {}),
        },
        { session },
      );
    else
      await SubscriptionPeriodModel.updateOne(
        { _id: run.periodId },
        {
          $inc: {
            [`${run.kind}Reserved`]: -(run.units ?? 1),
            ...(success ? { [`${run.kind}Used`]: run.units ?? 1 } : {}),
          },
        },
        { session },
      );
    run.status = success ? 'succeeded' : 'failed';
    if (success) run.result = result;
    else run.error = 'Yêu cầu thất bại hoặc đã bị hủy; các lượt đã giữ được hoàn lại.';
    await run.save({ session });
  });
}

export async function withUsage<T>(
  input: UsageInput,
  work: (signal: AbortSignal) => Promise<T>,
  parentSignal?: AbortSignal,
): Promise<{ runId: string; replayed: boolean; result: T }> {
  parentSignal?.throwIfAborted();
  const { run, replayed } = await reserveUsage(input);
  if (replayed) return { runId: run.id, replayed: true, result: run.result as T };
  const controller = new AbortController();
  const onAbort = () => controller.abort(parentSignal?.reason);
  parentSignal?.addEventListener('abort', onAbort, { once: true });
  if (parentSignal?.aborted) onAbort();
  const stopHeartbeat = keepUsageLeaseAlive(run.id, () => controller.abort());
  try {
    controller.signal.throwIfAborted();
    const result = await work(controller.signal);
    controller.signal.throwIfAborted();
    await finishUsage(input.orgId, run.id, true, result);
    return { runId: run.id, replayed: false, result };
  } catch (error) {
    await finishUsage(input.orgId, run.id, false);
    throw error;
  } finally {
    stopHeartbeat();
    parentSignal?.removeEventListener('abort', onAbort);
  }
}
