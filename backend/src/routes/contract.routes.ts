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
import { listClausesHandler } from '../controllers/clause.controller';
import {
  analyzeContractHandler,
  analyzeContractStreamHandler,
  retiredAnalysisStageHandler,
} from '../controllers/analysis.controller';
import {
  removeProposedRevisionHandler,
  updateProposedRevisionHandler,
  listRiskFindingsHandler,
} from '../controllers/risk.controller';
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
router.post(
  '/:id/analysis',
  requireRole('administrator', 'owner', 'manager', 'staff', 'reviewer', 'user'),
  aiLimiter,
  validate({ params: contractIdParamSchema, body: analysisFocusBodySchema }),
  analyzeContractHandler,
);
router.post(
  '/:id/analysis/stream',
  requireRole('administrator', 'owner', 'manager', 'staff', 'reviewer', 'user'),
  aiLimiter,
  validate({ params: contractIdParamSchema, body: analysisFocusBodySchema }),
  analyzeContractStreamHandler,
);

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

router.get('/:id/clauses', validate({ params: contractIdParamSchema }), listClausesHandler);

router.post(
  '/:id/clauses/segment',
  requireRole('administrator', 'owner', 'manager', 'staff', 'reviewer', 'user'),
  aiLimiter,
  validate({ params: contractIdParamSchema }),
  retiredAnalysisStageHandler,
);

router.post(
  '/:id/summary',
  requireRole('administrator', 'owner', 'manager', 'staff', 'reviewer', 'user'),
  aiLimiter,
  validate({ params: contractIdParamSchema, body: analysisFocusBodySchema }),
  retiredAnalysisStageHandler,
);

router.get('/:id/risks', validate({ params: contractIdParamSchema }), listRiskFindingsHandler);

router.post(
  '/:id/risks/detect',
  requireRole('administrator', 'owner', 'manager', 'staff', 'reviewer', 'user'),
  aiLimiter,
  validate({ params: contractIdParamSchema, body: analysisFocusBodySchema }),
  retiredAnalysisStageHandler,
);

router.patch(
  '/:id/risks/:findingId',
  requireRole('administrator', 'owner', 'manager', 'staff', 'reviewer', 'user'),
  validate({ params: findingParamSchema, body: updateProposedRevisionBodySchema }),
  updateProposedRevisionHandler,
);

router.delete(
  '/:id/risks/:findingId/revision',
  requireRole('administrator', 'owner', 'manager', 'staff', 'reviewer', 'user'),
  validate({ params: findingParamSchema }),
  removeProposedRevisionHandler,
);

router.get('/:id/chat', validate({ params: contractIdParamSchema }), listChatMessagesHandler);

router.post(
  '/:id/chat',
  requireRole('administrator', 'owner', 'manager', 'staff', 'reviewer', 'user'),
  aiLimiter,
  validate({ params: contractIdParamSchema, body: chatMessageBodySchema }),
  askAboutContractHandler,
);

router.post(
  '/:id/risks/detect/stream',
  requireRole('administrator', 'owner', 'manager', 'staff', 'reviewer'),
  aiLimiter,
  validate({ params: contractIdParamSchema, body: analysisFocusBodySchema }),
  retiredAnalysisStageHandler,
);

router.post(
  '/:id/chat/stream',
  requireRole('administrator', 'owner', 'manager', 'staff', 'reviewer', 'user'),
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
