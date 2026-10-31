import mongoose, { ClientSession, HydratedDocument, Types } from 'mongoose';
import { AppError } from '../../errors/AppError';
import { ClauseModel } from '../../models/clause.model';
import { ContractVersionModel, RISK_LEVELS } from '../../models/contractVersion.model';
import { EXPERT_ACTIONS, ExpertActionModel } from '../../models/expertAction.model';
import {
  ExpertReview,
  ExpertReviewModel,
  OPEN_EXPERT_REVIEW_STATUSES,
} from '../../models/expertReview.model';
import { OrganizationModel } from '../../models/organization.model';
import { ReviewModel } from '../../models/review.model';
import { RiskCitationModel } from '../../models/riskCitation.model';
import { RiskFinding, RiskFindingModel } from '../../models/riskFinding.model';
import { UserModel } from '../../models/user.model';
import { normalizeUploadFileName } from '../../utils/uploadFileName';
import { AddFindingInput, DecideFindingInput } from '../../validations/verification.validation';
import { getCurrentVersion } from '../contract/contractVersion.service';
import { getRoleByCode } from '../identity/role.service';

type RiskLevel = (typeof RISK_LEVELS)[number];
type ExpertActionType = (typeof EXPERT_ACTIONS)[number];
type FindingDoc = HydratedDocument<RiskFinding>;

const SEVERITY_RANK: Record<RiskLevel, number> = { none: 0, low: 1, medium: 2, high: 3 };

const CONTENT_FIELDS = ['severity', 'riskCode', 'title', 'problem', 'consequences', 'recommendations'] as const;

async function snapshotOf(finding: FindingDoc) {
  const clause = finding.clauseId ? await ClauseModel.findById(finding.clauseId).select('index') : null;
  return {
    findingType: finding.findingType,
    severity: finding.severity,
    riskCode: finding.riskCode ?? undefined,
    title: finding.title,
    problem: [...finding.problem],
    consequences: [...finding.consequences],
    recommendations: [...finding.recommendations],
    clauseIndex: clause?.index,
  };
}

function sameValue(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export async function assertNoOpenVerification(contractId: string) {
  if (await ExpertReviewModel.exists({ contractId, status: { $in: OPEN_EXPERT_REVIEW_STATUSES } })) {
    throw AppError.conflict(
      'Kết quả rà soát đang được chuyên gia xác minh. Vui lòng chờ chuyên gia duyệt hoặc trả lại trước khi rà soát lại.',
      'VERIFICATION_IN_PROGRESS',
    );
  }
}

async function loadVerifiableReview(orgId: string, reviewId: string) {
  const review = await ReviewModel.findOne({ _id: reviewId, orgId });
  if (!review) throw AppError.notFound('Không tìm thấy yêu cầu rà soát.');
  if (review.status !== 'completed' || !review.result || review.result.partial) {
    throw AppError.conflict('Chỉ có thể xác minh lượt rà soát đã hoàn tất đầy đủ.', 'REVIEW_NOT_VERIFIABLE');
  }
  const contractId = review.contractId.toString();
  const [latest, version, running] = await Promise.all([
    ReviewModel.findOne({ contractId, status: 'completed' }).sort({ createdAt: -1 }).select('_id'),
    getCurrentVersion(contractId),
    ReviewModel.exists({ contractId, activeLock: true }),
  ]);
  if (latest?.id !== review.id || version.id !== review.versionId.toString()) {
    throw AppError.conflict('Chỉ có thể xác minh kết quả rà soát mới nhất của hợp đồng.', 'REVIEW_OUTDATED');
  }
  if (running) throw AppError.conflict('Hợp đồng đang được rà soát lại. Vui lòng chờ hoàn tất.', 'REVIEW_RUNNING');
  return review;
}

async function assertOrganizationHasExpert(orgId: string) {
  const organization = await OrganizationModel.findById(orgId).select('isPersonal');
  if (!organization || organization.isPersonal) {
    throw AppError.badRequest('Tài khoản cá nhân chưa hỗ trợ gửi chuyên gia xác minh.', 'VERIFICATION_UNAVAILABLE');
  }
  const expertRole = await getRoleByCode('expert');
  const hasExpert = await UserModel.exists({ orgId, roleId: expertRole._id, isActive: true, deletedAt: null });
  if (!hasExpert) {
    throw AppError.conflict('Tổ chức chưa có chuyên gia. Hãy mời chuyên gia trước khi gửi xác minh.', 'NO_EXPERT');
  }
}

export async function requestVerification(orgId: string, userId: string, reviewId: string, note?: string) {
  const review = await loadVerifiableReview(orgId, reviewId);
  await assertOrganizationHasExpert(orgId);
  const now = new Date();
  const existing = await ExpertReviewModel.findOne({ reviewId: review._id });
  if (existing) {
    if (existing.status !== 'returned') {
      throw AppError.conflict(
        existing.status === 'approved' ? 'Kết quả rà soát này đã được chuyên gia duyệt.' : 'Kết quả rà soát này đã được gửi xác minh.',
        'VERIFICATION_EXISTS',
      );
    }
    const reopened = await ExpertReviewModel.findOneAndUpdate(
      { _id: existing._id, status: 'returned' },
      {
        $set: { status: 'requested', requestedBy: userId, requestedAt: now, ...(note ? { requestNote: note } : {}) },
        $inc: { attempt: 1 },
        $unset: { expertId: '', assignedAt: '', completedAt: '', decisionNote: '', ...(note ? {} : { requestNote: '' }) },
      },
      { new: true },
    );
    if (!reopened) throw AppError.conflict('Yêu cầu xác minh vừa thay đổi. Vui lòng tải lại.', 'VERIFICATION_EXISTS');
    return reopened;
  }
  try {
    return await ExpertReviewModel.create({
      reviewId: review._id,
      contractId: review.contractId,
      orgId,
      status: 'requested',
      requestedBy: userId,
      requestNote: note,
      requestedAt: now,
    });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      throw AppError.conflict('Kết quả rà soát này đã được gửi xác minh.', 'VERIFICATION_EXISTS');
    }
    throw err;
  }
}

