import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/rbac.middleware';
import { validate } from '../middlewares/validate.middleware';
import { managerPaymentListSchema } from '../validations/payment.validation';
import { listAllPaymentsHandler } from '../controllers/payment.controller';

// Read-only payment history across every account, for Managers.
const router = Router();
router.use(requireAuth, requireRole('manager'));
router.get('/', validate({ query: managerPaymentListSchema }), listAllPaymentsHandler);

export default router;
