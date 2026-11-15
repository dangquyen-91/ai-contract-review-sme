import type { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/ApiResponse';
import * as users from '../services/identity/userManagement.service';
import type { listUsersQuery } from '../validations/userManagement.validation';

export const listUsers = asyncHandler(async (req, res) => {
  ok(res, await users.listUsers(req.query as unknown as z.infer<typeof listUsersQuery>));
});
export const getUser = asyncHandler(async (req, res) => {
  ok(res, await users.getUser(req.params.id));
});
export const createUser = asyncHandler(async (req, res) => {
  ok(res, await users.createUser(req.body), 201);
});
export const updateUser = asyncHandler(async (req, res) => {
  ok(res, await users.updateUser(req.user!.sub, req.params.id, req.body));
});
export const deleteUser = asyncHandler(async (req, res) => {
  await users.deleteUser(req.user!.sub, req.params.id);
  res.status(204).send();
});
