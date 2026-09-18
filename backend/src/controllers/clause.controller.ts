import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/ApiResponse';
import { AppError } from '../errors/AppError';
import * as clauseService from '../services/clause.service';

export const segmentClausesHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const clauses = await clauseService.segmentClauses(req.user.orgId, req.params.id);
  ok(res, clauses);
});

export const listClausesHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const clauses = await clauseService.listClauses(req.user.orgId, req.params.id);
  ok(res, clauses);
});
