import { ClientSession, HydratedDocument, Types, PipelineStage } from 'mongoose';
import { ExpertReview, ExpertReviewModel } from '../../models/expertReview.model';
import { ExpertWorkRecordModel } from '../../models/expertWorkRecord.model';
import { ContractModel } from '../../models/contract.model';
import { ReviewModel } from '../../models/review.model';
import { ContractVersionModel } from '../../models/contractVersion.model';
import { UserModel } from '../../models/user.model';
import { createRedactor } from '../ai/redaction.service';
import { redactionPolicyFor } from '../contract/redactionPolicy.service';
import { normalizeUploadFileName } from '../../utils/uploadFileName';
import { AppError } from '../../errors/AppError';
import type { ExpertWorkQuery } from '../../validations/verification.validation';

export async function archiveExpertWork(session: HydratedDocument<ExpertReview>, workspace: { contract: { title: string; type?: string | null } }, dbSession: ClientSession) {
  if (!session.expertId || !['approved', 'returned'].includes(session.status)) return;
  const snapshot = JSON.parse(JSON.stringify(workspace));
  snapshot.verification = { ...snapshot.verification, status: session.status, completedAt: session.completedAt, decisionNote: session.decisionNote };
  await ExpertWorkRecordModel.updateOne({ expertReviewId: session._id, attempt: session.attempt }, {
    $setOnInsert: {
      expertReviewId: session._id, reviewId: session.reviewId, contractId: session.contractId,
      expertId: session.expertId, requestedBy: session.requestedBy, attempt: session.attempt,
      status: session.status, title: workspace.contract.title, contractType: workspace.contract.type,
      requestedAt: session.requestedAt, assignedAt: session.assignedAt, completedAt: session.completedAt,
      workspaceJson: JSON.stringify({ ...snapshot, historical: true }),
      decisionNote: session.decisionNote,
    },
  }, { upsert: true, session: dbSession });
}

