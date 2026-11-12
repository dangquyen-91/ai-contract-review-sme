import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/rbac.middleware';
import { aiLimiter } from '../middlewares/rateLimit.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createDraftSchema,
  draftDecisionSchema,
  draftIdSchema,
  revisionSchema,
  updateDraftSchema,
  draftListQuerySchema,
  studioLawParamsSchema,
  pinDraftSchema,
  draftProposalParamsSchema,
  draftExportQuerySchema,
} from '../validations/contractDraft.validation';
import { uploadStudioReference } from '../middlewares/studioReferenceUpload.middleware';
import {
  studioLawQuerySchema,
  assistantRequestSchema,
  proposalActionSchema,
} from '../validations/studio.validation';
import {
  templateCatalogHandler,
  listStudioLawsHandler,
  previewStudioLawHandler,
  listDraftsHandler,
  createDraftHandler,
  getDraftHandler,
  deleteDraftHandler,
  pinDraftHandler,
  updateDraftHandler,
  generateDraftHandler,
  copyToLatestTemplateHandler,
  openStudioHandler,
  authorizeDraftReferenceHandler,
  readStudioReferenceHandler,
  assistantHistoryHandler,
  requestAssistantHandler,
  actOnProposalHandler,
  decideDraftHandler,
  publishDraftHandler,
  exportDraftHandler,
} from '../controllers/contractDraft.controller';

const router = Router();
router.use(requireAuth, requireRole('owner', 'staff', 'user'));
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
router.get('/templates', templateCatalogHandler);
router.get('/legal-sources', validate({ query: studioLawQuerySchema }), listStudioLawsHandler);
router.get(
  '/legal-sources/:sourceId',
  validate({ params: studioLawParamsSchema, query: draftListQuerySchema }),
  previewStudioLawHandler,
);
router.get('/', validate({ query: draftListQuerySchema }), listDraftsHandler);
router.post('/', validate({ body: createDraftSchema }), createDraftHandler);
router.get('/:id', validate({ params: draftIdSchema }), getDraftHandler);
router.delete(
  '/:id',
  validate({ params: draftIdSchema, body: revisionSchema }),
  deleteDraftHandler,
);
router.patch(
  '/:id/pin',
  validate({ params: draftIdSchema, body: pinDraftSchema }),
  pinDraftHandler,
);
router.patch(
  '/:id',
  validate({ params: draftIdSchema, body: updateDraftSchema }),
  updateDraftHandler,
);
router.post(
  '/:id/generate',
  aiLimiter,
  validate({ params: draftIdSchema, body: revisionSchema }),
  generateDraftHandler,
);
router.post(
  '/:id/copy-latest',
  validate({ params: draftIdSchema, body: revisionSchema }),
  copyToLatestTemplateHandler,
);
router.post(
  '/:id/studio',
  validate({ params: draftIdSchema, body: revisionSchema }),
  openStudioHandler,
);
router.post(
  '/:id/reference',
  validate({ params: draftIdSchema }),
  authorizeDraftReferenceHandler,
  uploadStudioReference,
  readStudioReferenceHandler,
);
router.get('/:id/assistant', validate({ params: draftIdSchema }), assistantHistoryHandler);
router.post(
  '/:id/assistant',
  aiLimiter,
  validate({ params: draftIdSchema, body: assistantRequestSchema }),
  requestAssistantHandler,
);
router.post(
  '/:id/proposals/:proposalId',
  validate({ params: draftProposalParamsSchema, body: proposalActionSchema }),
  actOnProposalHandler,
);
router.post(
  '/:id/decision',
  validate({ params: draftIdSchema, body: draftDecisionSchema }),
  decideDraftHandler,
);
router.post(
  '/:id/publish',
  validate({ params: draftIdSchema, body: revisionSchema }),
  publishDraftHandler,
);
router.get(
  '/:id/export',
  validate({ params: draftIdSchema, query: draftExportQuerySchema }),
  exportDraftHandler,
);
export default router;
