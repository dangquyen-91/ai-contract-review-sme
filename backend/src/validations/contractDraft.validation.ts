import { z } from 'zod';
import { studioLawIdsSchema } from './studio.validation';

export const draftIdSchema = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) });
export const draftListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
export const studioLawParamsSchema = z.object({ sourceId: z.string().regex(/^[a-f\d]{24}$/i) });
export const pinDraftSchema = z.object({ pinned: z.boolean() }).strict();
export const draftProposalParamsSchema = draftIdSchema.extend({
  proposalId: z.string().regex(/^[a-f\d]{24}$/i),
});
export const draftExportQuerySchema = z.object({
  format: z.enum(['docx', 'print']).default('docx'),
});
const inputSchema = z
  .record(z.string().trim().max(16000))
  .refine(
    (value) =>
      Object.keys(value).length <= 64 &&
      Object.entries(value).every(([key, text]) => key === 'lineItems' || text.length <= 4000),
  );
export const createDraftSchema = z
  .object({
    templateCode: z.enum(['labor', 'service', 'sales', 'rental']),
    title: z.string().trim().min(2).max(200),
    ourParty: z.string().min(1).max(30),
    input: inputSchema,
    editorMode: z.literal('studio').optional(),
  })
  .strict();
export const revisionSchema = z.object({ revision: z.number().int().min(0) }).strict();
export const updateDraftSchema = revisionSchema
  .extend({
    title: z.string().trim().min(2).max(200),
    input: inputSchema,
    ourParty: z.string().min(1).max(30),
    content: z.string().max(80000),
    document: z.unknown().optional(),
    legalSourceIds: studioLawIdsSchema.optional(),
  })
  .strict();
export const draftDecisionSchema = revisionSchema
  .extend({
    action: z.enum(['submit', 'approve', 'return']),
    note: z.string().trim().max(1000).default(''),
  })
  .strict();
export type DraftInput = z.infer<typeof createDraftSchema>;
