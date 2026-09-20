import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/ApiResponse';
import { AppError } from '../errors/AppError';
import * as riskService from '../services/risk.service';

export const detectRisksHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const findings = await riskService.detectRisks(req.user.orgId, req.params.id);
  ok(res, findings);
});

export const listRiskFindingsHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const findings = await riskService.listRiskFindings(req.user.orgId, req.params.id);
  ok(res, findings);
});
