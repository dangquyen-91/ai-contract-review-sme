import type { LegalArticleText } from './legalDocumentParser.service';

export type ArticleDifferenceKind = 'different' | 'missing_in_reference';

export interface ArticleDifference {
  article: string;
  kind: ArticleDifferenceKind;
  similarity?: number;
  main?: string;
  reference?: string;
}

export interface ArticleComparison {
  compared: number;
  differences: ArticleDifference[];
  onlyInReference: number;
}

const SHINGLE_TOKENS = 3;
const SNIPPET_BEFORE = 6;
const SNIPPET_AFTER = 14;

const tokensOf = (text: string) => text.normalize('NFC').toLowerCase().match(/[\p{L}\p{M}\p{N}]+%?|%/gu) ?? [];

const labelOf = (article: LegalArticleText) => (article.key ? `Điều ${article.key}` : 'whole text');

function shingles(tokens: string[]): Set<string> {
  if (tokens.length < SHINGLE_TOKENS) return new Set([tokens.join(' ')]);
  const result = new Set<string>();
  for (let i = 0; i + SHINGLE_TOKENS <= tokens.length; i++) result.add(tokens.slice(i, i + SHINGLE_TOKENS).join(' '));
  return result;
}

function similarity(a: string[], b: string[]): number {
  const left = shingles(a);
  const right = shingles(b);
  let shared = 0;
  for (const item of left) if (right.has(item)) shared++;
  const union = left.size + right.size - shared;
  return union === 0 ? 100 : Math.round((shared / union) * 100);
}

const snippet = (tokens: string[], at: number) =>
  tokens.slice(Math.max(0, at - SNIPPET_BEFORE), at + SNIPPET_AFTER).join(' ');

export function compareArticles(main: LegalArticleText[], reference: LegalArticleText[]): ArticleComparison {
  const referenceByKey = new Map(reference.map((article) => [article.key, article]));
  const mainKeys = new Set(main.map((article) => article.key));
  const differences: ArticleDifference[] = [];

  for (const article of main) {
    const match = referenceByKey.get(article.key);
    if (!match) {
      differences.push({ article: labelOf(article), kind: 'missing_in_reference' });
      continue;
    }
    const left = tokensOf(article.text);
    const right = tokensOf(match.text);
    if (left.length === right.length && left.every((token, i) => token === right[i])) continue;
    let at = 0;
    while (at < left.length && at < right.length && left[at] === right[at]) at++;
    differences.push({
      article: labelOf(article),
      kind: 'different',
      similarity: similarity(left, right),
      main: snippet(left, at),
      reference: snippet(right, at),
    });
  }

  return {
    compared: main.length,
    differences,
    onlyInReference: reference.filter((article) => !mainKeys.has(article.key)).length,
  };
}
