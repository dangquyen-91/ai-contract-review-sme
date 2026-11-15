import mongoose from 'mongoose';
import { UserModel } from '../../models/user.model';
import { AppError } from '../../errors/AppError';
import { ensureEmailConfigured, sendEmail } from '../email/email.service';
import { getPendingInvitation } from '../organization/invitation.service';
import { getRoleByCode } from './role.service';
import {
  activateChallenge,
  attemptChallenge,
  hashSecret,
  issueChallenge,
  OtpPolicy,
  readChallenge,
} from './otpChallenge.service';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const MAX_ATTEMPTS = 5;

const POLICY: OtpPolicy = {
  namespace: 'email-verification',
  purpose: 'email-verification',
  codeLifetimeMs: 10 * MINUTE_MS,
  retentionMs: 24 * HOUR_MS,
  cooldownMs: MINUTE_MS,
  sendWindowMs: HOUR_MS,
  maxSendsPerWindow: 5,
  maxAttempts: MAX_ATTEMPTS,
};

interface VerificationAccount {
  email: string;
  name: string;
  passwordHash: string;
  userId?: string;
  remember?: boolean;
  invitationToken?: string;
}

interface PendingAccount {
  name: string;
  passwordHash: string;
  userId?: string;
  remember: boolean;
}

const invitationBinding = (invitationToken?: string) =>
  invitationToken ? hashSecret(invitationToken) : '';
const unavailable = () =>
  AppError.badRequest('Verification request is no longer available. Start again.');
const invitationMismatch = () =>
  AppError.badRequest('Invitation does not match this verification request');
const tooManyAttempts = () => new AppError('Too many incorrect codes. Request a new code.', 429);

export async function startEmailVerification(account: VerificationAccount) {
  return issue(account);
}

export async function resendEmailVerification(challengeId: string, invitationToken?: string) {
  const stored = await readChallenge<PendingAccount>(POLICY, challengeId);
  if (!stored || !stored.data.passwordHash || !stored.data.name) throw unavailable();
  if (stored.bind !== invitationBinding(invitationToken)) throw invitationMismatch();
  if (invitationToken) await getPendingInvitation(invitationToken, stored.email);
  return issue(
    {
      email: stored.email,
      name: stored.data.name,
      passwordHash: stored.data.passwordHash,
      userId: stored.data.userId,
      remember: stored.data.remember,
      invitationToken,
    },
    challengeId,
  );
}

async function issue(account: VerificationAccount, previousChallengeId?: string) {
  ensureEmailConfigured();
  const outcome = await issueChallenge<PendingAccount>(POLICY, {
    email: account.email,
    data: {
      name: account.name,
      passwordHash: account.passwordHash,
      userId: account.userId,
      remember: account.remember === true,
    },
    bind: invitationBinding(account.invitationToken),
    previousChallengeId,
  });
  if (outcome.status !== 'issued') {
    if (outcome.status === 'stale') throw unavailable();
    throw outcome.status === 'cooldown'
      ? new AppError('Please wait 60 seconds before requesting another code', 429)
      : new AppError('Email verification limit reached. Try again in one hour.', 429);
  }

  await sendEmail({
    to: account.email,
    subject: 'Mã xác minh email — AI Contract Review',
    text: `Mã xác minh của bạn: ${outcome.code}\n\nMã có hiệu lực trong 10 phút. Không chia sẻ mã với người khác. Nếu bạn không yêu cầu, hãy bỏ qua email này.`,
  });
  if (!(await activateChallenge(POLICY, outcome.challengeId, outcome.code)))
    throw AppError.conflict('A newer verification request exists. Use the latest code.');
  return {
    verificationRequired: true as const,
    challengeId: outcome.challengeId,
    email: account.email,
    expiresAt: outcome.expiresAt,
    resendAfterSeconds: 60,
  };
}

export async function completeEmailVerification(
  challengeId: string,
  code: string,
  invitationToken?: string,
) {
  const attempt = await attemptChallenge<PendingAccount>(POLICY, challengeId, code, {
    bind: invitationBinding(invitationToken),
  });
  if (attempt.status === 'mismatch') throw invitationMismatch();
  if (attempt.status === 'locked') throw tooManyAttempts();
  if (attempt.status === 'wrong') {
    throw attempt.attempts >= MAX_ATTEMPTS
      ? tooManyAttempts()
      : AppError.badRequest('Incorrect verification code');
  }
  if (attempt.status !== 'ok')
    throw AppError.badRequest('Verification code expired or unavailable. Request a new code.');

  const { email, data: pending } = attempt;
  const user = await mongoose.connection.transaction(async (session) => {
    if (invitationToken) await getPendingInvitation(invitationToken, email, session);
    if (pending.userId) {
      const existing = await UserModel.findOne({ _id: pending.userId, email, isActive: true })
        .select('+passwordHash')
        .session(session);
      if (!existing || existing.passwordHash !== pending.passwordHash)
        throw AppError.unauthorized('Account changed. Sign in again.');
      existing.emailVerifiedAt = existing.emailVerifiedAt ?? new Date();
      existing.hasPassword = true;
      await existing.save({ session });
      return existing;
    }
    if (await UserModel.exists({ email }).session(session))
      throw AppError.conflict('Email already registered');
    const role = await getRoleByCode('user');
    const [created] = await UserModel.create(
      [
        {
          email,
          name: pending.name,
          passwordHash: pending.passwordHash,
          hasPassword: true,
          roleId: role._id,
          emailVerifiedAt: new Date(),
        },
      ],
      { session },
    );
    return created;
  });
  await user.populate('roleId');
  return { user, remember: pending.remember === true };
}
