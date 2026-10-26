process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/unused';
process.env.JWT_ACCESS_SECRET = 'drafts-test-access';
process.env.JWT_REFRESH_SECRET = 'drafts-test-refresh';
process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
process.env.MONGOMS_DOWNLOAD_DIR = require('path').join(__dirname, '../node_modules/.cache/mongodb-memory-server');
jest.mock('../dist/services/ai/llm.service', () => ({
  isLlmConfigured: true,
  generateJson: jest.fn(async prompt => ({
    sections: JSON.parse(prompt.match(/TEMPLATE: (.*)\nDATA:/)[1]).map(section => ({ key: section.key, addition: 'Các bên phối hợp thực hiện và thông báo bằng văn bản khi phát sinh vướng mắc.' })),
    notes: ['Kiểm tra nội dung trước khi ký.'],
  })),
}));
jest.mock('../dist/services/contract/storage.service', () => ({
  uploadContractFile: jest.fn(async () => ({ key: 'test/private/contract.docx', resourceType: 'raw', deliveryType: 'private', format: 'docx' })),
  deleteContractFile: jest.fn(async () => {}),
}));
jest.mock('../dist/services/contract/documentPageCount.service', () => ({ countDocxPages: jest.fn().mockResolvedValue(6) }));
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const request = require('supertest');
const JSZip = require('jszip');
const { createApp } = require('../dist/app');
const { logger } = require('../dist/config/logger');
logger.silent = true;
const { UserModel } = require('../dist/models/user.model');
const { OrganizationModel } = require('../dist/models/organization.model');
const { ContractDraftModel: Drafts } = require('../dist/models/contractDraft.model');
const { ContractModel } = require('../dist/models/contract.model');
const { ContractVersionModel } = require('../dist/models/contractVersion.model');
const { seedDefaultRoles, getRoleByCode } = require('../dist/services/identity/role.service');
const { tokensForUser } = require('../dist/services/identity/auth.service');
const { CONTRACT_TEMPLATES } = require('../dist/services/drafting/templates');
const { renderDraftDocument } = require('../dist/services/drafting/generation.service');
const { generateJson } = require('../dist/services/ai/llm.service');
const { uploadContractFile } = require('../dist/services/contract/storage.service');
const { createDraftDocx } = require('../dist/services/drafting/docx.service');
const { seedPlans, activatePaidSubscription, getSubscription } = require('../dist/services/billing/subscription.service');
const { PlanModel, UsageRunModel, SubscriptionPeriodModel, initializeSubscriptionModels } = require('../dist/models/subscription.model');
let repl, app, org, owner, staff, otherStaff, otherOwner, sequence = 0;
async function user(role, orgId) {
  return (await UserModel.create({ name: `Draft ${role}`, email: `draft-${++sequence}@example.com`, roleId: (await getRoleByCode(role))._id, orgId, passwordHash: 'unused', emailVerifiedAt: new Date() })).populate('roleId');
}
const bearer = member => `Bearer ${tokensForUser(member).accessToken}`;
const call = (member, method, suffix = '') => request(app)[method](`/api/v1/contract-drafts${suffix}`).set('Authorization', bearer(member));
function values(code) {
  const template = CONTRACT_TEMPLATES.find(item => item.code === code);
  return Object.fromEntries(template.fields.filter(field => field.required).map(field => [field.key,
    field.kind === 'items' ? JSON.stringify([{ name: 'Máy tính', unit: 'cái', quantity: '1', unitPrice: '30000000' }]) : field.kind === 'date' ? field.key === 'partnerBirthDate' ? '1990-01-01' : '2026-10-25' : field.kind === 'number' ? '30000000' : field.kind === 'select' ? 'fixed' : field.key === 'partnerName' ? 'Nguyễn Văn Kiểm Thử' : field.key === 'partnerIdentifier' ? '012345678901' : field.key === 'partnerAddress' ? '123 Đường Riêng, Hà Nội' : 'Thông tin kiểm thử',
  ]).concat([['endDate', '2027-10-25']]));
}
async function create(member = staff, code = 'service', input = values(code)) {
  const response = await call(member, 'post').send({ templateCode: code, title: 'Hợp đồng kiểm thử', ourParty: CONTRACT_TEMPLATES.find(item => item.code === code).parties[0].code, input });
  expect(response.status).toBe(201); return response.body.data;
}
const generate = (member, draft) => call(member, 'post', `/${draft.id}/generate`).send({ revision: draft.revision });
const decide = (member, draft, action, note = '') => call(member, 'post', `/${draft.id}/decision`).send({ revision: draft.revision, action, note });
const changes = draft => ({ revision: draft.revision, title: draft.title, ourParty: draft.ourParty, input: draft.input, content: draft.content });
beforeAll(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(repl.getUri()); await seedDefaultRoles();
  org = await OrganizationModel.create({ name: 'Doanh nghiệp thử nghiệm', taxCode: '0101234567', address: 'Hà Nội' });
  await initializeSubscriptionModels(); await seedPlans();
  const plan = await PlanModel.findOne({ code: 'business_starter' });
  await activatePaidSubscription({ orgId: org.id, planCode: plan.code, action: 'purchase', amount: plan.price, paymentReference: 'test-drafting-plan' });
  owner = await user('owner', org.id); staff = await user('staff', org.id); otherStaff = await user('staff', org.id);
  const second = await OrganizationModel.create({ name: 'Other company' }); otherOwner = await user('owner', second.id);
  app = createApp();
});
afterAll(async () => { await mongoose.disconnect(); if (repl) await repl.stop(); });

