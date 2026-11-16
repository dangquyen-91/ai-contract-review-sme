process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/validation-unused';
process.env.JWT_ACCESS_SECRET = 'validation-test-access';
process.env.JWT_REFRESH_SECRET = 'validation-test-refresh';
process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');

const express = require('express');
const request = require('supertest');
const JSZip = require('jszip');
const auth = require('../dist/validations/auth.validation');
const {
  createOrganizationSchema,
  updateOrganizationSchema,
} = require('../dist/validations/organization.validation');
const {
  createLegalSourceSchema,
  updateLegalSourceSchema,
} = require('../dist/validations/legalSource.validation');
const { listContractsQuerySchema } = require('../dist/validations/contract.validation');
const { invitationPaginationSchema } = require('../dist/validations/invitation.validation');
const { validate } = require('../dist/middlewares/validate.middleware');
const { errorHandler } = require('../dist/middlewares/errorHandler');
const { contractFileUpload, legalDocUpload } = require('../dist/middlewares/upload.middleware');
const { validateDocxArchive } = require('../dist/utils/uploadContent');
const validUser = { name: 'Valid User', email: 'valid@example.com', password: 'ValidPassword123!' };
const validLaw = {
  code: 'test_law',
  title: 'Test law',
  citationLabel: 'Test law',
  sourceType: 'law',
};

test('auth rejects whitespace names and weak passwords; login preserves legacy passwords within bcrypt limit', () => {
  for (const name of ['  ', '\t\n', ' x '])
    expect(auth.registerSchema.safeParse({ ...validUser, name }).success).toBe(false);
  expect(auth.registerSchema.parse({ ...validUser, name: ' Valid User ' }).name).toBe('Valid User');
  for (const password of [
    '123456789012',
    'password1234',
    'ADMIN12345678',
    'qwerty123456',
    'lawscan123456',
    'ắ'.repeat(25),
  ])
    expect(auth.registerSchema.safeParse({ ...validUser, password }).success).toBe(false);
  expect(auth.registerSchema.safeParse({ ...validUser, password: 'a'.repeat(72) }).success).toBe(
    true,
  );
  expect(
    auth.loginSchema.safeParse({ email: validUser.email, password: 'a'.repeat(73) }).success,
  ).toBe(false);
  expect(auth.loginSchema.parse({ email: validUser.email, password: ' short ' }).password).toBe(
    ' short ',
  );
});

test.each(['2026-02-30', '2025-02-29', '2026-04-31', 'invalid', '2026-13-01'])(
  'legal metadata rejects impossible date %s on create and update',
  (date) => {
    expect(createLegalSourceSchema.safeParse({ ...validLaw, issuedDate: date }).success).toBe(
      false,
    );
    expect(updateLegalSourceSchema.safeParse({ effectiveDate: date }).success).toBe(false);
  },
);
test('legal dates accept actual leap dates and reject blank titles and invalid effective ranges', () => {
  expect(
    createLegalSourceSchema
      .parse({ ...validLaw, issuedDate: '2024-02-29' })
      .issuedDate.toISOString(),
  ).toBe('2024-02-29T00:00:00.000Z');
  expect(createLegalSourceSchema.safeParse({ ...validLaw, title: '  ' }).success).toBe(false);
  expect(createLegalSourceSchema.safeParse({ ...validLaw, citationLabel: ' ' }).success).toBe(
    false,
  );
  expect(
    updateLegalSourceSchema.safeParse({ effectiveDate: '2026-10-02', expiryDate: '2026-10-01' })
      .success,
  ).toBe(false);
  expect(updateLegalSourceSchema.parse({ expiryDate: null }).expiryDate).toBeNull();
});

