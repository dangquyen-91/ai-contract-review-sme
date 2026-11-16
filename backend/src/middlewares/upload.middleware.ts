import multer from 'multer';
import { RequestHandler } from 'express';
import { validateUploadContent } from '../utils/uploadContent';
import { AppError } from '../errors/AppError';
import { normalizeUploadFileName } from '../utils/uploadFileName';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'image/png',
  'image/jpeg',
]);

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

function checkedUpload(upload: multer.Multer) {
  return {
    single(field: string): RequestHandler {
      const receive = upload.single(field);
      return (req, res, next) =>
        receive(req, res, (error) => {
          if (error) return next(error);
          if (!req.file) return next();
          void validateUploadContent(req.file.buffer, req.file.mimetype).then(() => next(), next);
        });
    },
    fields(fields: multer.Field[]): RequestHandler {
      const receive = upload.fields(fields);
      return (req, res, next) =>
        receive(req, res, (error) => {
          if (error) return next(error);
          const files = Object.values((req.files ?? {}) as Record<string, Express.Multer.File[]>).flat();
          void Promise.all(files.map((file) => validateUploadContent(file.buffer, file.mimetype))).then(() => next(), next);
        });
    },
  };
}

const uploadLimits = {
  fileSize: MAX_FILE_SIZE_BYTES,
  files: 1,
  fields: 20,
  parts: 21,
  fieldSize: 16 * 1024,
};

export const contractFileUpload = checkedUpload(
  multer({
    storage: multer.memoryStorage(),
    limits: uploadLimits,
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        return cb(AppError.badRequest(`Unsupported file type: ${file.mimetype}`));
      }
      file.originalname = normalizeUploadFileName(file.originalname);
      cb(null, true);
    },
  }),
);

const LEGAL_DOC_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword',
  'text/plain',
]);

export const LEGAL_DOC_UPLOAD_FIELDS = [
  { name: 'file', maxCount: 1 },
  { name: 'referenceFile', maxCount: 1 },
];

export const legalDocUpload = checkedUpload(
  multer({
    storage: multer.memoryStorage(),
    limits: { ...uploadLimits, files: 2, parts: 22 },
    fileFilter: (_req, file, cb) => {
      if (!LEGAL_DOC_MIME_TYPES.has(file.mimetype)) {
        return cb(AppError.badRequest(`Unsupported file type: ${file.mimetype}`));
      }
      file.originalname = normalizeUploadFileName(file.originalname);
      cb(null, true);
    },
  }),
);
