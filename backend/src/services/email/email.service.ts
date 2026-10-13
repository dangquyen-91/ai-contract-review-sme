import { env } from '../../config/env';
import { AppError } from '../../errors/AppError';

export function ensureEmailConfigured() {
  if (!env.BREVO_API_KEY?.trim() || !env.BREVO_SENDER_EMAIL) {
    throw new AppError('Email delivery is not configured', 503);
  }
}

// Shared transport for invitations and account verification. Never log message bodies or API keys.
export async function sendEmail(input: { to: string; subject: string; text: string }) {
  ensureEmailConfigured();
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': env.BREVO_API_KEY!,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: env.BREVO_SENDER_EMAIL, name: env.BREVO_SENDER_NAME },
        to: [{ email: input.to }],
        subject: input.subject,
        textContent: input.text,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error('Email provider rejected request');
    const result = (await response.json()) as { messageId?: string };
    if (!result.messageId) throw new Error('Email provider did not acknowledge request');
  } catch {
    throw new AppError('Could not send email. Please try again.', 502);
  }
}
