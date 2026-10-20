process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/unused';
process.env.JWT_ACCESS_SECRET = 'email-tests-access';
process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
process.env.JWT_REFRESH_SECRET = 'email-tests-refresh';
process.env.BREVO_API_KEY = 'test-api-key-not-real';
process.env.BREVO_SENDER_EMAIL = 'invite@example.com';
process.env.BREVO_SENDER_NAME = 'AI Contract Review';
process.env.INVITATION_ACCEPT_URL = 'https://app.example.com/loi-moi?source=email';

const {
  sendInvitationEmail,
  ensureInvitationEmailConfigured,
} = require('../dist/services/organization/invitationEmail.service');
const { env } = require('../dist/config/env');
const input = {
  email: 'member@example.com',
  organizationName: 'Test Company',
  role: 'reviewer',
  token: 'a'.repeat(64),
  expiresAt: new Date('2030-01-01T00:00:00Z'),
};
let fetchMock;
beforeEach(() => {
  fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({ messageId: '<test-message>' }),
  });
});
afterEach(() => jest.restoreAllMocks());

test('sends invitation via Brevo HTTPS API with sender, recipient and invitation link', async () => {
  await sendInvitationEmail(input);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, options] = fetchMock.mock.calls[0];
  expect(url).toBe('https://api.brevo.com/v3/smtp/email');
  expect(options.method).toBe('POST');
  expect(options.headers['api-key']).toBe(process.env.BREVO_API_KEY);
  expect(options.signal).toBeInstanceOf(AbortSignal);
  const body = JSON.parse(options.body);
  expect(body.sender).toEqual({ email: 'invite@example.com', name: 'AI Contract Review' });
  expect(body.to).toEqual([{ email: input.email }]);
  expect(body.textContent).toContain(
    `https://app.example.com/loi-moi?source=email&token=${input.token}`,
  );
  for (const text of [input.organizationName, input.role, input.expiresAt.toISOString()])
    expect(body.textContent).toContain(text);
});

test.each([401, 429, 500])(
  'provider HTTP %s produces sanitized error without retrying delivery',
  async (status) => {
    fetchMock.mockResolvedValue({ ok: false, status });
    await expect(sendInvitationEmail(input)).rejects.toMatchObject({
      statusCode: 502,
      message: 'Could not send invitation email. Please try again.',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  },
);

test('network timeout and unacknowledged requests cannot claim successful delivery', async () => {
  fetchMock.mockRejectedValueOnce(new Error('secret API key and invitation URL'));
  await expect(sendInvitationEmail(input)).rejects.toMatchObject({
    statusCode: 502,
    message: 'Could not send invitation email. Please try again.',
  });
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
  await expect(sendInvitationEmail(input)).rejects.toMatchObject({ statusCode: 502 });
});

test.each(['BREVO_API_KEY', 'BREVO_SENDER_EMAIL'])(
  'missing %s fails before calling provider',
  async (key) => {
    const original = env[key];
    env[key] = '';
    try {
      expect(ensureInvitationEmailConfigured).toThrow('Email delivery is not configured');
      await expect(sendInvitationEmail(input)).rejects.toMatchObject({ statusCode: 503 });
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      env[key] = original;
    }
  },
);
