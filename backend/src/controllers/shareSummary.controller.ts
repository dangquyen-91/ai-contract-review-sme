import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { getOrganizationUser } from '../middlewares/auth.middleware';
import { ok } from '../utils/ApiResponse';
import { getShareSummary } from '../services/contract/shareSummary.service';

export const getShareSummaryHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getOrganizationUser(req);
  res.set('Cache-Control', 'private, no-store');
  ok(
    res,
    await getShareSummary(
      user.orgId,
      req.params.id,
      req.query.expectedUpdatedAt as string | undefined,
    ),
  );
});
