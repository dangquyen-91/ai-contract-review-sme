import { connectDB, disconnectDB } from './config/db';
import { logger } from './config/logger';
import { assertRedisReachable } from './config/queue';
import { startBackgroundWorkers, stopBackgroundWork } from './services/workers.service';

async function bootstrap() {
  await connectDB();
  await assertRedisReachable();
  startBackgroundWorkers();
  logger.info('Background workers started');

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, stopping background workers`);
    await stopBackgroundWork();
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
