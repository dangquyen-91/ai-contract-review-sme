import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/ApiResponse';
import { getOrganizationUser } from '../middlewares/auth.middleware';
import * as summaryService from '../services/summary.service';

export const generateContractSummaryHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getOrganizationUser(req);
  const contract = await summaryService.generateContractSummary(
    user.orgId,
    req.params.id,
    req.body?.analysisFocus,
  );
  ok(res, contract);
});
