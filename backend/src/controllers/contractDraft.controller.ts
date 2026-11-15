import type { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/ApiResponse';
import * as service from '../services/drafting/contractDraft.service';
import * as assistant from '../services/drafting/studioAssistant.service';
import { readStudioReference } from '../services/drafting/studioReference.service';
import { listStudioLaws, previewStudioLaw } from '../services/drafting/studioLegalSources.service';
import { studioLawQuerySchema } from '../validations/studio.validation';

export const templateCatalogHandler = asyncHandler(async (req, res) => {
  ok(res, await service.templateCatalog(req.user!));
});

export const listStudioLawsHandler = asyncHandler(async (req, res) => {
  await service.requireDraftAccess(req.user!);
  ok(res, await listStudioLaws(req.query as unknown as z.infer<typeof studioLawQuerySchema>));
});

export const previewStudioLawHandler = asyncHandler(async (req, res) => {
  await service.requireDraftAccess(req.user!);
  ok(res, await previewStudioLaw(req.params.sourceId.toLowerCase(), Number(req.query.page)));
});

export const listDraftsHandler = asyncHandler(async (req, res) => {
  ok(res, await service.listDrafts(req.user!, Number(req.query.page)));
});

export const createDraftHandler = asyncHandler(async (req, res) => {
  ok(res, await service.createDraft(req.user!, req.body), 201);
});

export const getDraftHandler = asyncHandler(async (req, res) => {
  ok(res, await service.getDraft(req.user!, req.params.id));
});

export const deleteDraftHandler = asyncHandler(async (req, res) => {
  ok(res, await service.deleteDraft(req.user!, req.params.id, req.body.revision));
});

export const pinDraftHandler = asyncHandler(async (req, res) => {
  ok(res, await service.pinDraft(req.user!, req.params.id, req.body.pinned));
});

export const updateDraftHandler = asyncHandler(async (req, res) => {
  ok(res, await service.updateDraft(req.user!, req.params.id, req.body));
});

export const generateDraftHandler = asyncHandler(async (req, res) => {
  ok(res, await service.generateDraft(req.user!, req.params.id, req.body.revision));
});

export const copyToLatestTemplateHandler = asyncHandler(async (req, res) => {
  ok(res, await service.copyToLatestTemplate(req.user!, req.params.id, req.body.revision), 201);
});

export const openStudioHandler = asyncHandler(async (req, res) => {
  ok(res, await service.openStudio(req.user!, req.params.id, req.body.revision));
});

export const authorizeDraftReferenceHandler = asyncHandler(async (req, _res, next) => {
  await service.requireDraftAccess(req.user!);
  await service.findDraft(req.user!, req.params.id);
  next();
});

export const readStudioReferenceHandler = asyncHandler(async (req, res) => {
  ok(res, await readStudioReference(req.file));
});

export const assistantHistoryHandler = asyncHandler(async (req, res) => {
  ok(res, await assistant.assistantHistory(req.user!, req.params.id));
});

export const requestAssistantHandler = asyncHandler(async (req, res) => {
  ok(res, await assistant.requestAssistant(req.user!, req.params.id, req.body));
});

export const actOnProposalHandler = asyncHandler(async (req, res) => {
  ok(
    res,
    await assistant.actOnProposal(
      req.user!,
      req.params.id,
      req.params.proposalId,
      req.body.revision,
      req.body.action,
    ),
  );
});

export const decideDraftHandler = asyncHandler(async (req, res) => {
  ok(
    res,
    await service.decideDraft(
      req.user!,
      req.params.id,
      req.body.revision,
      req.body.action,
      req.body.note,
    ),
  );
});

export const publishDraftHandler = asyncHandler(async (req, res) => {
  ok(res, await service.publishDraft(req.user!, req.params.id, req.body.revision));
});

export const exportDraftHandler = asyncHandler(async (req, res) => {
  const result = await service.exportDraft(req.user!, req.params.id);
  if (req.query.format === 'print') {
    ok(res, {
      title: result.title,
      content: result.content,
      document: result.document,
      template: result.template,
    });
    return;
  }
  res
    .type('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    .setHeader('Content-Disposition', `attachment; filename="hop-dong-${req.params.id}.docx"`);
  res.send(result.buffer);
});
