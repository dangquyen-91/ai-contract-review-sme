import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/ApiResponse';
import { getContractUser } from '../middlewares/auth.middleware';
import * as clauseService from '../services/analysis/clause.service';

export const listClausesHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getContractUser(req);
  const clauses = await clauseService.listClauses(user.orgId, req.params.id);
  ok(res, clauses);
});
