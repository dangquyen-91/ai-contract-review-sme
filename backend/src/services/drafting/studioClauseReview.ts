import { z } from 'zod';
import { Type } from '@google/genai';
import { AppError } from '../../errors/AppError';
import type { studioLawContext } from './studioLegalSources.service';

export const clauseReviewSchema = z.object({
  summary: z.string().trim().min(1).max(1500),
  findings: z.array(z.object({
    blockId: z.string(), severity: z.enum(['high', 'medium', 'note']),
    title: z.string().trim().min(1).max(160), reason: z.string().trim().min(1).max(1500),
    citationChunkIds: z.array(z.string()).max(4),
  }).strict()).max(8),
}).strict();

export const clauseReviewResponseSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    findings: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
      blockId: { type: Type.STRING }, severity: { type: Type.STRING, enum: ['high', 'medium', 'note'] },
      title: { type: Type.STRING }, reason: { type: Type.STRING },
      citationChunkIds: { type: Type.ARRAY, items: { type: Type.STRING } },
    }, required: ['blockId', 'severity', 'title', 'reason', 'citationChunkIds'] } },
  }, required: ['summary', 'findings'],
};

export function verifyClauseReview(
  result: z.infer<typeof clauseReviewSchema>,
  blocks: { id: string; text: string }[],
  selected: string[],
  sources: Awaited<ReturnType<typeof studioLawContext>>,
  unmask: (value: string) => string,
) {
  const citations = new Map(sources.flatMap(source => source.excerpts.map(excerpt => [excerpt.chunkId, {
    chunkId: excerpt.chunkId, sourceId: source.id, title: source.title, documentNumber: source.documentNumber,
    articleRef: excerpt.articleRef, quote: excerpt.text,
  }] as const)));
  return {
    summary: unmask(result.summary),
    findings: result.findings.map(finding => {
      const blockId = unmask(finding.blockId);
      const block = blocks.find(item => item.id === blockId);
      const ids = [...new Set(finding.citationChunkIds.map(unmask))];
      if (!block || !selected.includes(blockId) || ids.some(id => !citations.has(id)) || (!ids.length && finding.severity !== 'note')) {
        throw new AppError('Kết quả kiểm tra chứa vùng chọn hoặc căn cứ chưa khớp với dữ liệu. Vui lòng thử lại.', 502);
      }
      return { blockId, severity: finding.severity, title: unmask(finding.title), reason: unmask(finding.reason),
        contractText: block.text.slice(0, 4000), citations: ids.map(id => citations.get(id)!),
        verification: ids.length ? 'source_matched' : 'insufficient_basis' };
    }),
  };
}
