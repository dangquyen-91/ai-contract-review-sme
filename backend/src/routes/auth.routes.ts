import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware';
import {
  completeOnboardingHandler,
  loginHandler,
  refreshHandler,
  registerHandler,
  verifyEmailHandler,
  resendVerificationHandler,
  googleLoginHandler,
} from '../controllers/auth.controller';
import {
  loginSchema,
  refreshSchema,
  registerSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  googleLoginSchema,
} from '../validations/auth.validation';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Too many authentication requests. Please try again later.' },
  },
});
const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Too many verification requests. Please try again later.' },
  },
});

router.post('/register', authLimiter, validate({ body: registerSchema }), registerHandler);

router.post('/login', authLimiter, validate({ body: loginSchema }), loginHandler);
router.post('/google', authLimiter, validate({ body: googleLoginSchema }), googleLoginHandler);
router.post(
  '/verify-email',
  verificationLimiter,
  validate({ body: verifyEmailSchema }),
  verifyEmailHandler,
);
router.post(
  '/resend-verification',
  authLimiter,
  validate({ body: resendVerificationSchema }),
  resendVerificationHandler,
);

router.post('/refresh', validate({ body: refreshSchema }), refreshHandler);

router.post('/onboarding/complete', requireAuth, completeOnboardingHandler);

export default router;
