import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/rbac.middleware';
import { aiLimiter } from '../middlewares/rateLimit.middleware';
import { validate } from '../middlewares/validate.middleware';
import { legalDocUpload } from '../middlewares/upload.middleware';
import {
  createLegalSourceHandler,
  deleteLegalSourceHandler,
  listLegalSourcesHandler,
} from '../controllers/legalSource.controller';
import {
  createLegalSourceSchema,
  legalSourceIdParamSchema,
} from '../validations/legalSource.validation';

const router = Router();

router.use(requireAuth);

router.get('/', listLegalSourcesHandler);

router.post(
  '/',
  requireRole('administrator'),
  aiLimiter,
  legalDocUpload.single('file'),
  validate({ body: createLegalSourceSchema }),
  createLegalSourceHandler,
);

router.delete(
  '/:id',
  requireRole('administrator'),
  validate({ params: legalSourceIdParamSchema }),
  deleteLegalSourceHandler,
);

export default router;
