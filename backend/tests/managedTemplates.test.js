process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/unused';
process.env.JWT_ACCESS_SECRET = 'managed-template-test-access';
process.env.JWT_REFRESH_SECRET = 'managed-template-test-refresh';
process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
process.env.MONGOMS_DOWNLOAD_DIR = require('path').join(__dirname, '../node_modules/.cache/mongodb-memory-server');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const request = require('supertest');
const { createApp } = require('../dist/app');
require('../dist/config/logger').logger.silent = true;
const { UserModel } = require('../dist/models/user.model');
const { ManagedTemplateModel, ManagedTemplateVersionModel } = require('../dist/models/managedTemplate.model');
const { ContractDraftModel } = require('../dist/models/contractDraft.model');
const { MembershipModel } = require('../dist/models/membership.model');
const { OrganizationModel } = require('../dist/models/organization.model');
const { sessionFor } = require('../dist/services/identity/auth.service');
const { getTemplate } = require('../dist/services/drafting/templates');
let app, repl, manager, personal;
const base = '/api/v1/manager/contract-templates';
async function member(role) {
  const user = await UserModel.create({ name: 'Template tester', email: `${role}-${new mongoose.Types.ObjectId()}@example.com`, passwordHash: 'unused', emailVerifiedAt: new Date(), ...(['manager', 'administrator', 'expert'].includes(role) ? { platformRole: role } : {}) });
  if (['owner', 'staff'].includes(role)) {
    const organization = await OrganizationModel.create({ name: 'Template permission test' });
    await MembershipModel.create({ userId: user.id, orgId: organization.id, role });
  }
  user.testToken = (await sessionFor(user)).accessToken;
  return user;
}
const auth = user => `Bearer ${user.testToken}`;
const call = (method, path = '', user = manager) => request(app)[method](base + path).set('Authorization', auth(user));
const editDefinition = template => { const { code, name, description, legalBasis, fields, sections, reviewNotes = [] } = template; return { code, name, description, legalBasis, fields, sections, reviewNotes }; };
async function create(code = 'housing_purchase') {
  const response = await call('post').send({ code, name: `Mẫu quản lý ${new mongoose.Types.ObjectId()}` });
  expect(response.status).toBe(201); return response.body.data;
}
async function publish(template) {
  const response = await call('post', `/${template.id}/publish`).send({ revision: template.revision });
  expect(response.status).toBe(200); return response.body.data;
}
const catalog = () => request(app).get('/api/v1/contract-drafts/templates').set('Authorization', auth(personal));
const draft = template => request(app).post('/api/v1/contract-drafts').set('Authorization', auth(personal)).send({ templateCode: template.code, templateId: template.id, title: 'Hợp đồng theo mẫu quản lý', ourParty: 'buyer', input: {}, editorMode: 'studio' });
beforeAll(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(repl.getUri());
  await Promise.all([ManagedTemplateModel.init(), ManagedTemplateVersionModel.init()]);
  manager = await member('manager'); personal = await member('user'); app = createApp();
});
afterAll(async () => { await mongoose.disconnect(); await repl.stop(); });

