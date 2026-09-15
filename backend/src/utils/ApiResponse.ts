import { Response } from 'express';

export function ok<T>(res: Response, data: T, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

export function paginated<T>(
  res: Response,
  items: T[],
  meta: { page: number; limit: number; total: number },
) {
  return res.status(200).json({
    success: true,
    data: items,
    meta: {
      ...meta,
      totalPages: Math.ceil(meta.total / meta.limit) || 1,
    },
  });
}
