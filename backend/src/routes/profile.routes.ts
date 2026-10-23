import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { profileUpdateSchema, changePasswordSchema } from '../validations/profile.validation';
import {
  getProfileHandler,
  updateProfileHandler,
  avatarHandler,
  deleteAvatarHandler,
  changePasswordHandler,
} from '../controllers/profile.controller';
import { AppError } from '../errors/AppError';

const router = Router();
router.use(requireAuth);
const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) => req.user!.sub,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.' },
  },
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 0 },
  fileFilter: (_req, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype))
      return callback(AppError.badRequest('Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.'));
    callback(null, true);
  },
}).single('avatar');
router.get('/', getProfileHandler);
router.patch('/', validate({ body: profileUpdateSchema }), updateProfileHandler);
router.post(
  '/password',
  sensitiveLimiter,
  validate({ body: changePasswordSchema }),
  changePasswordHandler,
);
router.post(
  '/avatar',
  sensitiveLimiter,
  (req, res, next) =>
    upload(req, res, (error) => {
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE')
        return next(new AppError('Ảnh đại diện không được vượt quá 2 MB.', 413));
      next(error);
    }),
  avatarHandler,
);
router.delete('/avatar', deleteAvatarHandler);
export default router;