test('only system Manager can manage templates; users cannot self-publish', async () => {
  expect((await request(app).get(base)).status).toBe(401);
  for (const role of ['user', 'owner', 'staff', 'expert', 'administrator']) expect((await call('get', '', await member(role))).status).toBe(403);
});
test('catalog bootstraps six supported base types once and paginates safely', async () => {
  const result = await call('get', '?page=1');
  expect(result.status).toBe(200); expect(result.body.data.total).toBe(6);
  await call('get'); expect(await ManagedTemplateModel.countDocuments()).toBe(6);
  expect((await call('get', '?page=0')).status).toBe(400);
  expect((await call('get', '?q=%5B')).status).toBe(200);
});
test.each(['labor', 'sales', 'service', 'office_lease', 'housing_purchase', 'life_insurance'])('%s base can be cloned, validated and published with compatible renderer version', async code => {
  const created = await create(code);
  const saved = await call('patch', `/${created.id}`).send({ revision: 0, definition: editDefinition(created.definition) });
  expect(saved.status).toBe(200);
  const published = await publish(saved.body.data);
  expect(published.publishedVersion).toBeGreaterThanOrEqual(getTemplate(code).version);
});
test('unpublished changes stay private; publishing creates immutable snapshots for new drafts only', async () => {
  let template = await create();
  expect((await catalog()).body.data.templates.some(item => item.id === template.id)).toBe(false);
  expect((await draft(template)).status).toBe(409);
  template = await publish(template);
  const first = await draft(template); expect(first.status).toBe(201);
  const oldSnapshot = (await ContractDraftModel.findById(first.body.data.id)).templateJson;
  const definition = editDefinition(template.definition); definition.name = 'Phiên bản mới cần kiểm tra'; definition.sections[0].body += '\nĐiều kiện bổ sung được hai bên xác nhận.';
  const saved = await call('patch', `/${template.id}`).send({ revision: template.revision, definition });
  expect(saved.status).toBe(200);
  expect((await catalog()).body.data.templates.find(item => item.id === template.id).name).toBe(template.definition.name);
  expect((await call('patch', `/${template.id}`).send({ revision: template.revision, definition })).status).toBe(409);
  const next = await publish(saved.body.data);
  expect((await catalog()).body.data.templates.find(item => item.id === template.id).name).toBe(definition.name);
  expect((await ContractDraftModel.findById(first.body.data.id)).templateJson).toBe(oldSnapshot);
  const second = await draft(next); expect(second.status).toBe(201);
  expect(second.body.data.templateVersion).toBe(next.publishedVersion);
  expect(await ManagedTemplateVersionModel.countDocuments({ templateId: template.id })).toBe(2);
});
test('retired templates remain readable in saved drafts and cannot be recreated or silently reseeded', async () => {
  const template = await publish(await create());
  const created = await draft(template); expect(created.status).toBe(201);
  expect((await call('delete', `/${template.id}`).send({ revision: template.revision })).status).toBe(409);
  const retired = await call('post', `/${template.id}/retire`).send({ revision: template.revision }); expect(retired.status).toBe(200);
  expect((await catalog()).body.data.templates.some(item => item.id === template.id)).toBe(false);
  expect((await draft(template)).status).toBe(409);
  expect((await request(app).get(`/api/v1/contract-drafts/${created.body.data.id}`).set('Authorization', auth(personal))).status).toBe(200);
  expect((await call('get', `/${template.id}`)).body.data.status).toBe('retired');
});
test('only never-published drafts can be deleted and new contracts cannot bypass account scope', async () => {
  const template = await create('office_lease');
  expect((await draft(template)).status).toBe(403);
  expect((await call('delete', `/${template.id}`).send({ revision: template.revision })).status).toBe(200);
  expect((await call('get', `/${template.id}`)).status).toBe(404);
});
test('concurrent publication uses revision checks and produces exactly one version', async () => {
  const template = await create();
  const results = await Promise.all([1, 2].map(() => call('post', `/${template.id}/publish`).send({ revision: 0 })));
  expect(results.map(result => result.status).sort()).toEqual([200, 409]);
  expect(await ManagedTemplateVersionModel.countDocuments({ templateId: template.id })).toBe(1);
});
test('invalid field references, defaults and missing core fields are rejected before publication', async () => {
  const template = await create();
  for (const modify of [
    definition => definition.fields.pop(),
    definition => { definition.sections[0].body += '{{notDefined}}'; },
    definition => { definition.fields.find(field => field.key === 'price').defaultValue = '-10'; },
    definition => { definition.sections[0].body = '<script>alert(1)</script>'; },
  ]) {
    const definition = editDefinition(structuredClone(template.definition)); modify(definition);
    expect((await call('patch', `/${template.id}`).send({ revision: 0, definition })).status).toBe(400);
  }
});

