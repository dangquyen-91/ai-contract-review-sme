import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/rbac.middleware';
import { validate } from '../middlewares/validate.middleware';
import { aiJobListSchema, aiJobParamsSchema, auditListSchema } from '../validations/adminOperations.validation';
import {
  aiJobOverviewHandler,
  cancelAiJobHandler,
  listAiJobsHandler,
  listAuditEventsHandler,
} from '../controllers/adminOperations.controller';

// Platform operations: AI job monitoring and the audit log, for Administrators only.
const router = Router();
router.use(requireAuth, requireRole('administrator'));
router.get('/ai-jobs/overview', aiJobOverviewHandler);
router.get('/ai-jobs', validate({ query: aiJobListSchema }), listAiJobsHandler);
router.post('/ai-jobs/:id/cancel', validate({ params: aiJobParamsSchema }), cancelAiJobHandler);
router.get('/audit-log', validate({ query: auditListSchema }), listAuditEventsHandler);

export default router;
