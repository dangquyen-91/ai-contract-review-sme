import mongoose, { ClientSession, HydratedDocument, Types } from 'mongoose';
import { AppError } from '../../errors/AppError';
import { ClauseModel } from '../../models/clause.model';
import { ContractModel } from '../../models/contract.model';
import { ContractVersionModel, RISK_LEVELS } from '../../models/contractVersion.model';
import { EXPERT_ACTIONS, ExpertActionModel } from '../../models/expertAction.model';
import {
  ExpertReview,
  ExpertReviewModel,
  OPEN_EXPERT_REVIEW_STATUSES,
} from '../../models/expertReview.model';
import { ReviewModel } from '../../models/review.model';
import { RiskCitationModel } from '../../models/riskCitation.model';
import { RiskFinding, RiskFindingModel } from '../../models/riskFinding.model';
import { UserModel } from '../../models/user.model';
import { normalizeUploadFileName } from '../../utils/uploadFileName';
import { AddFindingInput, DecideFindingInput } from '../../validations/verification.validation';
import { createRedactor } from '../ai/redaction.service';
import { listVersionFindings } from '../analysis/risk.service';
import { getCurrentVersion } from '../contract/contractVersion.service';
import { redactionPolicyFor } from '../contract/redactionPolicy.service';
import { getRoleByCode } from '../identity/role.service';
import { archiveExpertWork, historicalExpertWork } from './expertWork.service';

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

async function assertExpertAvailable() {
  const expertRole = await getRoleByCode('expert');
  const hasExpert = await UserModel.exists({ roleId: expertRole._id, isActive: true, deletedAt: null });
  if (!hasExpert) {
    throw AppError.conflict('Hiện chưa có chuyên gia LawScan nhận xác minh. Vui lòng thử lại sau.', 'NO_EXPERT');
  }
}

export async function requestVerification(orgId: string, userId: string, reviewId: string, note?: string) {
  const review = await loadVerifiableReview(orgId, reviewId);
  await assertExpertAvailable();
  const now = new Date();
  const consent = { consentedAt: now, consentedBy: userId };
  const existing = await ExpertReviewModel.findOne({ reviewId: review._id });
  if (existing) {
    if (existing.status !== 'returned') {
      throw AppError.conflict(
        existing.status === 'approved' ? 'Kết quả rà soát này đã được chuyên gia duyệt.' : 'Kết quả rà soát này đã được gửi xác minh.',
        'VERIFICATION_EXISTS',
      );
    }
    const previousWorkspace = existing.expertId ? await getExpertWorkspace(existing.expertId.toString(), reviewId) : null;
    return mongoose.connection.transaction(async (dbSession) => {
    const reopened = await ExpertReviewModel.findOneAndUpdate(
      { _id: existing._id, status: 'returned', attempt: existing.attempt },
      {
        $set: { status: 'requested', requestedBy: userId, requestedAt: now, ...consent, ...(note ? { requestNote: note } : {}) },
        $inc: { attempt: 1 },
        $unset: { expertId: '', assignedAt: '', completedAt: '', decisionNote: '', ...(note ? {} : { requestNote: '' }) },
      },
      { new: true, session: dbSession },
    );
    if (!reopened) throw AppError.conflict('Yêu cầu xác minh vừa thay đổi. Vui lòng tải lại.', 'VERIFICATION_EXISTS');
    if (previousWorkspace) await archiveExpertWork(existing, previousWorkspace, dbSession);
    return reopened;
    });
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
      ...consent,
    });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      throw AppError.conflict('Kết quả rà soát này đã được gửi xác minh.', 'VERIFICATION_EXISTS');
    }
    throw err;
  }
}

export async function startVerification(expertId: string, reviewId: string) {
  const claimed = await ExpertReviewModel.findOneAndUpdate(
    { reviewId, status: 'requested' },
    { $set: { status: 'in_progress', expertId, assignedAt: new Date() } },
    { new: true },
  );
  if (claimed) return claimed;
  const session = await ExpertReviewModel.findOne({ reviewId });
  if (!session) throw AppError.notFound('Kết quả rà soát này chưa được gửi xác minh.');
  if (session.status === 'in_progress' && session.expertId?.toString() === expertId) return session;
  throw AppError.conflict(
    session.status === 'in_progress' ? 'Một chuyên gia khác đang xác minh kết quả này.' : 'Yêu cầu xác minh đã kết thúc.',
    'VERIFICATION_NOT_OPEN',
  );
}

