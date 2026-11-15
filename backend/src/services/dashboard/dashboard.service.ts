import { Types } from 'mongoose';
import type { AccessTokenPayload } from '../../middlewares/auth.middleware';
import { AppError } from '../../errors/AppError';
import { ContractModel } from '../../models/contract.model';
import { ContractVersionModel } from '../../models/contractVersion.model';
import { UserModel } from '../../models/user.model';
import { listContracts } from '../contract/contract.service';
import { getOrganization } from '../organization/organization.service';

type ContractCount = {
  _id: { status: string; risk: string | null };
  count: number;
};

async function countContracts(scopeId: string) {
  return ContractModel.aggregate<ContractCount>([
    { $match: { orgId: new Types.ObjectId(scopeId) } },
    {
      $lookup: {
        from: ContractVersionModel.collection.name,
        let: { contractId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$contractId', '$$contractId'] } } },
          { $sort: { versionNumber: -1 } },
          { $limit: 1 },
          { $project: { overallRiskLevel: 1 } },
        ],
        as: 'version',
      },
    },
    {
      $group: {
        _id: {
          status: '$status',
          risk: { $ifNull: [{ $arrayElemAt: ['$version.overallRiskLevel', 0] }, null] },
        },
        count: { $sum: 1 },
      },
    },
  ]);
}

export async function getDashboard(actor: AccessTokenPayload) {
  if (!['owner', 'staff', 'user'].includes(actor.role)) throw AppError.forbidden();
  const personal = !actor.orgId && actor.role === 'user';
  if (!actor.orgId && !personal) throw AppError.forbidden('Organization setup required');
  if (!personal && !['owner', 'staff'].includes(actor.role)) {
    throw AppError.forbidden('Chỉ Owner và Staff thuộc không gian tổ chức.');
  }
  const scopeId = actor.orgId ?? actor.sub;
  const [organization, recent, counts, user] = await Promise.all([
    personal ? null : getOrganization(scopeId, scopeId),
    listContracts(scopeId, {}, { page: 1, limit: 10, skip: 0, sortBy: 'updatedAt', sortOrder: -1 }),
    countContracts(scopeId),
    UserModel.findById(actor.sub).select('name email').lean(),
  ]);
  const statuses = { uploaded: 0, processing: 0, reviewed: 0, archived: 0 };
  const risks = { high: 0, medium: 0, low: 0, none: 0 };
  let totalContracts = 0;
  for (const { _id, count } of counts) {
    totalContracts += count;
    if (Object.hasOwn(statuses, _id.status)) statuses[_id.status as keyof typeof statuses] += count;
    if (_id.risk && Object.hasOwn(risks, _id.risk)) risks[_id.risk as keyof typeof risks] += count;
  }
  return {
    contractScopeId: scopeId,
    organization: organization
      ? {
          id: organization.id,
          name: organization.name,
          taxCode: organization.taxCode ?? null,
          address: organization.address ?? null,
          addressDetails: organization.addressDetails ?? null,
          industry: organization.industry ?? null,
          createdAt: organization.createdAt,
          updatedAt: organization.updatedAt,
        }
      : { id: '', name: 'Tài khoản cá nhân', taxCode: null, address: null },
    contracts: recent.items.map((contract) => ({
      ...contract,
      overallRiskLevel: contract.currentVersion?.overallRiskLevel ?? 'none',
      fileName: contract.currentVersion?.fileName,
    })),
    totalContracts,
    ...(actor.role === 'staff' ? { distribution: { statuses, risks } } : {}),
    stats: { processing: statuses.processing, reviewed: statuses.reviewed, highRisk: risks.high },
    role: actor.role,
    user: user ? { name: user.name, email: user.email } : null,
  };
}
