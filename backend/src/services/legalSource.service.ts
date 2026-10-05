import { AppError } from '../errors/AppError';
import { LegalSourceModel } from '../models/legalSource.model';
import { LegalKnowledgeChunkModel } from '../models/legalKnowledgeChunk.model';
import { CreateLegalSourceInput } from '../validations/legalSource.validation';
import { extractLegalText, ingestLegalSource } from './legalKnowledgeIngest.service';

interface CreateLegalSourceParams {
  input: CreateLegalSourceInput;
  file: { buffer: Buffer; mimeType: string };
}

export async function createLegalSource({ input, file }: CreateLegalSourceParams) {
  const fullText = await extractLegalText(file.buffer, file.mimeType);
  if (!fullText.trim()) {
    throw AppError.badRequest('No text could be extracted from the uploaded file');
  }

  const { legalSourceId } = await ingestLegalSource({
    title: input.title,
    sourceType: input.sourceType,
    citationLabel: input.citationLabel,
    issuingBody: input.issuingBody,
    effectiveDate: input.effectiveDate,
    fullText,
  });

  return LegalSourceModel.findById(legalSourceId);
}

export async function listLegalSources() {
  const sources = await LegalSourceModel.find().sort({ createdAt: -1 });
  const chunkCounts = await LegalKnowledgeChunkModel.aggregate([
    { $group: { _id: '$legalSourceId', count: { $sum: 1 } } },
  ]);
  const countBySourceId = new Map(chunkCounts.map((c) => [c._id.toString(), c.count]));

  return sources.map((source) => ({
    ...source.toObject(),
    chunkCount: countBySourceId.get(source._id.toString()) ?? 0,
  }));
}

export async function deleteLegalSource(id: string) {
  const source = await LegalSourceModel.findById(id);
  if (!source) {
    throw AppError.notFound('Legal source not found');
  }
  await LegalSourceModel.deleteOne({ _id: id });
  await LegalKnowledgeChunkModel.deleteMany({ legalSourceId: id });
}
