import { asyncHandler } from '../utils/asyncHandler';
import { ok, paginated } from '../utils/ApiResponse';
import { AppError } from '../errors/AppError';
import * as service from '../services/organization/invitation.service';
import { tokensForUser } from '../services/identity/auth.service';
import { toPublicUser } from './auth.controller';
import { invitationPaginationSchema } from '../validations/invitation.validation';

export const createInvitationHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized();
  ok(res, await service.createInvitation(req.user.sub, req.params.id, req.body), 201);
});
export const listInvitationsHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized();
  const { page, limit } = invitationPaginationSchema.parse(req.query);
  const { items, total } = await service.listInvitations(req.user.sub, req.params.id, page, limit);
  paginated(res, items, { page, limit, total });
});
export const revokeInvitationHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized();
  ok(res, await service.revokeInvitation(req.user.sub, req.params.id, req.params.invitationId));
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
  await service.removeMember(req.user.sub, req.params.id, req.params.userId);
  res.status(204).send();
});
export const acceptInvitationHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized();
  const user = await service.acceptInvitation(req.user.sub, req.body.token);
  res.setHeader('Cache-Control', 'no-store');
  ok(res, { user: toPublicUser(user), ...tokensForUser(user) });
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
  ok(res, { user: toPublicUser(user), ...tokensForUser(user) });
});
export const declineReceivedInvitationHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized();
  await service.declineReceivedInvitation(req.user.sub, req.params.invitationId);
  ok(res, { declined: true });
});
