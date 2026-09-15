import { Request } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  sortBy: string;
  sortOrder: 1 | -1;
}

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

export function parsePagination(req: Request, defaultSortBy = 'createdAt'): PaginationParams {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(String(req.query.limit ?? String(DEFAULT_LIMIT)), 10) || DEFAULT_LIMIT),
  );
  const sortBy = typeof req.query.sortBy === 'string' ? req.query.sortBy : defaultSortBy;
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

  return { page, limit, skip: (page - 1) * limit, sortBy, sortOrder };
}
