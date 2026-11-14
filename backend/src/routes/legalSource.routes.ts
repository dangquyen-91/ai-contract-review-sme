import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/rbac.middleware';
import { aiLimiter } from '../middlewares/rateLimit.middleware';
import { validate } from '../middlewares/validate.middleware';
import { legalDocUpload } from '../middlewares/upload.middleware';
import {
  appendLegalSourcePartHandler,
  applyReparseHandler,
  createLegalSourceHandler,
  deleteLegalSourceHandler,
  getLegalSourceHandler,
  getLegalSourcePartFileHandler,
  getPreviousPartFileHandler,
  listLegalSourceCatalogHandler,
  listLegalSourcesHandler,
  previewContentReplacementHandler,
  previewLegalSourceHandler,
  previewReparseHandler,
  replaceContentHandler,
  resumeLegalIngestionHandler,
  updateLegalSourceHandler,
} from '../controllers/legalSource.controller';
import {
  createLegalSourceSchema,
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
  legalDocUpload.single('file'),
  validate({ body: previewNewLegalSourceSchema }),
  previewLegalSourceHandler,
);

router.post(
  '/',
  aiLimiter,
  legalDocUpload.single('file'),
  validate({ body: createLegalSourceSchema }),
  createLegalSourceHandler,
);

router.get('/:id', validate({ params: legalSourceIdParamSchema }), getLegalSourceHandler);

router.patch(
  '/:id',
  validate({ params: legalSourceIdParamSchema, body: updateLegalSourceSchema }),
  updateLegalSourceHandler,
);

router.post(
  '/:id/parts',
  aiLimiter,
  legalDocUpload.single('file'),
  validate({ params: legalSourceIdParamSchema, body: previewLegalSourceSchema }),
  appendLegalSourcePartHandler,
);

router.post(
  '/:id/reparse/preview',
  validate({ params: legalSourceIdParamSchema, body: previewLegalSourceSchema }),
  previewReparseHandler,
);

router.post(
  '/:id/content/preview',
  legalDocUpload.single('file'),
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
  legalDocUpload.single('file'),
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
