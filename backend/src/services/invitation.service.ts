import { createHash, randomBytes } from 'crypto';
import mongoose, { ClientSession } from 'mongoose';
import { AppError } from '../errors/AppError';
import { OrganizationInvitationModel } from '../models/organizationInvitation.model';
import { OrganizationModel } from '../models/organization.model';
import { UserModel } from '../models/user.model';
import { Role } from '../models/role.model';
import { getRoleByCode } from './role.service';
import { ensureInvitationEmailConfigured, sendInvitationEmail } from './invitationEmail.service';
import { CreateInvitationInput } from '../validations/invitation.validation';

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

async function requireOwner(userId: string, orgId: string, session?: ClientSession) {
  const user = await UserModel.findOne({ _id: userId, orgId, isActive: true })
    .populate('roleId')
    .session(session ?? null);
  if (!user || (user.roleId as unknown as Role).code !== 'owner') {
    throw AppError.forbidden('Only the organization owner can manage invitations and members');
  }
  const org = await OrganizationModel.findById(orgId).session(session ?? null);
  if (!org) throw AppError.notFound('Organization not found');
  return org;
}

export async function getPendingInvitation(token: string, email?: string, session?: ClientSession) {
  const invitation = await OrganizationInvitationModel.findOne({
    tokenHash: hashToken(token),
    status: 'pending',
    expiresAt: { $gt: new Date() },
  }).session(session ?? null);
  if (!invitation)
    throw AppError.badRequest('Invitation is invalid, expired, revoked or already used');
  if (email !== undefined && invitation.email !== email.trim().toLowerCase()) {
    throw AppError.forbidden('Sign in with the email address that received the invitation');
  }
  const organization = await OrganizationModel.findById(invitation.orgId).session(session ?? null);
  if (!organization) throw AppError.badRequest('The invited organization no longer exists');
  return { invitation, organization };
}

export async function previewInvitation(token: string) {
  const { invitation, organization } = await getPendingInvitation(token);
  return {
    organizationName: organization.name,
    email: invitation.email,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
  };
}

export async function createInvitation(
  userId: string,
  orgId: string,
  input: CreateInvitationInput,
) {
  const organization = await requireOwner(userId, orgId);
  ensureInvitationEmailConfigured();
  const existing = await UserModel.findOne({ email: input.email });
  if (existing?.orgId) {
    throw AppError.conflict(
      existing.orgId.toString() === orgId
        ? 'This user is already a member'
        : 'This user already belongs to another organization',
    );
  }
  await OrganizationInvitationModel.updateMany(
    {
      orgId,
      email: input.email,
      status: 'pending',
      expiresAt: { $lte: new Date() },
    },
    { $set: { status: 'expired' } },
  );
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  let invitation;
  try {
    invitation = await OrganizationInvitationModel.create({
      orgId,
      email: input.email,
      role: input.role,
      invitedBy: userId,
      tokenHash: hashToken(token),
      expiresAt,
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      throw AppError.conflict(
        'A pending invitation already exists. Revoke it before sending another.',
      );
    }
    throw error;
  }
  try {
    await sendInvitationEmail({ ...input, organizationName: organization.name, token, expiresAt });
  } catch (error) {
    await OrganizationInvitationModel.updateOne(
      { _id: invitation._id, status: 'pending' },
      {
        $set: { status: 'delivery_failed' },
      },
    );
    throw error;
  }
  // Never return the raw token or its hash to the owner.
  return {
    id: invitation.id,
    orgId,
    email: input.email,
    role: input.role,
    status: invitation.status,
    expiresAt,
    createdAt: invitation.createdAt,
  };
}

export async function listInvitations(userId: string, orgId: string, page: number, limit: number) {
  await requireOwner(userId, orgId);
  const [items, total] = await Promise.all([
    OrganizationInvitationModel.find({ orgId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    OrganizationInvitationModel.countDocuments({ orgId }),
  ]);
  return {
    items: items.map((item) => ({
      ...item,
      status: item.status === 'pending' && item.expiresAt <= new Date() ? 'expired' : item.status,
    })),
    total,
  };
}

export async function revokeInvitation(userId: string, orgId: string, invitationId: string) {
  await requireOwner(userId, orgId);
  const invitation = await OrganizationInvitationModel.findOneAndUpdate(
    {
      _id: invitationId,
      orgId,
      status: 'pending',
    },
    { $set: { status: 'revoked' } },
    { new: true },
  );
  if (!invitation) throw AppError.conflict('Pending invitation not found');
  return invitation;
}

export async function listMembers(userId: string, orgId: string, page: number, limit: number) {
  await requireOwner(userId, orgId);
  const [users, total] = await Promise.all([
    UserModel.find({ orgId })
      .select('name email roleId isActive createdAt')
      .populate('roleId')
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    UserModel.countDocuments({ orgId }),
  ]);
  return {
    items: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: (user.roleId as unknown as Role).code,
      isActive: user.isActive,
    })),
    total,
  };
}

export async function acceptInvitation(userId: string, token: string) {
  return mongoose.connection.transaction(async (session) => {
    const user = await UserModel.findOne({ _id: userId, isActive: true }).session(session);
    if (!user) throw AppError.unauthorized();
    const { invitation } = await getPendingInvitation(token, user.email, session);
    if (user.orgId) {
      throw AppError.conflict(
        user.orgId.toString() === invitation.orgId.toString()
          ? 'You are already a member'
          : 'You already belong to another organization',
      );
    }
    const role = await getRoleByCode(invitation.role);
    // Writing the organization serializes acceptance against organization deletion.
    const organization = await OrganizationModel.findOneAndUpdate(
      { _id: invitation.orgId },
      { $inc: { __v: 1 } },
      { session, new: true },
    );
    if (!organization) throw AppError.conflict('Organization no longer exists');
    const consumed = await OrganizationInvitationModel.updateOne(
      {
        _id: invitation._id,
        status: 'pending',
        expiresAt: { $gt: new Date() },
      },
      { $set: { status: 'accepted', acceptedBy: user._id, acceptedAt: new Date() } },
      { session },
    );
    if (consumed.modifiedCount !== 1) throw AppError.conflict('Invitation is no longer available');
    const updated = await UserModel.findOneAndUpdate(
      { _id: userId, orgId: null, isActive: true },
      {
        $set: { orgId: invitation.orgId, roleId: role._id, hasCompletedOnboarding: true },
      },
      { new: true, session },
    ).populate('roleId');
    if (!updated) throw AppError.conflict('You already belong to an organization');
    return updated;
  });
}
