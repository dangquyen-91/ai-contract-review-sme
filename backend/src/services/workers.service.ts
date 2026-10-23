import { closeQueues } from '../config/queue';
import { terminateOcr } from './contract/textExtraction.service';
import { startExtractionWorker } from './contract/extractionWorker.service';
import { startClassificationWorker } from './contract/classificationWorker.service';
import { startUnsupportedCleanupWorker } from './contract/unsupportedCleanup.service';
import { startReviewWorker } from './review/reviewWorker.service';
import { startLegalIngestionWorker } from './legal/legalIngestionWorker.service';

export function startBackgroundWorkers() {
  startExtractionWorker();
  startClassificationWorker();
  startUnsupportedCleanupWorker();
  startReviewWorker();
  startLegalIngestionWorker();
}

export async function stopBackgroundWork() {
  await closeQueues();
  await terminateOcr().catch(() => undefined);
}
