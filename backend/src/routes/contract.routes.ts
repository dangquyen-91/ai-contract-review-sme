import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/rbac.middleware';
import { validate } from '../middlewares/validate.middleware';
import { contractFileUpload } from '../middlewares/upload.middleware';
import {
  createContractHandler,
  deleteContractHandler,
  getContractHandler,
  listContractsHandler,
} from '../controllers/contract.controller';
import {
  contractIdParamSchema,
  createContractSchema,
  listContractsQuerySchema,
} from '../validations/contract.validation';

const router = Router();

router.use(requireAuth);

router.get('/', validate({ query: listContractsQuerySchema }), listContractsHandler);

router.post(
  '/',
  requireRole('administrator', 'manager', 'staff'),
  contractFileUpload.single('file'),
  validate({ body: createContractSchema }),
  createContractHandler,
);

router.get('/:id', validate({ params: contractIdParamSchema }), getContractHandler);

router.delete(
  '/:id',
  requireRole('administrator', 'manager'),
  validate({ params: contractIdParamSchema }),
  deleteContractHandler,
);

export default router;
