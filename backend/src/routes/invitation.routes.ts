import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { invitationTokenBodySchema } from '../validations/invitation.validation';
import {
  acceptInvitationHandler,
  previewInvitationHandler,
  listReceivedInvitationsHandler,
  acceptReceivedInvitationHandler,
  declineReceivedInvitationHandler,
} from '../controllers/invitation.controller';

const router = Router();
const receivedParams = z.object({ invitationId: z.string().regex(/^[a-f\d]{24}$/i) });
router.get('/received', requireAuth, listReceivedInvitationsHandler);
router.post(
  '/received/:invitationId/accept',
  requireAuth,
  validate({ params: receivedParams }),
  acceptReceivedInvitationHandler,
);
router.post(
  '/received/:invitationId/decline',
  requireAuth,
  validate({ params: receivedParams }),
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
