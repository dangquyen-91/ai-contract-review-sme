import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/rbac.middleware';
import { getDashboardHandler } from '../controllers/dashboard.controller';

const router = Router();
router.get('/', requireAuth, requireRole('owner', 'staff', 'user'), getDashboardHandler);
export default router;
