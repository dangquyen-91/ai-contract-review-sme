import { Job, Queue, UnrecoverableError } from 'bullmq';
import { addJobWithTimeout, createQueue, createWorker } from '../../config/queue';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { LegalSourceModel } from '../../models/legalSource.model';
import { EMBEDDING_DIMENSIONS, LegalKnowledgeChunkModel } from '../../models/legalKnowledgeChunk.model';
import { embedTexts, isLlmConfigured, rateLimitInfoOf } from '../ai/llm.service';
import { embeddingInputOf } from './legalKnowledgeIngest.service';

const LEGAL_INGESTION_QUEUE = 'legal-ingestion';
const MAX_ATTEMPTS = 5;
const EMBED_BATCH_SIZE = 20;
const CHARS_PER_TOKEN = 2.5;
const BUDGET_WINDOW_MS = 60_000;
const MAX_INLINE_WAIT_MS = 5 * 60_000;
const DEFAULT_RATE_LIMIT_WAIT_MS = 60_000;
const DAILY_QUOTA_RETRY_MS = 60 * 60_000;
const MAX_CONSECUTIVE_RATE_LIMITS = 6;
const ACTIVE_JOB_STATES = new Set(['waiting', 'active', 'delayed', 'prioritized', 'waiting-children']);

interface LegalIngestionJobData {
  legalSourceId: string;
}

let queue: Queue<LegalIngestionJobData> | undefined;
const getQueue = () => (queue ??= createQueue<LegalIngestionJobData>(LEGAL_INGESTION_QUEUE));

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class MinuteBudget {
  private entries: { at: number; tokens: number; requests: number }[] = [];

  constructor(
    private readonly tokensPerMinute: number,
    private readonly requestsPerMinute: number,
  ) {}

  async take(tokens: number, requests: number) {
    for (;;) {
      const now = Date.now();
      this.entries = this.entries.filter((e) => now - e.at < BUDGET_WINDOW_MS);
      const usedTokens = this.entries.reduce((sum, e) => sum + e.tokens, 0);
      const usedRequests = this.entries.reduce((sum, e) => sum + e.requests, 0);
      const fits =
        usedTokens + tokens <= this.tokensPerMinute && usedRequests + requests <= this.requestsPerMinute;
      if (fits || this.entries.length === 0) {
        this.entries.push({ at: now, tokens, requests });
        return;
      }
      await sleep(this.entries[0].at + BUDGET_WINDOW_MS - now + 50);
    }
  }
}

const budget = new MinuteBudget(env.LEGAL_EMBED_TOKENS_PER_MINUTE, env.LEGAL_EMBED_REQUESTS_PER_MINUTE);

const estimateTokens = (texts: string[]) =>
  Math.ceil(texts.reduce((sum, t) => sum + t.length, 0) / CHARS_PER_TOKEN);

export async function queueLegalIngestion(legalSourceId: string, delayMs = 0): Promise<string> {
  const jobId = `ingest-${legalSourceId}-${Date.now()}`;
  const now = new Date();
  await LegalSourceModel.updateOne(
    { _id: legalSourceId },
    {
      $set: {
        'ingestion.status': delayMs ? 'paused' : 'queued',
        'ingestion.jobId': jobId,
        'ingestion.queuedAt': now,
        ...(delayMs ? { 'ingestion.resumeAt': new Date(now.getTime() + delayMs) } : {}),
      },
      $unset: { 'ingestion.finishedAt': '', ...(delayMs ? {} : { 'ingestion.resumeAt': '', 'ingestion.error': '' }) },
    },
  );
  await addJobWithTimeout(getQueue(), 'ingest', { legalSourceId }, {
    jobId,
    delay: delayMs,
    attempts: MAX_ATTEMPTS,
    backoff: { type: 'exponential', delay: 30_000 },
    removeOnComplete: { age: 7 * 24 * 3600 },
    removeOnFail: { age: 30 * 24 * 3600 },
  });
  return jobId;
}

export async function isLegalIngestionJobAlive(jobId: string | null | undefined): Promise<boolean> {
  if (!jobId) return false;
  const job = await getQueue().getJob(jobId);
  if (!job) return false;
  return ACTIVE_JOB_STATES.has(await job.getState());
}

const ownedBy = (job: Job<LegalIngestionJobData>) => ({
  _id: job.data.legalSourceId,
  'ingestion.jobId': job.id,
});

async function countChunks(legalSourceId: string) {
  const [total, embedded] = await Promise.all([
    LegalKnowledgeChunkModel.countDocuments({ legalSourceId }),
    LegalKnowledgeChunkModel.countDocuments({ legalSourceId, embedding: { $exists: true } }),
  ]);
  return { total, embedded };
}

