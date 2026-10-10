import { createApp } from './app';
import { connectDB, disconnectDB } from './config/db';
import { env } from './config/env';
import { logger } from './config/logger';
import { assertRedisReachable, closeQueues } from './config/queue';
import { seedDefaultRoles } from './services/role.service';
import { ensureLegalVectorIndex } from './services/legalKnowledgeIngest.service';
import { seedDefaultClauseTaxonomy } from './services/clauseTypeTaxonomy.service';
import { seedDefaultContractProfiles } from './services/contractProfile.service';
import { terminateOcr } from './services/textExtraction.service';
import { startExtractionWorker } from './services/extractionWorker.service';

async function bootstrap() {
  await connectDB();
  await assertRedisReachable();
  await seedDefaultRoles();
  await seedDefaultClauseTaxonomy();
  await seedDefaultContractProfiles();
  await ensureLegalVectorIndex();

  if (env.START_WORKERS) {
    startExtractionWorker();
    logger.info('Background workers started in the API process');
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`Server listening on port ${env.PORT} [${env.NODE_ENV}]`);
    logger.info(`Swagger UI available at http://localhost:${env.PORT}/api-docs`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(async () => {
      await closeQueues();
      await terminateOcr().catch(() => undefined);
      await disconnectDB();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  logger.error('Failed to start server', err);
  process.exit(1);
});
