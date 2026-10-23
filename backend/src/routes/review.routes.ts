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
import { reviewIdParamSchema } from '../validations/review.validation';

const router = Router();

router.use(requireAuth);

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
  validate({ params: reviewIdParamSchema }),
  retryReviewHandler,
);

export default router;
