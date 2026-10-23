const express = require('express');
const request = require('supertest');
const { CONTRACT_DELETE_ROLES, requireRole } = require('../src/middlewares/rbac.middleware');

const app = express();
const remove = jest.fn((_req, res) => res.status(204).send());
app.delete('/contracts/:id', (req, _res, next) => {
  const role = req.headers['x-test-role'];
  if (role) req.user = { role };
  next();
}, requireRole(...CONTRACT_DELETE_ROLES), remove);
app.use((error, _req, res, _next) => res.status(error.statusCode || 500).json({ message: error.message }));

test.each(['administrator', 'owner', 'manager', 'staff', 'user'])('%s can delete an uploaded contract', async (role) => {
  const response = await request(app).delete('/contracts/507f1f77bcf86cd799439011').set('x-test-role', role);
  expect(response.status).toBe(204);
  expect(remove).toHaveBeenCalledTimes(1);
});

test.each([[undefined, 401], ['expert', 403]])('denies contract deletion for %s', async (role, status) => {
  const operation = request(app).delete('/contracts/507f1f77bcf86cd799439011');
  if (role) operation.set('x-test-role', role);
  expect((await operation).status).toBe(status);
  expect(remove).not.toHaveBeenCalled();
});
