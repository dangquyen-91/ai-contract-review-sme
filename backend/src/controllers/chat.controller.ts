import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/ApiResponse';
import { AppError } from '../errors/AppError';
import * as chatService from '../services/chat.service';

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
