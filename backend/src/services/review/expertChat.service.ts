import mongoose, { ClientSession, HydratedDocument } from 'mongoose';
import { AccessTokenPayload } from '../../middlewares/auth.middleware';
import { AppError } from '../../errors/AppError';
import { ContractModel } from '../../models/contract.model';
import { ExpertReviewModel } from '../../models/expertReview.model';
import { ExpertWorkRecordModel } from '../../models/expertWorkRecord.model';
import { ExpertChatMessage, ExpertChatMessageModel } from '../../models/expertChatMessage.model';
import { UserModel } from '../../models/user.model';
import { ExpertChatQuery, SendExpertMessage } from '../../validations/expertChat.validation';

async function conversation(
  actor: AccessTokenPayload,
  reviewId: string,
  attempt?: number,
  db?: ClientSession,
) {
  const current = await ExpertReviewModel.findOne({ reviewId }).session(db ?? null);
  const missing = () => AppError.notFound('Không tìm thấy cuộc trò chuyện.');
  if (!current) throw missing();
  const selectedAttempt = attempt ?? current.attempt;
  const record =
    selectedAttempt === current.attempt
      ? current
      : await ExpertWorkRecordModel.findOne({
          expertReviewId: current._id,
          attempt: selectedAttempt,
        }).session(db ?? null);
  if (
    !record ||
    !(await ContractModel.exists({ _id: current.contractId, orgId: current.orgId }).session(
      db ?? null,
    ))
  )
    throw missing();

  let senderType: 'requester' | 'expert';
  if (actor.role === 'expert' && record.expertId?.toString() === actor.sub) {
    senderType = 'expert';
  } else {
    const scope = actor.role === 'user' ? actor.sub : actor.orgId;
    if (
      !['owner', 'staff', 'user'].includes(actor.role) ||
      scope !== current.orgId.toString() ||
      record.requestedBy.toString() !== actor.sub
    )
      throw missing();
    senderType = 'requester';
  }
  return {
    current,
    attempt: selectedAttempt,
    senderType,
    status: record.status,
    canSend:
      selectedAttempt === current.attempt &&
      current.status === 'in_progress' &&
      Boolean(current.expertId),
  };
}

function messageView(message: HydratedDocument<ExpertChatMessage>, senderName?: string) {
  return {
    id: message.id,
    attempt: message.attempt,
    senderId: String(message.senderId),
    senderType: message.senderType,
    senderName: senderName ?? null,
    clientMessageId: message.clientMessageId,
    content: message.content,
    createdAt: message.createdAt,
  };
}

export async function listExpertMessages(
  actor: AccessTokenPayload,
  reviewId: string,
  query: ExpertChatQuery,
) {
  const access = await conversation(actor, reviewId, query.attempt);
  const scope = { expertReviewId: access.current._id, attempt: access.attempt };
  const cursorId = query.before ?? query.after;
  const cursor = cursorId
    ? await ExpertChatMessageModel.findOne({ ...scope, _id: cursorId }).select('sequence')
    : null;
  if (cursorId && !cursor)
    throw AppError.badRequest('Con trỏ tin nhắn không thuộc cuộc trò chuyện này.');
  const messages = await ExpertChatMessageModel.find({
    ...scope,
    ...(cursor && query.before
      ? { sequence: { $lt: cursor.sequence } }
      : cursor && query.after
        ? { sequence: { $gt: cursor.sequence } }
        : {}),
  })
    .sort({ sequence: query.after ? 1 : -1 })
    .limit(query.limit + 1);
  const hasMore = messages.length > query.limit;
  const page = messages.slice(0, query.limit);
  if (!query.after) page.reverse();
  const senders = await UserModel.find({ _id: { $in: page.map((message) => message.senderId) } }).select('name').lean();
  const names = new Map(senders.map((sender) => [String(sender._id), sender.name]));
  return {
    attempt: access.attempt,
    status: access.status,
    canSend: access.canSend,
    items: page.map((message) => messageView(message, names.get(String(message.senderId)))),
    hasMore,
    nextBefore: page[0]?.id ?? null,
    nextAfter: page[page.length - 1]?.id ?? null,
  };
}

export async function sendExpertMessage(
  actor: AccessTokenPayload,
  reviewId: string,
  input: SendExpertMessage,
) {
  await ExpertChatMessageModel.init();
  return mongoose.connection.transaction(async (db) => {
    const access = await conversation(actor, reviewId, input.attempt, db);
    const sender = await UserModel.findById(actor.sub).select('name').session(db);
    const key = {
      expertReviewId: access.current._id,
      attempt: input.attempt,
      senderId: actor.sub,
      clientMessageId: input.clientMessageId,
    };
    const previous = await ExpertChatMessageModel.findOne(key).session(db);
    if (previous) {
      if (previous.content !== input.content)
        throw AppError.conflict(
          'Mã tin nhắn đã được dùng cho nội dung khác.',
          'MESSAGE_ID_CONFLICT',
        );
      return { message: messageView(previous, sender?.name), replayed: true };
    }
    if (!access.canSend)
      throw AppError.conflict(
        'Chỉ có thể gửi tin nhắn khi chuyên gia đang xác minh.',
        'EXPERT_CHAT_CLOSED',
      );
    // Serialize sending against completion, return, reopening and reassignment.
    const locked = await ExpertReviewModel.findOneAndUpdate(
      {
        _id: access.current._id,
        attempt: input.attempt,
        status: 'in_progress',
        requestedBy: access.current.requestedBy,
        expertId: access.current.expertId,
      },
      { $inc: { __v: 1, chatSequence: 1 } },
      { session: db, new: true },
    );
    if (!locked)
      throw AppError.conflict(
        'Yêu cầu xác minh đã thay đổi. Vui lòng tải lại.',
        'EXPERT_CHAT_CLOSED',
      );
    const [message] = await ExpertChatMessageModel.create(
      [
        {
          ...key,
          sequence: locked.chatSequence,
          contractId: access.current.contractId,
          senderType: access.senderType,
          content: input.content,
        },
      ],
      { session: db },
    );
    return { message: messageView(message, sender?.name), replayed: false };
  });
}
