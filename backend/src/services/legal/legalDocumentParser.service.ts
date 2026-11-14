import { LEGAL_HEADING_LEVELS } from '../../models/legalKnowledgeChunk.model';

type HeadingLevel = (typeof LEGAL_HEADING_LEVELS)[number];

export interface LegalHeading {
  level: HeadingLevel;
  number: string;
  title?: string;
}

export interface LegalArticleKey {
  number: number;
  suffix: string;
}

export interface LegalChunkDraft {
  order: number;
  chunkText: string;
  articleRef?: string;
  articleNumber?: number;
  articleKey?: string;
  articleTitle?: string;
  clauseFrom?: number;
  clauseTo?: number;
  hierarchy?: LegalHeading[];
}

export type LegalEndOfTextKind = 'signature' | 'consolidation' | 'appendix';

export interface LegalEndOfText {
  kind: LegalEndOfTextKind;
  marker: string;
  droppedLines: number;
}

export interface ParsedLegalDocument {
  documentNumber?: string;
  articles: LegalArticleKey[];
  headingCount: number;
  chunks: LegalChunkDraft[];
  footnoteLines: number;
  endOfText?: LegalEndOfText;
}

export interface LegalTextCleanup {
  pageFurnitureLines: number;
  footnoteLines: number;
  droppedTailLines: number;
  stoppedAt?: string;
  stoppedAtKind?: LegalEndOfTextKind;
}

export interface CleanedPdfText {
  text: string;
  pageFurnitureLines: number;
  footnoteLines: number;
}

export interface LegalCoverageReport {
  structured: boolean;
  articleCount: number;
  firstArticle?: number;
  lastArticle?: number;
  expectedArticleCount?: number;
  missingArticleCount: number;
  missingRanges: string[];
  suffixedArticles: string[];
  headingCount: number;
  chunkCount: number;
  complete: boolean;
  warnings: string[];
}

export const MAX_LEGAL_CHUNK_CHARS = 2200;
const MAX_REPEATED_LEAD_CHARS = 400;
const FALLBACK_OVERLAP_CHARS = 200;
const BREAK_SEPARATORS = ['\n\n', '\n', '. ', '; ', ' '];
const MAX_HEADING_TITLE_CHARS = 160;
const MAX_LISTED_MISSING_RANGES = 15;

const NOT_WORD = '(?![\\p{L}\\d])';
const ARTICLE_RE = /^Điều\s+(\d{1,4})([a-zđ]?)(?:\s*[.:]\s*(.*)|\s*)$/u;
const HEADING_RES: [HeadingLevel, RegExp][] = [
  ['part', new RegExp(`^(?:PHẦN|Phần)\\s+((?:THỨ|thứ)\\s+\\p{L}+|[IVXLCDM]+|\\d+)${NOT_WORD}\\s*[.:-]?\\s*(.*)$`, 'u')],
  ['chapter', new RegExp(`^(?:CHƯƠNG|Chương)\\s+([IVXLCDM]+|\\d+)${NOT_WORD}\\s*[.:-]?\\s*(.*)$`, 'u')],
  ['subsection', new RegExp(`^(?:TIỂU MỤC|Tiểu mục)\\s+(\\d+|[IVXLCDM]+)${NOT_WORD}\\s*[.:-]?\\s*(.*)$`, 'u')],
  ['section', new RegExp(`^(?:MỤC|Mục)\\s+(\\d+|[IVXLCDM]+)${NOT_WORD}\\s*[.:-]?\\s*(.*)$`, 'u')],
];
const END_OF_TEXT: { kind: LegalEndOfTextKind; re: RegExp }[] = [
  { kind: 'signature', re: /^(?:Luật|Bộ luật|Pháp lệnh|Nghị quyết) này (?:đã )?được .*thông qua/u },
  { kind: 'signature', re: /^(?:TM|KT|Q)\.\s*\p{Lu}/u },
  {
    kind: 'signature',
    re: /^(?:CHỦ TỊCH|PHÓ CHỦ TỊCH|THỦ TƯỚNG|PHÓ THỦ TƯỚNG|BỘ TRƯỞNG|THỨ TRƯỞNG|CHỦ NHIỆM|TỔNG THƯ KÝ)(?:\s|$)/u,
  },
  { kind: 'signature', re: /^Nơi nhận\s*:/u },
  { kind: 'consolidation', re: /^XÁC THỰC VĂN BẢN HỢP NHẤT(?:\s|$)/u },
  { kind: 'appendix', re: /^PHỤ LỤC(?:\s|$)/u },
];
const MAX_MARKER_CHARS = 120;
const QUIET_TAIL_LINES = 40;
const INLINE_FOOTNOTE_RE = /\[\d{1,3}\]/g;
const FOOTNOTE_LINE_RE =
  /^\[\d{1,3}\]\s*(?:Luật|Bộ luật|Nghị định|Nghị quyết|Thông tư|Pháp lệnh|Quyết định|Văn bản|Điều|Khoản|Điểm|Cụm từ|Mục|Chương|Phần|Tiểu mục)(?![\p{L}\d])/u;
