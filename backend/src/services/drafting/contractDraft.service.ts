import mongoose, { FilterQuery, InferSchemaType } from 'mongoose';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { AppError } from '../../errors/AppError';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { ContractDraftModel } from '../../models/contractDraft.model';
import { OrganizationModel } from '../../models/organization.model';
import { UserModel } from '../../models/user.model';
import { ContractModel } from '../../models/contract.model';
import { ContractVersionModel } from '../../models/contractVersion.model';
import { AccessTokenPayload } from '../../middlewares/auth.middleware';
import { DraftInput, inputErrors, updateDraftSchema } from '../../validations/contractDraft.validation';
import { CONTRACT_TEMPLATES, ContractTemplate, getTemplate, TemplateCode } from './templates';
import { generateDraftContent } from './generation.service';
import { createDraftDocx } from './docx.service';
import { deleteContractFile, uploadContractFile } from '../contract/storage.service';
import { countDocxPages } from '../contract/documentPageCount.service';
import { reserveUsage, finishUsage } from '../billing/usage.service';

type Draft = InferSchemaType<typeof ContractDraftModel.schema>;
const lockLifetime = 120_000;
const unlocked = () => ({ $or: [{ generationStartedAt: null }, { generationStartedAt: { $lte: new Date(Date.now() - lockLifetime) } }] });

async function requireBusiness(actor: AccessTokenPayload) {
  if (!actor.orgId || !['owner', 'staff'].includes(actor.role)) throw AppError.forbidden('Chức năng này chỉ dành cho Owner và Staff trong doanh nghiệp.');
  const member = await UserModel.findOne({ _id: actor.sub, orgId: actor.orgId, isActive: true }).populate('roleId');
  if (!member || (member.roleId as unknown as { code: string })?.code !== actor.role) throw AppError.forbidden('Quyền truy cập tổ chức đã thay đổi.');
  const organization = await OrganizationModel.findById(actor.orgId);
  if (!organization || organization.isPersonal) throw AppError.forbidden('Tài khoản chưa thuộc doanh nghiệp.');
  return organization;
}
function scope(actor: AccessTokenPayload, id?: string): FilterQuery<Draft> {
  return { orgId: actor.orgId, ...(id ? { _id: id } : {}), ...(actor.role === 'staff' ? { createdBy: actor.sub } : {}) };
}
function view(draft: InstanceType<typeof ContractDraftModel>) {
  return {
    id: draft.id, title: draft.title, templateCode: draft.templateCode, templateVersion: draft.templateVersion,
    template: JSON.parse(draft.templateJson),
    ourParty: draft.ourParty, input: JSON.parse(draft.inputJson), organization: JSON.parse(draft.organizationJson),
    content: draft.content, status: draft.status, revision: draft.revision,
    createdBy: draft.createdBy.toString(), createdAt: draft.createdAt, updatedAt: draft.updatedAt,
    notes: JSON.parse(draft.notes || '[]'), decisionNote: draft.decisionNote,
    generatedAt: draft.generatedAt, generatedByModel: draft.generatedByModel,
    generationStartedAt: draft.generationStartedAt,
    approvedAt: draft.approvedAt, contractId: draft.contractId?.toString() ?? null,
  };
}
function validateInput(code: TemplateCode, input: Record<string, string>, ourParty: string, complete = false, template: ContractTemplate = getTemplate(code)) {
  if (!template.parties.some(party => party.code === ourParty)) throw AppError.badRequest('Vai trò doanh nghiệp không hợp lệ.');
  const errors = inputErrors(code, input, complete, template);
  if (errors.length) throw AppError.badRequest(errors.join('. '));
}
async function findDraft(actor: AccessTokenPayload, id: string) {
  const draft = await ContractDraftModel.findOne(scope(actor, id));
  if (!draft) throw AppError.notFound('Không tìm thấy bản nháp hợp đồng.');
  return draft;
}
function requireOwner(actor: AccessTokenPayload) {
  if (actor.role !== 'owner') throw AppError.forbidden('Chỉ Owner được thực hiện thao tác này.');
}

