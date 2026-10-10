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
import { invitationEmailLimiter } from '../middlewares/rateLimit.middleware';
import {
  createInvitationHandler,
  listInvitationsHandler,
  revokeInvitationHandler,
  listMembersHandler,
} from '../controllers/invitation.controller';
import {
  createInvitationSchema,
  invitationParamsSchema,
  invitationPaginationSchema,
} from '../validations/invitation.validation';
import {
  createOrganizationSchema,
  organizationIdParamSchema,
  updateOrganizationSchema,
} from '../validations/organization.validation';

const router = Router();

router.use(requireAuth);
router.post(
  '/:id/invitations',
  requireRole('owner'),
  invitationEmailLimiter,
  validate({ params: organizationIdParamSchema, body: createInvitationSchema }),
  createInvitationHandler,
);
router.get(
  '/:id/invitations',
  requireRole('owner'),
  validate({ params: organizationIdParamSchema, query: invitationPaginationSchema }),
  listInvitationsHandler,
);
router.delete(
  '/:id/invitations/:invitationId',
  requireRole('owner'),
  validate({ params: invitationParamsSchema }),
  revokeInvitationHandler,
);
router.get(
  '/:id/members',
  requireRole('owner'),
  validate({ params: organizationIdParamSchema, query: invitationPaginationSchema }),
  listMembersHandler,
);
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
