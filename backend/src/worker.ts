import { connectDB, disconnectDB } from './config/db';
import { logger } from './config/logger';
import { assertRedisReachable, closeQueues } from './config/queue';
import { terminateOcr } from './services/textExtraction.service';
import { startExtractionWorker } from './services/extractionWorker.service';

async function bootstrap() {
  await connectDB();
  await assertRedisReachable();
  startExtractionWorker();
  logger.info('Background workers started');

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, stopping background workers`);
    await closeQueues();
    await terminateOcr().catch(() => undefined);
    await disconnectDB();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  logger.error('Failed to start background workers', err);
  process.exit(1);
});
