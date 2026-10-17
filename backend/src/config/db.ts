import mongoose from 'mongoose';
import { setServers } from 'node:dns';
import { env } from './env';
import { logger } from './logger';

export async function connectDB(): Promise<void> {
  // Apply before MongoDB performs SRV/TXT lookups; shared by API and worker startup.
  if (env.DNS_SERVERS.length > 0) setServers(env.DNS_SERVERS);
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
  mongoose.connection.on('error', (err) => logger.error('MongoDB connection error', err));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

  await mongoose.connect(env.MONGODB_URI);
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
