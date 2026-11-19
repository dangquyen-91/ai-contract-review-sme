import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/ApiResponse';
import * as service from '../services/drafting/managedTemplates.service';

export const listManagedTemplatesHandler = asyncHandler(async (req, res) => {
  ok(res, await service.listManagedTemplates(Number(req.query.page), String(req.query.q ?? '')));
});
export const getManagedTemplateHandler = asyncHandler(async (req, res) => {
  ok(res, await service.getManagedTemplate(req.params.id));
});
export const createManagedTemplateHandler = asyncHandler(async (req, res) => {
  ok(res, await service.createManagedTemplate(req.user!.sub, req.body.code, req.body.name), 201);
});
export const saveManagedTemplateHandler = asyncHandler(async (req, res) => {
  ok(
    res,
    await service.saveManagedTemplate(
      req.user!.sub,
      req.params.id,
      req.body.revision,
      req.body.definition,
    ),
  );
});
export const publishManagedTemplateHandler = asyncHandler(async (req, res) => {
  ok(res, await service.publishManagedTemplate(req.user!.sub, req.params.id, req.body.revision));
});
export const retireManagedTemplateHandler = asyncHandler(async (req, res) => {
  ok(res, await service.retireManagedTemplate(req.user!.sub, req.params.id, req.body.revision));
});
export const deleteManagedTemplateHandler = asyncHandler(async (req, res) => {
  ok(res, await service.deleteManagedTemplate(req.params.id, req.body.revision));
});
