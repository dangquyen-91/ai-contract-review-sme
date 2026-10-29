import { AppError } from '../../errors/AppError';
import mongoose from 'mongoose';
import { OrganizationInvitationModel } from '../../models/organizationInvitation.model';
import { ContractModel } from '../../models/contract.model';
import { OrganizationModel } from '../../models/organization.model';
import { IndustryModel } from '../../models/industry.model';
import { UserModel } from '../../models/user.model';
import { getRoleByCode } from '../identity/role.service';
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
  const user = await UserModel.findById(userId).select('orgId roleId');
  if (!user) throw AppError.notFound('User not found');

  const ownerRole = await getRoleByCode('owner');
  if (user.orgId) {
    const personal = await OrganizationModel.findOne({ _id: user.orgId, isPersonal: true });
    if (!personal) throw AppError.conflict('User already belongs to an organization');
    const organization = await OrganizationModel.findOneAndUpdate(
      { _id: personal._id, isPersonal: true },
      { $set: { ...input, isPersonal: false } },
      { new: true, runValidators: true },
    );
    if (!organization) throw AppError.conflict('Organization has already been configured');
    await UserModel.updateOne(
      { _id: userId, orgId: personal._id },
      { $set: { roleId: ownerRole._id, hasCompletedOnboarding: true } },
    );
    return organization;
  }

  const organization = await OrganizationModel.create(input);
  const updatedUser = await UserModel.findOneAndUpdate(
    { _id: userId, orgId: null },
    {
      $set: {
        orgId: organization._id,
        roleId: ownerRole._id,
        hasCompletedOnboarding: true,
      },
    },
    { new: true },
  );

  if (!updatedUser) {
    await OrganizationModel.deleteOne({ _id: organization._id });
    throw AppError.conflict('User already belongs to an organization');
  }

  return organization;
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
    { $set: input, ...('address' in input ? { $unset: { addressDetails: 1 } } : {}) },
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
  const personalRole = await getRoleByCode('user');

  await mongoose.connection.transaction(async (session) => {
    // Lock the organization before counting members; invitation acceptance writes it too.
    const organization = await OrganizationModel.findOneAndUpdate(
      { _id: organizationId },
      { $inc: { __v: 1 } },
      { session, new: true },
    );
    if (!organization) throw AppError.notFound('Organization not found');
    const hasContracts = await ContractModel.exists({ orgId: organizationId }).session(session);
    const memberCount = await UserModel.countDocuments({ orgId: organizationId }).session(session);
    if (hasContracts) throw AppError.conflict('Organization still has contracts');
    if (memberCount > 1) throw AppError.conflict('Organization still has other members');
    const detachedUser = await UserModel.findOneAndUpdate(
      { _id: userId, orgId: organizationId },
      {
        $unset: { orgId: 1 },
        $set: { roleId: personalRole._id, hasCompletedOnboarding: true },
        $inc: { permissionsVersion: 1 },
      },
      { session },
    );
    if (!detachedUser) throw AppError.forbidden();
    await OrganizationInvitationModel.updateMany(
      { orgId: organizationId, status: 'pending' },
      { $set: { status: 'revoked' } },
      { session },
    );
    await OrganizationModel.deleteOne({ _id: organizationId }, { session });
  });
}