export async function startVerification(orgId: string, expertId: string, reviewId: string) {
  const claimed = await ExpertReviewModel.findOneAndUpdate(
    { reviewId, orgId, status: 'requested' },
    { $set: { status: 'in_progress', expertId, assignedAt: new Date() } },
    { new: true },
  );
  if (claimed) return claimed;
  const session = await ExpertReviewModel.findOne({ reviewId, orgId });
  if (!session) throw AppError.notFound('Kết quả rà soát này chưa được gửi xác minh.');
  if (session.status === 'in_progress' && session.expertId?.toString() === expertId) return session;
  throw AppError.conflict(
    session.status === 'in_progress' ? 'Một chuyên gia khác đang xác minh kết quả này.' : 'Yêu cầu xác minh đã kết thúc.',
    'VERIFICATION_NOT_OPEN',
  );
}

async function loadOwnSession(orgId: string, expertId: string, reviewId: string) {
  const session = await ExpertReviewModel.findOne({ reviewId, orgId });
  if (!session) throw AppError.notFound('Kết quả rà soát này chưa được gửi xác minh.');
  if (session.status !== 'in_progress') {
    throw AppError.conflict('Hãy nhận yêu cầu xác minh trước khi thao tác.', 'VERIFICATION_NOT_OPEN');
  }
  if (session.expertId?.toString() !== expertId) {
    throw AppError.forbidden('Một chuyên gia khác đang xác minh kết quả này.', 'VERIFICATION_NOT_ASSIGNED');
  }
  const review = await ReviewModel.findById(session.reviewId).select('versionId contractId');
  if (!review) throw AppError.notFound('Không tìm thấy yêu cầu rà soát.');
  return { session, review };
}

async function recordAction(
  session: HydratedDocument<ExpertReview>,
  expertId: string,
  finding: FindingDoc,
  action: ExpertActionType,
  snapshots: { before?: Awaited<ReturnType<typeof snapshotOf>>; after?: Awaited<ReturnType<typeof snapshotOf>> },
  reason: string | undefined,
  dbSession: ClientSession,
) {
  await ExpertActionModel.create(
    [
      {
        expertReviewId: session._id,
        orgId: session.orgId,
        riskFindingId: finding._id,
        expertId,
        attempt: session.attempt,
        action,
        reason,
        ...snapshots,
      },
    ],
    { session: dbSession },
  );
}

