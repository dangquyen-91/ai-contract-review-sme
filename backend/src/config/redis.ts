import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

let client: Redis | undefined;

export function getRedis(): Redis {
  if (!client) {
    client = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2, commandTimeout: 5000 });
    client.on('error', (err) => logger.error('Redis client error', { error: err.message }));
  }
  return client;
}

export async function closeRedis(): Promise<void> {
  const current = client;
  client = undefined;
  if (current) await current.quit().catch(() => current.disconnect());
}
