import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/ApiResponse';
import { getContractUser } from '../middlewares/auth.middleware';
import * as verificationService from '../services/review/verification.service';
import { AddFindingInput, DecideFindingInput } from '../validations/verification.validation';
import { ExpertWorkQuery } from '../validations/verification.validation';
import { listExpertWork } from '../services/review/expertWork.service';

export const listExpertWorkHandler = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await listExpertWork(req.user!.sub, req.query as unknown as ExpertWorkQuery));
});

export const getVerificationHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getContractUser(req);
  ok(res, await verificationService.getVerification(user.orgId, req.params.reviewId));
});

export const requestVerificationHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getContractUser(req);
  ok(res, await verificationService.requestVerification(user.orgId, user.sub, req.params.reviewId, req.body.note), 201);
});

export const getExpertWorkspaceHandler = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await verificationService.getExpertWorkspace(req.user!.sub, req.params.reviewId, req.query.attempt === undefined ? undefined : Number(req.query.attempt)));
});

export const startVerificationHandler = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await verificationService.startVerification(req.user!.sub, req.params.reviewId));
});

export const decideFindingHandler = asyncHandler(async (req: Request, res: Response) => {
  ok(
    res,
    await verificationService.decideFinding(
      req.user!.sub,
      req.params.reviewId,
      req.params.findingId,
      req.body as DecideFindingInput,
    ),
  );
});

export const addFindingHandler = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await verificationService.addFinding(req.user!.sub, req.params.reviewId, req.body as AddFindingInput), 201);
});

export const removeFindingHandler = asyncHandler(async (req: Request, res: Response) => {
  await verificationService.removeFinding(req.user!.sub, req.params.reviewId, req.params.findingId);
  res.status(204).send();
});

export const approveVerificationHandler = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await verificationService.approveVerification(req.user!.sub, req.params.reviewId, req.body?.decisionNote));
});

export const returnVerificationHandler = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await verificationService.returnVerification(req.user!.sub, req.params.reviewId, req.body.reason));
});

export const listVerificationQueueHandler = asyncHandler(async (req: Request, res: Response) => {
  const status = req.query.status as 'requested' | 'in_progress' | 'all' | undefined;
  ok(res, await verificationService.listVerificationQueue(req.user!.sub, status));
});
