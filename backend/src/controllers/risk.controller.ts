import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/ApiResponse';
import { getOrganizationUser } from '../middlewares/auth.middleware';
import * as riskService from '../services/analysis/risk.service';
import { listKeyTerms } from '../services/analysis/keyTermExtraction.service';

export const listRiskFindingsHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getOrganizationUser(req);
  const findings = await riskService.listRiskFindings(user.orgId, req.params.id);
  ok(res, findings);
});

export const listKeyTermsHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getOrganizationUser(req);
  ok(res, await listKeyTerms(user.orgId, req.params.id));
});

export const updateProposedRevisionHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getOrganizationUser(req);
  const finding = await riskService.updateProposedRevision(
    user.orgId,
    req.params.id,
    req.params.findingId,
    req.body,
  );
  ok(res, finding);
});

export const removeProposedRevisionHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getOrganizationUser(req);
  const finding = await riskService.removeProposedRevision(
    user.orgId,
    req.params.id,
    req.params.findingId,
  );
  ok(res, finding);
});