export async function decideFinding(
  orgId: string,
  expertId: string,
  reviewId: string,
  findingId: string,
  input: DecideFindingInput,
) {
  const { session, review } = await loadOwnSession(orgId, expertId, reviewId);
  const finding = await RiskFindingModel.findOne({ _id: findingId, orgId, contractVersionId: review.versionId });
  if (!finding) throw AppError.notFound('Không tìm thấy rủi ro trong kết quả rà soát này.');
  const addedByExpert = finding.detectedBy === 'expert';
  if (addedByExpert && input.verdict !== 'adjusted') {
    throw AppError.badRequest('Rủi ro do chuyên gia thêm chỉ có thể chỉnh sửa hoặc xóa.', 'INVALID_VERDICT');
  }

  const before = await snapshotOf(finding);
  if (input.verdict === 'adjusted') {
    const changed = CONTENT_FIELDS.filter((field) => input[field] !== undefined && !sameValue(input[field], before[field]));
    if (!changed.length) throw AppError.badRequest('Nội dung điều chỉnh giống với hiện tại.', 'NOTHING_TO_ADJUST');
    for (const field of changed) finding.set(field, input[field]);
  }
  const after = await snapshotOf(finding);
  const originalSeverity = finding.verification?.originalSeverity ?? (addedByExpert ? undefined : before.severity);
  finding.set('verification', {
    verdict: addedByExpert ? 'added' : input.verdict,
    originalSeverity,
    reason: input.reason ?? (addedByExpert ? finding.verification?.reason : undefined),
    verifiedBy: expertId,
    verifiedAt: new Date(),
  });

  const action: ExpertActionType = input.verdict === 'confirmed' ? 'confirm' : input.verdict === 'rejected' ? 'reject' : 'adjust';
  await mongoose.connection.transaction(async (dbSession) => {
    await finding.save({ session: dbSession });
    await recordAction(session, expertId, finding, action, { before, after }, input.reason, dbSession);
  });
  return finding;
}

export async function addFinding(orgId: string, expertId: string, reviewId: string, input: AddFindingInput) {
  const { session, review } = await loadOwnSession(orgId, expertId, reviewId);
  let clauseId: Types.ObjectId | null = null;
  if (input.clauseIndex !== undefined) {
    const clause = await ClauseModel.findOne({ contractVersionId: review.versionId, index: input.clauseIndex }).select('_id');
    if (!clause) throw AppError.badRequest('Không tìm thấy điều khoản đã chọn trong hợp đồng.', 'CLAUSE_NOT_FOUND');
    clauseId = clause._id;
  }
  const finding = new RiskFindingModel({
    contractVersionId: review.versionId,
    orgId,
    clauseId,
    findingType: clauseId ? 'clause_risk' : 'missing_clause',
    severity: input.severity,
    riskCode: input.riskCode,
    title: input.title,
    problem: input.problem,
    consequences: input.consequences,
    recommendations: input.recommendations,
    detectedBy: 'expert',
    verification: { verdict: 'added', reason: input.reason, verifiedBy: expertId, verifiedAt: new Date() },
  });
  const after = await snapshotOf(finding);
  await mongoose.connection.transaction(async (dbSession) => {
    await finding.save({ session: dbSession });
    await recordAction(session, expertId, finding, 'add', { after }, input.reason, dbSession);
  });
  return finding;
}

export async function removeFinding(orgId: string, expertId: string, reviewId: string, findingId: string) {
  const { session, review } = await loadOwnSession(orgId, expertId, reviewId);
  const finding = await RiskFindingModel.findOne({ _id: findingId, orgId, contractVersionId: review.versionId });
  if (!finding) throw AppError.notFound('Không tìm thấy rủi ro trong kết quả rà soát này.');
  if (finding.detectedBy !== 'expert') {
    throw AppError.badRequest('Chỉ có thể xóa rủi ro do chuyên gia thêm. Hãy bác bỏ rủi ro do AI phát hiện.', 'INVALID_VERDICT');
  }
  const before = await snapshotOf(finding);
  await mongoose.connection.transaction(async (dbSession) => {
    await RiskCitationModel.deleteMany({ riskFindingId: finding._id }).session(dbSession);
    await RiskFindingModel.deleteOne({ _id: finding._id }).session(dbSession);
    await recordAction(session, expertId, finding, 'remove', { before }, undefined, dbSession);
  });
}

