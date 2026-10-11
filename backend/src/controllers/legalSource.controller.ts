import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/ApiResponse';
import { AppError } from '../errors/AppError';
import * as legalSourceService from '../services/legalSource.service';
import { CreateLegalSourceInput, PreviewLegalSourceInput } from '../validations/legalSource.validation';

function uploadedFile(req: Request) {
  if (!req.file) throw AppError.badRequest('A file is required');
  return { buffer: req.file.buffer, mimeType: req.file.mimetype, name: req.file.originalname };
}

function accepted(res: Response, source: { _id: unknown }) {
  res.set('Location', `/api/v1/kb/legal-sources/${String(source._id)}`);
  ok(res, source, 202);
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
  accepted(res, source);
});

export const appendLegalSourcePartHandler = asyncHandler(async (req: Request, res: Response) => {
  const { expectedArticleCount } = req.body as PreviewLegalSourceInput;
  const source = await legalSourceService.appendLegalSourcePart(req.params.id, uploadedFile(req), expectedArticleCount);
  accepted(res, source);
});

export const resumeLegalIngestionHandler = asyncHandler(async (req: Request, res: Response) => {
  accepted(res, await legalSourceService.resumeLegalIngestion(req.params.id));
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
