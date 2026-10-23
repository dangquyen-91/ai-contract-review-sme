import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  createPaymentHandler,
  listPaymentsHandler,
  getPaymentHandler,
  syncPaymentHandler,
  cancelPaymentHandler,
} from '../controllers/payment.controller';
import {
  createPaymentSchema,
  paymentParamsSchema,
  paymentListSchema,
} from '../validations/payment.validation';
import {
  getSubscriptionHandler,
  scheduleDowngradeHandler,
  cancelDowngradeHandler,
} from '../controllers/subscription.controller';
import { downgradeSchema } from '../validations/subscription.validation';
import {
  createOrganizationHandler,
  deleteOrganizationHandler,
  getOrganizationHandler,
  listOrganizationsHandler,
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
  removeMemberHandler,
} from '../controllers/invitation.controller';
import {
  createInvitationSchema,
  invitationParamsSchema,
  invitationPaginationSchema,
  memberParamsSchema,
} from '../validations/invitation.validation';
import {
  createOrganizationSchema,
  listOrganizationsQuerySchema,
  organizationIdParamSchema,
  updateOrganizationSchema,
} from '../validations/organization.validation';

const router = Router();

router.use(requireAuth);
const paymentLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  keyGenerator: (req) => req.user!.sub,
  standardHeaders: true,
  legacyHeaders: false,
});
router.post(
  '/:id/payments',
  paymentLimiter,
  validate({ params: organizationIdParamSchema, body: createPaymentSchema }),
  createPaymentHandler,
);
router.get(
  '/:id/payments',
  validate({ params: organizationIdParamSchema, query: paymentListSchema }),
  listPaymentsHandler,
);
router.get(
  '/:id/payments/:orderCode',
  validate({ params: paymentParamsSchema }),
  getPaymentHandler,
);
router.post(
  '/:id/payments/:orderCode/sync',
  paymentLimiter,
  validate({ params: paymentParamsSchema }),
  syncPaymentHandler,
);
router.post(
  '/:id/payments/:orderCode/cancel',
  paymentLimiter,
  validate({ params: paymentParamsSchema }),
  cancelPaymentHandler,
);
router.get(
  '/:id/subscription',
  validate({ params: organizationIdParamSchema }),
  getSubscriptionHandler,
);
router.get('/:id/usage', validate({ params: organizationIdParamSchema }), getSubscriptionHandler);
router.post(
  '/:id/subscription/downgrade',
  validate({ params: organizationIdParamSchema, body: downgradeSchema }),
  scheduleDowngradeHandler,
);
router.delete(
  '/:id/subscription/downgrade',
  validate({ params: organizationIdParamSchema }),
  cancelDowngradeHandler,
);
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
router.delete(
  '/:id/members/:userId',
  requireRole('owner'),
  validate({ params: memberParamsSchema }),
  removeMemberHandler,
);
router.post(
  '/',
  requireRole('owner', 'manager', 'staff', 'expert', 'user'),
  validate({ body: createOrganizationSchema }),
  createOrganizationHandler,
);
router.get(
  '/',
  requireRole('manager'),
  validate({ query: listOrganizationsQuerySchema }),
  listOrganizationsHandler,
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
