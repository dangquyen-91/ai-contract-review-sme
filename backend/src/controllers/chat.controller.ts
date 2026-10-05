import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/ApiResponse';
import { AppError } from '../errors/AppError';
import * as chatService from '../services/chat.service';
import { initSse, sendError, sendEvent } from '../utils/sse';

export const askAboutContractHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const result = await chatService.askAboutContract(
    req.user.orgId,
    req.user.sub,
    req.params.id,
    req.body.message,
  );
  ok(res, result);
});

export const listChatMessagesHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const messages = await chatService.listChatMessages(req.user.orgId, req.params.id);
  ok(res, messages);
});

export const streamAboutContractHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();

  initSse(res);
  try {
    await chatService.streamAboutContract(
      req.user.orgId,
      req.user.sub,
      req.params.id,
      req.body.message,
      (token) => sendEvent(res, 'token', { text: token }),
    );
    sendEvent(res, 'done', {});
  } catch (err) {
    sendError(res, err);
  } finally {
    res.end();
  }
});
