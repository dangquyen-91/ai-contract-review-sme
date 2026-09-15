import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError';
import { logger } from '../config/logger';
import { env } from '../config/env';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: { message: `Route not found: ${req.method} ${req.originalUrl}` },
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
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
