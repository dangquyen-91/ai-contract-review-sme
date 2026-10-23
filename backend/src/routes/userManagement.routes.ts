import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/rbac.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createUserBody,
  listUsersQuery,
  updateUserBody,
  userIdParams,
} from '../validations/userManagement.validation';
import {
  createUser,
  deleteUser,
  getUser,
  listUsers,
  updateUser,
} from '../controllers/userManagement.controller';

const router = Router();
router.use(requireAuth, requireRole('administrator'));
router.get('/', validate({ query: listUsersQuery }), listUsers);
router.post('/', validate({ body: createUserBody }), createUser);
router.get('/:id', validate({ params: userIdParams }), getUser);
router.patch('/:id', validate({ params: userIdParams, body: updateUserBody }), updateUser);
router.delete('/:id', validate({ params: userIdParams }), deleteUser);
export default router;
