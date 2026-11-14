import { AppError } from '../../errors/AppError';
import { LEGAL_RULES } from './legalRules.data';
import { ArticleDifference, compareArticles } from './legalCrossCheck';
import type { LegalArticleText } from './legalDocumentParser.service';

export interface OriginLike {
  publisher?: string | null;
  url?: string | null;
}

export interface OriginCheck {
  ok: boolean;
  message?: string;
}

export type DocumentNumberResult = 'match' | 'mismatch' | 'consolidated_number' | 'not_checked';

export interface DocumentNumberCheck {
  result: DocumentNumberResult;
  entered?: string;
  detected?: string;
  message?: string;
}

const CONSOLIDATED_NUMBER_RE = /\/VBHN-/i;

const normalizeNumber = (value: string) => value.normalize('NFC').toUpperCase().replace(/\s+/g, '');

export function checkOrigin(origin: OriginLike | null | undefined, gazette?: string | null): OriginCheck {
  if (!origin?.publisher) {
    return { ok: false, message: 'Say where the text was taken from: origin.publisher and origin.url are required' };
  }
  if (!origin.url && !(origin.publisher === 'official_gazette' && gazette)) {
    return {
      ok: false,
      message: 'origin.url is required; a text taken from a printed Công báo issue may give gazette (the issue) instead',
    };
  }
  return { ok: true };
}

export function assertOrigin(check: OriginCheck) {
  if (!check.ok) throw new AppError(check.message!, 400, true, 'LEGAL_ORIGIN_REQUIRED');
}

export function checkDocumentNumber(
  entered: string | null | undefined,
  detected: string | null | undefined,
  textKind: string | null | undefined,
): DocumentNumberCheck {
  const base = { entered: entered ?? undefined, detected: detected ?? undefined };
  if (!entered || !detected) return { ...base, result: 'not_checked' };
  if (normalizeNumber(entered) === normalizeNumber(detected)) return { ...base, result: 'match' };
  if (textKind === 'consolidated' || CONSOLIDATED_NUMBER_RE.test(detected)) {
    return {
      ...base,
      result: 'consolidated_number',
      message: `The file is numbered ${detected}, not ${entered}; this is expected for a consolidated text`,
    };
  }
  return { ...base, result: 'mismatch', message: `The file is numbered ${detected}, but the legal source is ${entered}` };
}

export function assertDocumentNumber(check: DocumentNumberCheck) {
  if (check.result !== 'mismatch') return;
  throw new AppError(check.message!, 400, true, 'LEGAL_DOCUMENT_NUMBER_MISMATCH', {
    entered: check.entered,
    detected: check.detected,
  });
}

export const documentNumberWarnings = (check: DocumentNumberCheck) =>
  check.result === 'consolidated_number' && check.message ? [check.message] : [];

export interface AnchorChunk {
  articleNumber?: number | null;
  chunkText: string;
}

export interface AnchorFailure {
  article: number;
  clause?: number;
  verifyText: string;
  rules: string[];
  message: string;
}

export interface AnchorCheck {
  result: 'ok' | 'failed' | 'not_applicable';
  checked: number;
  failures: AnchorFailure[];
}

const normalizeForMatch = (value: string) => value.normalize('NFC').replace(/\s+/g, ' ').toLowerCase();

export function checkAnchors(sourceCode: string | null | undefined, chunks: AnchorChunk[]): AnchorCheck {
  const anchors = new Map<string, Omit<AnchorFailure, 'message'>>();
  for (const rule of LEGAL_RULES) {
    for (const citation of rule.citations) {
      if (citation.sourceCode !== sourceCode) continue;
      const key = `${citation.article}:${citation.clause ?? ''}:${citation.verifyText}`;
      const anchor = anchors.get(key) ?? {
        article: citation.article,
        clause: citation.clause,
        verifyText: citation.verifyText,
        rules: [],
      };
      anchor.rules.push(`${rule.code} v${rule.version}`);
      anchors.set(key, anchor);
    }
  }
  if (anchors.size === 0) return { result: 'not_applicable', checked: 0, failures: [] };

  let checked = 0;
  const failures: AnchorFailure[] = [];
  for (const anchor of anchors.values()) {
    const articleText = chunks
      .filter((chunk) => chunk.articleNumber === anchor.article)
      .map((chunk) => normalizeForMatch(chunk.chunkText))
      .join(' ');
    if (!articleText) continue;
    checked++;
    if (articleText.includes(normalizeForMatch(anchor.verifyText))) continue;
    failures.push({
      ...anchor,
      message: `Điều ${anchor.article} does not contain "${anchor.verifyText}", which ${anchor.rules.join(', ')} relies on; the file may be an outdated or misread text. If the law really changed, update the rule first.`,
    });
  }
  if (checked === 0) return { result: 'not_applicable', checked, failures };
  return { result: failures.length ? 'failed' : 'ok', checked, failures };
}

