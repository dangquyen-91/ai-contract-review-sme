import mongoose from 'mongoose';
import { AppError } from '../../errors/AppError';
import {
  ManagedTemplateModel,
  ManagedTemplateVersionModel,
} from '../../models/managedTemplate.model';
import { CONTRACT_TEMPLATES, getTemplate, type ContractTemplate } from './templates';
import { withGroups } from './templateFields';
import { accountTemplate, assertTemplateScope } from './templatePolicy';
import { templateCategory } from './templateCategories';
import { buildStudioTemplate } from './studioTemplate';
import {
  type TemplateDefinition,
  managedTemplateCodes,
  templateDefinitionSchema,
} from '../../validations/managedTemplate.validation';
import { searchPattern } from '../../utils/regex';

type RecordDocument = InstanceType<typeof ManagedTemplateModel>;

// Built-in definitions bootstrap the database once; subsequent releases belong to Manager.
export async function ensureManagedTemplates() {
  await ManagedTemplateModel.init();
  await ManagedTemplateModel.bulkWrite(
    CONTRACT_TEMPLATES.filter((item) => item.code !== 'rental').map((template) => ({
      updateOne: {
        filter: { builtinKey: template.code },
        update: {
          $setOnInsert: {
            createdAt: new Date(),
            updatedAt: new Date(),
            builtinKey: template.code,
            code: template.code,
            status: 'published',
            revision: 0,
            name: template.name,
            description: template.description,
            publishedVersion: template.version,
            draftJson: JSON.stringify(template),
            publishedJson: JSON.stringify(template),
            hasUnpublishedChanges: false,
          },
        },
        upsert: true,
        timestamps: false,
      },
    })),
    { ordered: false },
  );
}
function metadata(record: RecordDocument) {
  return {
    id: record.id,
    code: record.code,
    status: record.status,
    revision: record.revision,
    publishedVersion: record.publishedVersion,
    hasUnpublishedChanges: record.hasUnpublishedChanges,
    updatedAt: record.updatedAt,
  };
}
function view(record: RecordDocument) {
  return {
    ...metadata(record),
    definition: JSON.parse(record.draftJson) as ContractTemplate,
    publishedDefinition: record.publishedJson
      ? (JSON.parse(record.publishedJson) as ContractTemplate)
      : null,
  };
}
function summary(record: RecordDocument) {
  return { ...metadata(record), name: record.name, description: record.description };
}
export async function listManagedTemplates(page: number, q: string) {
  await ensureManagedTemplates();
  const search = q ? searchPattern(q) : null;
  const filter = search ? { $or: [{ name: search }, { description: search }] } : {};
  const [records, total] = await Promise.all([
    ManagedTemplateModel.find(filter)
      .select('-draftJson -publishedJson')
      .sort({ updatedAt: -1, _id: -1 })
      .skip((page - 1) * 20)
      .limit(20),
    ManagedTemplateModel.countDocuments(filter),
  ]);
  return { items: records.map(summary), total, page, pages: Math.max(1, Math.ceil(total / 20)) };
}
export async function getManagedTemplate(id: string) {
  const record = await ManagedTemplateModel.findById(id);
  if (!record) throw AppError.notFound('Không tìm thấy mẫu hợp đồng.');
  const versions = await ManagedTemplateVersionModel.find({ templateId: id })
    .sort({ version: -1 })
    .select('version publishedAt publishedBy')
    .lean();
  return { ...view(record), versions };
}
export async function createManagedTemplate(
  userId: string,
  code: (typeof managedTemplateCodes)[number],
  name: string,
) {
  await ensureManagedTemplates();
  const current = await ManagedTemplateModel.findOne({ builtinKey: code, status: 'published' });
  const base = current?.publishedJson
    ? (JSON.parse(current.publishedJson) as ContractTemplate)
    : getTemplate(code);
  const record = await ManagedTemplateModel.create({
    code,
    name,
    description: base.description,
    draftJson: JSON.stringify({ ...base, name, version: 0 }),
    createdBy: userId,
    updatedBy: userId,
  });
  return getManagedTemplate(record.id);
}
export async function saveManagedTemplate(
  userId: string,
  id: string,
  revision: number,
  definition: TemplateDefinition,
) {
  const parsed = templateDefinitionSchema.parse(definition);
  const existing = await ManagedTemplateModel.findById(id);
  if (!existing) throw AppError.notFound('Không tìm thấy mẫu hợp đồng.');
  if (existing.code !== parsed.code)
    throw AppError.badRequest('Không thay đổi loại hợp đồng của mẫu đã tạo.');
  const base = getTemplate(parsed.code);
  const resolved = withGroups({ ...base, ...parsed, version: existing.publishedVersion });
  const updated = await ManagedTemplateModel.findOneAndUpdate(
    { _id: id, revision },
    {
      $set: {
        name: parsed.name,
        description: parsed.description,
        draftJson: JSON.stringify(resolved),
        hasUnpublishedChanges: true,
        updatedBy: userId,
      },
      $inc: { revision: 1 },
    },
    { new: true },
  );
  if (!updated) throw AppError.conflict('Mẫu đã thay đổi. Hãy tải lại trước khi lưu.');
  return getManagedTemplate(id);
}
/**
 * The contract a user would open from this definition, built from unsaved edits with the
 * same builder as a new draft: default values and today's dates, other fields left blank.
 */
