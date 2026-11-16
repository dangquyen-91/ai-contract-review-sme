import { closeQueues } from '../config/queue';
import { terminateOcr } from './contract/textExtraction.service';
import { startExtractionWorker } from './contract/extractionWorker.service';
import { startClassificationWorker } from './contract/classificationWorker.service';
import { startUnsupportedCleanupWorker } from './contract/unsupportedCleanup.service';
import { startReviewWorker } from './review/reviewWorker.service';
import { startLegalIngestionWorker } from './legal/legalIngestionWorker.service';
import { backfillTextSignatures } from './contract/versionMatch.service';
import { logger } from '../config/logger';

export function startBackgroundWorkers() {
  startExtractionWorker();
  startClassificationWorker();
  startUnsupportedCleanupWorker();
  startReviewWorker();
  startLegalIngestionWorker();
  backfillTextSignatures().catch((err) =>
    logger.warn('Failed to backfill contract text signatures', { error: err instanceof Error ? err.message : String(err) }),
  );
}

export async function stopBackgroundWork() {
  await closeQueues();
  await terminateOcr().catch(() => undefined);
}
