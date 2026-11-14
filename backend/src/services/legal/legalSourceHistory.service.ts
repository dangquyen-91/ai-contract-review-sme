import { ClientSession, Types } from 'mongoose';
import { logger } from '../../config/logger';
import { LEGAL_SOURCE_EVENT_ACTIONS, LegalSourceEventModel } from '../../models/legalSourceEvent.model';
import { LegalSourceModel } from '../../models/legalSource.model';
import { UserModel } from '../../models/user.model';
import { AppError } from '../../errors/AppError';

export interface LegalActor {
  id: string;
  role: string;
}

export type LegalSourceEventAction = (typeof LEGAL_SOURCE_EVENT_ACTIONS)[number];

export interface LegalSourceEventInput {
  source: { _id: Types.ObjectId | string; code: string; title: string };
  action: LegalSourceEventAction;
  actor: LegalActor;
  details?: Record<string, unknown>;
}

const eventDocument = ({ source, action, actor, details }: LegalSourceEventInput) => ({
  legalSourceId: source._id,
  code: source.code,
  title: source.title,
  action,
  actorId: actor.id,
  actorRole: actor.role,
  details,
});

export async function recordLegalSourceEvent(input: LegalSourceEventInput, session?: ClientSession) {
  if (session) {
    await LegalSourceEventModel.create([eventDocument(input)], { session });
    return;
  }
  try {
    await LegalSourceEventModel.create(eventDocument(input));
  } catch (err) {
    logger.error('Failed to record a legal source history event', {
      legalSourceId: String(input.source._id),
      action: input.action,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

function comparable(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Types.ObjectId) return value.toString();
  if (Array.isArray(value)) return value.map(comparable);
  if (typeof value === 'object') {
    const plain = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(plain)
        .filter((key) => key !== '_id' && plain[key] !== undefined)
        .sort()
        .map((key) => [key, comparable(plain[key])]),
    );
  }
  return value;
}

export function fieldChanges(before: Record<string, unknown>, after: Record<string, unknown>) {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const [field, value] of Object.entries(after)) {
    const from = comparable(before[field]);
    const to = comparable(value);
    if (JSON.stringify(from) !== JSON.stringify(to)) changes[field] = { from, to };
  }
  return changes;
}

export interface LegalSourceHistoryQuery {
  page: number;
  limit: number;
  action?: LegalSourceEventAction;
}

export async function actorsById(ids: unknown[]) {
  const unique = [...new Set(ids.filter(Boolean).map(String))];
  if (unique.length === 0) return new Map<string, { id: string; name: string; email: string }>();
  const users = await UserModel.find({ _id: { $in: unique } }).select('name email').lean();
  return new Map(users.map((user) => [String(user._id), { id: String(user._id), name: user.name, email: user.email }]));
}

export async function listLegalSourceHistory(legalSourceId: string, { page, limit, action }: LegalSourceHistoryQuery) {
  const filter = { legalSourceId: new Types.ObjectId(legalSourceId), ...(action ? { action } : {}) };
  const [events, total, exists] = await Promise.all([
    LegalSourceEventModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    LegalSourceEventModel.countDocuments(filter),
    LegalSourceEventModel.exists({ legalSourceId: filter.legalSourceId }),
  ]);
  if (!exists && !(await LegalSourceModel.exists({ _id: filter.legalSourceId }))) {
    throw AppError.notFound('Legal source not found');
  }
  const actors = await actorsById(events.map((event) => event.actorId));
  const items = events.map((event) => ({
    _id: String(event._id),
    action: event.action,
    code: event.code,
    title: event.title,
    actor: actors.get(String(event.actorId)) ?? { id: String(event.actorId), name: null, email: null },
    actorRole: event.actorRole,
    details: event.details ?? {},
    createdAt: event.createdAt,
  }));
  return { items, total };
}
