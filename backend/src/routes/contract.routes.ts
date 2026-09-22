import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/rbac.middleware';
import { aiLimiter } from '../middlewares/rateLimit.middleware';
import { validate } from '../middlewares/validate.middleware';
import { contractFileUpload } from '../middlewares/upload.middleware';
import {
  createContractHandler,
  deleteContractHandler,
  getContractHandler,
  listContractsHandler,
} from '../controllers/contract.controller';
import { listClausesHandler, segmentClausesHandler } from '../controllers/clause.controller';
import { detectRisksHandler, listRiskFindingsHandler } from '../controllers/risk.controller';
import { generateContractSummaryHandler } from '../controllers/summary.controller';
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

router.get(
  '/:id/clauses',
  validate({ params: contractIdParamSchema }),
  listClausesHandler,
);

router.post(
  '/:id/clauses/segment',
  requireRole('administrator', 'manager', 'staff'),
  aiLimiter,
  validate({ params: contractIdParamSchema }),
  segmentClausesHandler,
);

router.post(
  '/:id/summary',
  requireRole('administrator', 'manager', 'staff'),
  aiLimiter,
  validate({ params: contractIdParamSchema }),
  generateContractSummaryHandler,
);

router.get(
  '/:id/risks',
  validate({ params: contractIdParamSchema }),
  listRiskFindingsHandler,
);

router.post(
  '/:id/risks/detect',
  requireRole('administrator', 'manager', 'staff'),
  aiLimiter,
  validate({ params: contractIdParamSchema }),
  detectRisksHandler,
);

router.delete(
  '/:id',
  requireRole('administrator', 'manager'),
  validate({ params: contractIdParamSchema }),
  deleteContractHandler,
);

export default router;
