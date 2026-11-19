import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/rbac.middleware';
import { validate } from '../middlewares/validate.middleware';
import * as controller from '../controllers/managedTemplate.controller';
import {
  createManagedTemplateSchema,
  managedTemplateIdSchema,
  managedTemplateListSchema,
  managedTemplateRevisionSchema,
  saveManagedTemplateSchema,
} from '../validations/managedTemplate.validation';

const router = Router();
router.use(requireAuth, requireRole('manager'));
router.get(
  '/',
  validate({ query: managedTemplateListSchema }),
  controller.listManagedTemplatesHandler,
);
router.post(
  '/',
  validate({ body: createManagedTemplateSchema }),
  controller.createManagedTemplateHandler,
);
router.get(
  '/:id',
  validate({ params: managedTemplateIdSchema }),
  controller.getManagedTemplateHandler,
);
router.patch(
  '/:id',
  validate({ params: managedTemplateIdSchema, body: saveManagedTemplateSchema }),
  controller.saveManagedTemplateHandler,
);
router.post(
  '/:id/publish',
  validate({ params: managedTemplateIdSchema, body: managedTemplateRevisionSchema }),
  controller.publishManagedTemplateHandler,
);
router.post(
  '/:id/retire',
  validate({ params: managedTemplateIdSchema, body: managedTemplateRevisionSchema }),
  controller.retireManagedTemplateHandler,
);
router.delete(
  '/:id',
  validate({ params: managedTemplateIdSchema, body: managedTemplateRevisionSchema }),
  controller.deleteManagedTemplateHandler,
);
export default router;
