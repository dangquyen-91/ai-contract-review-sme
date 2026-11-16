import { AppError } from '../../errors/AppError';

export const REVIEW_PAGES_PER_UNIT = 5;
type VersionForBilling = { extractionStatus?: string; extractionQuality?: { pageCount?: number | null; truncatedAtPage?: number | null } | null };
export function reviewCost(version: VersionForBilling) {
  const pageCount = version.extractionQuality?.pageCount;
  const ready = version.extractionStatus === 'completed' && Number.isSafeInteger(pageCount) && Number(pageCount) > 0 && !version.extractionQuality?.truncatedAtPage;
  return {
    pageCount: Number.isSafeInteger(pageCount) && Number(pageCount) > 0 ? Number(pageCount) : null,
    pagesPerUnit: REVIEW_PAGES_PER_UNIT,
    units: ready ? Math.ceil(Number(pageCount) / REVIEW_PAGES_PER_UNIT) : null,
    ready,
    reason: ready ? null : version.extractionQuality?.truncatedAtPage
      ? 'Tài liệu chưa được đọc đầy đủ. Vui lòng chia nhỏ tệp trước khi rà soát.'
      : 'Chưa xác định được số trang hợp lệ. Chờ đọc tệp hoàn tất hoặc tải lại dưới dạng PDF; chưa trừ lượt.',
  };
}
export function requireReviewCost(version: VersionForBilling) {
  const quote = reviewCost(version);
  if (!quote.ready || quote.units === null) throw AppError.conflict(quote.reason!, 'REVIEW_PAGE_COUNT_UNAVAILABLE');
  return { ...quote, units: quote.units };
}
