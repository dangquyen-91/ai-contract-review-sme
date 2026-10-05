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
  getContractTextHandler,
  listContractsHandler,
} from '../controllers/contract.controller';
import { listClausesHandler, segmentClausesHandler } from '../controllers/clause.controller';
import {
  detectRisksHandler,
  detectRisksStreamHandler,
  removeProposedRevisionHandler,
  updateProposedRevisionHandler,
  listRiskFindingsHandler,
} from '../controllers/risk.controller';
import { generateContractSummaryHandler } from '../controllers/summary.controller';
import {
  askAboutContractHandler,
  listChatMessagesHandler,
  streamAboutContractHandler,
} from '../controllers/chat.controller';
import {
  analysisFocusBodySchema,
  chatMessageBodySchema,
  contractIdParamSchema,
  createContractSchema,
  findingParamSchema,
  listContractsQuerySchema,
  updateProposedRevisionBodySchema,
} from '../validations/contract.validation';

const router = Router();

router.use(requireAuth);

router.get('/', validate({ query: listContractsQuerySchema }), listContractsHandler);

router.post(
  '/',
  requireRole('administrator', 'owner', 'manager', 'staff', 'user'),
  contractFileUpload.single('file'),
  validate({ body: createContractSchema }),
  createContractHandler,
);

router.get('/:id', validate({ params: contractIdParamSchema }), getContractHandler);

router.get('/:id/text', validate({ params: contractIdParamSchema }), getContractTextHandler);

router.get(
  '/:id/clauses',
  validate({ params: contractIdParamSchema }),
  listClausesHandler,
);

router.post(
  '/:id/clauses/segment',
  requireRole('administrator', 'owner', 'manager', 'staff', 'reviewer', 'user'),
  aiLimiter,
  validate({ params: contractIdParamSchema }),
  segmentClausesHandler,
);

router.post(
  '/:id/summary',
  requireRole('administrator', 'owner', 'manager', 'staff', 'reviewer', 'user'),
  aiLimiter,
  validate({ params: contractIdParamSchema, body: analysisFocusBodySchema }),
  generateContractSummaryHandler,
);

router.get(
  '/:id/risks',
  validate({ params: contractIdParamSchema }),
  listRiskFindingsHandler,
);

router.post(
  '/:id/risks/detect',
  requireRole('administrator', 'owner', 'manager', 'staff', 'reviewer', 'user'),
  aiLimiter,
  validate({ params: contractIdParamSchema, body: analysisFocusBodySchema }),
  detectRisksHandler,
);

router.patch(
  '/:id/risks/:findingId',
  requireRole('administrator', 'owner', 'manager', 'staff'),
  validate({ params: findingParamSchema, body: updateProposedRevisionBodySchema }),
  updateProposedRevisionHandler,
);

router.delete(
  '/:id/risks/:findingId/revision',
  requireRole('administrator', 'owner', 'manager', 'staff'),
  validate({ params: findingParamSchema }),
  removeProposedRevisionHandler,
);

router.get('/:id/chat', validate({ params: contractIdParamSchema }), listChatMessagesHandler);

router.post(
  '/:id/chat',
  requireRole('administrator', 'owner', 'manager', 'staff', 'reviewer'),
  aiLimiter,
  validate({ params: contractIdParamSchema, body: chatMessageBodySchema }),
  askAboutContractHandler,
);

router.post(
  '/:id/risks/detect/stream',
  requireRole('administrator', 'owner', 'manager', 'staff', 'reviewer'),
  aiLimiter,
  validate({ params: contractIdParamSchema, body: analysisFocusBodySchema }),
  detectRisksStreamHandler,
);

router.post(
  '/:id/chat/stream',
  requireRole('administrator', 'owner', 'manager', 'staff', 'reviewer'),
  aiLimiter,
  validate({ params: contractIdParamSchema, body: chatMessageBodySchema }),
  streamAboutContractHandler,
);

router.delete(
  '/:id',
  requireRole('administrator', 'owner', 'manager'),
  validate({ params: contractIdParamSchema }),
  deleteContractHandler,
);

export default router;
