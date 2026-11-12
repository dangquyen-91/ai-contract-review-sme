import multer from 'multer';
import type { RequestHandler } from 'express';
import { AppError } from '../errors/AppError';
import { STUDIO_REFERENCE_MAX_BYTES } from '../config/studioReference';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: STUDIO_REFERENCE_MAX_BYTES, files: 1, fields: 0 },
}).single('file');
export const uploadStudioReference: RequestHandler = (req, res, next) =>
  upload(req, res, (error) => {
    if (error instanceof multer.MulterError)
      return next(
        AppError.badRequest('Chỉ đính kèm một tệp PDF, Word hoặc TXT, tối đa 2 MB mỗi lần.'),
      );
    next(error);
  });