export async function approveVerification(orgId: string, expertId: string, reviewId: string, decisionNote?: string) {
  const { session, review } = await loadOwnSession(orgId, expertId, reviewId);
  const findings = await RiskFindingModel.find({ contractVersionId: review.versionId }).select('severity verification');
  const pending = findings.filter((finding) => !finding.verification);
  if (pending.length) {
    throw AppError.badRequest(`Còn ${pending.length} rủi ro chưa được xử lý.`, 'VERIFICATION_INCOMPLETE');
  }
  let overallRiskLevel: RiskLevel = 'none';
  for (const finding of findings) {
    if (finding.verification?.verdict === 'rejected') continue;
    if (SEVERITY_RANK[finding.severity] > SEVERITY_RANK[overallRiskLevel]) overallRiskLevel = finding.severity;
  }
  return mongoose.connection.transaction(async (dbSession) => {
    const approved = await ExpertReviewModel.findOneAndUpdate(
      { _id: session._id, status: 'in_progress', expertId },
      { $set: { status: 'approved', completedAt: new Date(), ...(decisionNote ? { decisionNote } : {}) } },
      { new: true, session: dbSession },
    );
    if (!approved) throw AppError.conflict('Yêu cầu xác minh vừa thay đổi. Vui lòng tải lại.', 'VERIFICATION_NOT_OPEN');
    await ContractVersionModel.updateOne({ _id: review.versionId }, { $set: { overallRiskLevel } }, { session: dbSession });
    return approved;
  });
}

export async function returnVerification(orgId: string, expertId: string, reviewId: string, reason: string) {
  const { session } = await loadOwnSession(orgId, expertId, reviewId);
  const returned = await ExpertReviewModel.findOneAndUpdate(
    { _id: session._id, status: 'in_progress', expertId },
    { $set: { status: 'returned', completedAt: new Date(), decisionNote: reason } },
    { new: true },
  );
  if (!returned) throw AppError.conflict('Yêu cầu xác minh vừa thay đổi. Vui lòng tải lại.', 'VERIFICATION_NOT_OPEN');
  return returned;
}

export async function getVerification(orgId: string, reviewId: string) {
  const review = await ReviewModel.exists({ _id: reviewId, orgId });
  if (!review) throw AppError.notFound('Không tìm thấy yêu cầu rà soát.');
  const session = await ExpertReviewModel.findOne({ reviewId, orgId })
    .populate('requestedBy', 'name')
    .populate('expertId', 'name');
  if (!session) return { verification: null, actions: [] };
  const actions = await ExpertActionModel.find({ expertReviewId: session._id })
    .sort({ createdAt: 1 })
    .populate('expertId', 'name');
  return { verification: session, actions };
}

export async function listVerificationQueue(
  orgId: string,
  expertId: string,
  status: 'requested' | 'in_progress' | 'all' = 'all',
) {
  const filters = [
    ...(status !== 'in_progress' ? [{ status: 'requested' }] : []),
    ...(status !== 'requested' ? [{ status: 'in_progress', expertId: new Types.ObjectId(expertId) }] : []),
  ];
  const sessions = await ExpertReviewModel.find({ orgId, $or: filters })
    .sort({ requestedAt: 1 })
    .limit(100)
    .populate('requestedBy', 'name')
    .populate<{ contractId: { _id: Types.ObjectId; title: string; type?: string; overallRiskLevel?: string } | null }>(
      'contractId',
      'title type overallRiskLevel',
    );
  return sessions.map((session) => {
    const item = session.toObject();
    return item.contractId ? { ...item, contractId: { ...item.contractId, title: normalizeUploadFileName(item.contractId.title) } } : item;
  });
}
