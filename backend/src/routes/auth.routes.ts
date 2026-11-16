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
import { bodyFieldOrIpKey } from '../middlewares/rateLimit.middleware';
import {
  forgotPasswordHandler,
  resetPasswordHandler,
} from '../controllers/passwordReset.controller';
import { forgotPasswordSchema, resetPasswordSchema } from '../validations/auth.validation';

const router = Router();
const authLimiter = (keyField?: string) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    ...(keyField ? { keyGenerator: bodyFieldOrIpKey(keyField) } : {}),
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
  keyGenerator: bodyFieldOrIpKey('challengeId'),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Too many verification requests. Please try again later.' },
  },
});

// Reset endpoints need IP limits as well as per-address/per-challenge limits.
const resetIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.' },
  },
});
router.post(
  '/forgot-password',
  resetIpLimiter,
  authLimiter('email'),
  validate({ body: forgotPasswordSchema }),
  forgotPasswordHandler,
);
router.post(
  '/reset-password',
  resetIpLimiter,
  authLimiter('challengeId'),
  validate({ body: resetPasswordSchema }),
  resetPasswordHandler,
);

router.post('/register', authLimiter('email'), validate({ body: registerSchema }), registerHandler);

router.post('/login', authLimiter('email'), validate({ body: loginSchema }), loginHandler);
router.post('/google', authLimiter(), validate({ body: googleLoginSchema }), googleLoginHandler);
router.post(
  '/verify-email',
  verificationLimiter,
  validate({ body: verifyEmailSchema }),
  verifyEmailHandler,
);
router.post(
  '/resend-verification',
  authLimiter('challengeId'),
  validate({ body: resendVerificationSchema }),
  resendVerificationHandler,
);

router.post('/refresh', validate({ body: refreshSchema }), refreshHandler);

router.post('/onboarding/complete', requireAuth, completeOnboardingHandler);

export default router;
