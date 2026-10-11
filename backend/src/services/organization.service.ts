import { AppError } from '../errors/AppError';
import mongoose from 'mongoose';
import { OrganizationInvitationModel } from '../models/organizationInvitation.model';
import { ContractModel } from '../models/contract.model';
import { OrganizationModel } from '../models/organization.model';
import { UserModel } from '../models/user.model';
import { getRoleByCode } from './role.service';
import {
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from '../validations/organization.validation';

function ensureOrganizationAccess(organizationId: string, userOrganizationId: string) {
  if (organizationId !== userOrganizationId) throw AppError.forbidden();
}

export async function createOrganization(userId: string, input: CreateOrganizationInput) {
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
      { $set: { roleId: ownerRole._id } },
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
    const memberCount = await UserModel.countDocuments({ orgId: organizationId }).session(session);
    if (hasContracts) throw AppError.conflict('Organization still has contracts');
    if (memberCount > 1) throw AppError.conflict('Organization still has other members');
    const detachedUser = await UserModel.findOneAndUpdate(
      { _id: userId, orgId: organizationId },
      { $unset: { orgId: 1 } },
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