const PAGE_EDGE_LINES = 3;
const MIN_PAGES_FOR_REPEATS = 3;
const PAGE_NUMBER_RE = /^(?:trang\s*)?[-–—(]?\s*\d{1,4}\s*[-–—)]?(?:\s*(?:\/|trên|of)\s*\d{1,4})?$/iu;
const DOCUMENT_NUMBER_RE = /Số\s*:\s*(\d+\/(?:\d{4}\/[\p{Lu}\d-]+|VBHN-[\p{Lu}\d-]+))/u;
const CLAUSE_RE = /^(\d{1,3})\.\s+\S/u;
const POINT_RE = /^([a-zđ])\)\s*\S/u;

const HEADING_RANK: Record<HeadingLevel, number> = { part: 0, chapter: 1, section: 2, subsection: 3 };

interface ArticleDraft {
  key: LegalArticleKey;
  title?: string;
  heading: string;
  hierarchy: LegalHeading[];
  lines: string[];
}

interface Block {
  label: string;
  lines: string[];
}

interface ChunkPiece {
  text: string;
  articleRef?: string;
  clauseFrom?: number;
  clauseTo?: number;
}

function isUpperCaseText(text: string): boolean {
  const letters = text.match(/\p{L}/gu)?.length ?? 0;
  const upper = text.match(/\p{Lu}/gu)?.length ?? 0;
  return letters > 0 && upper / letters >= 0.8;
}

function looksLikeHeadingTitle(text: string): boolean {
  if (!text) return true;
  if (isUpperCaseText(text)) return true;
  return text.length <= MAX_HEADING_TITLE_CHARS && /^\p{Lu}/u.test(text) && !/[.;,:]$/.test(text);
}

function matchHeading(line: string): { level: HeadingLevel; number: string; rest: string } | null {
  for (const [level, re] of HEADING_RES) {
    const m = line.match(re);
    if (m && looksLikeHeadingTitle(m[2].trim())) return { level, number: m[1].replace(/\s+/g, ' '), rest: m[2].trim() };
  }
  return null;
}

function isAfter(key: LegalArticleKey, previous: LegalArticleKey | undefined): boolean {
  if (!previous) return true;
  if (key.number !== previous.number) return key.number > previous.number;
  return key.suffix > previous.suffix;
}

const articleKeyLabel = (key: LegalArticleKey) => `${key.number}${key.suffix}`;

const isStructuralLine = (line: string) =>
  ARTICLE_RE.test(line) ||
  CLAUSE_RE.test(line) ||
  POINT_RE.test(line) ||
  matchHeading(line) !== null ||
  END_OF_TEXT.some(({ re }) => re.test(line));

const pageFurnitureKey = (line: string) => line.toLowerCase().replace(/\d+/g, '#').replace(/\s+/g, ' ');

