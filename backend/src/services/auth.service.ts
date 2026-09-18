import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';
import { UserModel } from '../models/user.model';
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

const ACCESS_TOKEN_TTL = env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'];
const REFRESH_TOKEN_TTL = env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'];

function signTokens(payload: AccessTokenPayload) {
  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
  const refreshToken = jwt.sign({ sub: payload.sub }, env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL,
  });
  return { accessToken, refreshToken };
}

export async function register(input: RegisterInput) {
  const existing = await UserModel.findOne({ email: input.email });
  if (existing) {
    throw AppError.conflict('Email already registered');
  }

  const org = await OrganizationModel.create({ name: input.orgName });
  const passwordHash = await bcrypt.hash(input.password, 10);
  const adminRole = await getRoleByCode('administrator');

  const created = await UserModel.create({
    orgId: org._id,
    roleId: adminRole._id,
    name: input.name,
    email: input.email,
    passwordHash,
  });
  const user = await created.populate('roleId');

  const tokens = signTokens({ sub: user.id, role: roleCodeOf(user), orgId: org.id });
  return { user, ...tokens };
}

export async function login(input: LoginInput) {
  const user = await UserModel.findOne({ email: input.email })
    .select('+passwordHash')
    .populate('roleId');
  if (!user || !user.isActive) {
    throw AppError.unauthorized('Invalid credentials');
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw AppError.unauthorized('Invalid credentials');
  }

  const tokens = signTokens({
    sub: user.id,
    role: roleCodeOf(user),
    orgId: user.orgId.toString(),
  });
  return { user, ...tokens };
}

export async function refresh(refreshToken: string) {
  let payload: { sub: string };
  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { sub: string };
  } catch {
    throw AppError.unauthorized('Invalid or expired refresh token');
  }

  const user = await UserModel.findById(payload.sub).populate('roleId');
  if (!user || !user.isActive) {
    throw AppError.unauthorized('Invalid refresh token');
  }

  return signTokens({
    sub: user.id,
    role: roleCodeOf(user),
    orgId: user.orgId.toString(),
  });
}
