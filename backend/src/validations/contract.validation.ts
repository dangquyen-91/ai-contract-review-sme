import { z } from 'zod';
import { CONTRACT_STATUSES, CONTRACT_TYPES, RISK_LEVELS } from '../models/contract.model';

export const createContractSchema = z.object({
  title: z.string().min(2).max(300),
  type: z.enum(CONTRACT_TYPES),
});

export const listContractsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  type: z.enum(CONTRACT_TYPES).optional(),
  status: z.enum(CONTRACT_STATUSES).optional(),
  riskLevel: z.enum(RISK_LEVELS).optional(),
  search: z.string().optional(),
});

export const contractIdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid contract id'),
});

export type CreateContractInput = z.infer<typeof createContractSchema>;
export type ListContractsQuery = z.infer<typeof listContractsQuerySchema>;
