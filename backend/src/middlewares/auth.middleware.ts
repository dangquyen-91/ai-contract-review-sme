import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';
import { RoleCode } from '../models/role.model';
import { UserModel } from '../models/user.model';
import { Role } from '../models/role.model';

export type UserRole = RoleCode;

export interface AccessTokenPayload {
  sub: string; // user id
  role: UserRole;
  orgId?: string;
}

export type OrganizationAccessTokenPayload = AccessTokenPayload & { orgId: string };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(AppError.unauthorized('Missing bearer token'));
  }

  const token = header.slice('Bearer '.length);

  let payload: AccessTokenPayload;
  try {
    payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    if (!payload.sub || !/^[a-f\d]{24}$/i.test(payload.sub)) throw new Error('Invalid subject');
  } catch {
    return next(AppError.unauthorized('Invalid or expired token'));
  }
  try {
    const user = await UserModel.findOne({ _id: payload.sub, isActive: true }).populate('roleId');
    if (!user || !user.roleId)
      return next(AppError.unauthorized('User is inactive or no longer exists'));
    const role = (user.roleId as unknown as Role).code;
    const orgId = user.orgId?.toString();
    // Stale tokens must not keep old organization access or silently switch context.
    if (payload.role !== role || payload.orgId !== orgId) {
      return next(AppError.unauthorized('Account permissions changed. Refresh your access token.'));
    }
    req.user = { sub: user.id, role, orgId };
    return next();
  } catch (error) {
    return next(error);
  }
}

export function getOrganizationUser(req: Request): OrganizationAccessTokenPayload {
  if (!req.user) throw AppError.unauthorized();
  if (!req.user.orgId) throw AppError.forbidden('Organization setup required');
  return req.user as OrganizationAccessTokenPayload;
}
