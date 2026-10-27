import { createHash, createHmac, randomBytes, randomInt } from 'crypto';
import { getRedis } from '../../config/redis';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { AppError } from '../../errors/AppError';
import { decryptField, encryptField } from '../../utils/fieldEncryption';

export interface OtpPolicy {
  namespace: string;
  purpose: string;
  codeLifetimeMs: number;
  retentionMs: number;
  cooldownMs: number;
  sendWindowMs: number;
  maxSendsPerWindow: number;
  maxAttempts: number;
}

export type IssueOutcome =
  | { status: 'issued'; challengeId: string; code: string; expiresAt: Date }
  | { status: 'stale' | 'cooldown' | 'limit' };

export type AttemptOutcome<T> =
  | { status: 'ok'; email: string; data: T }
  | { status: 'wrong'; attempts: number }
  | { status: 'missing' | 'expired' | 'not_ready' | 'mismatch' | 'locked' };

export interface StoredChallenge<T> {
  email: string;
  bind: string;
  data: T;
}

const ISSUE_SCRIPT = `
local current = redis.call('GET', KEYS[3])
if ARGV[1] ~= '' and current ~= ARGV[1] then return 'stale' end
if redis.call('EXISTS', KEYS[1]) == 1 then return 'cooldown' end
if tonumber(redis.call('GET', KEYS[2]) or '0') >= tonumber(ARGV[5]) then return 'limit' end
redis.call('SET', KEYS[1], '1', 'PX', ARGV[3])
if redis.call('INCR', KEYS[2]) == 1 then redis.call('PEXPIRE', KEYS[2], ARGV[4]) end
if current and current ~= ARGV[2] then redis.call('DEL', ARGV[7] .. current) end
redis.call('DEL', KEYS[4])
redis.call('HSET', KEYS[4], unpack(ARGV, 8))
redis.call('PEXPIRE', KEYS[4], ARGV[6])
redis.call('SET', KEYS[3], ARGV[2], 'PX', ARGV[6])
return 'issued'
`;

const ACTIVATE_SCRIPT = `
if redis.call('HGET', KEYS[1], 'otpHash') == ARGV[1] then
  redis.call('HSET', KEYS[1], 'ready', '1')
  return 1
end
return 0
`;

const ATTEMPT_SCRIPT = `
local f = redis.call('HMGET', KEYS[1], 'otpHash', 'ready', 'expiresAt', 'attempts', 'bind', 'email', 'data', 'owner')
if not f[1] then return {'missing'} end
if tonumber(f[3]) <= tonumber(ARGV[2]) then return {'expired'} end
local ready = f[2] == '1'
if not ready and ARGV[5] ~= '1' then return {'not_ready'} end
if (f[5] or '') ~= ARGV[4] then return {'mismatch'} end
if tonumber(f[4]) >= tonumber(ARGV[3]) then return {'locked'} end
if not ready or f[1] ~= ARGV[1] then
  return {'wrong', tostring(redis.call('HINCRBY', KEYS[1], 'attempts', 1))}
end
redis.call('DEL', KEYS[1])
if f[8] and redis.call('GET', f[8]) == ARGV[6] then redis.call('DEL', f[8]) end
return {'ok', f[6], f[7]}
`;

export const hashSecret = (value: string) => createHash('sha256').update(value).digest('hex');

const otpHash = (policy: OtpPolicy, challengeHash: string, code: string) =>
  createHmac('sha256', env.JWT_ACCESS_SECRET)
    .update(`${policy.purpose}:${challengeHash}:${code}`)
    .digest('hex');

const challengeKey = (policy: OtpPolicy, challengeHash: string) =>
  `${policy.namespace}:ch:${challengeHash}`;
const emailKey = (policy: OtpPolicy, kind: string, email: string) =>
  `${policy.namespace}:${kind}:${hashSecret(email)}`;

async function withRedis<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error('OTP challenge store is unavailable', {
      error: err instanceof Error ? err.message : String(err),
    });
    throw new AppError('Service is temporarily unavailable, please try again later', 503);
  }
}

export async function issueChallenge<T>(
  policy: OtpPolicy,
  input: { email: string; data: T; bind?: string; previousChallengeId?: string },
): Promise<IssueOutcome> {
  const challengeId = input.previousChallengeId ?? randomBytes(32).toString('hex');
  const challengeHash = hashSecret(challengeId);
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const expiresAt = new Date(Date.now() + policy.codeLifetimeMs);
  const currentKey = emailKey(policy, 'current', input.email);
  const fields = {
    email: input.email,
    otpHash: otpHash(policy, challengeHash, code),
    expiresAt: String(expiresAt.getTime()),
    attempts: '0',
    ready: '0',
    bind: input.bind ?? '',
    owner: currentKey,
    data: encryptField(JSON.stringify(input.data)) as string,
  };
  const status = await withRedis(
    () =>
      getRedis().eval(
        ISSUE_SCRIPT,
        4,
        emailKey(policy, 'cooldown', input.email),
        emailKey(policy, 'sent', input.email),
        currentKey,
        challengeKey(policy, challengeHash),
        input.previousChallengeId ? challengeHash : '',
        challengeHash,
        policy.cooldownMs,
        policy.sendWindowMs,
        policy.maxSendsPerWindow,
        policy.retentionMs,
        `${policy.namespace}:ch:`,
        ...Object.entries(fields).flat(),
      ) as Promise<string>,
  );
  if (status !== 'issued') return { status: status as 'stale' | 'cooldown' | 'limit' };
  return { status: 'issued', challengeId, code, expiresAt };
}

export async function activateChallenge(policy: OtpPolicy, challengeId: string, code: string) {
  const challengeHash = hashSecret(challengeId);
  const activated = await withRedis(
    () =>
      getRedis().eval(
        ACTIVATE_SCRIPT,
        1,
        challengeKey(policy, challengeHash),
        otpHash(policy, challengeHash, code),
      ) as Promise<number>,
  );
  return activated === 1;
}

export async function readChallenge<T>(
  policy: OtpPolicy,
  challengeId: string,
): Promise<StoredChallenge<T> | null> {
  const stored = await withRedis(() =>
    getRedis().hmget(challengeKey(policy, hashSecret(challengeId)), 'email', 'bind', 'data'),
  );
  const [email, bind, data] = stored;
  if (!email || !data) return null;
  return { email, bind: bind ?? '', data: JSON.parse(decryptField(data) as string) as T };
}

export async function attemptChallenge<T>(
  policy: OtpPolicy,
  challengeId: string,
  code: string,
  options: { bind?: string; notReadyIsWrong?: boolean } = {},
): Promise<AttemptOutcome<T>> {
  const challengeHash = hashSecret(challengeId);
  const [status, ...rest] = await withRedis(
    () =>
      getRedis().eval(
        ATTEMPT_SCRIPT,
        1,
        challengeKey(policy, challengeHash),
        otpHash(policy, challengeHash, code),
        Date.now(),
        policy.maxAttempts,
        options.bind ?? '',
        options.notReadyIsWrong ? '1' : '0',
        challengeHash,
      ) as Promise<string[]>,
  );
  if (status === 'ok') {
    return { status, email: rest[0], data: JSON.parse(decryptField(rest[1]) as string) as T };
  }
  if (status === 'wrong') return { status, attempts: Number(rest[0]) };
  return { status: status as 'missing' | 'expired' | 'not_ready' | 'mismatch' | 'locked' };
}