export function cleanPdfPages(pages: string[]): CleanedPdfText {
  const pageLines = pages.map((page) => page.split('\n').map((l) => l.trim()).filter(Boolean));
  const edgeKeys = (lines: string[]) =>
    new Set([...lines.slice(0, PAGE_EDGE_LINES), ...lines.slice(-PAGE_EDGE_LINES)].map(pageFurnitureKey));

  const pagesByKey = new Map<string, number>();
  for (const lines of pageLines) {
    for (const key of edgeKeys(lines)) pagesByKey.set(key, (pagesByKey.get(key) ?? 0) + 1);
  }
  const minPages = Math.max(MIN_PAGES_FOR_REPEATS, Math.ceil(pageLines.length / 2));
  const repeated = new Set(
    pageLines.length >= MIN_PAGES_FOR_REPEATS
      ? [...pagesByKey].filter(([, count]) => count >= minPages).map(([key]) => key)
      : [],
  );

  let pageFurnitureLines = 0;
  let footnoteLines = 0;
  const kept = pageLines.map((lines) => {
    const out: string[] = [];
    let inFootnotes = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const atEdge = i < PAGE_EDGE_LINES || i >= lines.length - PAGE_EDGE_LINES;
      if (atEdge && (PAGE_NUMBER_RE.test(line) || repeated.has(pageFurnitureKey(line)))) {
        pageFurnitureLines++;
        continue;
      }
      if (FOOTNOTE_LINE_RE.test(line)) {
        inFootnotes = true;
        footnoteLines++;
        continue;
      }
      if (inFootnotes && !isStructuralLine(line)) {
        footnoteLines++;
        continue;
      }
      inFootnotes = false;
      out.push(line);
    }
    return out.join('\n');
  });

  return { text: kept.filter(Boolean).join('\n'), pageFurnitureLines, footnoteLines };
}

function stripFootnotes(fullText: string): { lines: string[]; footnoteLines: number } {
  let footnoteLines = 0;
  const lines: string[] = [];
  for (const raw of fullText.split('\n')) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (FOOTNOTE_LINE_RE.test(trimmed)) {
      footnoteLines++;
      continue;
    }
    const line = trimmed.replace(INLINE_FOOTNOTE_RE, '').replace(/\s{2,}/g, ' ').trim();
    if (line) lines.push(line);
  }
  return { lines, footnoteLines };
}

export function parseLegalDocument(fullText: string): ParsedLegalDocument {
  const { lines, footnoteLines } = stripFootnotes(fullText);
  const articles: ArticleDraft[] = [];
  const preamble: string[] = [];
  const hierarchy: LegalHeading[] = [];
  let headingCount = 0;
  let current: ArticleDraft | undefined;
  let endOfText: LegalEndOfText | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const end = articles.length > 0 ? END_OF_TEXT.find(({ re }) => re.test(line)) : undefined;
    if (end) {
      endOfText = { kind: end.kind, marker: line.slice(0, MAX_MARKER_CHARS), droppedLines: lines.length - i };
      break;
    }

    const article = line.match(ARTICLE_RE);
    if (article) {
      const key = { number: Number(article[1]), suffix: article[2] ?? '' };
      if (isAfter(key, articles.at(-1)?.key)) {
        current = {
          key,
          title: article[3]?.trim() || undefined,
          heading: line,
          hierarchy: hierarchy.map((h) => ({ ...h })),
          lines: [],
        };
        articles.push(current);
        continue;
      }
    }

    const heading = matchHeading(line);
    if (heading) {
      let title = heading.rest || undefined;
      const next = lines[i + 1];
      if (!title && next && !ARTICLE_RE.test(next) && !matchHeading(next) && looksLikeHeadingTitle(next)) {
        title = next;
        i++;
      }
      const rank = HEADING_RANK[heading.level];
      while (hierarchy.length && HEADING_RANK[hierarchy[hierarchy.length - 1].level] >= rank) hierarchy.pop();
      hierarchy.push({ level: heading.level, number: heading.number, ...(title ? { title } : {}) });
      headingCount++;
      current = undefined;
      continue;
    }

    if (current) current.lines.push(line);
    else if (articles.length === 0) preamble.push(line);
  }

  const documentNumber = preamble.join('\n').match(DOCUMENT_NUMBER_RE)?.[1];

  if (articles.length === 0) {
    const chunks = splitByLength(lines.join('\n')).map((text, order) => ({ order, chunkText: text }));
    return { documentNumber, articles: [], headingCount, chunks, footnoteLines };
  }

  const chunks: LegalChunkDraft[] = [];
  for (const article of articles) {
    for (const piece of chunkArticle(article)) {
      chunks.push({
        order: chunks.length,
        chunkText: piece.text,
        articleRef: piece.articleRef,
        articleNumber: article.key.number,
        articleKey: articleKeyLabel(article.key),
        articleTitle: article.title,
        clauseFrom: piece.clauseFrom,
        clauseTo: piece.clauseTo,
        hierarchy: article.hierarchy.length ? article.hierarchy : undefined,
      });
    }
  }

  return { documentNumber, articles: articles.map((a) => a.key), headingCount, chunks, footnoteLines, endOfText };
}

