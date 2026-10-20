import { ConnectionOptions, Job, JobsOptions, Processor, Queue, QueueEvents, Worker, WorkerOptions } from 'bullmq';
import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';
import { AppError } from '../errors/AppError';

const connection: ConnectionOptions = { url: env.REDIS_URL, maxRetriesPerRequest: null };

const ENQUEUE_TIMEOUT_MS = 5000;

export async function addJobWithTimeout<DataType>(
  queue: Queue<DataType>,
  name: string,
  data: DataType,
  options: JobsOptions,
): Promise<Job<DataType>> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new AppError('Background processing is unavailable, please try again later', 503)),
      ENQUEUE_TIMEOUT_MS,
    );
  });
  try {
    return (await Promise.race([queue.add(name as never, data as never, options), timeout])) as Job<DataType>;
  } finally {
    clearTimeout(timer);
  }
}

const openResources: { close: () => Promise<void> }[] = [];

export function createQueue<DataType>(name: string): Queue<DataType> {
  const queue = new Queue<DataType>(name, { connection });
  queue.on('error', (err) => logger.error(`Queue "${name}" error`, { error: err.message }));
  openResources.push(queue);
  return queue;
}

export function createQueueEvents(name: string): QueueEvents {
  const queueEvents = new QueueEvents(name, { connection });
  queueEvents.on('error', (err) => logger.error(`Queue events "${name}" error`, { error: err.message }));
  openResources.push(queueEvents);
  return queueEvents;
}

export function createWorker<DataType, ResultType>(
  name: string,
  processor: Processor<DataType, ResultType>,
  options: Omit<WorkerOptions, 'connection'> = {},
): Worker<DataType, ResultType> {
  const worker = new Worker<DataType, ResultType>(name, processor, { ...options, connection });
  worker.on('error', (err) => logger.error(`Worker "${name}" error`, { error: err.message }));
  openResources.push(worker);
  return worker;
}

export async function assertRedisReachable(): Promise<void> {
  const client = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    connectTimeout: 5000,
    maxRetriesPerRequest: 0,
    retryStrategy: () => null,
  });
  client.on('error', () => undefined);
  try {
    await client.connect();
    await client.ping();
  } catch (err) {
    throw new Error(
      `Cannot reach Redis at ${env.REDIS_URL} (${err instanceof Error ? err.message : String(err)}). ` +
        'Start it with "docker compose up -d redis" or set REDIS_URL.',
    );
  } finally {
    client.disconnect();
  }
}

export async function closeQueues(): Promise<void> {
  await Promise.allSettled(openResources.splice(0).map((resource) => resource.close()));
}
