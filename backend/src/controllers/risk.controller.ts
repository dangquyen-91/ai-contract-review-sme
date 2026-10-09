import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/ApiResponse';
import { getOrganizationUser } from '../middlewares/auth.middleware';
import * as riskService from '../services/risk.service';
import { openSseStream } from '../utils/sse';

export const detectRisksHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getOrganizationUser(req);
  const findings = await riskService.detectRisks(
    user.orgId,
    req.params.id,
    req.body?.analysisFocus,
  );
  ok(res, findings);
});

export const listRiskFindingsHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getOrganizationUser(req);
  const findings = await riskService.listRiskFindings(user.orgId, req.params.id);
  ok(res, findings);
});

export const detectRisksStreamHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getOrganizationUser(req);

  const stream = openSseStream(res);
  try {
    const findings = await riskService.detectRisks(
      user.orgId,
      req.params.id,
      req.body?.analysisFocus,
      (stage) => stream.send('progress', { stage }),
      stream.signal,
    );
    for (const finding of findings) {
      stream.send('finding', finding);
    }
    stream.send('done', { total: findings.length });
  } catch (err) {
    stream.fail(err);
  } finally {
    stream.end();
  }
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
