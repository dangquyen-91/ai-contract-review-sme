import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/ApiResponse';
import * as authService from '../services/auth.service';
import { User } from '../models/user.model';
import { Role } from '../models/role.model';
import { HydratedDocument } from 'mongoose';
import { AppError } from '../errors/AppError';

function toPublicUser(user: HydratedDocument<User>) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: (user.roleId as unknown as Role).code,
    orgId: user.orgId?.toString() ?? null,
    hasCompletedOnboarding: user.hasCompletedOnboarding || Boolean(user.orgId),
  };
}

export const registerHandler = asyncHandler(async (req: Request, res: Response) => {
  const { user, accessToken, refreshToken } = await authService.register(req.body);
  ok(res, { user: toPublicUser(user), accessToken, refreshToken }, 201);
});

export const loginHandler = asyncHandler(async (req: Request, res: Response) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body);
  ok(res, { user: toPublicUser(user), accessToken, refreshToken });
});

export const refreshHandler = asyncHandler(async (req: Request, res: Response) => {
  const tokens = await authService.refresh(req.body.refreshToken);
  ok(res, tokens);
});

export const completeOnboardingHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();

  const user = await authService.completeOnboarding(req.user.sub);
  ok(res, { user: toPublicUser(user) });
});
