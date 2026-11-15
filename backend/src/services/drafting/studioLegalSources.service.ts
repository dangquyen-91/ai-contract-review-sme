import { Types } from 'mongoose';
import { z } from 'zod';
import { AppError } from '../../errors/AppError';
import { LegalSourceModel } from '../../models/legalSource.model';
import { LegalKnowledgeChunkModel } from '../../models/legalKnowledgeChunk.model';
import { ContractProfileModel } from '../../models/contractProfile.model';
import { DEFAULT_PROFILES } from '../contract/contractProfile.data';
import { SALES_LEGAL_SOURCE_CODES } from '../legal/legalSourceCatalog.data';

export const studioLawIdsSchema = z.array(z.string().regex(/^[a-f\d]{24}$/i).transform(id => id.toLowerCase()))
  .max(10, 'Chỉ chọn tối đa 10 văn bản.').refine(ids => new Set(ids).size === ids.length, 'Văn bản được chọn không được trùng.');
export const studioLawQuerySchema = z.object({
  q: z.string().trim().max(100).default(''),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  templateCode: z.enum(['labor', 'service', 'sales', 'rental']).optional(),
  ids: z.string().max(249).optional().transform(value => value ? value.split(',') : undefined)
    .pipe(studioLawIdsSchema.optional()),
});
const pageSize = 20;
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function availableSources() {
  const now = new Date();
  return {
    status: { $in: ['in_force', 'amended'] },
    sourceType: { $ne: 'standard_template' },
    $and: [
      { $or: [{ effectiveDate: null }, { effectiveDate: { $lte: now } }] },
      { $or: [{ expiryDate: null }, { expiryDate: { $gt: now } }] },
      { $or: [{ ingestion: null }, { 'ingestion.status': 'completed' }] },
    ],
  };
}
const metadata = {
  _id: 0, id: { $toString: '$_id' }, code: 1, title: 1, documentNumber: 1,
  citationLabel: 1, sourceType: 1, status: 1, issuingBody: 1, issuedDate: 1, effectiveDate: 1,
  signer: 1, legalField: 1, issuingPlace: 1, gazette: 1,
};
async function templateLawFilter(templateCode?: string) {
  if (templateCode === 'sales') {
    return { code: { $in: SALES_LEGAL_SOURCE_CODES } };
  }
  if (templateCode !== 'labor') return {};
  const profile = await ContractProfileModel.findOne({ code: 'labor' }).select('legalSourceCodes').lean();
  const codes = profile?.legalSourceCodes ?? DEFAULT_PROFILES.find(item => item.code === 'labor')?.legalSources ?? [];
  return { code: { $in: codes } };
}
export async function listStudioLaws(query: z.infer<typeof studioLawQuerySchema>) {
  const search = query.q ? new RegExp(escapeRegex(query.q), 'i') : null;
  const lawFilter = await templateLawFilter(query.templateCode);
  const [result] = await LegalSourceModel.aggregate([
    { $match: { ...availableSources(), ...lawFilter,
      ...(query.ids ? { _id: { $in: query.ids.map(id => new Types.ObjectId(id)) } } : {}),
      ...(search ? { $or: [{ title: search }, { documentNumber: search }, { citationLabel: search }, { code: search }] } : {}),
    } },
    { $lookup: { from: LegalKnowledgeChunkModel.collection.name, localField: '_id', foreignField: 'legalSourceId',
      pipeline: [{ $limit: 1 }, { $project: { _id: 1 } }], as: 'chunks' } },
    { $match: { 'chunks.0': { $exists: true } } },
    { $sort: { issuedDate: -1, title: 1, _id: 1 } },
    { $facet: {
      items: [{ $skip: (query.page - 1) * pageSize }, { $limit: pageSize }, { $project: metadata }],
      count: [{ $count: 'total' }],
    } },
  ]);
  const total = result?.count[0]?.total ?? 0;
  return { items: result?.items ?? [], total, page: query.page, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function validateStudioLaws(ids: string[], templateCode?: string) {
  if (!ids.length) return [];
  const lawFilter = await templateLawFilter(templateCode);
  const sources = await LegalSourceModel.find({ ...availableSources(), ...lawFilter, _id: { $in: ids } })
    .select('code title documentNumber citationLabel status sourceType').lean();
  const present = await LegalKnowledgeChunkModel.distinct('legalSourceId', { legalSourceId: { $in: ids } });
  const readable = new Set(present.map(String));
  if (sources.length !== ids.length || sources.some(source => !readable.has(String(source._id)))) {
    throw AppError.badRequest('Một số văn bản không phù hợp với mẫu hợp đồng, không còn sẵn sàng hoặc đã thay đổi hiệu lực. Hãy chọn lại luật áp dụng.');
  }
  const byId = new Map(sources.map(source => [String(source._id), source]));
  return ids.map(id => byId.get(id)!);
}

export async function previewStudioLaw(id: string, page: number) {
  await validateStudioLaws([id]);
  const source = await LegalSourceModel.aggregate([{ $match: { _id: new Types.ObjectId(id) } }, { $project: metadata }]);
  const [chunks, total] = await Promise.all([
    LegalKnowledgeChunkModel.find({ legalSourceId: id }).sort({ order: 1, _id: 1 }).skip((page - 1) * 8).limit(8)
      .select('articleRef articleTitle chunkText hierarchy').lean(),
    LegalKnowledgeChunkModel.countDocuments({ legalSourceId: id }),
  ]);
  return { source: source[0], chunks: chunks.map(chunk => ({ id: String(chunk._id), articleRef: chunk.articleRef,
    articleTitle: chunk.articleTitle, text: chunk.chunkText, hierarchy: chunk.hierarchy ?? [] })),
    page, pages: Math.max(1, Math.ceil(total / 8)), total };
}

export async function studioLawContext(ids: string[], message: string, templateCode?: string) {
  const sources = await validateStudioLaws(ids, templateCode);
  const stopWords = new Set(['cho', 'của', 'với', 'theo', 'hợp', 'đồng', 'điều', 'tôi', 'hãy', 'sửa', 'thêm', 'vào', 'này', 'một', 'các', 'người', 'lao', 'động', 'trong', 'được', 'thực', 'hiện', 'công', 'việc']);
  const terms = [...new Set(message.toLocaleLowerCase('vi').match(/[\p{L}\d]{3,}/gu) ?? [])]
    .filter(term => !stopWords.has(term)).slice(0, 16);
  const expression = terms.length ? new RegExp(terms.map(escapeRegex).join('|'), 'i') : null;
  return Promise.all(sources.map(async source => {
    const base = { legalSourceId: source._id };
    let chunks = expression ? await LegalKnowledgeChunkModel.aggregate([
      { $match: { ...base, chunkText: expression } },
      { $set: { relevance: { $sum: terms.map(term => ({ $cond: [
        { $regexMatch: { input: '$chunkText', regex: escapeRegex(term), options: 'i' } }, 1, 0,
      ] })) } } },
      { $sort: { relevance: -1, order: 1, _id: 1 } }, { $limit: 2 },
      { $project: { chunkText: 1, articleRef: 1 } },
    ]) : [];
    if (!chunks.length) chunks = await LegalKnowledgeChunkModel.find(base).sort({ order: 1 }).limit(2)
      .select('chunkText articleRef').lean();
    return { id: String(source._id), title: source.title, documentNumber: source.documentNumber,
      citationLabel: source.citationLabel, status: source.status,
      excerpts: chunks.map(chunk => ({ chunkId: String(chunk._id), articleRef: chunk.articleRef, text: chunk.chunkText.slice(0, 1200) })) };
  }));
}
