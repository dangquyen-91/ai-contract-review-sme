import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/rbac.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/ApiResponse';
import { getComparedReports, getReports } from '../services/reporting/reports.service';
import { reportQuerySchema } from '../validations/reports.validation';

const router = Router();
router.get(
  '/',
  requireAuth,
  requireRole('administrator', 'owner'),
  asyncHandler(async (req, res) => {
    const { days, organizationId, ...options } = reportQuerySchema.parse(req.query);
    res.setHeader('Cache-Control', 'private, no-store');
    ok(
      res,
      days !== undefined
        ? await getReports(req.user!, days, organizationId)
        : await getComparedReports(req.user!, {
            ...options,
            period: options.period ?? 'month',
            organizationId,
          }),
    );
  }),
);
export default router;
