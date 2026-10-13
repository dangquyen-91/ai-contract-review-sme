import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_ACCESS_SECRET: z.string().min(1, 'JWT_ACCESS_SECRET is required'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_REMEMBER_EXPIRES_IN: z.string().default('30d'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  INVITATION_ACCEPT_URL: z.string().url().default('http://localhost:3000/loi-moi'),
  BREVO_API_KEY: z.string().optional(),
  BREVO_SENDER_EMAIL: z.union([z.string().trim().email(), z.literal('')]).optional(),
  BREVO_SENDER_NAME: z.string().trim().min(1).default('AI Contract Review'),

  DATA_ENCRYPTION_KEY: z
    .string()
    .refine(
      (value) => Buffer.from(value, 'base64').length === 32,
      'DATA_ENCRYPTION_KEY must be a base64-encoded 32-byte key',
    ),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-3.1-flash-lite'),
  GEMINI_EMBEDDING_MODEL: z.string().default('gemini-embedding-001'),
  LEGAL_EMBED_TOKENS_PER_MINUTE: z.coerce.number().int().min(1000).default(30000),
  LEGAL_EMBED_REQUESTS_PER_MINUTE: z.coerce.number().int().min(1).default(100),

  OCR_WORKERS: z.coerce.number().int().min(1).max(8).default(2),

  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  START_WORKERS: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
