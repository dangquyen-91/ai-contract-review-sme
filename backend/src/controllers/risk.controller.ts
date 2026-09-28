import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/ApiResponse';
import { getOrganizationUser } from '../middlewares/auth.middleware';
import * as riskService from '../services/risk.service';

export const detectRisksHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getOrganizationUser(req);
  const findings = await riskService.detectRisks(user.orgId, req.params.id);
  ok(res, findings);
});

export const listRiskFindingsHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getOrganizationUser(req);
  const findings = await riskService.listRiskFindings(user.orgId, req.params.id);
  ok(res, findings);
});
