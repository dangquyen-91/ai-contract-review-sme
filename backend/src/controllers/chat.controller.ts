import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/ApiResponse';
import { getOrganizationUser } from '../middlewares/auth.middleware';
import * as chatService from '../services/chat.service';
import { initSse, sendError, sendEvent } from '../utils/sse';

export const askAboutContractHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getOrganizationUser(req);
  const result = await chatService.askAboutContract(
    user.orgId,
    user.sub,
    req.params.id,
    req.body.message,
  );
  ok(res, result);
});

export const listChatMessagesHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getOrganizationUser(req);
  const messages = await chatService.listChatMessages(user.orgId, req.params.id);
  ok(res, messages);
});

export const streamAboutContractHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getOrganizationUser(req);

  initSse(res);
  try {
    await chatService.streamAboutContract(
      user.orgId,
      user.sub,
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