test('catalog and all draft endpoints require a business owner/staff identity', async () => {
  expect((await request(app).get('/api/v1/contract-drafts/templates')).status).toBe(401);
  for (const role of ['user', 'manager', 'expert', 'administrator']) expect((await call(await user(role), 'get', '/templates')).status).toBe(403);
  const personal = await OrganizationModel.create({ name: 'Personal', isPersonal: true });
  expect((await call(await user('owner', personal.id), 'get', '/templates')).status).toBe(403);
  const response = await call(staff, 'get', '/templates');
  expect(response.status).toBe(200);
  expect(response.body.data.templates.map(template => template.code)).toEqual(['labor', 'service', 'sales']);
});

test('creation snapshots organization data; sensitive fields are encrypted and stale edits fail', async () => {
  const draft = await create();
  expect(draft.organization.name).toBe(org.name);
  const raw = await Drafts.collection.findOne({ _id: new mongoose.Types.ObjectId(draft.id) });
  expect(raw.inputJson).toMatch(/^enc:v1:/); expect(raw.organizationJson).toMatch(/^enc:v1:/);
  const update = await call(staff, 'patch', `/${draft.id}`).send({ ...changes(draft), title: 'Updated title' });
  expect(update.status).toBe(200); expect(update.body.data.revision).toBe(1);
  expect((await call(staff, 'patch', `/${draft.id}`).send(changes(draft))).status).toBe(409);
  expect((await call(otherStaff, 'get', `/${draft.id}`)).status).toBe(404);
  expect((await call(otherOwner, 'get', `/${draft.id}`)).status).toBe(404);
  expect((await call(owner, 'get', `/${draft.id}`)).status).toBe(200);
});

test.each(['labor', 'service', 'sales'])('%s generation retains the fixed frame and masks identity values before calling AI', async code => {
  const before = (await getSubscription(staff.id, org.id)).drafting.used;
  const draft = await create(staff, code);
  const response = await generate(staff, draft);
  expect(response.status).toBe(200);
  expect((await getSubscription(staff.id, org.id)).drafting).toMatchObject({ used: before + 1, reserved: 0 });
  expect(response.body.data.content).toContain('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM');
  expect(response.body.data.content).toContain('Nguyễn Văn Kiểm Thử');
  expect(response.body.data.content).toContain('012345678901');
  expect(response.body.data.content).not.toContain('[FIELD_');
  expect(response.body.data.content).not.toContain('{{');
  const prompt = generateJson.mock.calls.at(-1)[0];
  expect(prompt).not.toContain('Nguyễn Văn Kiểm Thử');
  expect(prompt).not.toContain('012345678901');
  expect(prompt).not.toContain('123 Đường Riêng');
  expect(prompt).not.toContain(org.name);
  expect((await Drafts.collection.findOne({ _id: new mongoose.Types.ObjectId(draft.id) })).content).toMatch(/^enc:v1:/);
});