export function previewManagedTemplate(definition: TemplateDefinition) {
  const parsed = templateDefinitionSchema.parse(definition);
  const base = getTemplate(parsed.code);
  const template = withGroups({ ...base, ...parsed, version: base.version });
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const values = Object.fromEntries(
    template.fields.flatMap((field) =>
      field.defaultValue
        ? [[field.key, field.defaultValue]]
        : ['signingDate', 'startDate'].includes(field.key)
          ? [[field.key, today]]
          : field.key === 'termType'
            ? [[field.key, 'fixed']]
            : [],
    ),
  );
  return { template, document: buildStudioTemplate(template, values, '', template.parties[0].code) };
}
export async function publishManagedTemplate(userId: string, id: string, revision: number) {
  await mongoose.connection.transaction(async (session) => {
    const record = await ManagedTemplateModel.findOne({ _id: id, revision }).session(session);
    if (!record) throw AppError.conflict('Mẫu đã thay đổi hoặc không tồn tại. Hãy tải lại.');
    if (!record.hasUnpublishedChanges && record.status === 'published')
      throw AppError.conflict('Mẫu không có thay đổi để phát hành.');
    const definition = JSON.parse(record.draftJson) as ContractTemplate;
    templateDefinitionSchema.parse({
      code: definition.code,
      name: definition.name,
      description: definition.description,
      legalBasis: definition.legalBasis,
      fields: definition.fields,
      sections: definition.sections,
      reviewNotes: definition.reviewNotes ?? [],
      category: definition.category,
    });
    // Re-validate the structured definition; contract drafts retain their own immutable snapshot.
    const version = Math.max(record.publishedVersion + 1, getTemplate(definition.code).version);
    const snapshot = JSON.stringify({ ...definition, version });
    if (record.publishedJson)
      await ManagedTemplateVersionModel.updateOne(
        { templateId: id, version: record.publishedVersion },
        {
          $setOnInsert: {
            templateId: id,
            version: record.publishedVersion,
            definitionJson: record.publishedJson,
          },
        },
        { upsert: true, session },
      );
    await ManagedTemplateVersionModel.create(
      [{ templateId: id, version, definitionJson: snapshot, publishedBy: userId }],
      { session },
    );
    record.publishedVersion = version;
    record.publishedJson = snapshot;
    record.draftJson = snapshot;
    record.status = 'published';
    record.hasUnpublishedChanges = false;
    record.updatedBy = new mongoose.Types.ObjectId(userId);
    record.revision++;
    await record.save({ session });
  });
  return getManagedTemplate(id);
}
export async function retireManagedTemplate(userId: string, id: string, revision: number) {
  const record = await ManagedTemplateModel.findOneAndUpdate(
    { _id: id, revision, publishedVersion: { $gt: 0 }, status: 'published' },
    { $set: { status: 'retired', updatedBy: userId }, $inc: { revision: 1 } },
    { new: true },
  );
  if (!record) throw AppError.conflict('Chỉ ngừng mẫu đã phát hành và chưa thay đổi.');
  return getManagedTemplate(id);
}
export async function deleteManagedTemplate(id: string, revision: number) {
  const result = await ManagedTemplateModel.deleteOne({
    _id: id,
    revision,
    publishedVersion: 0,
    status: 'draft',
  });
  if (!result.deletedCount)
    throw AppError.conflict('Chỉ xóa mẫu chưa từng phát hành. Mẫu đã dùng phải ngừng sử dụng.');
  return { id };
}
function forAccount(template: ContractTemplate, id: string, personal: boolean) {
  const policy = accountTemplate(template.code, personal);
  return {
    ...template,
    id,
    category: templateCategory(template),
    ...(personal && template.code === 'labor' ? { parties: policy.parties } : {}),
  };
}
export async function publishedAccountTemplates(personal: boolean) {
  await ensureManagedTemplates();
  const records = await ManagedTemplateModel.find({ status: 'published' }).sort({
    createdAt: 1,
    _id: 1,
  });
  records.sort((left, right) => {
    const rank = (record: RecordDocument) =>
      record.builtinKey
        ? CONTRACT_TEMPLATES.findIndex((item) => item.code === record.code)
        : CONTRACT_TEMPLATES.length;
    return rank(left) - rank(right);
  });
  return records
    .filter((record) => {
      try {
        assertTemplateScope(record.code, personal);
        return true;
      } catch {
        return false;
      }
    })
    .map((record) => forAccount(JSON.parse(record.publishedJson!), record.id, personal));
}
export async function publishedAccountTemplate(code: string, personal: boolean, id?: string) {
  assertTemplateScope(code, personal);
  await ensureManagedTemplates();
  const record = await ManagedTemplateModel.findOne({
    ...(id ? { _id: id } : { builtinKey: code }),
    code,
    status: 'published',
  });
  if (!record?.publishedJson)
    throw AppError.conflict('Mẫu chưa phát hành hoặc đã ngừng sử dụng. Hãy chọn mẫu khác.');
  return forAccount(JSON.parse(record.publishedJson), record.id, personal);
}
