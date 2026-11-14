import { AppError } from '../../errors/AppError';

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
