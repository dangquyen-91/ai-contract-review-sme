import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/rbac.middleware';
import { aiLimiter } from '../middlewares/rateLimit.middleware';
import { validate } from '../middlewares/validate.middleware';
import { legalDocUpload } from '../middlewares/upload.middleware';
import {
  appendLegalSourcePartHandler,
  createLegalSourceHandler,
  deleteLegalSourceHandler,
  getLegalSourceHandler,
  listLegalSourceCatalogHandler,
  listLegalSourcesHandler,
  previewLegalSourceHandler,
  resumeLegalIngestionHandler,
  updateLegalSourceHandler,
} from '../controllers/legalSource.controller';
import {
  createLegalSourceSchema,
  legalSourceIdParamSchema,
  previewLegalSourceSchema,
  updateLegalSourceSchema,
} from '../validations/legalSource.validation';

const router = Router();

router.use(requireAuth, requireRole('manager'));

router.get('/', listLegalSourcesHandler);

router.get('/catalog', listLegalSourceCatalogHandler);

router.post(
  '/preview',
  legalDocUpload.single('file'),
  validate({ body: previewLegalSourceSchema }),
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
