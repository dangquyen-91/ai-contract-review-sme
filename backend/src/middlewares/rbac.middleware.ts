import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { UserRole } from './auth.middleware';

export const CONTRACT_UPLOAD_ROLES: UserRole[] = ['administrator', 'owner', 'manager', 'staff', 'user'];
export const CONTRACT_REVIEW_ROLES: UserRole[] = ['administrator', 'owner', 'manager', 'staff', 'reviewer', 'user'];
export const CONTRACT_DELETE_ROLES: UserRole[] = ['administrator', 'owner', 'manager', 'user'];

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(AppError.unauthorized());
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(AppError.forbidden(`Requires role: ${allowedRoles.join(' or ')}`));
    }
    next();
  };
}
