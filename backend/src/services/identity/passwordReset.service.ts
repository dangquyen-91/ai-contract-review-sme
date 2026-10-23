import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { PasswordResetModel } from '../../models/passwordReset.model';
import { UserModel } from '../../models/user.model';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { AppError } from '../../errors/AppError';
import { ensureEmailConfigured, sendEmail } from '../email/email.service';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const otpHash = (challenge: string, code: string) =>
  createHmac('sha256', env.JWT_ACCESS_SECRET)
    .update(`password-reset:${challenge}:${code}`)
    .digest('hex');
const invalid = () =>
  AppError.badRequest('Mã xác minh không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu mã mới.');

export async function requestPasswordReset(email: string) {
  ensureEmailConfigured();
  const challengeId = randomBytes(32).toString('hex');
  const challengeHash = hash(challengeId);
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * MINUTE);
  const user = await UserModel.findOne({ email, isActive: true, emailVerifiedAt: { $ne: null } });
  try {
    // Keep the same throttling and public response for registered and unknown addresses.
    await mongoose.connection.transaction(async (session) => {
      const stored = await PasswordResetModel.findOneAndUpdate(
        { email },
        { $setOnInsert: { email, purgeAt: new Date(now.getTime() + 24 * HOUR) } },
        { upsert: true, new: true, session },
      );
      if (stored.lastSentAt && now.getTime() - stored.lastSentAt.getTime() < MINUTE) {
        throw new AppError('Vui lòng đợi 60 giây trước khi yêu cầu mã mới.', 429);
      }
      if (!stored.windowStartedAt || now.getTime() - stored.windowStartedAt.getTime() >= HOUR) {
        stored.windowStartedAt = now;
        stored.sentCount = 0;
      }
      if (stored.sentCount >= 5)
        throw new AppError('Đã hết lượt gửi mã. Vui lòng thử lại sau một giờ.', 429);
      stored.set({
        challengeHash,
        otpHash: otpHash(challengeHash, code),
        userId: user?._id ?? null,
        authVersion: user?.authVersion ?? 0,
        expiresAt,
        lastSentAt: now,
        attempts: 0,
        ready: false,
        consumed: false,
        purgeAt: new Date(now.getTime() + 24 * HOUR),
      });
      stored.sentCount += 1;
      await stored.save({ session });
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000)
      throw new AppError('Yêu cầu đang được xử lý. Vui lòng thử lại sau.', 429);
    throw error;
  }
  if (user) {
    try {
      await sendEmail({
        to: email,
        subject: 'Mã đặt lại mật khẩu — LawScan',
        text: `Mã đặt lại mật khẩu của bạn: ${code}\n\nMã có hiệu lực trong 10 phút và chỉ dùng được một lần. Không chia sẻ mã với bất kỳ ai. Nếu bạn không yêu cầu đổi mật khẩu, hãy bỏ qua email này.`,
      });
      await PasswordResetModel.updateOne(
        { email, challengeHash, consumed: false },
        { $set: { ready: true } },
      );
    } catch {
      // Do not disclose whether the account exists, even when email delivery fails.
      logger.warn('Password reset email delivery failed');
    }
  }
  return {
    challengeId,
    expiresAt,
    resendAfterSeconds: 60,
    message: 'Nếu email đã được đăng ký và xác minh, bạn sẽ nhận được mã đặt lại mật khẩu.',
  };
}

export async function resetPassword(challengeId: string, code: string, password: string) {
  const challengeHash = hash(challengeId);
  const outcome = await mongoose.connection.transaction(async (session) => {
    const stored = await PasswordResetModel.findOne({ challengeHash })
      .select('+challengeHash +otpHash')
      .session(session);
    if (!stored || stored.consumed || !stored.expiresAt || stored.expiresAt <= new Date()) {
      return { error: invalid() };
    }
    if (stored.attempts >= 5)
      return { error: new AppError('Đã nhập sai mã quá nhiều lần. Vui lòng yêu cầu mã mới.', 429) };
    const expected = Buffer.from(stored.otpHash ?? '', 'hex');
    const supplied = Buffer.from(otpHash(challengeHash, code), 'hex');
    if (
      expected.length !== supplied.length ||
      !timingSafeEqual(expected, supplied) ||
      !stored.ready ||
      !stored.userId
    ) {
      stored.attempts += 1;
      await stored.save({ session });
      return {
        error:
          stored.attempts >= 5
            ? new AppError('Đã nhập sai mã quá nhiều lần. Vui lòng yêu cầu mã mới.', 429)
            : invalid(),
      };
    }
    const user = await UserModel.findOne({
      _id: stored.userId,
      email: stored.email,
      isActive: true,
      emailVerifiedAt: { $ne: null },
    }).session(session);
    if (!user || (user.authVersion ?? 0) !== stored.authVersion) return { error: invalid() };
    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: { passwordHash: await bcrypt.hash(password, 10) },
        $inc: { authVersion: 1, permissionsVersion: 1 },
      },
      { session },
    );
    stored.consumed = true;
    stored.otpHash = undefined;
    await stored.save({ session });
    return { error: undefined };
  });
  if (outcome.error) throw outcome.error;
  return { reset: true };
}