test('invalid or incomplete inputs never start AI, including dates, role and labor term rules', async () => {
  const before = generateJson.mock.calls.length;
  expect((await call(staff, 'post').send({ templateCode: 'service', title: 'Test', ourParty: 'employer', input: {} })).status).toBe(400);
  expect((await call(staff, 'post').send({ templateCode: 'labor', title: 'Test', ourParty: 'employer', input: { injected: 'ignored?' } })).status).toBe(400);
  for (const input of [{ ...values('labor'), endDate: '2030-01-01' }, { ...values('labor'), partnerBirthDate: '2020-01-01' }, { ...values('labor'), salary: '-1' }, { ...values('labor'), signingDate: '2026-02-30' }]) {
    expect((await call(staff, 'post').send({ templateCode: 'labor', title: 'Test', ourParty: 'employer', input })).status).toBe(400);
  }
  const missing = await create(staff, 'service', {});
  expect((await generate(staff, missing)).status).toBe(400);
  expect(generateJson.mock.calls.length).toBe(before);
});

test('generation is locked against duplicate requests, releases on provider failure and validates AI structure', async () => {
  const draft = await create();
  let entered, release;
  const started = new Promise(resolve => { entered = resolve; });
  generateJson.mockImplementationOnce(() => new Promise(resolve => { release = resolve; entered(); }));
  const first = generate(staff, draft).then(response => response);
  await started;
  expect((await generate(staff, draft)).status).toBe(409);
  expect((await call(staff, 'patch', `/${draft.id}`).send(changes(draft))).status).toBe(409);
  release({ sections: CONTRACT_TEMPLATES.find(item => item.code === 'service').sections.map(section => ({ key: section.key, addition: '' })), notes: [] });
  expect((await first).status).toBe(200);
  const failing = await create();
  generateJson.mockRejectedValueOnce(new Error('Provider unavailable'));
  expect((await generate(staff, failing)).status).toBe(500);
  expect((await Drafts.findById(failing.id)).generationStartedAt).toBeUndefined();
  generateJson.mockResolvedValueOnce({ sections: [], notes: [] });
  expect((await generate(staff, failing)).status).toBe(502);
  expect((await generate(staff, failing)).status).toBe(200);
});

