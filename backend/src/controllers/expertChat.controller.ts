import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/ApiResponse';
import { listExpertMessages, sendExpertMessage } from '../services/review/expertChat.service';
import { ExpertChatQuery } from '../validations/expertChat.validation';

export const listExpertMessagesHandler = asyncHandler(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  ok(
    res,
    await listExpertMessages(
      req.user!,
      req.params.reviewId,
      req.query as unknown as ExpertChatQuery,
    ),
  );
});

export const sendExpertMessageHandler = asyncHandler(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const result = await sendExpertMessage(req.user!, req.params.reviewId, req.body);
  ok(res, result, result.replayed ? 200 : 201);
});
