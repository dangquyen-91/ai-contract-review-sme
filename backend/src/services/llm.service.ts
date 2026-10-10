import { GoogleGenAI, Schema } from '@google/genai';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';

export const isLlmConfigured = Boolean(env.GEMINI_API_KEY);

const client = env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: env.GEMINI_API_KEY }) : null;

export async function generateJson(
  prompt: string,
  responseSchema?: Schema,
  signal?: AbortSignal,
): Promise<unknown> {
  if (!client) {
    throw AppError.internal('LLM is not configured. Set GEMINI_API_KEY.');
  }

  const response = await client.models.generateContent({
    model: env.GEMINI_MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      ...(responseSchema ? { responseSchema } : {}),
      abortSignal: signal,
      httpOptions: {
        retryOptions: { attempts: 3, initialDelay: 1, maxDelay: 5 },
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw AppError.internal('LLM returned an empty response.');
  }

  try {
    return JSON.parse(text);
  } catch {
    throw AppError.internal('LLM returned a response that was not valid JSON.');
  }
}

export async function generateText(
  prompt: string,
  systemInstruction?: string,
  signal?: AbortSignal,
): Promise<string> {
  if (!client) {
    throw AppError.internal('LLM is not configured. Set GEMINI_API_KEY.');
  }

  const response = await client.models.generateContent({
    model: env.GEMINI_MODEL,
    contents: prompt,
    config: {
      ...(systemInstruction ? { systemInstruction } : {}),
      abortSignal: signal,
      httpOptions: {
        retryOptions: { attempts: 3, initialDelay: 1, maxDelay: 5 },
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw AppError.internal('LLM returned an empty response.');
  }
  return text;
}

export async function* generateTextStream(
  prompt: string,
  systemInstruction?: string,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  if (!client) {
    throw AppError.internal('LLM is not configured. Set GEMINI_API_KEY.');
  }

  const stream = await client.models.generateContentStream({
    model: env.GEMINI_MODEL,
    contents: prompt,
    config: {
      ...(systemInstruction ? { systemInstruction } : {}),
      abortSignal: signal,
      httpOptions: {
        retryOptions: { attempts: 3, initialDelay: 1, maxDelay: 5 },
      },
    },
  });

  for await (const chunk of stream) {
    if (chunk.text) yield chunk.text;
  }
}

const EMBED_BATCH_SIZE = 100;

export type EmbeddingTaskType = 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT';

interface EmbedOptions {
  taskType: EmbeddingTaskType;
  outputDimensionality?: number;
  signal?: AbortSignal;
}

export async function embedTexts(
  texts: string[],
  { taskType, outputDimensionality, signal }: EmbedOptions,
): Promise<number[][]> {
  if (!client) {
    throw AppError.internal('LLM is not configured. Set GEMINI_API_KEY.');
  }

  const vectors: number[][] = [];
  for (let start = 0; start < texts.length; start += EMBED_BATCH_SIZE) {
    const batch = texts.slice(start, start + EMBED_BATCH_SIZE);
    const response = await client.models.embedContent({
      model: env.GEMINI_EMBEDDING_MODEL,
      contents: batch,
      config: {
        taskType,
        ...(outputDimensionality ? { outputDimensionality } : {}),
        abortSignal: signal,
        httpOptions: {
          retryOptions: { attempts: 3, initialDelay: 1, maxDelay: 5 },
        },
      },
    });

    const embeddings = response.embeddings ?? [];
    if (embeddings.length !== batch.length || embeddings.some((e) => !e.values?.length)) {
      throw AppError.internal('LLM returned an empty or incomplete embedding batch.');
    }
    vectors.push(...embeddings.map((e) => e.values as number[]));
  }

  return vectors;
}
