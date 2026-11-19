export interface FoldedText {
  folded: string;
  starts: number[];
  ends: number[];
}

const KEPT_SYMBOLS = new Set(['%']);

function foldChar(char: string): string {
  const lower = char.toLocaleLowerCase('vi');
  if (lower === 'đ') return 'd';
  return lower.normalize('NFD').replace(/\p{M}/gu, '');
}

export function foldText(text: string): FoldedText {
  let folded = '';
  const starts: number[] = [];
  const ends: number[] = [];
  let offset = 0;
  for (const char of text) {
    const end = offset + char.length;
    if (/\p{M}/u.test(char)) {
      if (ends.length > 0 && folded[folded.length - 1] !== ' ') ends[ends.length - 1] = end;
    } else if (/[\p{L}\p{N}]/u.test(char) || KEPT_SYMBOLS.has(char)) {
      for (const piece of foldChar(char)) {
        folded += piece;
        starts.push(offset);
        ends.push(end);
      }
    } else if (folded.length > 0 && folded[folded.length - 1] !== ' ') {
      folded += ' ';
      starts.push(offset);
      ends.push(end);
    }
    offset = end;
  }
  while (folded.endsWith(' ')) {
    folded = folded.slice(0, -1);
    starts.pop();
    ends.pop();
  }
  return { folded, starts, ends };
}

export const foldForMatch = (text: string) => foldText(text).folded;

export interface QuoteLocation {
  start: number;
  end: number;
  exact: boolean;
}

const MIN_FUZZY_LENGTH = 20;
const FUZZY_ERROR_RATE = 0.08;
const MAX_FUZZY_TEXT = 20000;

function approximateMatch(text: string, pattern: string, maxErrors: number): { start: number; end: number } | null {
  const m = pattern.length;
  let previous = new Array<number>(m + 1);
  let previousStart = new Array<number>(m + 1);
  for (let i = 0; i <= m; i++) {
    previous[i] = i;
    previousStart[i] = 0;
  }
  let best: { start: number; end: number; errors: number } | null = null;
  for (let j = 1; j <= text.length; j++) {
    const current = new Array<number>(m + 1);
    const currentStart = new Array<number>(m + 1);
    current[0] = 0;
    currentStart[0] = j;
    for (let i = 1; i <= m; i++) {
      const substitution = previous[i - 1] + (pattern[i - 1] === text[j - 1] ? 0 : 1);
      const deletion = previous[i] + 1;
      const insertion = current[i - 1] + 1;
      if (substitution <= deletion && substitution <= insertion) {
        current[i] = substitution;
        currentStart[i] = previousStart[i - 1];
      } else if (deletion <= insertion) {
        current[i] = deletion;
        currentStart[i] = previousStart[i];
      } else {
        current[i] = insertion;
        currentStart[i] = currentStart[i - 1];
      }
    }
    if (current[m] <= maxErrors && (!best || current[m] < best.errors)) {
      best = { start: currentStart[m], end: j, errors: current[m] };
    }
    previous = current;
    previousStart = currentStart;
  }
  return best && { start: best.start, end: best.end };
}

export function locateQuote(text: string, quote: string, { fuzzy = true } = {}): QuoteLocation | null {
  const haystack = foldText(text);
  const needle = foldForMatch(quote);
  if (needle.length === 0) return null;

  const index = haystack.folded.indexOf(needle);
  if (index !== -1) {
    return { start: haystack.starts[index], end: haystack.ends[index + needle.length - 1], exact: true };
  }

  if (!fuzzy || needle.length < MIN_FUZZY_LENGTH || haystack.folded.length > MAX_FUZZY_TEXT) return null;
  const match = approximateMatch(haystack.folded, needle, Math.floor(needle.length * FUZZY_ERROR_RATE));
  if (!match || match.end <= match.start) return null;
  let end = haystack.ends[match.end - 1];
  while (end < text.length && /[\p{L}\p{M}\p{N}]/u.test(text[end])) end++;
  return { start: haystack.starts[match.start], end, exact: false };
}

export const containsFolded = (text: string, part: string) => {
  const needle = foldForMatch(part);
  return needle.length > 0 && foldForMatch(text).includes(needle);
};
