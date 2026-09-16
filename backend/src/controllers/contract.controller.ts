import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, paginated } from '../utils/ApiResponse';
import { parsePagination } from '../utils/pagination';
import { AppError } from '../errors/AppError';
import * as contractService from '../services/contract.service';
import { uploadContractFile } from '../services/storage.service';
import { ListContractsQuery } from '../validations/contract.validation';

export const createContractHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();

  const file = req.file
    ? {
        ...(await uploadContractFile(req.file.buffer, req.user.orgId, req.file.originalname)),
        name: req.file.originalname,
        mimeType: req.file.mimetype,
        buffer: req.file.buffer,
      }
    : undefined;

  const contract = await contractService.createContract({
    orgId: req.user.orgId,
    uploadedBy: req.user.sub,
    input: req.body,
    file,
  });

  ok(res, contract, 201);
});

export const listContractsHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();

  const pagination = parsePagination(req);
  const query = req.query as unknown as ListContractsQuery;
  const { items, total } = await contractService.listContracts(req.user.orgId, query, pagination);

  paginated(res, items, { page: pagination.page, limit: pagination.limit, total });
});

export const getContractHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const contract = await contractService.getContractById(req.user.orgId, req.params.id);
  ok(res, contract);
});

export const deleteContractHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  await contractService.deleteContract(req.user.orgId, req.params.id);
  res.status(204).send();
});
