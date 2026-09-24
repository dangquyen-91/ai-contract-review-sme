import { GoogleGenAI, Schema } from '@google/genai';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';

export const isLlmConfigured = Boolean(env.GEMINI_API_KEY);

const client = env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: env.GEMINI_API_KEY }) : null;

export async function generateJson(prompt: string, responseSchema?: Schema): Promise<unknown> {
  if (!client) {
    throw AppError.internal('LLM is not configured. Set GEMINI_API_KEY.');
  }

  const response = await client.models.generateContent({
    model: env.GEMINI_MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      ...(responseSchema ? { responseSchema } : {}),
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

export async function embedText(text: string): Promise<number[]> {
  if (!client) {
    throw AppError.internal('LLM is not configured. Set GEMINI_API_KEY.');
  }

  const response = await client.models.embedContent({
    model: env.GEMINI_EMBEDDING_MODEL,
    contents: text,
    config: {
      httpOptions: {
        retryOptions: { attempts: 3, initialDelay: 1, maxDelay: 5 },
      },
    },
  });

  const values = response.embeddings?.[0]?.values;
  if (!values || values.length === 0) {
    throw AppError.internal('LLM returned an empty embedding.');
  }

  return values;
}
