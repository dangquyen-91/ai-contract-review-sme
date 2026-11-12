import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/ApiResponse';
import { getDashboard } from '../services/dashboard/dashboard.service';

export const getDashboardHandler = asyncHandler(async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  ok(res, await getDashboard(req.user!));
});
