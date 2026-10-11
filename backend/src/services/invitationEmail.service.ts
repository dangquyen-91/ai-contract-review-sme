import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';

export function ensureInvitationEmailConfigured() {
  if (!env.SMTP_HOST || !env.SMTP_FROM || Boolean(env.SMTP_USER) !== Boolean(env.SMTP_PASSWORD)) {
    throw new AppError('Invitation email is not configured', 503);
  }
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
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });
  try {
    const result = await transport.sendMail({
      from: env.SMTP_FROM,
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
    if (!result.accepted.length) throw new Error('Recipient rejected');
  } catch {
    // Do not expose SMTP credentials or invitation links in errors/logs.
    throw new AppError('Could not send invitation email. Please try again.', 502);
  } finally {
    transport.close();
  }
}
