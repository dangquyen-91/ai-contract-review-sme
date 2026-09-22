import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/ApiResponse';
import { AppError } from '../errors/AppError';
import * as summaryService from '../services/summary.service';

export const generateContractSummaryHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const contract = await summaryService.generateContractSummary(req.user.orgId, req.params.id);
  ok(res, contract);
});
