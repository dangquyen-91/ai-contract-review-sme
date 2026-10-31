import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { CONTRACT_REVIEW_ROLES, requireRole } from '../middlewares/rbac.middleware';
import { aiLimiter } from '../middlewares/rateLimit.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  cancelReviewHandler,
  getReviewHandler,
  retryReviewHandler,
  streamReviewHandler,
} from '../controllers/review.controller';
import {
  addFindingHandler,
  approveVerificationHandler,
  decideFindingHandler,
  getExpertWorkspaceHandler,
  getVerificationHandler,
  listVerificationQueueHandler,
  removeFindingHandler,
  requestVerificationHandler,
  returnVerificationHandler,
  startVerificationHandler,
} from '../controllers/verification.controller';
import { reviewIdParamSchema } from '../validations/review.validation';
import { analysisFocusBodySchema } from '../validations/contract.validation';
import {
  addFindingBodySchema,
  approveVerificationBodySchema,
  decideFindingBodySchema,
  requestVerificationBodySchema,
  returnVerificationBodySchema,
  verificationFindingParamSchema,
  verificationQueueQuerySchema,
} from '../validations/verification.validation';

const router = Router();

router.use(requireAuth);

router.get(
  '/verification-queue',
  requireRole('expert'),
  validate({ query: verificationQueueQuerySchema }),
  listVerificationQueueHandler,
);

router.get('/:reviewId', validate({ params: reviewIdParamSchema }), getReviewHandler);

router.get('/:reviewId/events', validate({ params: reviewIdParamSchema }), streamReviewHandler);

router.post(
  '/:reviewId/cancel',
  requireRole(...CONTRACT_REVIEW_ROLES),
  validate({ params: reviewIdParamSchema }),
  cancelReviewHandler,
);

router.post(
  '/:reviewId/retry',
  requireRole(...CONTRACT_REVIEW_ROLES),
  aiLimiter,
  validate({ params: reviewIdParamSchema, body: analysisFocusBodySchema }),
  retryReviewHandler,
);

router.get(
  '/:reviewId/verification',
  requireRole(...CONTRACT_REVIEW_ROLES.filter((role) => role !== 'expert')),
  validate({ params: reviewIdParamSchema }),
  getVerificationHandler,
);

router.get(
  '/:reviewId/verification/workspace',
  requireRole('expert'),
  validate({ params: reviewIdParamSchema }),
  getExpertWorkspaceHandler,
);

router.post(
  '/:reviewId/verification/request',
  requireRole('owner', 'manager', 'staff', 'user'),
  validate({ params: reviewIdParamSchema, body: requestVerificationBodySchema }),
  requestVerificationHandler,
);

router.post(
  '/:reviewId/verification/start',
  requireRole('expert'),
  validate({ params: reviewIdParamSchema }),
  startVerificationHandler,
);

router.post(
  '/:reviewId/verification/findings',
  requireRole('expert'),
  validate({ params: reviewIdParamSchema, body: addFindingBodySchema }),
  addFindingHandler,
);

router.put(
  '/:reviewId/verification/findings/:findingId',
  requireRole('expert'),
  validate({ params: verificationFindingParamSchema, body: decideFindingBodySchema }),
  decideFindingHandler,
);

router.delete(
  '/:reviewId/verification/findings/:findingId',
  requireRole('expert'),
  validate({ params: verificationFindingParamSchema }),
  removeFindingHandler,
);

router.post(
  '/:reviewId/verification/approve',
  requireRole('expert'),
  validate({ params: reviewIdParamSchema, body: approveVerificationBodySchema }),
  approveVerificationHandler,
);

router.post(
  '/:reviewId/verification/return',
  requireRole('expert'),
  validate({ params: reviewIdParamSchema, body: returnVerificationBodySchema }),
  returnVerificationHandler,
);

export default router;
