import multer from 'multer';
import { AppError } from '../errors/AppError';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'image/png',
  'image/jpeg',
]);

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

// Buffered in memory for now; swap storage engine once MinIO/S3 upload is wired up.
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
