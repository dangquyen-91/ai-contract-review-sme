import multer from 'multer';
import type { RequestHandler } from 'express';
import { AppError } from '../errors/AppError';
import { DRAFT_IMPORT_MAX_BYTES } from '../config/draftImport';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: DRAFT_IMPORT_MAX_BYTES, files: 1, fields: 4, fieldSize: 1024 },
}).single('file');
export const uploadDraftImport: RequestHandler = (req, res, next) =>
  upload(req, res, (error) => {
    if (error instanceof multer.MulterError)
      return next(AppError.badRequest('Chỉ tải lên một tệp PDF, Word .docx hoặc TXT, tối đa 10 MB.'));
    // Multer reads the filename as latin1; browsers send it as UTF-8.
    if (!error && req.file) req.file.originalname = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    next(error);
  });
