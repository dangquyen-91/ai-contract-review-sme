import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/ApiResponse';
import * as authService from '../services/identity/auth.service';
import { User } from '../models/user.model';
import { Role } from '../models/role.model';
import { HydratedDocument } from 'mongoose';
import { AppError } from '../errors/AppError';
import { resendEmailVerification } from '../services/identity/emailVerification.service';
import { googleLogin } from '../services/identity/googleAuth.service';

export const googleLoginHandler = asyncHandler(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const { user, ...tokens } = await googleLogin(req.body);
  ok(res, { user: toPublicUser(user), ...tokens });
});

export function toPublicUser(user: HydratedDocument<User>) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: (user.roleId as unknown as Role).code,
    orgId: user.orgId?.toString() ?? null,
    hasCompletedOnboarding: user.hasCompletedOnboarding,
    emailVerified: Boolean(user.emailVerifiedAt),
  };
}

export const registerHandler = asyncHandler(async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  ok(res, await authService.register(req.body), 202);
});

export const loginHandler = asyncHandler(async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  const result = await authService.login(req.body);
  if ('verificationRequired' in result) {
    ok(res, result, 202);
    return;
  }
  const { user, accessToken, refreshToken } = result;
  ok(res, { user: toPublicUser(user), accessToken, refreshToken });
});

export const verifyEmailHandler = asyncHandler(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const { user, ...tokens } = await authService.verifyEmail(
    req.body.challengeId,
    req.body.code,
    req.body.invitationToken,
  );
  ok(res, { user: toPublicUser(user), ...tokens });
});

export const resendVerificationHandler = asyncHandler(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  ok(res, await resendEmailVerification(req.body.challengeId, req.body.invitationToken), 202);
});

export const refreshHandler = asyncHandler(async (req: Request, res: Response) => {
  const { user, ...tokens } = await authService.refresh(
    req.body.refreshToken,
    req.body.invitationToken,
  );
  ok(res, { user: toPublicUser(user), ...tokens });
});

export const completeOnboardingHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();

  const user = await authService.completeOnboarding(req.user.sub);
  ok(res, { user: toPublicUser(user) });
});
