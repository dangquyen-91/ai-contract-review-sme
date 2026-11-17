import { z } from 'zod';
import { ENCRYPTED_PREFIX } from '../utils/fieldEncryption';

const objectId = z.string().regex(/^[a-f\d]{24}$/i);
export const expertChatQuerySchema = z
  .object({
    attempt: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(30),
    before: objectId.optional(),
    after: objectId.optional(),
  })
  .strict()
  .refine((query) => !(query.before && query.after), 'Use either before or after');

export const sendExpertMessageSchema = z
  .object({
    attempt: z.number().int().min(1),
    clientMessageId: z.string().uuid(),
    content: z
      .string()
      .trim()
      .min(1)
      .max(2000)
      .refine(
        (value) => !value.startsWith(ENCRYPTED_PREFIX),
        'Message starts with a reserved storage prefix',
      ),
  })
  .strict();

export type ExpertChatQuery = z.infer<typeof expertChatQuerySchema>;
export type SendExpertMessage = z.infer<typeof sendExpertMessageSchema>;
