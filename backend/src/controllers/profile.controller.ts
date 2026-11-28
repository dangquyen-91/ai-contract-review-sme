import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../errors/AppError';
import { ok } from '../utils/ApiResponse';
import * as profile from '../services/identity/profile.service';
import { recordAudit, requestActor } from '../services/audit/audit.service';

export const getProfileHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized();
  res.setHeader('Cache-Control', 'no-store');
  ok(res, await profile.getProfile(req.user.sub));
});
export const updateProfileHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized();
  res.setHeader('Cache-Control', 'no-store');
  ok(res, await profile.updateProfile(req.user.sub, req.body));
});
export const avatarHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized();
  if (!req.file) throw AppError.badRequest('Vui lòng chọn ảnh đại diện.');
  res.setHeader('Cache-Control', 'no-store');
  ok(res, await profile.updateProfileAvatar(req.user.sub, req.file));
});
export const deleteAvatarHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized();
  res.setHeader('Cache-Control', 'no-store');
  ok(res, await profile.deleteProfileAvatar(req.user.sub));
});
export const changePasswordHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized();
  res.setHeader('Cache-Control', 'no-store');
  const result = await profile.changePassword(req.user.sub, req.body);
  // The password itself is never recorded.
  await recordAudit({ action: 'account.password_change', actor: requestActor(req.user), target: { type: 'user', id: req.user.sub } });
  ok(res, result);
});
