import { GoogleGenAI, Schema } from '@google/genai';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';

// Thin wrapper around the LLM provider. Call sites only depend on `generateJson`,
// so swapping Gemini for another provider later only means rewriting this file.
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
