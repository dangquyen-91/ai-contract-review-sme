import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import {
  CONTRACT_DELETE_ROLES,
  CONTRACT_REVIEW_ROLES,
  CONTRACT_UPLOAD_ROLES,
  requireRole,
} from '../middlewares/rbac.middleware';
import { aiLimiter } from '../middlewares/rateLimit.middleware';
import { validate } from '../middlewares/validate.middleware';
import { contractFileUpload } from '../middlewares/upload.middleware';
import {
  confirmContractProfileHandler,
  createContractHandler,
  deleteContractHandler,
  getContractFileHandler,
  getContractHandler,
  getContractTextHandler,
  listContractsHandler,
  retryClassificationHandler,
} from '../controllers/contract.controller';
import { listClausesHandler } from '../controllers/clause.controller';
import { getShareSummaryHandler } from '../controllers/shareSummary.controller';
import {
  removeProposedRevisionHandler,
  updateProposedRevisionHandler,
  listRiskFindingsHandler,
  listKeyTermsHandler,
} from '../controllers/risk.controller';
import {
  askAboutContractHandler,
  listChatMessagesHandler,
  streamAboutContractHandler,
} from '../controllers/chat.controller';
import { listReviewsHandler, startReviewHandler } from '../controllers/review.controller';
import {
  analysisFocusBodySchema,
  confirmContractProfileSchema,
  chatMessageBodySchema,
  contractIdParamSchema,
  contractTextQuerySchema,
  contractFileQuerySchema,
  shareSummaryQuerySchema,
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
  requireRole(...CONTRACT_UPLOAD_ROLES),
  contractFileUpload.single('file'),
  validate({ body: createContractSchema }),
  createContractHandler,
);

router.get('/:id', validate({ params: contractIdParamSchema }), getContractHandler);

router.patch(
  '/:id/profile',
  requireRole(...CONTRACT_REVIEW_ROLES),
  validate({ params: contractIdParamSchema, body: confirmContractProfileSchema }),
  confirmContractProfileHandler,
);

router.post(
  '/:id/classify',
  requireRole(...CONTRACT_REVIEW_ROLES),
  aiLimiter,
  validate({ params: contractIdParamSchema }),
  retryClassificationHandler,
);

router.get(
  '/:id/text',
  validate({ params: contractIdParamSchema, query: contractTextQuerySchema }),
  getContractTextHandler,
);

router.get('/:id/file', validate({ params: contractIdParamSchema, query: contractFileQuerySchema }), getContractFileHandler);

router.get('/:id/share-summary', validate({ params: contractIdParamSchema, query: shareSummaryQuerySchema }), getShareSummaryHandler);

router.post(
  '/:id/reviews',
  requireRole(...CONTRACT_REVIEW_ROLES),
  aiLimiter,
  validate({ params: contractIdParamSchema, body: analysisFocusBodySchema }),
  startReviewHandler,
);

router.get('/:id/reviews', validate({ params: contractIdParamSchema }), listReviewsHandler);

router.get('/:id/clauses', validate({ params: contractIdParamSchema }), listClausesHandler);

router.get('/:id/risks', validate({ params: contractIdParamSchema }), listRiskFindingsHandler);

router.get('/:id/key-terms', validate({ params: contractIdParamSchema }), listKeyTermsHandler);

router.patch(
  '/:id/risks/:findingId',
  requireRole(...CONTRACT_REVIEW_ROLES),
  validate({ params: findingParamSchema, body: updateProposedRevisionBodySchema }),
  updateProposedRevisionHandler,
);

router.delete(
  '/:id/risks/:findingId/revision',
  requireRole(...CONTRACT_REVIEW_ROLES),
  validate({ params: findingParamSchema }),
  removeProposedRevisionHandler,
);

router.get('/:id/chat', validate({ params: contractIdParamSchema }), listChatMessagesHandler);

router.post(
  '/:id/chat',
  requireRole(...CONTRACT_REVIEW_ROLES),
  aiLimiter,
  validate({ params: contractIdParamSchema, body: chatMessageBodySchema }),
  askAboutContractHandler,
);

router.post(
  '/:id/chat/stream',
  requireRole(...CONTRACT_REVIEW_ROLES),
  aiLimiter,
  validate({ params: contractIdParamSchema, body: chatMessageBodySchema }),
  streamAboutContractHandler,
);

router.delete(
  '/:id',
  requireRole(...CONTRACT_DELETE_ROLES),
  validate({ params: contractIdParamSchema }),
  deleteContractHandler,
);

export default router;