async function pauseForQuota(job: Job<LegalIngestionJobData>, delayMs: number, reason: string) {
  const owned = await LegalSourceModel.exists(ownedBy(job));
  if (!owned) return;
  await LegalSourceModel.updateOne(ownedBy(job), { $set: { 'ingestion.error': reason } });
  await queueLegalIngestion(job.data.legalSourceId, delayMs);
  logger.warn('Legal source ingestion paused by the embedding quota', {
    legalSourceId: job.data.legalSourceId,
    resumeInMinutes: Math.round(delayMs / 60_000),
    reason,
  });
}

async function runIngestion(job: Job<LegalIngestionJobData>): Promise<void> {
  const { legalSourceId } = job.data;
  if (!isLlmConfigured) throw new UnrecoverableError('LLM is not configured. Set GEMINI_API_KEY.');

  const started = await LegalSourceModel.updateOne(ownedBy(job), {
    $set: { 'ingestion.status': 'running', 'ingestion.startedAt': new Date() },
    $unset: { 'ingestion.resumeAt': '' },
  });
  if (started.matchedCount === 0) return;

  let rateLimitedInARow = 0;
  for (;;) {
    const source = await LegalSourceModel.findOne(ownedBy(job)).select('citationLabel');
    if (!source) return;

    const pending = await LegalKnowledgeChunkModel.find({ legalSourceId, embedding: { $exists: false } })
      .sort({ order: 1 })
      .limit(EMBED_BATCH_SIZE)
      .select('chunkText hierarchy');
    if (pending.length === 0) break;

    const inputs = pending.map((c) => embeddingInputOf(source.citationLabel, c));
    await budget.take(estimateTokens(inputs), inputs.length);

    let vectors: number[][];
    try {
      vectors = await embedTexts(inputs, {
        taskType: 'RETRIEVAL_DOCUMENT',
        outputDimensionality: EMBEDDING_DIMENSIONS,
        retryAttempts: 1,
      });
      rateLimitedInARow = 0;
    } catch (err) {
      const limit = rateLimitInfoOf(err);
      if (!limit) throw err;
      rateLimitedInARow++;
      const waitMs = limit.retryAfterMs ?? DEFAULT_RATE_LIMIT_WAIT_MS;
      if (limit.dailyQuota) {
        await pauseForQuota(job, Math.max(waitMs, DAILY_QUOTA_RETRY_MS), 'The daily embedding quota is used up; ingestion resumes automatically');
        return;
      }
      if (waitMs > MAX_INLINE_WAIT_MS || rateLimitedInARow > MAX_CONSECUTIVE_RATE_LIMITS) {
        await pauseForQuota(job, Math.max(waitMs, DEFAULT_RATE_LIMIT_WAIT_MS), 'The embedding rate limit was hit repeatedly; ingestion resumes automatically');
        return;
      }
      logger.info('Embedding rate limit hit, waiting before the next batch', { legalSourceId, waitMs });
      await sleep(waitMs);
      continue;
    }

    await LegalKnowledgeChunkModel.bulkWrite(
      pending.map((chunk, i) => ({
        updateOne: {
          filter: { _id: chunk._id, embedding: { $exists: false } },
          update: { $set: { embedding: vectors[i] } },
        },
      })),
    );
    const counts = await countChunks(legalSourceId);
    await LegalSourceModel.updateOne(ownedBy(job), {
      $set: { 'ingestion.embeddedChunks': counts.embedded, 'ingestion.totalChunks': counts.total },
    });
    await job.updateProgress(counts);
  }

  const counts = await countChunks(legalSourceId);
  await LegalSourceModel.updateOne(ownedBy(job), {
    $set: {
      'ingestion.status': 'completed',
      'ingestion.embeddedChunks': counts.embedded,
      'ingestion.totalChunks': counts.total,
      'ingestion.finishedAt': new Date(),
    },
    $unset: { 'ingestion.error': '', 'ingestion.resumeAt': '' },
  });
}

async function recordFailure(job: Job<LegalIngestionJobData>, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  const finalAttempt = err instanceof UnrecoverableError || job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
  logger.warn('Legal source ingestion attempt failed', {
    legalSourceId: job.data.legalSourceId,
    attempt: job.attemptsMade + 1,
    finalAttempt,
    error: message,
  });
  await LegalSourceModel.updateOne(ownedBy(job), {
    $set: finalAttempt
      ? { 'ingestion.status': 'failed', 'ingestion.error': message, 'ingestion.finishedAt': new Date() }
      : { 'ingestion.error': `${message} (retrying)` },
  }).catch(() => undefined);
}

export async function processLegalIngestion(job: Job<LegalIngestionJobData>): Promise<void> {
  try {
    await runIngestion(job);
  } catch (err) {
    await recordFailure(job, err);
    throw err;
  }
}

export function startLegalIngestionWorker() {
  getQueue()
    .setGlobalConcurrency(1)
    .catch((err) => logger.warn('Could not limit legal ingestion to one job at a time', { error: err.message }));
  return createWorker<LegalIngestionJobData, void>(LEGAL_INGESTION_QUEUE, processLegalIngestion, {
    concurrency: 1,
  });
}