export async function historicalExpertWork(expertId: string, reviewId: string, attempt: number) {
  const record = await ExpertWorkRecordModel.findOne({ expertId, reviewId, attempt }).select('+workspaceJson');
  if (!record) throw AppError.notFound('Không tìm thấy lần xác minh của bạn.', 'EXPERT_WORK_NOT_FOUND');
  const [contract, review] = await Promise.all([
    ContractModel.exists({ _id: record.contractId }), ReviewModel.exists({ _id: record.reviewId }),
  ]);
  if (!contract || !review) throw AppError.notFound('Hợp đồng của lần xác minh này không còn khả dụng.');
  return JSON.parse(record.workspaceJson);
}

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function listExpertWork(expertId: string, query: ExpertWorkQuery) {
  const expert = new Types.ObjectId(expertId);
  // Legacy/current sessions remain visible even if they predate work records.
  const fields = { expertReviewId: '$_id', reviewId: 1, contractId: 1, expertId: 1, requestedBy: 1, attempt: { $ifNull: ['$attempt', 1] }, status: 1, requestedAt: 1, assignedAt: 1, completedAt: 1, decisionNote: 1, historical: { $literal: false } };
  const pipeline: PipelineStage[] = [
    { $match: { expertId: expert, status: { $in: ['in_progress', 'approved', 'returned'] } } },
    { $project: fields },
    { $unionWith: { coll: ExpertWorkRecordModel.collection.name, pipeline: [
      { $match: { expertId: expert } },
      { $project: { workspaceJson: 0, decisionNote: 0 } },
      { $set: { historical: true } },
    ] } },
    { $sort: { historical: -1 } },
    { $group: { _id: { session: '$expertReviewId', attempt: '$attempt' }, row: { $first: '$$ROOT' } } },
    { $replaceRoot: { newRoot: '$row' } },
    { $lookup: { from: ContractModel.collection.name, localField: 'contractId', foreignField: '_id', as: 'contract' } },
    { $set: { contract: { $arrayElemAt: ['$contract', 0] } } },
    { $set: { displayTitle: { $ifNull: ['$title', '$contract.title'] }, contractType: { $ifNull: ['$contractType', '$contract.type'] }, sortDate: { $ifNull: ['$assignedAt', '$requestedAt'] } } },
  ];
  const match: Record<string, unknown> = {};
  if (query.status !== 'all') match.status = query.status;
  if (query.search) match.displayTitle = { $regex: escapeRegex(query.search), $options: 'i' };
  if (query.type) match.contractType = query.type;
  if (query.from || query.to) match.sortDate = {
    ...(query.from ? { $gte: new Date(`${query.from}T00:00:00+07:00`) } : {}),
    ...(query.to ? { $lt: new Date(new Date(`${query.to}T00:00:00+07:00`).getTime() + 86400000) } : {}),
  };
  pipeline.push({ $match: match }, { $sort: { sortDate: -1, expertReviewId: -1, attempt: -1 } }, {
    $facet: {
      count: [{ $count: 'total' }],
      items: [{ $skip: (query.page - 1) * query.limit }, { $limit: query.limit }, { $project: { _id: 0, expertReviewId: 1, reviewId: 1, contractId: 1, requestedBy: 1, attempt: 1, status: 1, requestedAt: 1, assignedAt: 1, completedAt: 1, decisionNote: 1, historical: 1, displayTitle: 1, contractType: 1, available: { $ne: [{ $ifNull: ['$contract._id', null] }, null] }, } }],
    },
  });
  const [data] = await ExpertReviewModel.aggregate(pipeline);
  const rows = data?.items ?? [];
  const ids = rows.map((row: { expertReviewId: Types.ObjectId }) => row.expertReviewId);
  const selectedAttempts = rows.length
    ? { $or: rows.map((row: { expertReviewId: Types.ObjectId; attempt: number }) => ({ expertReviewId: row.expertReviewId, attempt: row.attempt })) }
    : { _id: { $in: [] } };
  const [archives, currentNotes, previewPolicy] = await Promise.all([
    ExpertWorkRecordModel.find({ expertId: expert, ...selectedAttempts }).select('expertReviewId attempt').select('+decisionNote'),
    ExpertReviewModel.find({ expertId: expert, _id: { $in: ids } }).select('attempt decisionNote'),
    redactionPolicyFor(),
  ]);
  const notes = new Map(archives.filter((record) => record.decisionNote).map((record) => [`${record.expertReviewId}:${record.attempt}`, record.decisionNote!]));
  for (const record of currentNotes) {
    const noteKey = `${record._id}:${record.attempt}`;
    if (!notes.has(noteKey) && record.decisionNote) notes.set(noteKey, record.decisionNote);
  }
  const users = await UserModel.find({ _id: { $in: rows.map((row: { requestedBy: Types.ObjectId }) => row.requestedBy) } }).select('name');
  const names = new Map(users.map((user) => [user.id, user.name]));
  const items = await Promise.all(rows.map(async (row: { expertReviewId: Types.ObjectId; attempt: number; status: string; decisionNote?: string; reviewId: Types.ObjectId; contractType?: string; displayTitle?: string; requestedBy: Types.ObjectId; historical: boolean }) => {
    let title = row.displayTitle || 'Hợp đồng không còn khả dụng';
    if (!row.historical) {
      const review = await ReviewModel.findById(row.reviewId).select('versionId');
      const version = review ? await ContractVersionModel.findById(review.versionId).select('+extractedText') : null;
      title = createRedactor(version?.extractedText ?? '', await redactionPolicyFor(row.contractType)).maskForDisplay(normalizeUploadFileName(title)).text;
    }
    const note = ['approved', 'returned'].includes(row.status) ? notes.get(`${row.expertReviewId}:${row.attempt}`) : undefined;
    const masked = note ? createRedactor(note, previewPolicy).maskForDisplay(note).text.normalize('NFC') : '';
    const characters = Array.from(masked);
    const decisionPreview = characters.length > 240 ? characters.slice(0, 240).join('') + '…' : masked || undefined;
    const rest = { ...row };
    delete rest.displayTitle;
    delete rest.decisionNote;
    return { ...rest, title, decisionPreview, requestedBy: { _id: row.requestedBy, name: names.get(String(row.requestedBy)) ?? 'Tài khoản không còn khả dụng' } };
  }));
  const total = data?.count[0]?.total ?? 0;
  return { items, total, page: query.page, limit: query.limit, pages: Math.max(1, Math.ceil(total / query.limit)) };
}
