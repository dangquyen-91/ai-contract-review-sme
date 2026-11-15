import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { dashboardInsightsHandler } from '../controllers/dashboard.controller';
import { validate } from '../middlewares/validate.middleware';
import { dashboardQuerySchema } from '../validations/dashboard.validation';

const router = Router();
router.get(
  '/insights',
  requireAuth,
  validate({ query: dashboardQuerySchema }),
  dashboardInsightsHandler,
);
export default router;
