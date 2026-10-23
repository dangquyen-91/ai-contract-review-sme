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
  listLegalSourcesHandler,
  previewLegalSourceHandler,
  resumeLegalIngestionHandler,
} from '../controllers/legalSource.controller';
import {
  createLegalSourceSchema,
  legalSourceIdParamSchema,
  previewLegalSourceSchema,
} from '../validations/legalSource.validation';

const router = Router();

router.use(requireAuth, requireRole('manager'));

router.get('/', listLegalSourcesHandler);

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
