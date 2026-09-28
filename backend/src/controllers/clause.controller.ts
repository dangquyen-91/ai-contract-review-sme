import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/ApiResponse';
import { getOrganizationUser } from '../middlewares/auth.middleware';
import * as clauseService from '../services/clause.service';

export const segmentClausesHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getOrganizationUser(req);
  const clauses = await clauseService.segmentClauses(user.orgId, req.params.id);
  ok(res, clauses);
});

export const listClausesHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getOrganizationUser(req);
  const clauses = await clauseService.listClauses(user.orgId, req.params.id);
  ok(res, clauses);
});
