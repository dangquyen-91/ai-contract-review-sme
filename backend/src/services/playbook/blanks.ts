const BLANK_RUN = /(?:…|\.{2,}|_{3,})(?:[\s/.,…_-]*(?:…|\.{2,}|_{3,}))*/gu;
const LONG_BLANK_WEIGHT = 5;

const weightOf = (run: string) =>
  (run.match(/\./g) ?? []).length + (run.match(/…/g) ?? []).length * 3 + (run.match(/_/g) ?? []).length * 2;

function isBlankRun(text: string, start: number, end: number) {
  const run = text.slice(start, end);
  const before = text.slice(Math.max(0, start - 6), start);
  if (/v\.v\.?\s*$/iu.test(before)) return false;
  const weight = weightOf(run);
  if (weight >= LONG_BLANK_WEIGHT) return true;
  if (weight < 2) return false;
  return !/[\p{L}\d]$|[,;]\s*$/u.test(before);
}

export interface BlankRun {
  start: number;
  end: number;
  text: string;
}

export function blankRuns(text: string): BlankRun[] {
  const runs: BlankRun[] = [];
  for (const match of text.matchAll(BLANK_RUN)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (isBlankRun(text, start, end)) runs.push({ start, end, text: match[0].trim() });
  }
  return runs;
}

export const containsBlank = (text: string) => blankRuns(text).length > 0;
