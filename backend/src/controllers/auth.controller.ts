import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/ApiResponse';
import * as authService from '../services/identity/auth.service';
import { User } from '../models/user.model';
import { HydratedDocument } from 'mongoose';
import { AppError } from '../errors/AppError';
import { resendEmailVerification } from '../services/identity/emailVerification.service';
import { googleLogin } from '../services/identity/googleAuth.service';
import { AccountAccess } from '../services/identity/account.service';

type Workspace = 'personal' | 'organization';

export function toPublicUser(
  user: HydratedDocument<User>,
  access: AccountAccess,
  workspace?: Workspace,
) {
  const personal = workspace === 'personal';
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
    role: personal ? 'user' : access.role,
    orgId: personal ? null : (access.orgId ?? null),
    organizationMembership: access.membership,
    workspace: workspace ?? (access.membership ? 'organization' : 'personal'),
    hasCompletedOnboarding: user.hasCompletedOnboarding,
    emailVerified: Boolean(user.emailVerifiedAt),
  };
}

export function sessionResponse(session: Awaited<ReturnType<typeof authService.sessionFor>>) {
  return {
    user: toPublicUser(session.user, session.access, session.workspace),
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  };
}

export const googleLoginHandler = asyncHandler(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  ok(res, sessionResponse(await googleLogin(req.body)));
});

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
  ok(res, sessionResponse(result));
});

export const verifyEmailHandler = asyncHandler(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const session = await authService.verifyEmail(
    req.body.challengeId,
    req.body.code,
    req.body.invitationToken,
  );
  ok(res, { ...sessionResponse(session), remember: session.remember });
});

export const resendVerificationHandler = asyncHandler(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  ok(res, await resendEmailVerification(req.body.challengeId, req.body.invitationToken), 202);
});

export const refreshHandler = asyncHandler(async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  const session = await authService.refresh(
    req.body.refreshToken,
    req.body.invitationToken,
    req.body.workspace,
  );
  ok(res, sessionResponse(session));
});

export const completeOnboardingHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();

  const { user, access } = await authService.completeOnboarding(req.user.sub);
  ok(res, { user: toPublicUser(user, access) });
});
