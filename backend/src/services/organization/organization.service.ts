import { AppError } from '../../errors/AppError';
import mongoose from 'mongoose';
import { OrganizationInvitationModel } from '../../models/organizationInvitation.model';
import { ContractModel } from '../../models/contract.model';
import { OrganizationModel } from '../../models/organization.model';
import { IndustryModel } from '../../models/industry.model';
import { UserModel } from '../../models/user.model';
import { MembershipModel } from '../../models/membership.model';
import { countMembers } from '../identity/account.service';
import {
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from '../../validations/organization.validation';

function ensureOrganizationAccess(organizationId: string, userOrganizationId: string) {
  if (organizationId !== userOrganizationId) throw AppError.forbidden();
}

export async function createOrganization(userId: string, input: CreateOrganizationInput) {
  if (input.industry && !(await IndustryModel.exists({ code: input.industry }))) {
    throw AppError.badRequest('Ngành kinh doanh không hợp lệ. Vui lòng chọn lại.');
  }
  try {
    return await mongoose.connection.transaction(async (session) => {
      const user = await UserModel.findOneAndUpdate(
        { _id: userId, isActive: true, platformRole: null },
        { $set: { hasCompletedOnboarding: true }, $inc: { permissionsVersion: 1 } },
        { new: true, session },
      );
      if (!user) throw AppError.notFound('User not found');
      if (await MembershipModel.exists({ userId }).session(session)) {
        throw AppError.conflict('User already belongs to an organization');
      }
      const [organization] = await OrganizationModel.create([input], { session });
      await MembershipModel.create([{ userId, orgId: organization._id, role: 'owner' }], { session });
      return organization;
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      throw AppError.conflict('User already belongs to an organization');
    }
    throw error;
  }
}

export async function listOrganizations(page: number, limit: number, filters: { search?: string; industry?: string } = {}) {
  const query: mongoose.FilterQuery<InstanceType<typeof OrganizationModel>> = {};
  if (filters.search) {
    const search = new RegExp(filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ name: search }, { taxCode: search }];
  }
  if (filters.industry) query.industry = filters.industry;
  const [items, total] = await Promise.all([
    OrganizationModel.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    OrganizationModel.countDocuments(query),
  ]);
  return { items, total };
}

export async function getOrganization(organizationId: string, userOrganizationId: string) {
  ensureOrganizationAccess(organizationId, userOrganizationId);
  const organization = await OrganizationModel.findById(organizationId);
  if (!organization) throw AppError.notFound('Organization not found');
  return organization;
}

export async function updateOrganization(
  organizationId: string,
  userOrganizationId: string,
  input: UpdateOrganizationInput,
) {
  ensureOrganizationAccess(organizationId, userOrganizationId);

  if (input.industry && !(await IndustryModel.exists({ code: input.industry }))) {
    throw AppError.badRequest(`Unknown industry: ${input.industry}`);
  }
  const organization = await OrganizationModel.findByIdAndUpdate(
    organizationId,
    { $set: input },
    { new: true, runValidators: true },
  );
  if (!organization) throw AppError.notFound('Organization not found');
  return organization;
}

export async function deleteOrganization(
  organizationId: string,
  userOrganizationId: string,
  userId: string,
) {
  ensureOrganizationAccess(organizationId, userOrganizationId);

  await mongoose.connection.transaction(async (session) => {
    // Lock the organization before counting members; invitation acceptance writes it too.
    const organization = await OrganizationModel.findOneAndUpdate(
      { _id: organizationId },
      { $inc: { __v: 1 } },
      { session, new: true },
    );
    if (!organization) throw AppError.notFound('Organization not found');
    const hasContracts = await ContractModel.exists({ orgId: organizationId }).session(session);
    const memberCount = await countMembers(organizationId, session);
    if (hasContracts) throw AppError.conflict('Organization still has contracts');
    if (memberCount > 1) throw AppError.conflict('Organization still has other members');
    const detached = await MembershipModel.deleteOne(
      { userId, orgId: organizationId, role: 'owner' },
      { session },
    );
    if (!detached.deletedCount) throw AppError.forbidden();
    await UserModel.updateOne(
      { _id: userId },
      { $set: { hasCompletedOnboarding: true }, $inc: { permissionsVersion: 1 } },
      { session },
    );
    await OrganizationInvitationModel.updateMany(
      { orgId: organizationId, status: 'pending' },
      { $set: { status: 'revoked' } },
      { session },
    );
    await OrganizationModel.deleteOne({ _id: organizationId }, { session });
  });
}
