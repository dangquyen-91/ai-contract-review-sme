import { createQueue, createWorker } from '../../config/queue';
import { logger } from '../../config/logger';
import { ContractModel } from '../../models/contract.model';
import { deleteContract } from './contract.service';

const CLEANUP_QUEUE = 'contract-cleanup';
const UNSUPPORTED_RETENTION_MS = 7 * 24 * 3600 * 1000;
const CLEANUP_EVERY_MS = 6 * 3600 * 1000;
const BATCH_SIZE = 100;

export async function deleteExpiredUnsupportedContracts(now = new Date()): Promise<number> {
  const expired = await ContractModel.find({
    status: 'unsupported',
    type: null,
    updatedAt: { $lt: new Date(now.getTime() - UNSUPPORTED_RETENTION_MS) },
  })
    .select('orgId')
    .limit(BATCH_SIZE);
  let deleted = 0;
  for (const contract of expired) {
    try {
      await deleteContract(contract.orgId.toString(), contract.id);
      deleted++;
    } catch (err) {
      logger.warn('Failed to delete an expired unsupported contract', {
        contractId: contract.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return deleted;
}

export function startUnsupportedCleanupWorker() {
  const queue = createQueue(CLEANUP_QUEUE);
  queue
    .upsertJobScheduler('delete-expired-unsupported', { every: CLEANUP_EVERY_MS }, {
      name: 'cleanup',
      opts: { removeOnComplete: { count: 20 }, removeOnFail: { count: 50 } },
    })
    .catch((err) =>
      logger.warn('Failed to schedule unsupported contract cleanup', {
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  return createWorker<unknown, { deleted: number }>(CLEANUP_QUEUE, async () => ({
    deleted: await deleteExpiredUnsupportedContracts(),
  }));
}
