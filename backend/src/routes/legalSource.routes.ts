import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/rbac.middleware';
import { aiLimiter } from '../middlewares/rateLimit.middleware';
import { validate } from '../middlewares/validate.middleware';
import { LEGAL_DOC_UPLOAD_FIELDS, legalDocUpload } from '../middlewares/upload.middleware';
import {
  appendLegalSourcePartHandler,
  applyReparseHandler,
  createLegalSourceHandler,
  deleteLegalSourceHandler,
  getLegalSourceHandler,
  getLegalSourcePartFileHandler,
  getPreviousPartFileHandler,
  getPreviousReferenceFileHandler,
  getReferenceFileHandler,
  listLegalSourceCatalogHandler,
  listLegalSourceHistoryHandler,
  listLegalSourcesHandler,
  previewContentReplacementHandler,
  previewLegalSourceHandler,
  previewReparseHandler,
  replaceContentHandler,
  resumeLegalIngestionHandler,
  updateLegalSourceHandler,
} from '../controllers/legalSource.controller';
import {
  appendLegalSourcePartSchema,
  createLegalSourceSchema,
  legalSourceHistoryQuerySchema,
  legalSourceIdParamSchema,
  legalSourcePartParamSchema,
  previewLegalSourceSchema,
  previewNewLegalSourceSchema,
  replaceLegalSourceContentSchema,
  updateLegalSourceSchema,
} from '../validations/legalSource.validation';

const router = Router();

router.use(requireAuth, requireRole('manager'));

router.get('/', listLegalSourcesHandler);

router.get('/catalog', listLegalSourceCatalogHandler);

router.post(
  '/preview',
  legalDocUpload.fields(LEGAL_DOC_UPLOAD_FIELDS),
  validate({ body: previewNewLegalSourceSchema }),
  previewLegalSourceHandler,
);

router.post(
  '/',
  aiLimiter,
  legalDocUpload.fields(LEGAL_DOC_UPLOAD_FIELDS),
  validate({ body: createLegalSourceSchema }),
  createLegalSourceHandler,
);

router.get('/:id', validate({ params: legalSourceIdParamSchema }), getLegalSourceHandler);

router.get(
  '/:id/history',
  validate({ params: legalSourceIdParamSchema, query: legalSourceHistoryQuerySchema }),
  listLegalSourceHistoryHandler,
);

router.patch(
  '/:id',
  validate({ params: legalSourceIdParamSchema, body: updateLegalSourceSchema }),
  updateLegalSourceHandler,
);

router.post(
  '/:id/parts',
  aiLimiter,
  legalDocUpload.fields(LEGAL_DOC_UPLOAD_FIELDS),
  validate({ params: legalSourceIdParamSchema, body: appendLegalSourcePartSchema }),
  appendLegalSourcePartHandler,
);

router.post(
  '/:id/reparse/preview',
  validate({ params: legalSourceIdParamSchema, body: previewLegalSourceSchema }),
  previewReparseHandler,
);

router.post(
  '/:id/content/preview',
  legalDocUpload.fields(LEGAL_DOC_UPLOAD_FIELDS),
  validate({ params: legalSourceIdParamSchema, body: replaceLegalSourceContentSchema }),
  previewContentReplacementHandler,
);

router.post(
  '/:id/reparse',
  aiLimiter,
  validate({ params: legalSourceIdParamSchema, body: previewLegalSourceSchema }),
  applyReparseHandler,
);

router.put(
  '/:id/content',
  aiLimiter,
  legalDocUpload.fields(LEGAL_DOC_UPLOAD_FIELDS),
  validate({ params: legalSourceIdParamSchema, body: replaceLegalSourceContentSchema }),
  replaceContentHandler,
);

router.get(
  '/:id/parts/:partIndex/file',
  validate({ params: legalSourcePartParamSchema }),
  getLegalSourcePartFileHandler,
);

router.get(
  '/:id/previous-parts/:partIndex/file',
  validate({ params: legalSourcePartParamSchema }),
  getPreviousPartFileHandler,
);

router.get(
  '/:id/parts/:partIndex/reference-file',
  validate({ params: legalSourcePartParamSchema }),
  getReferenceFileHandler,
);

router.get(
  '/:id/previous-parts/:partIndex/reference-file',
  validate({ params: legalSourcePartParamSchema }),
  getPreviousReferenceFileHandler,
);

router.post(
  '/:id/resume',
  validate({ params: legalSourceIdParamSchema }),
  resumeLegalIngestionHandler,
);

router.delete(
  '/:id',
  validate({ params: legalSourceIdParamSchema }),
  deleteLegalSourceHandler,
);

export default router;
