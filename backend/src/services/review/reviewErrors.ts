import { ApiError } from '@google/genai';
import { UnrecoverableError } from 'bullmq';
import { AppError } from '../../errors/AppError';
import { REVIEW_ERROR_CODES } from '../../models/review.model';

export type ReviewErrorCode = (typeof REVIEW_ERROR_CODES)[number];

type CodedError = Error & { reviewErrorCode?: ReviewErrorCode };

export function reviewFailure(code: ReviewErrorCode, message: string, recoverable = false): Error {
  const err: CodedError = recoverable ? new Error(message) : new UnrecoverableError(message);
  err.reviewErrorCode = code;
  return err;
}

export function reviewErrorCodeOf(err: unknown): ReviewErrorCode {
  const tagged = (err as CodedError | null)?.reviewErrorCode;
  if (tagged) return tagged;
  const isApiError = err instanceof ApiError || (err instanceof Error && err.name === 'ApiError');
  if (isApiError) {
    const status = (err as ApiError).status;
    if (status === 429 || status >= 500) return 'AI_OVERLOADED';
  }
  if (err instanceof AppError) {
    if (err.statusCode === 404) return 'CONTRACT_DELETED';
    if (err.statusCode >= 500 && /^LLM\b/.test(err.message)) return 'AI_OVERLOADED';
  }
  return 'UNKNOWN';
}

export function withReviewErrorCode<T extends Error>(target: T, source: unknown): T {
  const code = reviewErrorCodeOf(source);
  if (code !== 'UNKNOWN') (target as CodedError).reviewErrorCode = code;
  return target;
}
