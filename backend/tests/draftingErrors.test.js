const { ApiError } = require('@google/genai');
const { draftingError } = require('../dist/services/drafting/draftingErrors');
const { AppError } = require('../dist/errors/AppError');

test.each([[429, 503, 'AI_RATE_LIMITED'], [503, 503, 'AI_UNAVAILABLE'], [500, 503, 'AI_UNAVAILABLE'],
  [403, 503, 'AI_CONFIGURATION_ERROR'], [404, 503, 'AI_CONFIGURATION_ERROR'], [400, 502, 'AI_REQUEST_REJECTED']])(
  'provider %s becomes a safe Vietnamese error with no raw provider details', (status, expectedStatus, code) => {
    const error = draftingError(new ApiError({ status, message: 'sensitive provider diagnostic' }));
    expect(error).toMatchObject({ statusCode: expectedStatus, code });
    expect(error.message).toContain('không bị trừ lượt');
    expect(error.message).not.toContain('sensitive provider diagnostic');
  },
);

test('timeouts become actionable and existing application errors remain intact', () => {
  const timeout = new Error('timeout'); timeout.name = 'TimeoutError';
  expect(draftingError(timeout)).toMatchObject({ statusCode: 504, code: 'AI_TIMEOUT' });
  const conflict = AppError.conflict('stale draft');
  expect(draftingError(conflict)).toBe(conflict);
  const unexpected = new Error('database failure');
  expect(draftingError(unexpected)).toBe(unexpected);
});
