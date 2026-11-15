import { Request } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

function bearerSubject(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return undefined;
  try {
    const { sub } = jwt.verify(header.slice('Bearer '.length), env.JWT_ACCESS_SECRET) as { sub?: unknown };
    return typeof sub === 'string' ? sub : undefined;
  } catch {
    return undefined;
  }
}

export function userOrIpKey(req: Request): string {
  const sub = req.user?.sub ?? bearerSubject(req);
  return sub ? `user:${sub}` : `ip:${req.ip}`;
}

export function bodyFieldOrIpKey(field: string) {
  return (req: Request): string => {
    const value: unknown = req.body?.[field];
    return typeof value === 'string' && value.trim()
      ? `${field}:${value.trim().toLowerCase()}`
      : `ip:${req.ip}`;
  };
}

export const invitationEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  keyGenerator: (req) => req.user!.sub,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many invitations. Please try again later.' } },
});

// General API traffic
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  keyGenerator: userOrIpKey,
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter reserved for endpoints that call an LLM API (cost control),
// e.g. contract summarization / risk detection routes.
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  keyGenerator: userOrIpKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many AI requests, please slow down' } },
});
