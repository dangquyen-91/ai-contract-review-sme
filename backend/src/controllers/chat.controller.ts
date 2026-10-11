import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/ApiResponse';
import { getOrganizationUser } from '../middlewares/auth.middleware';
import * as chatService from '../services/chat.service';
import { openSseStream } from '../utils/sse';
import { getIdempotencyKey } from '../validations/subscription.validation';

export const askAboutContractHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getOrganizationUser(req);
  const idempotencyKey = getIdempotencyKey(req);
  const controller = new AbortController();
  const onClose = () => {
    if (!res.writableEnded) controller.abort();
  };
  res.on('close', onClose);
  try {
    const result = await chatService.askAboutContract(
      user.orgId,
      user.sub,
      req.params.id,
      req.body.message,
      idempotencyKey,
      controller.signal,
    );
    ok(res, result);
  } finally {
    res.off('close', onClose);
  }
});

export const listChatMessagesHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getOrganizationUser(req);
  const messages = await chatService.listChatMessages(user.orgId, req.params.id);
  ok(res, messages);
});

export const streamAboutContractHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getOrganizationUser(req);
  const idempotencyKey = getIdempotencyKey(req);

  const stream = openSseStream(res);
  try {
    const result = await chatService.streamAboutContract(
      user.orgId,
      user.sub,
      req.params.id,
      req.body.message,
      (token) => stream.send('token', { text: token }),
      idempotencyKey,
      stream.signal,
    );
    stream.send('done', result);
  } catch (err) {
    stream.fail(err);
  } finally {
    stream.end();
  }
});
