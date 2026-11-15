import { Request, Response } from 'express';
import { getDashboard } from '../services/dashboard/dashboard.service';
import { getDashboardInsights } from '../services/reporting/dashboard.service';
import { DashboardQuery } from '../validations/dashboard.validation';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/ApiResponse';

export const getDashboardHandler = asyncHandler(async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'private, no-store');
  ok(res, await getDashboard(req.user!));
});

export const dashboardInsightsHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as DashboardQuery;
  res.setHeader('Cache-Control', 'private, no-store');
  ok(res, await getDashboardInsights(req.user!, query));
});
