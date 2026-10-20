import { createApp } from './app';
import { connectDB, disconnectDB } from './config/db';
import { env } from './config/env';
import { logger } from './config/logger';
import { assertRedisReachable } from './config/queue';
import { seedDefaultRoles } from './services/identity/role.service';
import {
  ensureLegalTextIndex,
  ensureLegalVectorIndex,
} from './services/legal/legalKnowledgeIngest.service';
import { seedDefaultClauseTaxonomy } from './services/analysis/clauseTypeTaxonomy.service';
import { seedDefaultContractProfiles } from './services/contract/contractProfile.service';
import { startBackgroundWorkers, stopBackgroundWork } from './services/workers.service';
import { OrganizationInvitationModel } from './models/organizationInvitation.model';
import { initializeSubscriptionModels } from './models/subscription.model';
import { seedPlans } from './services/billing/subscription.service';
import { EmailVerificationModel } from './models/emailVerification.model';
import { PaymentModel } from './models/payment.model';

async function bootstrap() {
  await connectDB();
  await assertRedisReachable();
  await OrganizationInvitationModel.init();
  await EmailVerificationModel.init();
  await PaymentModel.init();
  await initializeSubscriptionModels();
  await seedPlans();
  await seedDefaultRoles();
  await seedDefaultClauseTaxonomy();
  await seedDefaultContractProfiles();
  await ensureLegalVectorIndex();
  await ensureLegalTextIndex();

  if (env.START_WORKERS) {
    startBackgroundWorkers();
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
      await stopBackgroundWork();
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
