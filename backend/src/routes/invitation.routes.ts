import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  invitationTokenBodySchema,
  receivedInvitationParamsSchema,
} from '../validations/invitation.validation';
import {
  acceptInvitationHandler,
  previewInvitationHandler,
  listReceivedInvitationsHandler,
  acceptReceivedInvitationHandler,
  declineReceivedInvitationHandler,
} from '../controllers/invitation.controller';

const router = Router();
router.get('/received', requireAuth, listReceivedInvitationsHandler);
router.post(
  '/received/:invitationId/accept',
  requireAuth,
  validate({ params: receivedInvitationParamsSchema }),
  acceptReceivedInvitationHandler,
);
router.post(
  '/received/:invitationId/decline',
  requireAuth,
  validate({ params: receivedInvitationParamsSchema }),
  declineReceivedInvitationHandler,
);
// Token in the body avoids writing invitation secrets into URL/access logs.
router.post('/preview', validate({ body: invitationTokenBodySchema }), previewInvitationHandler);
router.post(
  '/accept',
  requireAuth,
  validate({ body: invitationTokenBodySchema }),
  acceptInvitationHandler,
);
export default router;
