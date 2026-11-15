import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { HydratedDocument } from 'mongoose';
import { env } from '../../config/env';
import { AppError } from '../../errors/AppError';
import { User, UserModel } from '../../models/user.model';
import { startEmailVerification, completeEmailVerification } from './emailVerification.service';
import { AccessTokenPayload } from '../../middlewares/auth.middleware';
import { LoginInput, RegisterInput } from '../../validations/auth.validation';
import { getPendingInvitation } from '../organization/invitation.service';
import { loadAccess, PERSONAL_ROLES } from './account.service';

const ACCESS_TOKEN_TTL = env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'];
const REFRESH_TOKEN_TTL = env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'];
const REMEMBER_REFRESH_TOKEN_TTL = env.JWT_REFRESH_REMEMBER_EXPIRES_IN as SignOptions['expiresIn'];

type Workspace = AccessTokenPayload['workspace'];

function signTokens(payload: AccessTokenPayload, remember = false, authVersion = 0) {
  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
  const refreshToken = jwt.sign(
    { sub: payload.sub, remember, authVersion, workspace: payload.workspace },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: remember ? REMEMBER_REFRESH_TOKEN_TTL : REFRESH_TOKEN_TTL,
    },
  );
  return { accessToken, refreshToken };
}

export async function sessionFor(
  user: HydratedDocument<User>,
  remember = false,
  requestedWorkspace?: Workspace,
  strictWorkspace = false,
) {
  const access = await loadAccess(user);
  let workspace = requestedWorkspace;
  if (workspace === 'personal' && !PERSONAL_ROLES.includes(access.role))
    throw AppError.forbidden('Vai trò này không có không gian cá nhân.');
  if (workspace === 'organization' && !access.membership) {
    if (strictWorkspace) throw AppError.forbidden('Bạn không còn là thành viên tổ chức.');
    workspace = undefined;
  }
  const tokens = signTokens(
    {
      sub: user.id,
      role: access.role,
      orgId: access.orgId,
      permissionsVersion: user.permissionsVersion ?? 0,
      workspace,
    },
    remember,
    user.authVersion ?? 0,
  );
  return { user, access, workspace, ...tokens };
}

export async function register(input: RegisterInput) {
  if (input.invitationToken) await getPendingInvitation(input.invitationToken, input.email);
  const existing = await UserModel.findOne({ email: input.email });
  if (existing) {
    throw AppError.conflict('Email already registered');
  }

  return startEmailVerification({
    email: input.email,
    name: input.name,
    passwordHash: await bcrypt.hash(input.password, 10),
    invitationToken: input.invitationToken,
  });
}

export async function login(input: LoginInput) {
  const user = await UserModel.findOne({ email: input.email }).select('+passwordHash');
  if (!user || !user.isActive) {
    throw AppError.unauthorized('Invalid credentials');
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw AppError.unauthorized('Invalid credentials');
  }

  if (input.invitationToken) await getPendingInvitation(input.invitationToken, user.email);
  if (!user.emailVerifiedAt) {
    return startEmailVerification({
      email: user.email,
      name: user.name,
      passwordHash: user.passwordHash,
      userId: user.id,
      remember: input.remember,
      invitationToken: input.invitationToken,
    });
  }

  return sessionFor(user, input.remember === true);
}

export async function refresh(
  refreshToken: string,
  invitationToken?: string,
  requestedWorkspace?: Workspace,
) {
  let payload: { sub: string; remember?: boolean; authVersion?: number; workspace?: Workspace };
  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as {
      sub: string;
      remember?: boolean;
      authVersion?: number;
      workspace?: Workspace;
    };
  } catch {
    throw AppError.unauthorized('Invalid or expired refresh token');
  }

  const user = await UserModel.findById(payload.sub);
  if (!user || !user.isActive || (payload.authVersion ?? 0) !== (user.authVersion ?? 0)) {
    throw AppError.unauthorized('Invalid refresh token');
  }
  if (!user.emailVerifiedAt) throw AppError.unauthorized('Verify your email by signing in again');

  if (invitationToken) await getPendingInvitation(invitationToken, user.email);

  return sessionFor(
    user,
    payload.remember === true,
    requestedWorkspace ?? payload.workspace,
    Boolean(requestedWorkspace),
  );
}

export async function completeOnboarding(userId: string) {
  const user = await UserModel.findByIdAndUpdate(
    userId,
    { $set: { hasCompletedOnboarding: true } },
    { new: true },
  );

  if (!user || !user.isActive) {
    throw AppError.unauthorized('User is inactive or no longer exists');
  }

  return { user, access: await loadAccess(user) };
}

export async function verifyEmail(challengeId: string, code: string, invitationToken?: string) {
  const result = await completeEmailVerification(challengeId, code, invitationToken);
  const session = await sessionFor(result.user, result.remember);
  return { ...session, remember: result.remember };
}