export async function templateCatalog(actor: AccessTokenPayload) {
  const organization = await requireBusiness(actor);
  return { templates: CONTRACT_TEMPLATES.map(({ sections: _sections, ...template }) => template), organization: { name: organization.name, taxCode: organization.taxCode ?? '', address: organization.address ?? '' }, role: actor.role };
}
export async function listDrafts(actor: AccessTokenPayload, page: number) {
  await requireBusiness(actor);
  const filter = scope(actor);
  const [items, total] = await Promise.all([
    ContractDraftModel.find(filter).select('title templateCode status revision createdBy updatedAt contractId generationStartedAt').sort({ updatedAt: -1, _id: -1 }).skip((page - 1) * 20).limit(20),
    ContractDraftModel.countDocuments(filter),
  ]);
  return { items: items.map(draft => ({ id: draft.id, title: draft.title, templateCode: draft.templateCode, status: draft.status, revision: draft.revision, createdBy: draft.createdBy.toString(), updatedAt: draft.updatedAt, contractId: draft.contractId?.toString() ?? null })), total, page, pages: Math.max(1, Math.ceil(total / 20)) };
}
export async function getDraft(actor: AccessTokenPayload, id: string) {
  await requireBusiness(actor);
  return view(await findDraft(actor, id));
}
export async function createDraft(actor: AccessTokenPayload, input: DraftInput) {
  const organization = await requireBusiness(actor);
  const defaults = Object.fromEntries(getTemplate(input.templateCode).fields.filter(field => field.defaultValue).map(field => [field.key, field.defaultValue!])) as Record<string, string>;
  const values = { ...defaults, companyAddress: organization.address ?? '', companyTaxCode: organization.taxCode ?? '', ...input.input };
  validateInput(input.templateCode, values, input.ourParty);
  const draft = await ContractDraftModel.create({
    orgId: actor.orgId, createdBy: actor.sub, title: input.title,
    templateCode: input.templateCode, templateVersion: getTemplate(input.templateCode).version, ourParty: input.ourParty,
    templateJson: JSON.stringify(getTemplate(input.templateCode)),
    inputJson: JSON.stringify(values), organizationJson: JSON.stringify({ name: organization.name, taxCode: organization.taxCode ?? '', address: organization.address ?? '' }),
  });
  return view(draft);
}
export async function updateDraft(actor: AccessTokenPayload, id: string, input: z.infer<typeof updateDraftSchema>) {
  await requireBusiness(actor);
  const existing = await findDraft(actor, id);
  if (existing.revision !== input.revision) throw AppError.conflict('Bản nháp đã thay đổi. Vui lòng tải lại.');
  validateInput(existing.templateCode as TemplateCode, input.input, input.ourParty, false, JSON.parse(existing.templateJson));
  const changed = existing.ourParty !== input.ourParty || JSON.stringify(JSON.parse(existing.inputJson)) !== JSON.stringify(input.input);
  const draft = await ContractDraftModel.findOneAndUpdate({ ...scope(actor, id), status: 'draft', revision: input.revision, ...unlocked() }, {
    $set: { title: input.title, ourParty: input.ourParty, inputJson: JSON.stringify(input.input), content: changed ? '' : input.content, ...(changed ? { generatedAt: null, generatedByModel: null, notes: '[]' } : {}) },
    $inc: { revision: 1 }, $unset: { generationToken: 1, generationStartedAt: 1 },
  }, { new: true });
  if (!draft) throw AppError.conflict('Bản nháp đã thay đổi, đang tạo bằng AI hoặc không còn ở trạng thái chỉnh sửa. Vui lòng tải lại.');
  return view(draft);
}

