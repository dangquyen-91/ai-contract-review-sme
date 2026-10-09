const express = require('express');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/env', () => ({
  env: { JWT_ACCESS_SECRET: 'organization-access-test-only' },
}));

jest.mock('../src/controllers/organization.controller', () => ({
  createOrganizationHandler: jest.fn((_req, res) => res.status(201).json({ success: true })),
  getOrganizationHandler: jest.fn(),
  updateOrganizationHandler: jest.fn(),
  deleteOrganizationHandler: jest.fn(),
}));

const router = require('../src/routes/organization.routes').default;
const { createOrganizationHandler } = require('../src/controllers/organization.controller');
let server;
let baseUrl;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/organizations', router);
  app.use((error, _req, res, _next) => {
    res.status(error.statusCode || 500).json({ message: error.message });
  });
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

beforeEach(() => jest.clearAllMocks());

async function createOrganization(role, orgId) {
  const headers = { 'Content-Type': 'application/json' };
  if (role) {
    const token = jwt.sign({ sub: 'test-user', role, orgId }, 'organization-access-test-only', { expiresIn: '1m' });
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${baseUrl}/organizations`, {
    method: 'POST', headers, body: JSON.stringify({ name: 'Test organization' }),
  });
  await response.json();
  return response.status;
}

test.each([undefined, 'existing-organization'])('admin is blocked before creation, orgId=%s', async (orgId) => {
  expect(await createOrganization('administrator', orgId)).toBe(403);
  expect(createOrganizationHandler).not.toHaveBeenCalled();
});

test('unauthenticated requests cannot create organizations', async () => {
  expect(await createOrganization()).toBe(401);
  expect(createOrganizationHandler).not.toHaveBeenCalled();
});

test.each(['owner', 'manager', 'staff', 'reviewer', 'user'])('%s retains access to the creation handler', async (role) => {
  expect(await createOrganization(role)).toBe(201);
  expect(createOrganizationHandler).toHaveBeenCalledTimes(1);
});
