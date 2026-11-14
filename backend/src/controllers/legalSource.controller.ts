import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/ApiResponse';
import { AppError } from '../errors/AppError';
import * as legalSourceService from '../services/legal/legalSource.service';
import * as legalSourceContentService from '../services/legal/legalSourceContent.service';
import {
  CreateLegalSourceInput,
  PreviewLegalSourceInput,
  ReplaceLegalSourceContentInput,
  UpdateLegalSourceInput,
} from '../validations/legalSource.validation';

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

export const listLegalSourceCatalogHandler = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await legalSourceService.listLegalSourceCatalog());
});

export const getLegalSourceHandler =asyncHandler(async (req: Request, res: Response) => {
  ok(res, await legalSourceService.getLegalSource(req.params.id));
});

export const previewReparseHandler = asyncHandler(async (req: Request, res: Response) => {
  const { expectedArticleCount } = req.body as PreviewLegalSourceInput;
  ok(res, await legalSourceContentService.previewReparse(req.params.id, expectedArticleCount));
});

export const previewContentReplacementHandler = asyncHandler(async (req: Request, res: Response) => {
  const { expectedArticleCount } = req.body as PreviewLegalSourceInput;
  ok(
    res,
    await legalSourceContentService.previewContentReplacement(req.params.id, uploadedFile(req), expectedArticleCount),
  );
});

export const applyReparseHandler = asyncHandler(async (req: Request, res: Response) => {
  const { expectedArticleCount } = req.body as PreviewLegalSourceInput;
  accepted(res, await legalSourceContentService.applyReparse(req.params.id, expectedArticleCount));
});

export const replaceContentHandler = asyncHandler(async (req: Request, res: Response) => {
  accepted(
    res,
    await legalSourceContentService.applyContentReplacement(
      req.params.id,
      uploadedFile(req),
      req.body as ReplaceLegalSourceContentInput,
    ),
  );
});

export const getLegalSourcePartFileHandler = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await legalSourceService.getLegalSourcePartFile(req.params.id, Number(req.params.partIndex)));
});

export const getPreviousPartFileHandler = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await legalSourceService.getLegalSourcePartFile(req.params.id, Number(req.params.partIndex), true));
});

export const updateLegalSourceHandler = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await legalSourceService.updateLegalSource(req.params.id, req.body as UpdateLegalSourceInput));
});

export const deleteLegalSourceHandler =asyncHandler(async (req: Request, res: Response) => {
  await legalSourceService.deleteLegalSource(req.params.id);
  res.status(204).send();
});
