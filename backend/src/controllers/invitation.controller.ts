import { asyncHandler } from '../utils/asyncHandler';
import { ok, paginated } from '../utils/ApiResponse';
import { AppError } from '../errors/AppError';
import * as service from '../services/organization/invitation.service';
import { sessionFor } from '../services/identity/auth.service';
import { sessionResponse } from './auth.controller';
import { invitationPaginationSchema } from '../validations/invitation.validation';
import { recordAudit, requestActor } from '../services/audit/audit.service';
import { UserModel } from '../models/user.model';

export const createInvitationHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized();
  const invitation = await service.createInvitation(req.user.sub, req.params.id, req.body);
  await recordAudit({ action: 'invitation.create', actor: requestActor(req.user), orgId: req.params.id, target: { type: 'invitation', id: String(invitation.id ?? ''), label: req.body.email }, changes: { role: req.body.role ?? 'staff' } });
  ok(res, invitation, 201);
});
export const listInvitationsHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized();
  const { page, limit } = invitationPaginationSchema.parse(req.query);
  const { items, total } = await service.listInvitations(req.user.sub, req.params.id, page, limit);
  paginated(res, items, { page, limit, total });
});
export const revokeInvitationHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized();
  const invitation = await service.revokeInvitation(req.user.sub, req.params.id, req.params.invitationId);
  await recordAudit({ action: 'invitation.revoke', actor: requestActor(req.user), orgId: req.params.id, target: { type: 'invitation', id: req.params.invitationId, label: (invitation as { email?: string } | undefined)?.email ?? null } });
  ok(res, invitation);
});
export const listMembersHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized();
  const { page, limit } = invitationPaginationSchema.parse(req.query);
  const { items, total } = await service.listMembers(req.user.sub, req.params.id, page, limit);
  paginated(res, items, { page, limit, total });
});
export const previewInvitationHandler = asyncHandler(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  ok(res, await service.previewInvitation(req.body.token));
});
export const removeMemberHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized();
  const member = await UserModel.findById(req.params.userId).select('email').lean();
  await service.removeMember(req.user.sub, req.params.id, req.params.userId);
  await recordAudit({ action: 'member.remove', actor: requestActor(req.user), orgId: req.params.id, target: { type: 'user', id: req.params.userId, label: member?.email ?? null } });
  res.status(204).send();
});
export const leaveOrganizationHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized();
  await service.leaveOrganization(req.user.sub, req.params.id);
  res.status(204).send();
});
export const acceptInvitationHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized();
  const user = await service.acceptInvitation(req.user.sub, req.body.token);
  res.setHeader('Cache-Control', 'no-store');
  ok(res, sessionResponse(await sessionFor(user)));
});

export const listReceivedInvitationsHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized();
  res.setHeader('Cache-Control', 'no-store');
  ok(res, await service.listReceivedInvitations(req.user.sub));
});
export const acceptReceivedInvitationHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized();
  const user = await service.acceptInvitation(req.user.sub, undefined, req.params.invitationId);
  res.setHeader('Cache-Control', 'no-store');
  ok(res, sessionResponse(await sessionFor(user)));
});
export const declineReceivedInvitationHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized();
  await service.declineReceivedInvitation(req.user.sub, req.params.invitationId);
  ok(res, { declined: true });
});
