import { Response } from 'express';
import { AppError } from '../errors/AppError';
import { logger } from '../config/logger';

const HEARTBEAT_INTERVAL_MS = 15_000;

export interface SseStream {
  signal: AbortSignal;
  send: (event: string, data: unknown) => void;
  fail: (err: unknown) => void;
  end: () => void;
}

export function openSseStream(res: Response): SseStream {
  res.status(200).set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  const controller = new AbortController();
  const isOpen = () => !controller.signal.aborted && !res.writableEnded;

  const heartbeat = setInterval(() => {
    if (isOpen()) res.write(': ping\n\n');
  }, HEARTBEAT_INTERVAL_MS);

  res.on('close', () => {
    clearInterval(heartbeat);
    if (!res.writableEnded) controller.abort();
  });

  const send = (event: string, data: unknown) => {
    if (isOpen()) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  return {
    signal: controller.signal,
    send,
    fail: (err) => {
      if (controller.signal.aborted) return;
      const isAppError = err instanceof AppError;
      if (!isAppError || !err.isOperational) {
        logger.error(err instanceof Error ? err.message : 'Stream failed', {
          stack: err instanceof Error ? err.stack : undefined,
        });
      }
      send('error', {
        status: isAppError ? err.statusCode : 500,
        message: isAppError ? err.message : 'Internal server error',
      });
    },
    end: () => {
      clearInterval(heartbeat);
      if (!res.writableEnded) res.end();
    },
  };
}