test('staff submits only their draft; Owner returns for edits or approves, and approved content is immutable', async () => {
  let draft = (await generate(staff, await create())).body.data;
  expect((await call(staff, 'get', `/${draft.id}/export`)).status).toBe(409);
  expect((await call(staff, 'get', `/${draft.id}/export?format=print`)).status).toBe(409);
  expect((await decide(staff, draft, 'approve')).status).toBe(403);
  expect((await call(owner, 'get', `/${draft.id}/export`)).status).toBe(409);
  draft = (await decide(staff, draft, 'submit')).body.data;
  expect(draft.status).toBe('pending_approval');
  expect((await call(staff, 'get', `/${draft.id}/export`)).status).toBe(409);
  expect((await call(staff, 'get', `/${draft.id}/export?format=print`)).status).toBe(409);
  expect((await call(staff, 'patch', `/${draft.id}`).send(changes(draft))).status).toBe(409);
  expect((await decide(owner, draft, 'return')).status).toBe(400);
  draft = (await decide(owner, draft, 'return', 'Kiểm tra tiến độ')).body.data;
  expect(draft.status).toBe('draft'); expect(draft.decisionNote).toBe('Kiểm tra tiến độ');
  draft = (await decide(staff, draft, 'submit')).body.data;
  draft = (await decide(owner, draft, 'approve')).body.data;
  expect(draft.status).toBe('approved');
  expect((await call(staff, 'patch', `/${draft.id}`).send(changes(draft))).status).toBe(409);
  const staffDownload = await call(staff, 'get', `/${draft.id}/export`);
  expect(staffDownload.status).toBe(200);
  expect(staffDownload.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  const staffPrint = await call(staff, 'get', `/${draft.id}/export?format=print`);
  expect(staffPrint.status).toBe(200); expect(staffPrint.body.data.content).toBe(draft.content);
  for (const member of [otherStaff, otherOwner]) {
    expect((await call(member, 'get', `/${draft.id}/export`)).status).toBe(404);
    expect((await call(member, 'get', `/${draft.id}/export?format=print`)).status).toBe(404);
  }
  expect((await call(staff, 'post', `/${draft.id}/publish`).send({ revision: draft.revision })).status).toBe(403);
  const print = await call(owner, 'get', `/${draft.id}/export?format=print`);
  expect(print.status).toBe(200); expect(print.body.data.content).toBe(draft.content);
  const docx = await createDraftDocx(`${draft.content}\nA & B <C>`);
  const zip = await JSZip.loadAsync(docx);
  const document = await zip.file('word/document.xml').async('string');
  expect(document).toContain('Nguyễn Văn Kiểm Thử'); expect(document).toContain('A &amp; B &lt;C&gt;');
  expect(document).toContain('Times New Roman');
  expect(document).toContain('<w:sz w:val="26"/>');
  expect(document).toContain('<w:lang w:val="vi-VN"/>');
  expect(document).toContain('<w:i/>');
  const before = await ContractModel.countDocuments({ orgId: org.id });
  const result = await call(owner, 'post', `/${draft.id}/publish`).send({ revision: draft.revision });
  expect(result.status).toBe(200);
  const again = await call(owner, 'post', `/${draft.id}/publish`).send({ revision: draft.revision });
  expect(again.body.data.contractId).toBe(result.body.data.contractId);
  expect(await ContractModel.countDocuments({ orgId: org.id })).toBe(before + 1);
  expect(uploadContractFile).toHaveBeenCalledTimes(1);
  const version = await ContractVersionModel.findOne({ contractId: result.body.data.contractId }).select('+extractedText');
  expect(version.extractionStatus).toBe('completed'); expect(version.extractedText).toBe(draft.content);
});

test('changing form data invalidates generated content instead of retaining mismatched clauses', async () => {
  const draft = (await generate(owner, await create(owner))).body.data;
  const response = await call(owner, 'patch', `/${draft.id}`).send({ ...changes(draft), input: { ...draft.input, price: '99000000' } });
  expect(response.status).toBe(200); expect(response.body.data.content).toBe(''); expect(response.body.data.generatedAt).toBeNull();
});

test('deterministic frame uses the organization role for buyer/client and indefinite labor', () => {
  const input = { ...values('labor'), termType: 'indefinite', endDate: '' };
  expect(renderDraftDocument('labor', input, org.name, 'employer')).toContain('Không xác định thời hạn');
  expect(renderDraftDocument('sales', values('sales'), org.name, 'buyer')).toContain('BÊN A - BÊN MUA');
});

test('drafts retain the original template snapshot after a catalog update', async () => {
  const draft = await create(owner);
  const template = CONTRACT_TEMPLATES.find(item => item.code === 'service');
  const original = template.name;
  try {
    template.name = 'Future template title';
    const result = await generate(owner, draft);
    expect(result.status).toBe(200);
    expect(result.body.data.template.name).toBe(original);
    expect(result.body.data.content).toContain(original.toLocaleUpperCase('vi-VN'));
    expect(result.body.data.content).not.toContain('FUTURE TEMPLATE');
  } finally { template.name = original; }
});

test('current forms cover each field once and distinguish labor parties from companies', () => {
  for (const template of CONTRACT_TEMPLATES) {
    expect(template.version).toBe(template.code === 'labor' ? 4 : 2);
    const grouped = template.formGroups.flatMap(group => group.fields);
    expect(grouped.length).toBe(new Set(grouped).size);
    expect(grouped.slice().sort()).toEqual(template.fields.map(field => field.key).sort());
  }
  const labor = CONTRACT_TEMPLATES.find(template => template.code === 'labor');
  expect(labor.sections).toHaveLength(12);
  expect(labor.fields.find(field => field.key === 'partnerName').label).toBe('Họ và tên người lao động');
});

test('copying an old snapshot creates a current draft without altering original content or approval', async () => {
  const draft = await create(owner, 'labor');
  const stored = await Drafts.findById(draft.id);
  stored.templateVersion = 1;
  stored.templateJson = JSON.stringify({ ...JSON.parse(stored.templateJson), version: 1 });
  stored.content = 'Bản hợp đồng gốc đã duyệt'; stored.status = 'approved';
  await stored.save();
  expect((await call(otherOwner, 'post', `/${draft.id}/copy-latest`).send({ revision: 0 })).status).toBe(404);
  expect((await call(owner, 'post', `/${draft.id}/copy-latest`).send({ revision: 1 })).status).toBe(409);
  const response = await call(owner, 'post', `/${draft.id}/copy-latest`).send({ revision: 0 });
  expect(response.status).toBe(201);
  expect(response.body.data.id).not.toBe(draft.id);
  expect(response.body.data.templateVersion).toBe(4);
  expect(response.body.data.input.partnerName).toBe(draft.input.partnerName);
  expect(response.body.data.content).toBe(''); expect(response.body.data.status).toBe('draft');
  const original = await Drafts.findById(draft.id);
  expect(original.templateVersion).toBe(1); expect(original.status).toBe('approved');
  expect(original.content).toBe('Bản hợp đồng gốc đã duyệt');
});

test('invalid labor party details and nonsense are blocked before AI, while incomplete editing remains allowed', () => {
  const { inputErrors } = require('../dist/validations/contractDraft.validation');
  for (const update of [{ partnerName: 'Công ty Khách Hàng' }, { representative: 'Staff' }, { workingTime: 'ghhghhhgh' }]) {
    const input = { ...values('labor'), ...update };
    expect(inputErrors('labor', input, false)).toEqual([]);
    expect(inputErrors('labor', input, true).length).toBeGreaterThan(0);
  }
});

test('AI reported input issues do not produce a contract or leave a generation lock', async () => {
  const before = (await getSubscription(owner.id, org.id)).drafting.used;
  const draft = await create(owner);
  generateJson.mockResolvedValueOnce({ sections: [], notes: [], issues: [{ field: 'scope', message: 'Nội dung chưa rõ nghĩa.' }] });
  const result = await generate(owner, draft);
  expect(result.status).toBe(400);
  expect(JSON.stringify(result.body)).toContain('Nội dung chưa rõ nghĩa.');
  const stored = await Drafts.findById(draft.id);
  expect(stored.content).toBe(''); expect(stored.generationStartedAt).toBeUndefined();
  expect((await getSubscription(owner.id, org.id)).drafting).toMatchObject({ used: before, reserved: 0 });
});

test('unpaid and exhausted organizations can save drafts but cannot call AI', async () => {
  const before = generateJson.mock.calls.length;
  const unpaid = await create(otherOwner);
  expect((await generate(otherOwner, unpaid)).status).toBe(403);
  const draft = await create(owner);
  const period = await SubscriptionPeriodModel.findOne({ orgId: org.id });
  const previous = period.draftingUsed;
  await SubscriptionPeriodModel.updateOne({ _id: period.id }, { $set: { draftingUsed: period.plan.draftingLimit } });
  try {
    expect((await generate(owner, draft)).status).toBe(403);
    expect(generateJson.mock.calls.length).toBe(before);
    expect((await Drafts.findById(draft.id)).generationStartedAt).toBeUndefined();
  } finally { await SubscriptionPeriodModel.updateOne({ _id: period.id }, { $set: { draftingUsed: previous } }); }
});

test('line item decimals round per row, validate totals and export real tables with signature columns', async () => {
  const { validateLineItems } = require('../dist/services/drafting/line-items');
  const { inputErrors } = require('../dist/validations/contractDraft.validation');
  const items = JSON.stringify([{ name: 'Sản phẩm A & B', unit: 'kg', quantity: '1.125', unitPrice: '1000.25' }, { name: 'Sản phẩm B', unit: 'cái', quantity: '2', unitPrice: '10000000' }]);
  expect(validateLineItems(items, true)).toMatchObject({ errors: [], total: '20001125.28' });
  expect(validateLineItems(JSON.stringify([{ name: '', unit: '', quantity: '-1', unitPrice: '5' }]), true).errors.length).toBeGreaterThan(0);
  const input = { ...values('sales'), lineItems: items, price: '20001125.28' };
  expect(inputErrors('sales', input, true)).toEqual([]);
  expect(inputErrors('sales', { ...input, price: '1' }, true).join()).toContain('khớp');
  const content = renderDraftDocument('sales', input, org.name, 'seller');
  expect(content).toContain('1.1.'); expect(content).toContain('20.001.125,28');
  const zip = await JSZip.loadAsync(await createDraftDocx(content));
  const doc = await zip.file('word/document.xml').async('string');
  expect(doc.match(/<w:tbl>/g)).toHaveLength(2);
  expect(doc).toContain('<w:tblHeader/>'); expect(doc).toContain('Sản phẩm A &amp; B');
  expect(doc).toContain('ĐẠI DIỆN BÊN B'); expect(doc).not.toContain('| STT');
});
