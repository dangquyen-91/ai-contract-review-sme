import type { FilterQuery } from 'mongoose';
import { logger } from '../../config/logger';
import { AUDIT_GROUPS, AuditAction, AuditEvent, AuditEventModel } from '../../models/auditEvent.model';
import { OrganizationModel } from '../../models/organization.model';
import { UserModel } from '../../models/user.model';
import { searchPattern } from '../../utils/regex';

export type AuditInput = {
  action: AuditAction;
  actor: { id?: string | null; role: string };
  target: { type: string; id?: string | null; label?: string | null };
  orgId?: string | null;
  changes?: Record<string, unknown>;
};

/**
 * Records a sensitive action. Auditing never blocks or fails the action itself: a
 * write error is logged and the caller carries on.
 */
export async function recordAudit(input: AuditInput) {
  try {
    await AuditEventModel.create({
      action: input.action,
      actorId: input.actor.id ?? null,
      actorRole: input.actor.role,
      target: { type: input.target.type, id: input.target.id ?? null, label: input.target.label ?? null },
      orgId: input.orgId ?? null,
      ...(input.changes && Object.keys(input.changes).length ? { changes: input.changes } : {}),
    });
  } catch (error) {
    logger.warn('Could not record an audit event', {
      action: input.action,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/** The signed-in person behind a request, as an audit actor. */
export const requestActor = (user?: { sub: string; role: string }) => ({ id: user?.sub ?? null, role: user?.role ?? 'system' });

export type AuditFilters = {
  group?: (typeof AUDIT_GROUPS)[number] | '';
  search?: string;
  from?: Date;
  to?: Date;
};

/** Audit events, newest first, with the actor's current name and email. */
export async function listAuditEvents(page: number, limit: number, filters: AuditFilters = {}) {
  const query: FilterQuery<AuditEvent> = {};
  if (filters.group) query.action = new RegExp(`^${filters.group}\\.`);
  if (filters.from || filters.to)
    query.createdAt = { ...(filters.from ? { $gte: filters.from } : {}), ...(filters.to ? { $lt: filters.to } : {}) };
  const search = filters.search?.trim();
  if (search) {
    const pattern = searchPattern(search);
    const actors = await UserModel.find({ $or: [{ name: pattern }, { email: pattern }] }).select('_id').limit(200).lean();
    query.$or = [{ actorId: { $in: actors.map((item) => item._id) } }, { 'target.label': pattern }];
  }
  const [events, total] = await Promise.all([
    AuditEventModel.find(query).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    AuditEventModel.countDocuments(query),
  ]);
  // A personal account's workspace id is its owner's user id.
  const workspaceIds = [...new Set(events.map((event) => event.orgId).filter(Boolean).map(String))];
  const [actors, organizations] = await Promise.all([
    UserModel.find({ _id: { $in: [...events.map((event) => event.actorId).filter(Boolean), ...workspaceIds] } })
      .select('name email')
      .lean(),
    OrganizationModel.find({ _id: { $in: workspaceIds } }).select('name').lean(),
  ]);
  const people = new Map(actors.map((item) => [String(item._id), item]));
  const orgNames = new Map(organizations.map((item) => [String(item._id), item.name]));
  const workspace = (orgId: string) =>
    orgNames.has(orgId)
      ? { id: orgId, type: 'organization' as const, name: orgNames.get(orgId)! }
      : { id: orgId, type: 'personal' as const, name: people.get(orgId)?.name ?? 'Tài khoản đã xóa' };
  const items = events.map((event) => {
    const person = event.actorId ? people.get(String(event.actorId)) : null;
    return {
      id: String(event._id),
      action: event.action,
      actor: {
        id: event.actorId ? String(event.actorId) : null,
        role: event.actorRole,
        name: person?.name ?? (event.actorId ? 'Tài khoản đã xóa' : 'Hệ thống'),
        email: person?.email ?? null,
      },
      target: event.target,
      orgId: event.orgId ? String(event.orgId) : null,
      organization: event.orgId ? workspace(String(event.orgId)) : null,
      changes: event.changes ?? null,
      createdAt: event.createdAt,
    };
  });
  return { items, total };
}
