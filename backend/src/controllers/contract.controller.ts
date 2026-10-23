import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, paginated } from '../utils/ApiResponse';
import { parsePagination } from '../utils/pagination';
import { getOrganizationUser } from '../middlewares/auth.middleware';
import * as contractService from '../services/contract/contract.service';
import { assertAccountReviewPolicy } from '../services/contract/personalReviewPolicy';
import { confirmContractProfile } from '../services/contract/contractClassification.service';
import { retryClassification } from '../services/contract/classificationWorker.service';
import { ListContractsQuery } from '../validations/contract.validation';

export const createContractHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getOrganizationUser(req);
  const respondAsync = /\brespond-async\b/i.test(req.get('Prefer') ?? '');
  if (req.body.type) assertAccountReviewPolicy(user.role === 'user', req.body.type, req.body.ourParty);

  const contract = await contractService.createContract({
    orgId: user.orgId,
    uploadedBy: user.sub,
    input: req.body,
    file: req.file
      ? { name: req.file.originalname, mimeType: req.file.mimetype, buffer: req.file.buffer }
      : undefined,
    waitForExtraction: !respondAsync,
  });

  if (respondAsync) res.set('Preference-Applied', 'respond-async');
  ok(res, contract, respondAsync ? 202 : 201);
});

export const listContractsHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getOrganizationUser(req);

  const pagination = parsePagination(req);
  const query = req.query as unknown as ListContractsQuery;
  const { items, total } = await contractService.listContracts(user.orgId, query, pagination);

  paginated(res, items, { page: pagination.page, limit: pagination.limit, total });
});

export const getContractHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getOrganizationUser(req);
  const contract = await contractService.getContractById(user.orgId, req.params.id);
  ok(res, contract);
});

export const confirmContractProfileHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getOrganizationUser(req);
  await confirmContractProfile(user.orgId, req.params.id, req.body, user.role === 'user');
  ok(res, await contractService.getContractById(user.orgId, req.params.id));
});

export const retryClassificationHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getOrganizationUser(req);
  await retryClassification(user.orgId, req.params.id);
  ok(res, await contractService.getContractById(user.orgId, req.params.id), 202);
});

export const deleteContractHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getOrganizationUser(req);
  await contractService.deleteContract(user.orgId, req.params.id);
  res.status(204).send();
});

export const getContractTextHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getOrganizationUser(req);
  const text = await contractService.getContractText(
    user.orgId,
    req.params.id,
    req.query.redacted === 'true',
    req.query.redactionMode === 'partial' ? 'partial' : 'token',
  );
  ok(res, text);
});

export const getContractFileHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getOrganizationUser(req);
  if (req.query.redacted === 'true') {
    const file = await contractService.getRedactedContractDocx(user.orgId, req.params.id);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `inline; filename="contract-redacted.docx"; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
      'Cache-Control': 'private, no-store',
      'X-LawScan-Redacted': 'partial',
      'X-Content-Type-Options': 'nosniff',
    });
    res.send(file.buffer);
    return;
  }
  const link = await contractService.getContractFileLink(user.orgId, req.params.id);
  ok(res, link);
});