async function loadOwnSession(expertId: string, reviewId: string) {
  const session = await ExpertReviewModel.findOne({ reviewId });
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
  expertId: string,
  reviewId: string,
  findingId: string,
  input: DecideFindingInput,
) {
  const { session, review } = await loadOwnSession(expertId, reviewId);
  const finding = await RiskFindingModel.findOne({ _id: findingId, orgId: session.orgId, contractVersionId: review.versionId });
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

export async function addFinding(expertId: string, reviewId: string, input: AddFindingInput) {
  const { session, review } = await loadOwnSession(expertId, reviewId);
  let clauseId: Types.ObjectId | null = null;
  if (input.clauseIndex !== undefined) {
    const clause = await ClauseModel.findOne({ contractVersionId: review.versionId, index: input.clauseIndex }).select('_id');
    if (!clause) throw AppError.badRequest('Không tìm thấy điều khoản đã chọn trong hợp đồng.', 'CLAUSE_NOT_FOUND');
    clauseId = clause._id;
  }
  const finding = new RiskFindingModel({
    contractVersionId: review.versionId,
    orgId: session.orgId,
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

export async function removeFinding(expertId: string, reviewId: string, findingId: string) {
  const { session, review } = await loadOwnSession(expertId, reviewId);
  const finding = await RiskFindingModel.findOne({ _id: findingId, orgId: session.orgId, contractVersionId: review.versionId });
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

export async function approveVerification(expertId: string, reviewId: string, decisionNote?: string) {
  const { session, review } = await loadOwnSession(expertId, reviewId);
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
  const workspace = await getExpertWorkspace(expertId, reviewId);
  return mongoose.connection.transaction(async (dbSession) => {
    const approved = await ExpertReviewModel.findOneAndUpdate(
      { _id: session._id, status: 'in_progress', expertId },
      { $set: { status: 'approved', completedAt: new Date(), ...(decisionNote ? { decisionNote } : {}) } },
      { new: true, session: dbSession },
    );
    if (!approved) throw AppError.conflict('Yêu cầu xác minh vừa thay đổi. Vui lòng tải lại.', 'VERIFICATION_NOT_OPEN');
    await ContractVersionModel.updateOne({ _id: review.versionId }, { $set: { overallRiskLevel } }, { session: dbSession });
    await archiveExpertWork(approved, workspace, dbSession);
    return approved;
  });
}

export async function returnVerification(expertId: string, reviewId: string, reason: string) {
  const { session } = await loadOwnSession(expertId, reviewId);
  const workspace = await getExpertWorkspace(expertId, reviewId);
  return mongoose.connection.transaction(async (dbSession) => {
  const returned = await ExpertReviewModel.findOneAndUpdate(
    { _id: session._id, status: 'in_progress', expertId },
    { $set: { status: 'returned', completedAt: new Date(), decisionNote: reason } },
    { new: true, session: dbSession },
  );
  if (!returned) throw AppError.conflict('Yêu cầu xác minh vừa thay đổi. Vui lòng tải lại.', 'VERIFICATION_NOT_OPEN');
  await archiveExpertWork(returned, workspace, dbSession);
  return returned;
  });
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
  expertId: string,
  status: 'requested' | 'in_progress' | 'all' = 'all',
) {
  const filters = [
    ...(status !== 'in_progress' ? [{ status: 'requested' }] : []),
    ...(status !== 'requested' ? [{ status: 'in_progress', expertId: new Types.ObjectId(expertId) }] : []),
  ];
  const sessions = await ExpertReviewModel.find({ $or: filters })
    .select('reviewId contractId orgId status attempt requestedBy requestedAt assignedAt expertId requestNote')
    .sort({ requestedAt: 1 })
    .limit(100)
    .populate('requestedBy', 'name')
    .populate<{ contractId: { _id: Types.ObjectId; title: string; type?: string; overallRiskLevel?: string } | null }>(
      'contractId',
      'title type overallRiskLevel',
    );
  return Promise.all(
    sessions.map(async (session) => {
      const item = session.toObject();
      if (!item.contractId) return { ...item, requestNote: undefined };
      const mask = await displayMaskFor(String(session.reviewId), item.contractId.type, item.requestNote ?? '');
      return { ...item, requestNote: item.requestNote ? mask(item.requestNote) : undefined, contractId: { ...item.contractId, title: mask(normalizeUploadFileName(item.contractId.title)) } };
    }),
  );
}

async function displayMaskFor(reviewId: string, contractType?: string | null, extraText = '') {
  const review = await ReviewModel.findById(reviewId).select('versionId');
  const version = review ? await ContractVersionModel.findById(review.versionId).select('+extractedText') : null;
  const redactor = createRedactor(`${version?.extractedText ?? ''}\n${extraText}`, await redactionPolicyFor(contractType));
  return (text: string) => redactor.maskForDisplay(text).text;
}

const MASKED_TEXT_FIELDS = ['title', 'problem', 'consequences', 'recommendations', 'summary', 'text'] as const;

function maskTextFields<T extends object>(item: T, mask: (text: string) => string): T {
  const masked = { ...item } as Record<string, unknown>;
  for (const field of MASKED_TEXT_FIELDS) {
    const value = masked[field];
    if (typeof value === 'string') masked[field] = mask(value);
    else if (Array.isArray(value)) masked[field] = value.map((entry) => (typeof entry === 'string' ? mask(entry) : entry));
  }
  return masked as T;
}

export async function getExpertWorkspace(expertId: string, reviewId: string, attempt?: number) {
  if (attempt !== undefined) return historicalExpertWork(expertId, reviewId, attempt);
  const session = await ExpertReviewModel.findOne({ reviewId });
  if (!session) throw AppError.notFound('Kết quả rà soát này chưa được gửi xác minh.');
  if (session.status !== 'requested' && session.expertId?.toString() !== expertId) {
    throw AppError.forbidden('Yêu cầu xác minh này do chuyên gia khác phụ trách.', 'VERIFICATION_NOT_ASSIGNED');
  }
  await session.populate([
    { path: 'requestedBy', select: 'name' },
    { path: 'expertId', select: 'name' },
  ]);
  const [review, contract] = await Promise.all([
    ReviewModel.findById(session.reviewId).select('versionId'),
    ContractModel.findById(session.contractId).select('title type ourParty industry'),
  ]);
  if (!review || !contract) throw AppError.notFound('Không tìm thấy hợp đồng của yêu cầu xác minh.');
  const versionId = review.versionId.toString();
  const [version, clauses, findings, actions, policy] = await Promise.all([
    ContractVersionModel.findById(versionId).select('+extractedText mimeType'),
    ClauseModel.find({ contractVersionId: versionId }).sort({ index: 1 }).populate('clauseTypeId'),
    listVersionFindings(versionId),
    ExpertActionModel.find({ expertReviewId: session._id }).sort({ createdAt: 1 }).populate('expertId', 'name'),
    redactionPolicyFor(contract.type),
  ]);
  if (!version) throw AppError.notFound('Không tìm thấy phiên bản hợp đồng đã rà soát.');

  const source = version.extractedText ?? '';
  const redactor = createRedactor(source, policy);
  const mask = (text: string) => redactor.maskForDisplay(text).text;
  const document = redactor.maskForDisplay(source);
  return {
    verification: session,
    contract: {
      id: contract.id as string,
      title: mask(normalizeUploadFileName(contract.title)),
      type: contract.type,
      ourParty: contract.ourParty,
      industry: contract.industry,
    },
    document: { text: document.text, redactionSpans: document.spans, mimeType: version.mimeType },
    clauses: clauses.map((clause) => {
      const item: Record<string, unknown> = clause.toObject();
      delete item.startOffset;
      delete item.endOffset;
      return maskTextFields(item, mask);
    }),
    findings: findings.map((finding) => {
      const item = finding as typeof finding & {
        clause: { index: number; title?: string | null } | null;
        proposedRevision?: { originalText?: string | null; revisedText: string; reason?: string | null };
      };
      return {
        ...maskTextFields(item, mask),
        clause: item.clause ? { index: item.clause.index, title: item.clause.title ? mask(item.clause.title) : item.clause.title } : null,
        ...(item.proposedRevision
          ? {
              proposedRevision: {
                ...item.proposedRevision,
                originalText: item.proposedRevision.originalText ? mask(item.proposedRevision.originalText) : item.proposedRevision.originalText,
                revisedText: mask(item.proposedRevision.revisedText),
              },
            }
          : {}),
      };
    }),
    actions: actions.map((action) => {
      const item = action.toObject();
      return {
        ...item,
        ...(item.before ? { before: maskTextFields(item.before, mask) } : {}),
        ...(item.after ? { after: maskTextFields(item.after, mask) } : {}),
      };
    }),
  };
}
