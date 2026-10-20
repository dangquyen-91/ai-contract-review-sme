import { env } from '../../config/env';
import { AppError } from '../../errors/AppError';
import { ensureEmailConfigured, sendEmail } from '../email/email.service';

export function ensureInvitationEmailConfigured() {
  ensureEmailConfigured();
}

export async function sendInvitationEmail(input: {
  email: string;
  organizationName: string;
  role: string;
  token: string;
  expiresAt: Date;
}) {
  ensureInvitationEmailConfigured();
  const url = new URL(env.INVITATION_ACCEPT_URL);
  url.searchParams.set('token', input.token);
  try {
    await sendEmail({
      to: input.email,
      subject: 'Lời mời tham gia tổ chức — AI Contract Review',
      text: [
        `Bạn được mời tham gia tổ chức ${input.organizationName} với vai trò ${input.role}.`,
        `Đăng nhập hoặc đăng ký bằng email ${input.email}, sau đó chấp nhận lời mời:`,
        url.toString(),
        `Lời mời hết hạn lúc ${input.expiresAt.toISOString()}.`,
        'Nếu không mong đợi lời mời này, bạn có thể bỏ qua email.',
      ].join('\n\n'),
    });
  } catch {
    throw new AppError('Could not send invitation email. Please try again.', 502);
  }
}
