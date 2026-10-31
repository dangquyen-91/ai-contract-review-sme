import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserModel } from '../../models/user.model';
import { logger } from '../../config/logger';
import { AppError } from '../../errors/AppError';
import { ensureEmailConfigured, sendEmail } from '../email/email.service';
import { activateChallenge, attemptChallenge, issueChallenge, OtpPolicy } from './otpChallenge.service';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const MAX_ATTEMPTS = 5;

const POLICY: OtpPolicy = {
  namespace: 'password-reset',
  purpose: 'password-reset',
  codeLifetimeMs: 10 * MINUTE_MS,
  retentionMs: 10 * MINUTE_MS,
  cooldownMs: MINUTE_MS,
  sendWindowMs: HOUR_MS,
  maxSendsPerWindow: 5,
  maxAttempts: MAX_ATTEMPTS,
};

interface PendingReset {
  userId: string | null;
  authVersion: number;
}

const invalid = () =>
  AppError.badRequest('Mã xác minh không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu mã mới.');
const tooManyAttempts = () =>
  new AppError('Đã nhập sai mã quá nhiều lần. Vui lòng yêu cầu mã mới.', 429);

async function deliverResetCode(email: string, challengeId: string, code: string) {
  try {
    await sendEmail({
      to: email,
      subject: 'Mã đặt lại mật khẩu — LawScan',
      text: `Mã đặt lại mật khẩu của bạn: ${code}\n\nMã có hiệu lực trong 10 phút và chỉ dùng được một lần. Không chia sẻ mã với bất kỳ ai. Nếu bạn không yêu cầu đổi mật khẩu, hãy bỏ qua email này.`,
    });
    await activateChallenge(POLICY, challengeId, code);
  } catch {
    logger.warn('Password reset email delivery failed');
  }
}

export async function requestPasswordReset(email: string) {
  ensureEmailConfigured();
  const user = await UserModel.findOne({ email, isActive: true });
  const outcome = await issueChallenge<PendingReset>(POLICY, {
    email,
    data: { userId: user?.id ?? null, authVersion: user?.authVersion ?? 0 },
  });
  if (outcome.status !== 'issued') {
    throw outcome.status === 'cooldown'
      ? new AppError('Vui lòng đợi 60 giây trước khi yêu cầu mã mới.', 429)
      : new AppError('Đã hết lượt gửi mã. Vui lòng thử lại sau một giờ.', 429);
  }

  if (user) void deliverResetCode(email, outcome.challengeId, outcome.code);
  return {
    challengeId: outcome.challengeId,
    expiresAt: outcome.expiresAt,
    resendAfterSeconds: 60,
    message: 'Nếu email thuộc tài khoản đang hoạt động, bạn sẽ nhận được mã đặt lại mật khẩu.',
  };
}

export async function resetPassword(challengeId: string, code: string, password: string) {
  const attempt = await attemptChallenge<PendingReset>(POLICY, challengeId, code, {
    notReadyIsWrong: true,
  });
  if (attempt.status === 'locked') throw tooManyAttempts();
  if (attempt.status === 'wrong') throw attempt.attempts >= MAX_ATTEMPTS ? tooManyAttempts() : invalid();
  if (attempt.status !== 'ok' || !attempt.data.userId) throw invalid();

  const { email, data: pending } = attempt;
  const passwordHash = await bcrypt.hash(password, 10);
  await mongoose.connection.transaction(async (session) => {
    const user = await UserModel.findOne({ _id: pending.userId, email, isActive: true }).session(
      session,
    );
    if (!user || (user.authVersion ?? 0) !== pending.authVersion) throw invalid();
    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash,
          hasPassword: true,
          emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
        },
        $inc: { authVersion: 1, permissionsVersion: 1 },
      },
      { session },
    );
  });
  return { reset: true };
}
