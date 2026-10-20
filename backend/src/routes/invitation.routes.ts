import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { invitationTokenBodySchema } from '../validations/invitation.validation';
import {
  acceptInvitationHandler,
  previewInvitationHandler,
} from '../controllers/invitation.controller';

const router = Router();
// Token in the body avoids writing invitation secrets into URL/access logs.
router.post('/preview', validate({ body: invitationTokenBodySchema }), previewInvitationHandler);
router.post(
  '/accept',
  requireAuth,
  validate({ body: invitationTokenBodySchema }),
  acceptInvitationHandler,
);
export default router;