export interface StoredLegalTextCleanup {
  droppedTailLines?: number | null;
  stoppedAt?: string | null;
  stoppedAtKind?: LegalEndOfTextKind | null;
}

export function cleanupWarnings(cleanup: StoredLegalTextCleanup | null | undefined): string[] {
  if (!cleanup?.stoppedAt || !cleanup.droppedTailLines) return [];
  if (cleanup.stoppedAtKind === 'appendix') {
    return [`Stopped at "${cleanup.stoppedAt}": ${cleanup.droppedTailLines} line(s) of appendix text were not added`];
  }
  if (cleanup.droppedTailLines > QUIET_TAIL_LINES) {
    return [
      `${cleanup.droppedTailLines} line(s) after "${cleanup.stoppedAt}" were not added; check that no article was cut off`,
    ];
  }
  return [];
}

function splitBlocks(lines: string[], re: RegExp): { lead: string[]; blocks: Block[] } {
  const lead: string[] = [];
  const blocks: Block[] = [];
  for (const line of lines) {
    const m = line.match(re);
    if (m) blocks.push({ label: m[1], lines: [line] });
    else if (blocks.length) blocks[blocks.length - 1].lines.push(line);
    else lead.push(line);
  }
  return { lead, blocks };
}

const rangeLabel = (first: string, last: string) => (first === last ? first : `${first}-${last}`);

function packBlocks(
  firstPrefix: string,
  nextPrefix: string,
  blocks: Block[],
  describe: (first: string, last: string) => Omit<ChunkPiece, 'text'>,
): ChunkPiece[] {
  const pieces: ChunkPiece[] = [];
  let parts: string[] = [];
  let size = 0;
  let first = '';
  let last = '';

  const flush = () => {
    if (parts.length > 1) pieces.push({ text: parts.filter(Boolean).join('\n'), ...describe(first, last) });
    parts = [];
  };

  for (const block of blocks) {
    const text = block.lines.join('\n');
    if (parts.length > 1 && size + 1 + text.length > MAX_LEGAL_CHUNK_CHARS) flush();
    if (!parts.length) {
      const prefix = pieces.length ? nextPrefix : firstPrefix;
      parts = [prefix];
      size = prefix.length;
      first = block.label;
    }
    parts.push(text);
    size += 1 + text.length;
    last = block.label;
  }
  flush();

  return pieces.flatMap((piece) =>
    piece.text.length <= MAX_LEGAL_CHUNK_CHARS
      ? [piece]
      : splitByLength(piece.text).map((text) => ({ ...piece, text })),
  );
}

function chunkArticle(article: ArticleDraft): ChunkPiece[] {
  const ref = `Điều ${articleKeyLabel(article.key)}`;
  const full = [article.heading, ...article.lines].join('\n');
  if (full.length <= MAX_LEGAL_CHUNK_CHARS) return [{ text: full, articleRef: ref }];

  const { lead, blocks } = splitBlocks(article.lines, CLAUSE_RE);
  if (blocks.length < 2) return splitByLength(full).map((text) => ({ text, articleRef: ref }));

  const leadText = lead.join('\n');
  const firstPrefix = [article.heading, leadText].filter(Boolean).join('\n');
  const nextPrefix =
    leadText && leadText.length <= MAX_REPEATED_LEAD_CHARS ? firstPrefix : article.heading;
  const describeClauses = (first: string, last: string) => ({
    articleRef: `${ref}, khoản ${rangeLabel(first, last)}`,
    clauseFrom: Number(first),
    clauseTo: Number(last),
  });

  const pieces: ChunkPiece[] = [];
  let pending: Block[] = [];
  const flushPending = () => {
    if (!pending.length) return;
    pieces.push(...packBlocks(pieces.length ? nextPrefix : firstPrefix, nextPrefix, pending, describeClauses));
    pending = [];
  };

  for (const block of blocks) {
    if (nextPrefix.length + 1 + block.lines.join('\n').length <= MAX_LEGAL_CHUNK_CHARS) {
      pending.push(block);
      continue;
    }
    flushPending();
    pieces.push(...chunkLongClause(article.heading, ref, block));
  }
  flushPending();
  return pieces;
}

