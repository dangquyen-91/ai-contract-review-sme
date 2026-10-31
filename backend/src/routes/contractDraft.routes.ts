import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/rbac.middleware';
import { aiLimiter } from '../middlewares/rateLimit.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/ApiResponse';
import { createDraftSchema, draftDecisionSchema, draftIdSchema, revisionSchema, updateDraftSchema } from '../validations/contractDraft.validation';
import * as service from '../services/drafting/contractDraft.service';
import * as assistant from '../services/drafting/studioAssistant.service';
import { readStudioReference, uploadStudioReference } from '../services/drafting/studioReference.service';

const router = Router();
router.use(requireAuth, requireRole('owner', 'staff', 'user'));
router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
router.get('/templates', asyncHandler(async (req, res) => { ok(res, await service.templateCatalog(req.user!)); }));
router.get('/', validate({ query: z.object({ page: z.coerce.number().int().min(1).max(10000).default(1) }) }), asyncHandler(async (req, res) => { ok(res, await service.listDrafts(req.user!, Number(req.query.page))); }));
router.post('/', validate({ body: createDraftSchema }), asyncHandler(async (req, res) => { ok(res, await service.createDraft(req.user!, req.body), 201); }));
router.get('/:id', validate({ params: draftIdSchema }), asyncHandler(async (req, res) => { ok(res, await service.getDraft(req.user!, req.params.id)); }));
router.delete('/:id', validate({ params: draftIdSchema, body: revisionSchema }), asyncHandler(async (req, res) => { ok(res, await service.deleteDraft(req.user!, req.params.id, req.body.revision)); }));
router.patch('/:id/pin', validate({ params: draftIdSchema, body: z.object({ pinned: z.boolean() }).strict() }), asyncHandler(async (req, res) => { ok(res, await service.pinDraft(req.user!, req.params.id, req.body.pinned)); }));
router.patch('/:id', validate({ params: draftIdSchema, body: updateDraftSchema }), asyncHandler(async (req, res) => { ok(res, await service.updateDraft(req.user!, req.params.id, req.body)); }));
router.post('/:id/generate', aiLimiter, validate({ params: draftIdSchema, body: revisionSchema }), asyncHandler(async (req, res) => { ok(res, await service.generateDraft(req.user!, req.params.id, req.body.revision)); }));
router.post('/:id/copy-latest', validate({ params: draftIdSchema, body: revisionSchema }), asyncHandler(async (req, res) => { ok(res, await service.copyToLatestTemplate(req.user!, req.params.id, req.body.revision), 201); }));
router.post('/:id/studio', validate({ params: draftIdSchema, body: revisionSchema }), asyncHandler(async (req, res) => { ok(res, await service.openStudio(req.user!, req.params.id, req.body.revision)); }));
router.post('/:id/reference', validate({ params: draftIdSchema }), asyncHandler(async (req, _res, next) => { await service.requireDraftAccess(req.user!); await service.findDraft(req.user!, req.params.id); next(); }), uploadStudioReference, asyncHandler(async (req, res) => { ok(res, await readStudioReference(req.file)); }));
router.get('/:id/assistant', validate({ params: draftIdSchema }), asyncHandler(async (req, res) => { ok(res, await assistant.assistantHistory(req.user!, req.params.id)); }));
router.post('/:id/assistant', aiLimiter, validate({ params: draftIdSchema, body: assistant.assistantRequestSchema }), asyncHandler(async (req, res) => { ok(res, await assistant.requestAssistant(req.user!, req.params.id, req.body)); }));
router.post('/:id/proposals/:proposalId', validate({ params: draftIdSchema.extend({ proposalId: z.string().regex(/^[a-f\d]{24}$/i) }), body: assistant.proposalActionSchema }), asyncHandler(async (req, res) => { ok(res, await assistant.actOnProposal(req.user!, req.params.id, req.params.proposalId, req.body.revision, req.body.action)); }));
router.post('/:id/decision', validate({ params: draftIdSchema, body: draftDecisionSchema }), asyncHandler(async (req, res) => { ok(res, await service.decideDraft(req.user!, req.params.id, req.body.revision, req.body.action, req.body.note)); }));
router.post('/:id/publish', validate({ params: draftIdSchema, body: revisionSchema }), asyncHandler(async (req, res) => { ok(res, await service.publishDraft(req.user!, req.params.id, req.body.revision)); }));
router.get('/:id/export', validate({ params: draftIdSchema, query: z.object({ format: z.enum(['docx', 'print']).default('docx') }) }), asyncHandler(async (req, res) => {
  const result = await service.exportDraft(req.user!, req.params.id);
  if (req.query.format === 'print') { ok(res, { title: result.title, content: result.content, document: result.document, template: result.template }); return; }
  res.type('application/vnd.openxmlformats-officedocument.wordprocessingml.document').setHeader('Content-Disposition', `attachment; filename="hop-dong-${req.params.id}.docx"`);
  res.send(result.buffer);
}));
export default router;