test('extra fields appear in new user drafts and catalog reads never restore a retired base template', async () => {
  const template = await create();
  const definition = editDefinition(template.definition);
  definition.fields.push({ key: 'customContact', label: 'Người liên hệ giao nhận', kind: 'text', group: 'terms', required: true, defaultValue: 'Nguyễn Văn An' });
  definition.sections[0].body += '\nNgười liên hệ: {{customContact}}.';
  const saved = await call('patch', `/${template.id}`).send({ revision: 0, definition }); expect(saved.status).toBe(200);
  const published = await publish(saved.body.data);
  const created = await draft(published); expect(created.status).toBe(201);
  expect(created.body.data.input.customContact).toBe('Nguyễn Văn An');
  expect(created.body.data.content).toContain('Nguyễn Văn An');
  const builtin = await ManagedTemplateModel.findOne({ builtinKey: 'housing_purchase' });
  const updatedAt = builtin.updatedAt.toISOString();
  await catalog();
  expect((await ManagedTemplateModel.findById(builtin.id)).updatedAt.toISOString()).toBe(updatedAt);
  expect((await call('post', `/${builtin.id}/retire`).send({ revision: builtin.revision })).status).toBe(200);
  expect((await catalog()).body.data.templates.some(item => item.id === builtin.id)).toBe(false);
  expect((await ManagedTemplateModel.findById(builtin.id)).status).toBe('retired');
});

test('the library groups templates by a category the Manager publishes, defaulting by contract type', async () => {
  const before = (await catalog()).body.data.templates;
  expect(before.find((item) => item.code === 'labor').category).toBe('Lao động');
  expect(before.find((item) => item.code === 'life_insurance').category).toBe('Bảo hiểm');
  const template = await create();
  const definition = { ...editDefinition(template.definition), category: '  Nhà ở  ' };
  const saved = await call('patch', `/${template.id}`).send({ revision: template.revision, definition });
  expect(saved.status).toBe(200);
  expect(saved.body.data.definition.category).toBe('Nhà ở');
  // A saved draft does not change the library until it is published.
  expect((await catalog()).body.data.templates.some((item) => item.id === template.id)).toBe(false);
  const published = await publish(saved.body.data);
  const listed = (await catalog()).body.data.templates.find((item) => item.id === published.id);
  expect(listed.category).toBe('Nhà ở');
  // Clearing the category falls back to the default of the contract type.
  const cleared = await call('patch', `/${published.id}`).send({ revision: published.revision, definition: { ...definition, category: '' } });
  await publish(cleared.body.data);
  expect((await catalog()).body.data.templates.find((item) => item.id === published.id).category).toBe('Bất động sản');
});

test('a category longer than 60 characters is rejected', async () => {
  const template = await create();
  const response = await call('patch', `/${template.id}`).send({ revision: template.revision, definition: { ...editDefinition(template.definition), category: 'x'.repeat(61) } });
  expect(response.status).toBe(400);
});

const previewText = (node) => (node.text ?? '') + (node.content ?? []).map(previewText).join('') + (node.type === 'templateField' ? `[${node.attrs.key}]` : '');

test('a Manager previews unsaved edits as the contract users will open, without saving them', async () => {
  const template = await create('life_insurance');
  const definition = editDefinition(template.definition);
  definition.sections[0].title = 'ĐIỀU KHOẢN XEM TRƯỚC';
  definition.sections[0].body += '\nNội dung chưa lưu dành cho {{insuredPerson}}.';
  const response = await call('post', '/preview').send({ definition });
  expect(response.status).toBe(200);
  expect(response.headers['cache-control']).toBe('no-store');
  const text = previewText(response.body.data.document);
  expect(text).toContain('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM');
  expect(text).toContain('Nội dung chưa lưu dành cho');
  expect(response.body.data.template.sections[0].title).toBe('ĐIỀU KHOẢN XEM TRƯỚC');
  // Today's date fills the signing date, as in a new draft.
  const signing = JSON.stringify(response.body.data.document).match(/"key":"signingDate","value":"(\d{4}-\d{2}-\d{2})"/);
  expect(signing?.[1]).toBe(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }));
  const stored = await ManagedTemplateModel.findById(template.id);
  expect(stored.revision).toBe(template.revision);
  expect(stored.draftJson).not.toContain('Nội dung chưa lưu');
});

test('an invalid definition cannot be previewed, and only a Manager may preview', async () => {
  const template = await create();
  const definition = editDefinition(template.definition);
  expect((await call('post', '/preview').send({ definition: { ...definition, name: '' } })).status).toBe(400);
  expect((await call('post', '/preview', personal).send({ definition })).status).toBe(403);
});