export async function copyToLatestTemplate(actor: AccessTokenPayload, id: string, revision: number) {
  await requireBusiness(actor);
  const draft = await findDraft(actor, id);
  if (draft.revision !== revision) throw AppError.conflict('Bản nháp đã thay đổi. Vui lòng tải lại.');
  const code = draft.templateCode as TemplateCode;
  const template = getTemplate(code);
  const oldInput = JSON.parse(draft.inputJson) as Record<string, string>;
  const input = Object.fromEntries(template.fields.filter(field => oldInput[field.key] !== undefined).map(field => [field.key, oldInput[field.key]]));
  return createDraft(actor, { templateCode: code, title: `${draft.title.slice(0, 180)} (mẫu v${template.version})`, ourParty: draft.ourParty, input });
}
export async function generateDraft(actor: AccessTokenPayload, id: string, revision: number) {
  await requireBusiness(actor);
  const existing = await findDraft(actor, id);
  if (existing.revision !== revision) throw AppError.conflict('Bản nháp đã thay đổi. Vui lòng tải lại.');
  const code = existing.templateCode as TemplateCode;
  const input = JSON.parse(existing.inputJson) as Record<string, string>;
  validateInput(code, input, existing.ourParty, true, JSON.parse(existing.templateJson));
  const generationToken = randomBytes(24).toString('hex');
  const locked = await ContractDraftModel.findOneAndUpdate({ ...scope(actor, id), status: 'draft', revision, ...unlocked() }, { $set: { generationToken, generationStartedAt: new Date() } }, { new: true });
  if (!locked) throw AppError.conflict('Bản nháp đã thay đổi hoặc đang được tạo. Vui lòng tải lại.');
  let usageRunId: string | undefined;
  try {
    const { run } = await reserveUsage({ orgId: actor.orgId!, userId: actor.sub, draftId: id, kind: 'drafting', idempotencyKey: generationToken, payload: { revision } }, new Date(), lockLifetime);
    usageRunId = run.id;
    const generated = await generateDraftContent(code, input, JSON.parse(existing.organizationJson).name, existing.ourParty, JSON.parse(existing.templateJson));
    await requireBusiness(actor);
    await finishUsage(actor.orgId!, run.id, true, { draftId: id, revision: revision + 1 }, async session => {
      const updated = await ContractDraftModel.updateOne({ ...scope(actor, id), status: 'draft', revision, generationToken }, {
        $set: { content: generated.content, notes: JSON.stringify(generated.notes), generatedAt: new Date(), generatedByModel: env.GEMINI_MODEL },
        $inc: { revision: 1 }, $unset: { generationToken: 1, generationStartedAt: 1 },
      }, { session });
      if (!updated.modifiedCount) throw AppError.conflict('Bản nháp đã thay đổi. Nội dung mới chưa được lưu.');
    });
    return view(await findDraft(actor, id));
  } catch (error) {
    if (usageRunId) await finishUsage(actor.orgId!, usageRunId, false);
    throw error;
  } finally {
    await ContractDraftModel.updateOne({ _id: id, generationToken }, { $unset: { generationToken: 1, generationStartedAt: 1 } });
  }
}
export async function decideDraft(actor: AccessTokenPayload, id: string, revision: number, action: 'submit' | 'approve' | 'return', note: string) {
  await requireBusiness(actor);
  const draft = await findDraft(actor, id);
  if (draft.revision !== revision) throw AppError.conflict('Bản nháp đã thay đổi. Vui lòng tải lại.');
  if (action !== 'submit') requireOwner(actor);
  if (action === 'return' && !note.trim()) throw AppError.badRequest('Vui lòng nhập lý do yêu cầu chỉnh sửa.');
  if (action !== 'return') {
    validateInput(draft.templateCode as TemplateCode, JSON.parse(draft.inputJson), draft.ourParty, true, JSON.parse(draft.templateJson));
    if (draft.content.trim().length < 200) throw AppError.badRequest('Vui lòng tạo và kiểm tra nội dung hợp đồng trước.');
  }
  const allowed = action === 'approve' ? ['draft', 'pending_approval'] : action === 'return' ? ['pending_approval'] : ['draft'];
  const updated = await ContractDraftModel.findOneAndUpdate({ ...scope(actor, id), revision, status: { $in: allowed }, ...unlocked() }, {
    $set: { status: action === 'approve' ? 'approved' : action === 'submit' ? 'pending_approval' : 'draft', decisionNote: note, ...(action === 'approve' ? { approvedBy: actor.sub, approvedAt: new Date() } : {}) },
    $inc: { revision: 1 }, $unset: { generationToken: 1, generationStartedAt: 1 },
  }, { new: true });
  if (!updated) throw AppError.conflict('Bản nháp đã thay đổi hoặc không thể thực hiện thao tác này. Vui lòng tải lại.');
  return view(updated);
}
export async function exportDraft(actor: AccessTokenPayload, id: string) {
  await requireBusiness(actor);
  const draft = await findDraft(actor, id);
  if (draft.status !== 'approved') throw AppError.conflict('Owner cần duyệt bản nháp trước khi xuất hợp đồng.');
  return { content: draft.content, title: draft.title, buffer: await createDraftDocx(draft.content) };
}
export async function publishDraft(actor: AccessTokenPayload, id: string, revision: number) {
  await requireBusiness(actor); requireOwner(actor);
  const draft = await findDraft(actor, id);
  if (draft.contractId) return { contractId: draft.contractId.toString() };
  if (draft.status !== 'approved' || draft.revision !== revision) throw AppError.conflict('Vui lòng duyệt và tải lại bản nháp trước khi chuyển sang rà soát.');
  const filename = `hop-dong-${draft.templateCode}-${draft.id}.docx`;
  const buffer = await createDraftDocx(draft.content);
  const pageCount = await countDocxPages(buffer);
  const stored = await uploadContractFile(buffer, actor.orgId!, filename);
  try {
    await requireBusiness(actor);
    const contractId = await mongoose.connection.transaction(async session => {
      const [contract] = await ContractModel.create([{ orgId: actor.orgId, uploadedBy: actor.sub, title: draft.title, type: draft.templateCode, ourParty: draft.ourParty,
        classification: { status: 'completed', outcome: 'supported', type: draft.templateCode, ourParty: draft.ourParty, source: 'user', confirmedAt: new Date() } }], { session });
      await ContractVersionModel.create([{ contractId: contract._id, versionNumber: 1, createdBy: actor.sub, extractedText: draft.content, extractionStatus: 'completed', extractionQuality: { method: 'docx', pageCount, ocrPageCount: 0, lowConfidence: false }, fileKey: stored.key, fileResourceType: stored.resourceType, fileDeliveryType: stored.deliveryType, fileFormat: stored.format, fileName: filename, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }], { session });
      const updated = await ContractDraftModel.updateOne({ ...scope(actor, id), status: 'approved', revision, contractId: null }, { $set: { contractId: contract._id }, $inc: { revision: 1 } }, { session });
      if (!updated.modifiedCount) throw AppError.conflict('Bản nháp đã được chuyển sang rà soát. Vui lòng tải lại.');
      return contract.id;
    });
    return { contractId };
  } catch (error) {
    await deleteContractFile(stored).catch(() => logger.warn('Failed to clean up a generated contract file'));
    throw error;
  }
}
