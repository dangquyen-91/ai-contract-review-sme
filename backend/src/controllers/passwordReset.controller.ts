import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/ApiResponse';
import { requestPasswordReset, resetPassword } from '../services/identity/passwordReset.service';

export const forgotPasswordHandler = asyncHandler(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  ok(res, await requestPasswordReset(req.body.email), 202);
});
export const resetPasswordHandler = asyncHandler(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  ok(res, await resetPassword(req.body.challengeId, req.body.code, req.body.password));
});
