export const TEXT_SIGNATURE_VERSION = 1;
const SIGNATURE_SIZE = 128;
const SHINGLE_WORDS = 3;

function hash32(value: string, seed: number) {
  let hash = (2166136261 ^ seed) >>> 0;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 2246822507);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 3266489909);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

function shingles(text: string) {
  const words = text.normalize('NFC').toLocaleLowerCase('vi').match(/[\p{L}\p{N}]+/gu) ?? [];
  if (words.length === 0) return [];
  if (words.length < SHINGLE_WORDS) return [words.join(' ')];
  const result = new Set<string>();
  for (let i = 0; i + SHINGLE_WORDS <= words.length; i++) {
    result.add(words.slice(i, i + SHINGLE_WORDS).join(' '));
  }
  return [...result];
}

export function textSignature(text: string | null | undefined): number[] | undefined {
  if (!text) return undefined;
  const parts = shingles(text);
  if (parts.length === 0) return undefined;
  const signature = new Array<number>(SIGNATURE_SIZE).fill(0xffffffff);
  for (const part of parts) {
    for (let seed = 0; seed < SIGNATURE_SIZE; seed++) {
      const value = hash32(part, seed);
      if (value < signature[seed]) signature[seed] = value;
    }
  }
  return signature;
}

export function signatureSimilarity(a: readonly number[] | null | undefined, b: readonly number[] | null | undefined) {
  if (!a?.length || !b?.length || a.length !== b.length) return null;
  let equal = 0;
  for (let i = 0; i < a.length; i++) if (a[i] === b[i]) equal++;
  return equal / a.length;
}
