import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, paginated } from '../utils/ApiResponse';
import { listLegalSourceHistory } from '../services/legal/legalSourceHistory.service';
import { AppError } from '../errors/AppError';
import * as legalSourceService from '../services/legal/legalSource.service';
import * as legalSourceContentService from '../services/legal/legalSourceContent.service';
import {
  AppendLegalSourcePartInput,
  CreateLegalSourceInput,
  LegalSourceHistoryQueryInput,
  PreviewLegalSourceInput,
  PreviewNewLegalSourceInput,
  ReplaceLegalSourceContentInput,
  UpdateLegalSourceInput,
} from '../validations/legalSource.validation';

const actorOf = (req: Request) => ({ id: req.user!.sub, role: req.user!.role });

const toLegalFile = (file: Express.Multer.File) => ({
  buffer: file.buffer,
  mimeType: file.mimetype,
  name: file.originalname,
});

function uploadedFiles(req: Request) {
  const files = (req.files ?? {}) as Record<string, Express.Multer.File[] | undefined>;
  const main = files.file?.[0];
  if (!main) throw AppError.badRequest('A file is required');
  const reference = files.referenceFile?.[0];
  return { file: toLegalFile(main), referenceFile: reference ? toLegalFile(reference) : undefined };
}

function accepted(res: Response, source: { _id: unknown }) {
  res.set('Location', `/api/v1/kb/legal-sources/${String(source._id)}`);
  ok(res, source, 202);
}

export const previewLegalSourceHandler = asyncHandler(async (req: Request, res: Response) => {
  const { file, referenceFile } = uploadedFiles(req);
  ok(res, await legalSourceService.previewLegalSource(file, req.body as PreviewNewLegalSourceInput, referenceFile));
});

export const createLegalSourceHandler = asyncHandler(async (req: Request, res: Response) => {
  const { file, referenceFile } = uploadedFiles(req);
  const source = await legalSourceService.createLegalSource({
    input: req.body as CreateLegalSourceInput,
    file,
    referenceFile,
    actor: actorOf(req),
  });
  accepted(res, source);
});

export const appendLegalSourcePartHandler = asyncHandler(async (req: Request, res: Response) => {
  const { file, referenceFile } = uploadedFiles(req);
  const source = await legalSourceService.appendLegalSourcePart(
    req.params.id,
    actorOf(req),
    file,
    req.body as AppendLegalSourcePartInput,
    referenceFile,
  );
  accepted(res, source);
});

export const resumeLegalIngestionHandler = asyncHandler(async (req: Request, res: Response) => {
  accepted(res, await legalSourceService.resumeLegalIngestion(req.params.id, actorOf(req)));
});

export const listLegalSourcesHandler = asyncHandler(async (_req: Request, res: Response) => {
  const sources = await legalSourceService.listLegalSources();
  ok(res, sources);
});

export const listLegalSourceCatalogHandler = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await legalSourceService.listLegalSourceCatalog());
});

export const getLegalSourceHandler = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await legalSourceService.getLegalSource(req.params.id));
});

export const previewReparseHandler = asyncHandler(async (req: Request, res: Response) => {
  const { expectedArticleCount } = req.body as PreviewLegalSourceInput;
  ok(res, await legalSourceContentService.previewReparse(req.params.id, expectedArticleCount));
});

export const previewContentReplacementHandler = asyncHandler(async (req: Request, res: Response) => {
  const { file, referenceFile } = uploadedFiles(req);
  ok(
    res,
    await legalSourceContentService.previewContentReplacement(
      req.params.id,
      file,
      req.body as ReplaceLegalSourceContentInput,
      referenceFile,
    ),
  );
});

export const applyReparseHandler = asyncHandler(async (req: Request, res: Response) => {
  const { expectedArticleCount } = req.body as PreviewLegalSourceInput;
  accepted(res, await legalSourceContentService.applyReparse(req.params.id, actorOf(req), expectedArticleCount));
});

export const replaceContentHandler = asyncHandler(async (req: Request, res: Response) => {
  const { file, referenceFile } = uploadedFiles(req);
  accepted(
    res,
    await legalSourceContentService.applyContentReplacement(
      req.params.id,
      actorOf(req),
      file,
      req.body as ReplaceLegalSourceContentInput,
      referenceFile,
    ),
  );
});

export const getLegalSourcePartFileHandler = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await legalSourceService.getLegalSourcePartFile(req.params.id, Number(req.params.partIndex)));
});

export const getPreviousPartFileHandler = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await legalSourceService.getLegalSourcePartFile(req.params.id, Number(req.params.partIndex), true));
});

export const getReferenceFileHandler = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await legalSourceService.getLegalSourcePartFile(req.params.id, Number(req.params.partIndex), false, true));
});

export const getPreviousReferenceFileHandler = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await legalSourceService.getLegalSourcePartFile(req.params.id, Number(req.params.partIndex), true, true));
});

export const listLegalSourceHistoryHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as LegalSourceHistoryQueryInput;
  const { items, total } = await listLegalSourceHistory(req.params.id, query);
  paginated(res, items, { page: query.page, limit: query.limit, total });
});

export const updateLegalSourceHandler = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await legalSourceService.updateLegalSource(req.params.id, actorOf(req), req.body as UpdateLegalSourceInput));
});

export const deleteLegalSourceHandler = asyncHandler(async (req: Request, res: Response) => {
  await legalSourceService.deleteLegalSource(req.params.id, actorOf(req));
  res.status(204).send();
});