export function assertAnchors(check: AnchorCheck) {
  if (check.result !== 'failed') return;
  throw new AppError(
    `${check.failures.length} article(s) do not contain the wording the legal rules rely on: ${check.failures
      .map((failure) => `Điều ${failure.article} ("${failure.verifyText}")`)
      .join(', ')}`,
    400,
    true,
    'LEGAL_ANCHOR_MISMATCH',
    { failures: check.failures },
  );
}

export const anchorWarnings = (check: AnchorCheck) => check.failures.map((failure) => failure.message);

export type CrossCheckResult = 'same' | 'different' | 'not_required' | 'missing_reference';

export interface CrossCheck {
  result: CrossCheckResult;
  required: boolean;
  referenceOrigin?: OriginCheck;
  sameFile?: boolean;
  compared: number;
  differing: number;
  differences: ArticleDifference[];
  onlyInReference: number;
}

export interface CrossCheckInput {
  mainOrigin?: OriginLike | null;
  mainArticles: LegalArticleText[];
  reference?: { articles: LegalArticleText[]; origin?: OriginLike | null; sameFile: boolean };
}

const MAX_REPORTED_DIFFERENCES = 50;
const MAX_NAMED_DIFFERENCES = 10;

export const referenceRequired = (origin: OriginLike | null | undefined) => origin?.publisher === 'other';

export function checkCrossReference({ mainOrigin, mainArticles, reference }: CrossCheckInput): CrossCheck {
  const required = referenceRequired(mainOrigin);
  if (!reference) {
    return {
      result: required ? 'missing_reference' : 'not_required',
      required,
      compared: 0,
      differing: 0,
      differences: [],
      onlyInReference: 0,
    };
  }
  const comparison = compareArticles(mainArticles, reference.articles);
  return {
    result: comparison.differences.length ? 'different' : 'same',
    required,
    referenceOrigin: checkOrigin(reference.origin),
    sameFile: reference.sameFile,
    ...comparison,
    differing: comparison.differences.length,
    differences: comparison.differences.slice(0, MAX_REPORTED_DIFFERENCES),
  };
}

export function assertCrossReference(check: CrossCheck, acknowledged?: boolean) {
  if (check.result === 'missing_reference') {
    throw new AppError(
      'The text comes from an unofficial site (origin.publisher other); send referenceFile, the same text taken from another source, with referenceOrigin',
      400,
      true,
      'LEGAL_REFERENCE_REQUIRED',
    );
  }
  if (check.sameFile) {
    throw new AppError('referenceFile is the same file as file; send the text from another source', 400, true, 'LEGAL_REFERENCE_SAME_FILE');
  }
  if (check.referenceOrigin && !check.referenceOrigin.ok) {
    throw new AppError(`referenceOrigin: ${check.referenceOrigin.message}`, 400, true, 'LEGAL_ORIGIN_REQUIRED');
  }
  if (check.result === 'different' && !acknowledged) {
    throw new AppError(
      `${check.differing} article(s) differ from the reference file; review them and send acknowledgeDifferences=true to keep this text`,
      409,
      true,
      'LEGAL_REFERENCE_DIFFERS',
      { differences: check.differences, differing: check.differing, compared: check.compared },
    );
  }
}

export function crossCheckWarnings(check: CrossCheck): string[] {
  if (check.result !== 'different') return [];
  const named = check.differences.slice(0, MAX_NAMED_DIFFERENCES).map((d) => d.article).join(', ');
  const more = check.differing > MAX_NAMED_DIFFERENCES ? ', ...' : '';
  return [`${check.differing} article(s) differ from the reference file and were kept on purpose: ${named}${more}`];
}
