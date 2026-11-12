import type { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/ApiResponse';
import { getComparedReports, getReports } from '../services/reporting/reports.service';
import type { reportQuerySchema } from '../validations/reports.validation';

export const getReportsHandler = asyncHandler(async (req, res) => {
  const { days, organizationId, ...options } = req.query as unknown as z.infer<
    typeof reportQuerySchema
  >;
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
});
