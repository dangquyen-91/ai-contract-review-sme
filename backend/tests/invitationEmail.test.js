process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/unused';
process.env.JWT_ACCESS_SECRET = 'email-tests-access';
process.env.JWT_REFRESH_SECRET = 'email-tests-refresh';
process.env.SMTP_HOST = 'smtp.example.com';
process.env.SMTP_FROM = 'Invitations <invite@example.com>';
process.env.INVITATION_ACCEPT_URL = 'https://app.example.com/loi-moi?source=email';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));
const nodemailer = require('nodemailer');
const {
  sendInvitationEmail,
  ensureInvitationEmailConfigured,
} = require('../dist/services/invitationEmail.service');
const { env } = require('../dist/config/env');
const input = {
  email: 'member@example.com',
  organizationName: 'Công ty A',
  role: 'reviewer',
  token: 'a'.repeat(64),
  expiresAt: new Date('2030-01-01T00:00:00Z'),
};

test('SMTP message includes encoded invitation URL, role and expiry, and closes connection', async () => {
  const transport = {
    sendMail: jest.fn().mockResolvedValue({ accepted: [input.email] }),
    close: jest.fn(),
  };
  nodemailer.createTransport.mockReturnValue(transport);
  await sendInvitationEmail(input);
  const message = transport.sendMail.mock.calls[0][0];
  expect(message.to).toBe(input.email);
  expect(message.text).toContain(
    `https://app.example.com/loi-moi?source=email&token=${input.token}`,
  );
  expect(message.text).toContain(input.organizationName);
  expect(message.text).toContain(input.role);
  expect(message.text).toContain(input.expiresAt.toISOString());
  expect(transport.close).toHaveBeenCalledTimes(1);
});

test('SMTP failure returns a sanitized 502 and closes connection', async () => {
  const transport = {
    sendMail: jest.fn().mockRejectedValue(new Error('secret SMTP password')),
    close: jest.fn(),
  };
  nodemailer.createTransport.mockReturnValue(transport);
  await expect(sendInvitationEmail(input)).rejects.toMatchObject({
    statusCode: 502,
    message: 'Could not send invitation email. Please try again.',
  });
  expect(transport.close).toHaveBeenCalledTimes(1);
});

test('missing SMTP config fails explicitly instead of claiming to send mail', () => {
  const original = env.SMTP_HOST;
  env.SMTP_HOST = '';
  try {
    expect(ensureInvitationEmailConfigured).toThrow('Invitation email is not configured');
  } finally {
    env.SMTP_HOST = original;
  }
});
