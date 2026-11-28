import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/ApiResponse';
import * as service from '../services/drafting/managedTemplates.service';
import { recordAudit, requestActor } from '../services/audit/audit.service';

export const listManagedTemplatesHandler = asyncHandler(async (req, res) => {
  ok(res, await service.listManagedTemplates(Number(req.query.page), String(req.query.q ?? '')));
});
export const previewManagedTemplateHandler = asyncHandler(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  ok(res, service.previewManagedTemplate(req.body.definition));
});
export const getManagedTemplateHandler = asyncHandler(async (req, res) => {
  ok(res, await service.getManagedTemplate(req.params.id));
});
export const createManagedTemplateHandler = asyncHandler(async (req, res) => {
  const template = await service.createManagedTemplate(req.user!.sub, req.body.code, req.body.name);
  await recordAudit({ action: 'template.create', actor: requestActor(req.user), target: { type: 'template', id: template.id, label: template.definition.name }, changes: { code: template.code } });
  ok(res, template, 201);
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
  const template = await service.publishManagedTemplate(req.user!.sub, req.params.id, req.body.revision);
  await recordAudit({ action: 'template.publish', actor: requestActor(req.user), target: { type: 'template', id: template.id, label: template.definition.name }, changes: { version: template.publishedVersion } });
  ok(res, template);
});
export const retireManagedTemplateHandler = asyncHandler(async (req, res) => {
  const template = await service.retireManagedTemplate(req.user!.sub, req.params.id, req.body.revision);
  await recordAudit({ action: 'template.retire', actor: requestActor(req.user), target: { type: 'template', id: template.id, label: template.definition.name } });
  ok(res, template);
});
export const deleteManagedTemplateHandler = asyncHandler(async (req, res) => {
  const before = await service.getManagedTemplate(req.params.id).catch(() => null);
  const result = await service.deleteManagedTemplate(req.params.id, req.body.revision);
  await recordAudit({ action: 'template.delete', actor: requestActor(req.user), target: { type: 'template', id: req.params.id, label: before?.definition.name ?? null } });
  ok(res, result);
});
