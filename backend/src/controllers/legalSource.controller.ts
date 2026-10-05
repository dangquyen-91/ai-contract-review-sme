import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/ApiResponse';
import { AppError } from '../errors/AppError';
import * as legalSourceService from '../services/legalSource.service';
import { CreateLegalSourceInput } from '../validations/legalSource.validation';

export const createLegalSourceHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw AppError.badRequest('A file is required');

  const source = await legalSourceService.createLegalSource({
    input: req.body as CreateLegalSourceInput,
    file: { buffer: req.file.buffer, mimeType: req.file.mimetype },
  });

  ok(res, source, 201);
});

export const listLegalSourcesHandler = asyncHandler(async (_req: Request, res: Response) => {
  const sources = await legalSourceService.listLegalSources();
  ok(res, sources);
});

export const deleteLegalSourceHandler = asyncHandler(async (req: Request, res: Response) => {
  await legalSourceService.deleteLegalSource(req.params.id);
  res.status(204).send();
});
