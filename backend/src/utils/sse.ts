import { Response } from 'express';
import { AppError } from '../errors/AppError';
import { logger } from '../config/logger';

export function initSse(res: Response) {
  res.status(200).set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
}

export function sendEvent(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export function sendError(res: Response, err: unknown) {
  const isAppError = err instanceof AppError;
  if (!isAppError || !err.isOperational) {
    logger.error(err instanceof Error ? err.message : 'Stream failed', {
      stack: err instanceof Error ? err.stack : undefined,
    });
  }
  sendEvent(res, 'error', {
    status: isAppError ? err.statusCode : 500,
    message: isAppError ? err.message : 'Internal server error',
  });
}
