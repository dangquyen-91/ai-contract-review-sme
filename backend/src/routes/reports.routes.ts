import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/rbac.middleware';
import { validate } from '../middlewares/validate.middleware';
import { getReportsHandler } from '../controllers/reports.controller';
import { reportQuerySchema } from '../validations/reports.validation';

const router = Router();
router.get(
  '/',
  requireAuth,
  requireRole('administrator', 'owner'),
  validate({ query: reportQuerySchema }),
  getReportsHandler,
);
export default router;
