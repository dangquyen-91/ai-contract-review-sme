import { AppError } from '../errors/AppError';
import { ContractModel } from '../models/contract.model';
import { OrganizationModel } from '../models/organization.model';
import { UserModel } from '../models/user.model';
import {
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from '../validations/organization.validation';

function ensureOrganizationAccess(organizationId: string, userOrganizationId: string) {
  if (organizationId !== userOrganizationId) throw AppError.forbidden();
}

export async function createOrganization(userId: string, input: CreateOrganizationInput) {
  const user = await UserModel.findById(userId).select('orgId');
  if (!user) throw AppError.notFound('User not found');
  if (user.orgId) throw AppError.conflict('User already belongs to an organization');

  const organization = await OrganizationModel.create(input);
  const updatedUser = await UserModel.findOneAndUpdate(
    { _id: userId, orgId: null },
    { $set: { orgId: organization._id } },
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

  const [organization, hasContracts, memberCount] = await Promise.all([
    OrganizationModel.exists({ _id: organizationId }),
    ContractModel.exists({ orgId: organizationId }),
    UserModel.countDocuments({ orgId: organizationId }),
  ]);

  if (!organization) throw AppError.notFound('Organization not found');
  if (hasContracts) throw AppError.conflict('Organization still has contracts');
  if (memberCount > 1) throw AppError.conflict('Organization still has other members');

  const detachedUser = await UserModel.findOneAndUpdate(
    { _id: userId, orgId: organizationId },
    { $unset: { orgId: 1 } },
  );
  if (!detachedUser) throw AppError.forbidden();

  const deleted = await OrganizationModel.findByIdAndDelete(organizationId);
  if (!deleted) {
    await UserModel.updateOne({ _id: userId, orgId: null }, { $set: { orgId: organizationId } });
    throw AppError.notFound('Organization not found');
  }
}
