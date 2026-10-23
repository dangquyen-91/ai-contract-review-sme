import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import mongoose from 'mongoose';
import { EmailVerificationModel } from '../../models/emailVerification.model';
import { UserModel } from '../../models/user.model';
import { env } from '../../config/env';
import { AppError } from '../../errors/AppError';
import { ensureEmailConfigured, sendEmail } from '../email/email.service';
import { getPendingInvitation } from '../organization/invitation.service';
import { getRoleByCode } from './role.service';

const LIFETIME_MS = 10 * 60_000;
const COOLDOWN_MS = 60_000;
const HOUR_MS = 60 * 60_000;
const MAX_ATTEMPTS = 5;
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const hashOtp = (challengeHash: string, code: string) =>
  createHmac('sha256', env.JWT_ACCESS_SECRET)
    .update(`email-verification:${challengeHash}:${code}`)
    .digest('hex');
const secrets = '+challengeHash +otpHash +passwordHash +invitationHash';

interface VerificationAccount {
  email: string;
  name: string;
  passwordHash: string;
  userId?: string;
  remember?: boolean;
  invitationToken?: string;
}

export async function startEmailVerification(account: VerificationAccount) {
  return issue(account);
}

export async function resendEmailVerification(challengeId: string, invitationToken?: string) {
  const stored = await EmailVerificationModel.findOne({
    challengeHash: hash(challengeId),
    consumed: false,
  }).select(secrets);
  if (!stored || !stored.passwordHash || !stored.name)
    throw AppError.badRequest('Verification request is no longer available. Start again.');
  if ((stored.invitationHash ?? '') !== (invitationToken ? hash(invitationToken) : '')) {
    throw AppError.badRequest('Invitation does not match this verification request');
  }
  if (invitationToken) await getPendingInvitation(invitationToken, stored.email);
  return issue(
    {
      email: stored.email,
      name: stored.name,
      passwordHash: stored.passwordHash,
      userId: stored.userId?.toString(),
      remember: stored.remember,
      invitationToken,
    },
    challengeId,
  );
}

async function issue(account: VerificationAccount, previousChallengeId?: string) {
  ensureEmailConfigured();
  const challengeId = previousChallengeId ?? randomBytes(32).toString('hex');
  const challengeHash = hash(challengeId);
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LIFETIME_MS);
  try {
    await mongoose.connection.transaction(async (session) => {
      const stored = await EmailVerificationModel.findOneAndUpdate(
        { email: account.email },
        { $setOnInsert: { email: account.email, purgeAt: new Date(now.getTime() + 24 * HOUR_MS) } },
        { session, upsert: true, new: true },
      ).select(secrets);
      if (
        previousChallengeId &&
        (stored.consumed || stored.challengeHash !== hash(previousChallengeId))
      ) {
        throw AppError.badRequest('Verification request is no longer available. Start again.');
      }
      if (stored.lastSentAt && now.getTime() - stored.lastSentAt.getTime() < COOLDOWN_MS) {
        throw new AppError('Please wait 60 seconds before requesting another code', 429);
      }
      if (!stored.windowStartedAt || now.getTime() - stored.windowStartedAt.getTime() >= HOUR_MS) {
        stored.windowStartedAt = now;
        stored.sentCount = 0;
      }
      if (stored.sentCount >= 5)
        throw new AppError('Email verification limit reached. Try again in one hour.', 429);
      stored.set({
        challengeHash,
        otpHash: hashOtp(challengeHash, code),
        name: account.name,
        passwordHash: account.passwordHash,
        userId: account.userId ?? null,
        invitationHash: account.invitationToken ? hash(account.invitationToken) : null,
        remember: account.remember === true,
        expiresAt,
        lastSentAt: now,
        attempts: 0,
        ready: false,
        consumed: false,
        purgeAt: new Date(now.getTime() + 24 * HOUR_MS),
      });
      stored.sentCount += 1;
      await stored.save({ session });
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000)
      throw new AppError(
        'A verification request is already being processed. Try again later.',
        429,
      );
    throw error;
  }
  await sendEmail({
    to: account.email,
    subject: 'Mã xác minh email — AI Contract Review',
    text: `Mã xác minh của bạn: ${code}\n\nMã có hiệu lực trong 10 phút. Không chia sẻ mã với người khác. Nếu bạn không yêu cầu, hãy bỏ qua email này.`,
  });
  const activated = await EmailVerificationModel.updateOne(
    { email: account.email, challengeHash, otpHash: hashOtp(challengeHash, code), consumed: false },
    { $set: { ready: true } },
  );
  if (!activated.matchedCount)
    throw AppError.conflict('A newer verification request exists. Use the latest code.');
  return {
    verificationRequired: true as const,
    challengeId,
    email: account.email,
    expiresAt,
    resendAfterSeconds: 60,
  };
}

export async function completeEmailVerification(
  challengeId: string,
  code: string,
  invitationToken?: string,
) {
  const challengeHash = hash(challengeId);
  const outcome = await mongoose.connection.transaction(async (session) => {
    const stored = await EmailVerificationModel.findOne({ challengeHash })
      .select(secrets)
      .session(session);
    if (
      !stored ||
      stored.consumed ||
      !stored.ready ||
      !stored.expiresAt ||
      stored.expiresAt <= new Date()
    ) {
      return {
        error: AppError.badRequest('Verification code expired or unavailable. Request a new code.'),
      };
    }
    if ((stored.invitationHash ?? '') !== (invitationToken ? hash(invitationToken) : '')) {
      return { error: AppError.badRequest('Invitation does not match this verification request') };
    }
    if (stored.attempts >= MAX_ATTEMPTS)
      return { error: new AppError('Too many incorrect codes. Request a new code.', 429) };
    const expected = Buffer.from(stored.otpHash ?? '', 'hex');
    const supplied = Buffer.from(hashOtp(challengeHash, code), 'hex');
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
      stored.attempts += 1;
      await stored.save({ session });
      return {
        error: new AppError(
          stored.attempts >= MAX_ATTEMPTS
            ? 'Too many incorrect codes. Request a new code.'
            : 'Incorrect verification code',
          stored.attempts >= MAX_ATTEMPTS ? 429 : 400,
        ),
      };
    }
    if (invitationToken) await getPendingInvitation(invitationToken, stored.email, session);
    let user;
    if (stored.userId) {
      user = await UserModel.findOne({ _id: stored.userId, email: stored.email, isActive: true })
        .select('+passwordHash')
        .session(session);
      if (!user || user.passwordHash !== stored.passwordHash)
        return { error: AppError.unauthorized('Account changed. Sign in again.') };
      user.emailVerifiedAt = user.emailVerifiedAt ?? new Date();
      user.hasPassword = true;
      await user.save({ session });
    } else {
      if (await UserModel.exists({ email: stored.email }).session(session))
        return { error: AppError.conflict('Email already registered') };
      const role = await getRoleByCode('user');
      [user] = await UserModel.create(
        [
          {
            email: stored.email,
            name: stored.name,
            passwordHash: stored.passwordHash,
            hasPassword: true,
            roleId: role._id,
            emailVerifiedAt: new Date(),
          },
        ],
        { session },
      );
    }
    stored.consumed = true;
    stored.otpHash = undefined;
    stored.passwordHash = undefined;
    await stored.save({ session });
    await user.populate('roleId');
    return { user, remember: stored.remember };
  });
  if (outcome.error) throw outcome.error;
  return { user: outcome.user!, remember: outcome.remember === true };
}
