import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/ApiResponse';
import { getContractUser } from '../middlewares/auth.middleware';
import * as verificationService from '../services/review/verification.service';
import { AddFindingInput, DecideFindingInput } from '../validations/verification.validation';

export const getVerificationHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getContractUser(req);
  ok(res, await verificationService.getVerification(user.orgId, req.params.reviewId));
});

export const requestVerificationHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getContractUser(req);
  ok(res, await verificationService.requestVerification(user.orgId, user.sub, req.params.reviewId, req.body.note), 201);
});

export const startVerificationHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getContractUser(req);
  ok(res, await verificationService.startVerification(user.orgId, user.sub, req.params.reviewId));
});

export const decideFindingHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getContractUser(req);
  ok(
    res,
    await verificationService.decideFinding(
      user.orgId,
      user.sub,
      req.params.reviewId,
      req.params.findingId,
      req.body as DecideFindingInput,
    ),
  );
});

export const addFindingHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getContractUser(req);
  ok(res, await verificationService.addFinding(user.orgId, user.sub, req.params.reviewId, req.body as AddFindingInput), 201);
});

export const removeFindingHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getContractUser(req);
  await verificationService.removeFinding(user.orgId, user.sub, req.params.reviewId, req.params.findingId);
  res.status(204).send();
});

export const approveVerificationHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getContractUser(req);
  ok(res, await verificationService.approveVerification(user.orgId, user.sub, req.params.reviewId, req.body?.decisionNote));
});

export const returnVerificationHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getContractUser(req);
  ok(res, await verificationService.returnVerification(user.orgId, user.sub, req.params.reviewId, req.body.reason));
});

export const listVerificationQueueHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getContractUser(req);
  const status = req.query.status as 'requested' | 'in_progress' | 'all' | undefined;
  ok(res, await verificationService.listVerificationQueue(user.orgId, user.sub, status));
});
