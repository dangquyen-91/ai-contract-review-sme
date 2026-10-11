import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/ApiResponse';
import { AppError } from '../errors/AppError';
import * as legalSourceService from '../services/legalSource.service';
import { CreateLegalSourceInput, PreviewLegalSourceInput } from '../validations/legalSource.validation';

function uploadedFile(req: Request) {
  if (!req.file) throw AppError.badRequest('A file is required');
  return { buffer: req.file.buffer, mimeType: req.file.mimetype };
}

export const previewLegalSourceHandler = asyncHandler(async (req: Request, res: Response) => {
  const { expectedArticleCount } = req.body as PreviewLegalSourceInput;
  const preview = await legalSourceService.previewLegalSource(uploadedFile(req), expectedArticleCount);
  ok(res, preview);
});

export const createLegalSourceHandler = asyncHandler(async (req: Request, res: Response) => {
  const source = await legalSourceService.createLegalSource({
    input: req.body as CreateLegalSourceInput,
    file: uploadedFile(req),
  });

  ok(res, source, 201);
});

export const listLegalSourcesHandler = asyncHandler(async (_req: Request, res: Response) => {
  const sources = await legalSourceService.listLegalSources();
  ok(res, sources);
});

export const getLegalSourceHandler = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await legalSourceService.getLegalSource(req.params.id));
});

export const deleteLegalSourceHandler = asyncHandler(async (req: Request, res: Response) => {
  await legalSourceService.deleteLegalSource(req.params.id);
  res.status(204).send();
});
