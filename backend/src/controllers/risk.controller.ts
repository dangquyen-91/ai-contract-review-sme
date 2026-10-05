import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/ApiResponse';
import { AppError } from '../errors/AppError';
import * as riskService from '../services/risk.service';
import { initSse, sendError, sendEvent } from '../utils/sse';

export const detectRisksHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const findings = await riskService.detectRisks(
    req.user.orgId,
    req.params.id,
    req.body?.analysisFocus,
  );
  ok(res, findings);
});

export const listRiskFindingsHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const findings = await riskService.listRiskFindings(req.user.orgId, req.params.id);
  ok(res, findings);
});

export const detectRisksStreamHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();

  initSse(res);
  try {
    const findings = await riskService.detectRisks(
      req.user.orgId,
      req.params.id,
      req.body?.analysisFocus,
      (stage) => sendEvent(res, 'progress', { stage }),
    );
    for (const finding of findings) {
      sendEvent(res, 'finding', finding);
    }
    sendEvent(res, 'done', { total: findings.length });
  } catch (err) {
    sendError(res, err);
  } finally {
    res.end();
  }
});
