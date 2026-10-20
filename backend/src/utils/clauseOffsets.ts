export interface ClauseSpan {
  markerIndex: number;
  startOffset: number;
  endOffset: number;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findMarker(fullText: string, marker: string, from: number): number {
  const needle = marker.trim();
  if (!needle) return -1;

  const exactIdx = fullText.indexOf(needle, from);
  if (exactIdx !== -1) return exactIdx;

  const pattern = needle.split(/\s+/).map(escapeRegExp).join('\\s+');
  const match = new RegExp(pattern, 'iu').exec(fullText.slice(from));
  return match ? from + match.index : -1;
}

export interface ArticleSpan {
  startOffset: number;
  endOffset: number;
  title?: string;
}

const ARTICLE_HEADING_RE = /^[^\S\n]*[Đđ][Ii](?:[ềỀ]|[eEêÊ]\p{M}*)[Uu][^\S\n]+(\d+)/gmu;
const MIN_ARTICLE_HEADINGS = 3;
const MAX_TITLE_LENGTH = 200;

function trimSpan(fullText: string, start: number, end: number): [number, number] {
  let begin = start;
  let finish = end;
  while (begin < finish && /\s/.test(fullText[begin])) begin++;
  while (finish > begin && /\s/.test(fullText[finish - 1])) finish--;
  return [begin, finish];
}

export function splitByArticleHeadings(fullText: string): ArticleSpan[] | null {
  const starts: number[] = [];
  let lastNumber = 0;
  for (const match of fullText.matchAll(ARTICLE_HEADING_RE)) {
    const number = Number(match[1]);
    if (number !== lastNumber + 1 && number !== lastNumber + 2) continue;
    if (lastNumber === 0 && number !== 1) continue;
    starts.push(match.index ?? 0);
    lastNumber = number;
  }
  if (starts.length < MIN_ARTICLE_HEADINGS) return null;

  const spans: ArticleSpan[] = [];
  const [preambleStart, preambleEnd] = trimSpan(fullText, 0, starts[0]);
  if (preambleEnd > preambleStart) {
    spans.push({ startOffset: preambleStart, endOffset: preambleEnd });
  }
  starts.forEach((start, i) => {
    const [begin, end] = trimSpan(fullText, start, starts[i + 1] ?? fullText.length);
    if (end <= begin) return;
    const firstLine = fullText.slice(begin, end).split('\n', 1)[0].replace(/\s+/g, ' ').trim();
    spans.push({ startOffset: begin, endOffset: end, title: firstLine.slice(0, MAX_TITLE_LENGTH) });
  });
  return spans;
}

export function splitByStartMarkers(fullText: string, markers: string[]): ClauseSpan[] {
  const starts: { markerIndex: number; start: number }[] = [];
  let cursor = 0;
  markers.forEach((marker, markerIndex) => {
    const start = findMarker(fullText, marker, cursor);
    if (start === -1) return;
    starts.push({ markerIndex, start });
    cursor = start + 1;
  });

  if (starts.length === 0) return [];
  starts[0].start = 0;

  const spans: ClauseSpan[] = [];
  starts.forEach(({ markerIndex, start }, i) => {
    const [begin, end] = trimSpan(fullText, start, starts[i + 1]?.start ?? fullText.length);
    if (end > begin) spans.push({ markerIndex, startOffset: begin, endOffset: end });
  });
  return spans;
}
