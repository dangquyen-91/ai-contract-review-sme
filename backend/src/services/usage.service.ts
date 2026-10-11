import { createHash } from 'crypto';
import mongoose from 'mongoose';
import { AppError } from '../errors/AppError';
import { UsageRunModel, SubscriptionPeriodModel } from '../models/subscription.model';
import { UserModel } from '../models/user.model';
import { ContractModel } from '../models/contract.model';
import { lockSubscriptionOrganization, resolveSubscription } from './subscription.service';

export interface UsageInput {
  orgId: string;
  userId: string;
  contractId: string;
  kind: 'analysis' | 'chat';
  idempotencyKey: string;
  payload: unknown;
}
const LEASE_MS = 5 * 60 * 1000;

export async function reserveUsage(input: UsageInput, now = new Date()) {
  const fingerprint = createHash('sha256')
    .update(
      JSON.stringify({
        userId: input.userId,
        contractId: input.contractId,
        payload: input.payload,
      }),
    )
    .digest('hex');
  return mongoose.connection.transaction(async (session) => {
    await lockSubscriptionOrganization(input.orgId, session);
    const user = await UserModel.exists({
      _id: input.userId,
      orgId: input.orgId,
      isActive: true,
    }).session(session);
    if (!user) throw AppError.forbidden('Organization access denied');
    if (
      !(await ContractModel.exists({ _id: input.contractId, orgId: input.orgId }).session(session))
    ) {
      throw AppError.notFound('Contract not found');
    }
    const { period } = await resolveSubscription(input.orgId, session, now);
    const existing = await UsageRunModel.findOne({
      orgId: input.orgId,
      kind: input.kind,
      idempotencyKey: input.idempotencyKey,
    })
      .select('+result')
      .session(session);
    if (existing) {
      if (existing.fingerprint !== fingerprint)
        throw AppError.conflict('Idempotency key was used for another request');
      if (existing.status === 'succeeded') return { run: existing, replayed: true };
      throw AppError.conflict(
        existing.status === 'reserved'
          ? 'Request is already running'
          : 'Request failed. Use a new idempotency key to retry.',
      );
    }
    if (!period) throw new AppError('An active Business plan is required to use AI', 403);
    if (
      input.kind === 'analysis' &&
      (await UsageRunModel.exists({
        orgId: input.orgId,
        contractId: input.contractId,
        kind: 'analysis',
        status: 'reserved',
      }).session(session))
    ) {
      throw AppError.conflict('A complete analysis is already running for this contract');
    }
    const used = input.kind === 'analysis' ? period.analysisUsed : period.chatUsed;
    const reserved = input.kind === 'analysis' ? period.analysisReserved : period.chatReserved;
    const limit = input.kind === 'analysis' ? period.plan.analysisLimit : period.plan.chatLimit;
    if (used + reserved >= limit)
      throw new AppError(
        `${input.kind} quota exhausted. Upgrade your plan or wait for the next period.`,
        403,
      );
    await SubscriptionPeriodModel.updateOne(
      { _id: period._id },
      { $inc: { [`${input.kind}Reserved`]: 1 } },
      { session },
    );
    const [run] = await UsageRunModel.create(
      [
        {
          orgId: input.orgId,
          userId: input.userId,
          contractId: input.contractId,
          periodId: period._id,
          kind: input.kind,
          idempotencyKey: input.idempotencyKey,
          fingerprint,
          leaseExpiresAt: new Date(now.getTime() + LEASE_MS),
        },
      ],
      { session },
    );
    return { run, replayed: false };
  });
}

export async function finishUsage(
  orgId: string,
  runId: string,
  success: boolean,
  result?: unknown,
) {
  return mongoose.connection.transaction(async (session) => {
    await lockSubscriptionOrganization(orgId, session);
    const run = await UsageRunModel.findOne({ _id: runId, orgId }).session(session);
    if (!run) throw AppError.notFound('Usage run not found');
    if (run.status === 'succeeded') return;
    if (run.status !== 'reserved' || run.leaseExpiresAt <= new Date()) {
      if (success)
        throw AppError.conflict('AI request lease expired; its result cannot be finalized');
      if (run.status !== 'reserved') return;
    }
    await SubscriptionPeriodModel.updateOne(
      { _id: run.periodId },
      {
        $inc: {
          [`${run.kind}Reserved`]: -1,
          ...(success ? { [`${run.kind}Used`]: 1 } : {}),
        },
      },
      { session },
    );
    run.status = success ? 'succeeded' : 'failed';
    if (success) run.result = result;
    else run.error = 'Request failed or was cancelled; reserved quota released';
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
  const heartbeat = setInterval(() => {
    void UsageRunModel.updateOne(
      { _id: run._id, status: 'reserved', leaseExpiresAt: { $gt: new Date() } },
      { $set: { leaseExpiresAt: new Date(Date.now() + LEASE_MS) } },
    )
      .then((updated) => {
        if (!updated.modifiedCount) controller.abort();
      })
      .catch(() => controller.abort());
  }, 60_000);
  heartbeat.unref();
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
    clearInterval(heartbeat);
    parentSignal?.removeEventListener('abort', onAbort);
  }
}