test('organization updates preserve required metadata and validate structured address relationships', () => {
  const input = {
    name: 'Test business',
    taxCode: '0312345678',
    industry: 'other',
    addressDetails: { provinceCode: '01', wardCode: '00004', addressLine: '12 Test' },
  };
  for (const schema of [createOrganizationSchema, updateOrganizationSchema]) {
    expect(schema.safeParse(input).success).toBe(true);
    for (const taxCode of ['', 'abc', '123', null])
      expect(schema.safeParse({ ...input, taxCode }).success).toBe(false);
    for (const taxCode of ['0312345678-001', '0312345678001'])
      expect(schema.safeParse({ ...input, taxCode }).success).toBe(true);
  }
  for (const bad of [
    { taxCode: null },
    { industry: null },
    { address: 'anywhere' },
    { addressDetails: null },
    {},
  ])
    expect(updateOrganizationSchema.safeParse(bad).success).toBe(false);
  expect(
    updateOrganizationSchema.safeParse({
      addressDetails: { ...input.addressDetails, provinceCode: '79' },
    }).success,
  ).toBe(false);
  expect(
    updateOrganizationSchema.parse({ addressDetails: input.addressDetails }).address,
  ).toContain('12 Test');
});

test('pagination rejects unsafe or excessive pages and bounds contract search', () => {
  for (const schema of [listContractsQuerySchema, invitationPaginationSchema]) {
    for (const page of ['1e100', '10001', '0', '-1', '1.5'])
      expect(schema.safeParse({ page }).success).toBe(false);
    expect(schema.parse({ page: '10000' }).page).toBe(10000);
  }
  expect(listContractsQuerySchema.safeParse({ search: 'a'.repeat(301) }).success).toBe(false);
});

test('validation responses retain form-level messages and field errors', async () => {
  const app = express();
  app.use(express.json());
  app.patch('/', validate({ body: updateOrganizationSchema }), (_req, res) => res.sendStatus(204));
  app.use(errorHandler);
  const root = await request(app).patch('/').send({});
  expect(root.status).toBe(400);
  expect(root.body.error.formErrors.length).toBeGreaterThan(0);
  expect(root.body.error.message).toContain(root.body.error.formErrors[0]);
  const field = await request(app).patch('/').send({ taxCode: 'abc' });
  expect(field.body.error.details.taxCode.length).toBeGreaterThan(0);
});

test('upload endpoints reject MIME spoofing and excessive multipart fields before service execution', async () => {
  for (const upload of [contractFileUpload, legalDocUpload]) {
    const app = express();
    const handler = jest.fn((_req, res) => res.sendStatus(204));
    app.post('/', upload.single('file'), handler);
    app.use(errorHandler);
    const bad = await request(app)
      .post('/')
      .attach('file', Buffer.from('not a PDF'), {
        filename: 'file.pdf',
        contentType: 'application/pdf',
      });
    expect(bad.status).toBe(400);
    expect(handler).not.toHaveBeenCalled();
    const tooMany = request(app).post('/');
    for (let index = 0; index < 21; index++) tooMany.field(`extra${index}`, 'x');
    expect((await tooMany).status).toBe(400);
    expect((await request(app).post('/').field('title', 'x'.repeat(16385))).status).toBe(400);
    expect(
      (
        await request(app)
          .post('/')
          .attach('file', Buffer.from('%PDF-1.7\nfixture'), {
            filename: 'file.pdf',
            contentType: 'application/pdf',
          })
      ).status,
    ).toBe(204);
  }
});

test('Word validation rejects non-DOCX archives, excessive expanded content and entry counts', async () => {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<Types/>');
  zip.file('word/document.xml', '<document/>');
  await expect(
    validateDocxArchive(await zip.generateAsync({ type: 'nodebuffer' })),
  ).resolves.toBeUndefined();
  zip.file('word/media/large.txt', 'x'.repeat(2048));
  await expect(
    validateDocxArchive(
      await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }),
      1024,
    ),
  ).rejects.toMatchObject({ statusCode: 400 });
  await expect(
    validateDocxArchive(await zip.generateAsync({ type: 'nodebuffer' }), 10000, 2),
  ).rejects.toMatchObject({ statusCode: 400 });
  await expect(validateDocxArchive(Buffer.from('not a zip'))).rejects.toMatchObject({
    statusCode: 400,
  });
});
