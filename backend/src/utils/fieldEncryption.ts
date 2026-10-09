import crypto from 'crypto';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';

export const ENCRYPTED_PREFIX = 'enc:v1:';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const key = Buffer.from(env.DATA_ENCRYPTION_KEY, 'base64');

export function isEncrypted(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(ENCRYPTED_PREFIX);
}

export function encryptField<T>(value: T): T | string {
  if (typeof value !== 'string' || value === '' || isEncrypted(value)) return value;

  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ENCRYPTED_PREFIX + [iv, tag, ciphertext].map((part) => part.toString('base64')).join(':');
}

export function decryptField<T>(value: T): T | string {
  if (!isEncrypted(value)) return value;

  try {
    const [iv, tag, ciphertext] = value
      .slice(ENCRYPTED_PREFIX.length)
      .split(':')
      .map((part) => Buffer.from(part, 'base64'));
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch {
    throw new AppError('Stored data could not be decrypted. Check DATA_ENCRYPTION_KEY.', 500, false);
  }
}

export const encryptedString = { get: decryptField, set: encryptField };

export const decryptOnSerialize = {
  toJSON: { getters: true, virtuals: false },
  toObject: { getters: true, virtuals: false },
};
