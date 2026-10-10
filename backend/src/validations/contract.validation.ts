import { z } from 'zod';
import { CONTRACT_STATUSES } from '../models/contract.model';
import { RISK_LEVELS } from '../models/contractVersion.model';

const codeSchema = z.string().trim().min(1).max(50);

export const createContractSchema = z.object({
  title: z.string().min(2).max(300),
  type: codeSchema,
  ourParty: codeSchema.optional(),
  industry: codeSchema.optional(),
});

export const CONTRACT_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'title',
  'type',
  'status',
  'overallRiskLevel',
] as const;

export const listContractsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sortBy: z.enum(CONTRACT_SORT_FIELDS).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  type: codeSchema.optional(),
  industry: codeSchema.optional(),
  status: z.enum(CONTRACT_STATUSES).optional(),
  riskLevel: z.enum(RISK_LEVELS).optional(),
  search: z.string().optional(),
});

export const contractIdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid contract id'),
});

export const contractTextQuerySchema = z.object({
  redacted: z.enum(['true', 'false']).optional(),
});

export const analysisFocusBodySchema = z.object({
  analysisFocus: z.string().trim().min(1).max(1000).optional(),
});

export const chatMessageBodySchema = z.object({
  message: z.string().trim().min(1).max(5000),
});

export type CreateContractInput = z.infer<typeof createContractSchema>;
export type ListContractsQuery = z.infer<typeof listContractsQuerySchema>;

export const findingParamSchema = contractIdParamSchema.extend({
  findingId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid finding id'),
});

export const updateProposedRevisionBodySchema = z
  .object({
    revisedText: z.string().trim().min(1).max(10000).optional(),
    reason: z.string().trim().min(1).max(2000).optional(),
  })
  .refine((v) => v.revisedText !== undefined || v.reason !== undefined, {
    message: 'Provide revisedText and/or reason',
  });
