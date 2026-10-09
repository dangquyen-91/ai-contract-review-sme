import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { HydratedDocument } from 'mongoose';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';
import { User, UserModel } from '../models/user.model';
import { OrganizationModel } from '../models/organization.model';
import { Role } from '../models/role.model';
import { getRoleByCode } from './role.service';
import { AccessTokenPayload } from '../middlewares/auth.middleware';
import { LoginInput, RegisterInput } from '../validations/auth.validation';

function roleCodeOf(user: { roleId: unknown }) {
  const role = user.roleId as Role | null | undefined;
  if (!role || typeof role !== 'object' || !('code' in role)) {
    throw AppError.internal('User role reference is invalid or unpopulated');
  }
  return role.code as AccessTokenPayload['role'];
}

async function ensurePersonalWorkspace(user: HydratedDocument<User>): Promise<HydratedDocument<User>> {
  if (user.orgId || !user.hasCompletedOnboarding) return user;

  const organization = await OrganizationModel.create({ name: `Không gian cá nhân của ${user.name}`, isPersonal: true });
  const updated = await UserModel.findOneAndUpdate(
    { _id: user._id, orgId: null },
    { $set: { orgId: organization._id } },
    { new: true },
  ).populate('roleId');

  if (!updated) {
    await OrganizationModel.deleteOne({ _id: organization._id });
    const existing = await UserModel.findById(user._id).populate('roleId');
    if (!existing) throw AppError.notFound('User not found');
    return existing;
  }
  return updated;
}

const ACCESS_TOKEN_TTL = env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'];
const REFRESH_TOKEN_TTL = env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'];
const REMEMBER_REFRESH_TOKEN_TTL = env.JWT_REFRESH_REMEMBER_EXPIRES_IN as SignOptions['expiresIn'];

function signTokens(payload: AccessTokenPayload, remember = false) {
  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
  const refreshToken = jwt.sign({ sub: payload.sub, remember }, env.JWT_REFRESH_SECRET, {
    expiresIn: remember ? REMEMBER_REFRESH_TOKEN_TTL : REFRESH_TOKEN_TTL,
  });
  return { accessToken, refreshToken };
}

export async function register(input: RegisterInput) {
  const existing = await UserModel.findOne({ email: input.email });
  if (existing) {
    throw AppError.conflict('Email already registered');
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const userRole = await getRoleByCode('user');

  const created = await UserModel.create({
    roleId: userRole._id,
    name: input.name,
    email: input.email,
    passwordHash,
  });
  const user = await created.populate('roleId');

  const tokens = signTokens({ sub: user.id, role: roleCodeOf(user) });
  return { user, ...tokens };
}

export async function login(input: LoginInput) {
  let user = await UserModel.findOne({ email: input.email })
    .select('+passwordHash')
    .populate('roleId');
  if (!user || !user.isActive) {
    throw AppError.unauthorized('Invalid credentials');
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw AppError.unauthorized('Invalid credentials');
  }

  if (roleCodeOf(user) === 'user' && user.hasCompletedOnboarding && !user.orgId) {
    user = await ensurePersonalWorkspace(user) as typeof user;
  }

  const tokens = signTokens({
    sub: user.id,
    role: roleCodeOf(user),
    orgId: user.orgId?.toString(),
  }, input.remember === true);
  return { user, ...tokens };
}

export async function refresh(refreshToken: string) {
  let payload: { sub: string; remember?: boolean };
  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { sub: string; remember?: boolean };
  } catch {
    throw AppError.unauthorized('Invalid or expired refresh token');
  }

  let user = await UserModel.findById(payload.sub).populate('roleId');
  if (!user || !user.isActive) {
    throw AppError.unauthorized('Invalid refresh token');
  }

  if (roleCodeOf(user) === 'user' && user.hasCompletedOnboarding && !user.orgId) {
    user = await ensurePersonalWorkspace(user) as typeof user;
  }

  const tokens = signTokens({
    sub: user.id,
    role: roleCodeOf(user),
    orgId: user.orgId?.toString(),
  }, payload.remember === true);
  return { user, ...tokens };
}

export async function completeOnboarding(userId: string) {
  const user = await UserModel.findByIdAndUpdate(
    userId,
    { $set: { hasCompletedOnboarding: true } },
    { new: true },
  ).populate('roleId');

  if (!user || !user.isActive) {
    throw AppError.unauthorized('User is inactive or no longer exists');
  }

  if (roleCodeOf(user) === 'user' && !user.orgId) {
    return ensurePersonalWorkspace(user);
  }
  return user;
}
