// Reads and adjusts OTP challenges in the in-memory Redis used by tests, using the
// same key layout as services/identity/otpChallenge.service.ts.
const { createHash } = require('crypto');
const { getRedis } = require('../../dist/config/redis');

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function otpStore(namespace) {
  const challengeKey = (challengeId) => `${namespace}:ch:${sha256(challengeId)}`;
  const emailKey = (kind, email) => `${namespace}:${kind}:${sha256(email)}`;
  return {
    challengeKey,
    /** Stored fields of a challenge, or {} once it is consumed or replaced. */
    challenge: (challengeId) => getRedis().hgetall(challengeKey(challengeId)),
    expire: (challengeId) => getRedis().hset(challengeKey(challengeId), 'expiresAt', '0'),
    skipCooldown: (email) => getRedis().del(emailKey('cooldown', email)),
    setSendCount: (email, count) => getRedis().set(emailKey('sent', email), String(count)),
  };
}

module.exports = { otpStore };
