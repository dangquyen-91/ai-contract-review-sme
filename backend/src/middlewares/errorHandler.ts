import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError';
import { logger } from '../config/logger';
import { env } from '../config/env';
import { MAX_FILE_SIZE_BYTES } from './upload.middleware';

interface HttpError {
  status?: number;
  expose?: boolean;
  type?: string;
  message?: string;
}

const BODY_PARSER_MESSAGES: Record<string, string> = {
  'entity.parse.failed': 'Request body is not valid JSON',
  'entity.too.large': 'Request body is too large',
};

function isClientHttpError(err: unknown): err is HttpError {
  const { status, expose } = (err ?? {}) as HttpError;
  return expose === true && typeof status === 'number' && status >= 400 && status < 500;
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: { message: `Route not found: ${req.method} ${req.originalUrl}` },
  });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: { message: 'Validation failed', details: err.flatten().fieldErrors },
    });
  }

  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error(err.message, { stack: err.stack });
    }
    return res.status(err.statusCode).json({
      success: false,
      error: { message: err.message },
    });
  }

  if (err instanceof multer.MulterError) {
    const tooLarge = err.code === 'LIMIT_FILE_SIZE';
    return res.status(tooLarge ? 413 : 400).json({
      success: false,
      error: {
        message: tooLarge
          ? `File exceeds the ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit`
          : err.message,
      },
    });
  }

  if (isClientHttpError(err)) {
    return res.status(err.status as number).json({
      success: false,
      error: { message: BODY_PARSER_MESSAGES[err.type ?? ''] ?? err.message ?? 'Bad request' },
    });
  }

  if ((err as { code?: number })?.code === 11000) {
    return res.status(409).json({
      success: false,
      error: { message: 'Resource already exists' },
    });
  }

  const error = err as Error;
  logger.error(error.message, { stack: error.stack });

  return res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      ...(env.NODE_ENV !== 'production' && { stack: error.stack }),
    },
  });
}
