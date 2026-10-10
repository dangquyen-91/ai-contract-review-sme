import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { getReviewHandler, streamReviewHandler } from '../controllers/review.controller';
import { reviewIdParamSchema } from '../validations/review.validation';

const router = Router();

router.use(requireAuth);

router.get('/:reviewId', validate({ params: reviewIdParamSchema }), getReviewHandler);

router.get('/:reviewId/events', validate({ params: reviewIdParamSchema }), streamReviewHandler);

export default router;
