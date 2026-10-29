import { ClientSession } from 'mongoose';
import { AppError } from '../../errors/AppError';
import { UserModel } from '../../models/user.model';
import { ContractModel } from '../../models/contract.model';
import { ContractDraftModel } from '../../models/contractDraft.model';
import { ContractVersionModel } from '../../models/contractVersion.model';
import { UsageRunModel } from '../../models/subscription.model';
import { requireReviewCost } from './reviewCost';
import type { UsageInput } from './usage.service';

export async function assertUsageAccess(input: UsageInput, session: ClientSession) {
  const query = UserModel.findOne({
    _id: input.userId,
    ...(input.userId === input.orgId ? { orgId: null } : { orgId: input.orgId }),
    isActive: true,
  })
    .select('roleId')
    .session(session);
  if (input.kind === 'drafting' || input.userId === input.orgId) query.populate('roleId');
  const user = await query;
  if (!user) throw AppError.forbidden('Bạn không còn quyền truy cập tổ chức này.');
  if (
    input.userId === input.orgId &&
    (user.roleId as unknown as { code?: string })?.code !== 'user'
  )
    throw AppError.forbidden('Bạn không có quyền truy cập tài khoản cá nhân này.');

  if (input.kind !== 'drafting') {
    const contract = await ContractModel.exists({
      _id: input.contractId,
      orgId: input.orgId,
    }).session(session);
    if (!contract) throw AppError.notFound('Không tìm thấy hợp đồng.');
    return;
  }

  const role = (user.roleId as unknown as { code?: string })?.code;
  if (role !== 'owner' && role !== 'staff' && role !== 'user') {
    throw AppError.forbidden('Bạn không có quyền truy cập bản nháp này.');
  }
  const draft = await ContractDraftModel.exists({
    _id: input.draftId,
    orgId: input.orgId,
    ...(role !== 'owner' ? { createdBy: input.userId } : {}),
  }).session(session);
  if (!draft) throw AppError.forbidden('Bạn không có quyền truy cập bản nháp này.');
}

export async function calculateUsageCost(input: UsageInput, session: ClientSession) {
  if (input.kind !== 'analysis') return { units: 1 };

  const version = await ContractVersionModel.findOne({ contractId: input.contractId })
    .sort({ versionNumber: -1 })
    .session(session);
  if (!version || (input.versionId && version.id !== input.versionId)) {
    throw AppError.conflict(
      'Phiên bản hợp đồng đã thay đổi. Vui lòng tải lại trước khi rà soát.',
      'REVIEW_QUOTE_CHANGED',
    );
  }
  const quote = requireReviewCost(version);
  if (input.confirmedUnits !== undefined && input.confirmedUnits !== quote.units) {
    throw AppError.conflict(
      'Số lượt cần dùng đã thay đổi. Vui lòng kiểm tra lại trước khi rà soát.',
      'REVIEW_QUOTE_CHANGED',
    );
  }
  return { units: quote.units, pageCount: quote.pageCount!, versionId: version.id };
}

export async function assertNoActiveReview(input: UsageInput, session: ClientSession) {
  if (input.kind !== 'analysis') return;
  const active = await UsageRunModel.exists({
    orgId: input.orgId,
    contractId: input.contractId,
    kind: 'analysis',
    status: 'reserved',
  }).session(session);
  if (active) {
    throw AppError.conflict(
      'Hợp đồng đang được rà soát. Vui lòng chờ yêu cầu hiện tại hoàn tất.',
      'REVIEW_RUNNING',
    );
  }
}
