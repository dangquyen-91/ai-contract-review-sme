import rateLimit from 'express-rate-limit';

// General API traffic
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter reserved for endpoints that call an LLM API (cost control),
// e.g. contract summarization / risk detection routes.
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many AI requests, please slow down' } },
});
