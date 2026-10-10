import { z } from 'zod';

export const reviewIdParamSchema = z.object({
  reviewId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid review id'),
});
