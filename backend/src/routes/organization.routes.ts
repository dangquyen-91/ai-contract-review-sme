import { Router } from 'express';
import {
  createOrganizationHandler,
  deleteOrganizationHandler,
  getOrganizationHandler,
  updateOrganizationHandler,
} from '../controllers/organization.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/rbac.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createOrganizationSchema,
  organizationIdParamSchema,
  updateOrganizationSchema,
} from '../validations/organization.validation';

const router = Router();

router.use(requireAuth);
router.post(
  '/',
  requireRole('owner', 'manager', 'staff', 'reviewer', 'user'),
  validate({ body: createOrganizationSchema }),
  createOrganizationHandler,
);
router.get('/:id', validate({ params: organizationIdParamSchema }), getOrganizationHandler);
router.patch(
  '/:id',
  requireRole('administrator', 'owner'),
  validate({ params: organizationIdParamSchema, body: updateOrganizationSchema }),
  updateOrganizationHandler,
);
router.delete(
  '/:id',
  requireRole('administrator', 'owner'),
  validate({ params: organizationIdParamSchema }),
  deleteOrganizationHandler,
);

export default router;
