import multer from 'multer';
import { AppError } from '../errors/AppError';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'image/png',
  'image/jpeg',
]);

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

export const contractFileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(AppError.badRequest(`Unsupported file type: ${file.mimetype}`));
    }
    cb(null, true);
  },
});

const LEGAL_DOC_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'text/plain',
]);

export const legalDocUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!LEGAL_DOC_MIME_TYPES.has(file.mimetype)) {
      return cb(AppError.badRequest(`Unsupported file type: ${file.mimetype}`));
    }
    cb(null, true);
  },
});