function chunkLongClause(heading: string, ref: string, clause: Block): ChunkPiece[] {
  const clauseNumber = Number(clause.label);
  const clauseRef = `${ref}, khoản ${clause.label}`;
  const { lead, blocks } = splitBlocks(clause.lines, POINT_RE);
  if (blocks.length < 2) {
    return splitByLength([heading, ...clause.lines].join('\n')).map((text) => ({
      text,
      articleRef: clauseRef,
      clauseFrom: clauseNumber,
      clauseTo: clauseNumber,
    }));
  }
  const prefix = [heading, ...lead].join('\n');
  return packBlocks(prefix, prefix, blocks, (first, last) => ({
    articleRef: `${clauseRef}, điểm ${rangeLabel(first, last)}`,
    clauseFrom: clauseNumber,
    clauseTo: clauseNumber,
  }));
}

function splitByLength(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= MAX_LEGAL_CHUNK_CHARS) return [trimmed];

  const parts: string[] = [];
  let start = 0;
  while (start < trimmed.length) {
    const limit = Math.min(start + MAX_LEGAL_CHUNK_CHARS, trimmed.length);
    const end = limit === trimmed.length ? limit : findBreak(trimmed, start, limit);
    const part = trimmed.slice(start, end).trim();
    if (part) parts.push(part);
    if (end >= trimmed.length) break;
    start = nextStart(trimmed, start, end);
  }
  return parts;
}

function findBreak(text: string, start: number, limit: number): number {
  const window = text.slice(start, limit);
  for (const separator of BREAK_SEPARATORS) {
    const idx = window.lastIndexOf(separator);
    if (idx > window.length / 2) return start + idx + separator.length;
  }
  return limit;
}

function nextStart(text: string, start: number, end: number): number {
  let next = Math.max(end - FALLBACK_OVERLAP_CHARS, start + 1);
  while (next < end && !/\s/.test(text[next - 1])) next++;
  return next;
}

function toRanges(numbers: number[]): string[] {
  const ranges: string[] = [];
  for (let i = 0; i < numbers.length; i++) {
    let j = i;
    while (j + 1 < numbers.length && numbers[j + 1] === numbers[j] + 1) j++;
    ranges.push(rangeLabel(String(numbers[i]), String(numbers[j])));
    i = j;
  }
  return ranges;
}

export function buildLegalCoverage(input: {
  articles: LegalArticleKey[];
  headingCount: number;
  chunkCount: number;
  expectedArticleCount?: number;
  notes?: string[];
}): LegalCoverageReport {
  const { articles, headingCount, chunkCount, expectedArticleCount, notes = [] } = input;
  const numbers = [...new Set(articles.map((a) => a.number))].sort((a, b) => a - b);
  const present = new Set(numbers);
  const firstArticle = numbers[0];
  const lastArticle = numbers.at(-1);
  const upper = Math.max(lastArticle ?? 0, expectedArticleCount ?? 0);

  const missing: number[] = [];
  for (let n = 1; n <= upper; n++) if (!present.has(n)) missing.push(n);
  const missingRanges = toRanges(missing);

  const warnings: string[] = [];
  if (numbers.length === 0) {
    warnings.push('No "Điều N" headings were found; the text was split into plain passages');
  }
  if (missing.length) {
    const listed = missingRanges.slice(0, MAX_LISTED_MISSING_RANGES).join(', ');
    const more = missingRanges.length > MAX_LISTED_MISSING_RANGES ? ', ...' : '';
    warnings.push(`${missing.length} article(s) missing: Điều ${listed}${more}`);
  }
  if (expectedArticleCount && lastArticle && lastArticle > expectedArticleCount) {
    warnings.push(`Found Điều ${lastArticle} but only ${expectedArticleCount} articles were expected`);
  }
  warnings.push(...new Set(notes));

  return {
    structured: numbers.length > 0,
    articleCount: articles.length,
    firstArticle,
    lastArticle,
    expectedArticleCount,
    missingArticleCount: missing.length,
    missingRanges,
    suffixedArticles: articles.filter((a) => a.suffix).map(articleKeyLabel),
    headingCount,
    chunkCount,
    complete: missing.length === 0,
    warnings,
  };
}
