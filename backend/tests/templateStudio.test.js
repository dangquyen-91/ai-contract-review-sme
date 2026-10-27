process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/unused';
process.env.JWT_ACCESS_SECRET = 'studio-test-access';
process.env.JWT_REFRESH_SECRET = 'studio-test-refresh';
process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 8).toString('base64');
process.env.MONGOMS_DOWNLOAD_DIR = require('path').join(
  __dirname,
  '../node_modules/.cache/mongodb-memory-server',
);
jest.mock('../dist/services/ai/llm.service', () => ({
  isLlmConfigured: true,
  generateJson: jest.fn(),
}));
jest.mock('../dist/middlewares/rateLimit.middleware', () => ({ ...jest.requireActual('../dist/middlewares/rateLimit.middleware'), aiLimiter: (_req, _res, next) => next() }));
jest.mock('../dist/services/contract/storage.service', () => ({
  uploadContractFile: jest.fn(),
  deleteContractFile: jest.fn(),
}));
jest.mock('../dist/services/contract/documentPageCount.service', () => ({
  countDocxPages: jest.fn().mockResolvedValue(3),
}));
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const request = require('supertest');
const JSZip = require('jszip');
const { createApp } = require('../dist/app');
require('../dist/config/logger').logger.silent = true;
const { UserModel } = require('../dist/models/user.model');
const { OrganizationModel } = require('../dist/models/organization.model');
const { ContractDraftModel } = require('../dist/models/contractDraft.model');
const { DraftAssistantProposalModel } = require('../dist/models/draftAssistantProposal.model');
const { seedDefaultRoles, getRoleByCode } = require('../dist/services/identity/role.service');
const { tokensForUser } = require('../dist/services/identity/auth.service');
const { CONTRACT_TEMPLATES } = require('../dist/services/drafting/templates');
const {
  normalizeStudioDocument,
  studioInput,
  studioText,
  walkStudio,
} = require('../dist/services/drafting/studioDocument');
const {
  buildStudioTemplate,
  legacyStudioDocument,
} = require('../dist/services/drafting/studioTemplate');
const { applyStudioChanges, studioBlocks } = require('../dist/services/drafting/studioChanges');
const { createStudioDocx } = require('../dist/services/drafting/studioDocx.service');
const { generateJson } = require('../dist/services/ai/llm.service');
const {
  seedPlans,
  activatePaidSubscription,
  getSubscription,
} = require('../dist/services/billing/subscription.service');
const { PlanModel, initializeSubscriptionModels } = require('../dist/models/subscription.model');
let repl,
  app,
  org,
  owner,
  staff,
  otherStaff,
  sequence = 0;
const template = CONTRACT_TEMPLATES.find((item) => item.code === 'service');
const call = (member, method, path = '') =>
  request(app)
    [method](`/api/v1/contract-drafts${path}`)
    .set('Authorization', `Bearer ${tokensForUser(member).accessToken}`);
async function member(role) {
  return (
    await UserModel.create({
      name: role,
      email: `studio-${++sequence}@example.com`,
      orgId: org.id,
      roleId: (await getRoleByCode(role))._id,
      passwordHash: 'unused',
      emailVerifiedAt: new Date(),
    })
  ).populate('roleId');
}
async function create(input = {}, code = 'service') {
  const response = await call(staff, 'post').send({
    templateCode: code,
    title: 'Studio contract',
    ourParty: CONTRACT_TEMPLATES.find((item) => item.code === code).parties[0].code,
    editorMode: 'studio',
    input,
  });
  expect(response.status).toBe(201);
  return response.body.data;
}
const patch = (draft) => ({
  revision: draft.revision,
  title: draft.title,
  ourParty: draft.ourParty,
  input: draft.input,
  content: '',
  document: draft.document,
});
const ask = (
  draft,
  message = 'Update the contract price',
  requestId = `request-${++sequence}`,
  blockIds = [],
) =>
  call(staff, 'post', `/${draft.id}/assistant`).send({
    revision: draft.revision,
    message,
    requestId,
    blockIds,
  });
const usage = async () => (await getSubscription(staff.id, org.id)).drafting;
beforeAll(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(repl.getUri());
  await seedDefaultRoles();
  await initializeSubscriptionModels();
  await seedPlans();
  org = await OrganizationModel.create({
    name: 'Confidential Studio Company',
    taxCode: '0101234567',
    address: 'Ha Noi',
  });
  const plan = await PlanModel.findOne({ code: 'business_starter' });
  await activatePaidSubscription({
    orgId: org.id,
    planCode: plan.code,
    action: 'purchase',
    amount: plan.price,
    paymentReference: 'studio-test-plan',
  });
  owner = await member('owner');
  staff = await member('staff');
  otherStaff = await member('staff');
  app = createApp();
});
afterAll(async () => {
  await mongoose.disconnect();
  if (repl) await repl.stop();
});

test('reference uploads require draft access, validate content, and do not consume AI credits', async () => {
  const draft = await create();
  const before = await usage();
  expect(
    (
      await call(otherStaff, 'post', `/${draft.id}/reference`).attach(
        'file',
        Buffer.from('Private reference'),
        'reference.txt',
      )
    ).status,
  ).toBe(404);
  const result = await call(staff, 'post', `/${draft.id}/reference`).attach(
    'file',
    Buffer.from('Tài liệu tham khảo'),
    'reference.txt',
  );
  expect(result.status).toBe(200);
  expect(result.body.data.text).toBe('Tài liệu tham khảo');
  expect(
    (
      await call(staff, 'post', `/${draft.id}/reference`).attach(
        'file',
        Buffer.from('invalid PDF'),
        'reference.pdf',
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await call(staff, 'post', `/${draft.id}/reference`).attach(
        'file',
        Buffer.from('x'.repeat(12001)),
        'long.txt',
      )
    ).status,
  ).toBe(400);
  expect(await usage()).toEqual(before);
});

test('AI reference context is masked, stored encrypted and bound to the replay key', async () => {
  const draft = await create({ representative: 'Private Reference Person' });
  const body = { revision: draft.revision, requestId: `reference-${++sequence}`, message: 'Use this reference', references: [{ name: 'terms.txt', text: 'Private Reference Person requested 15000000 VND.' }] };
  generateJson.mockResolvedValue({ message: 'Reference received', fields: [], blocks: [] });
  const response = await call(staff, 'post', `/${draft.id}/assistant`).send(body); expect(response.status).toBe(200);
  expect(response.body.data.referenceNames).toEqual(['terms.txt']);
  expect(generateJson.mock.calls.at(-1)[0]).toContain('15000000 VND'); expect(generateJson.mock.calls.at(-1)[0]).not.toContain('Private Reference Person');
  const raw = await DraftAssistantProposalModel.collection.findOne({ _id: new mongoose.Types.ObjectId(response.body.data.id) }); expect(raw.referencesJson).toMatch(/^enc:v1:/);
  expect((await call(staff, 'post', `/${draft.id}/assistant`).send({ ...body, references: [] })).status).toBe(409);
});

test('appendices preserve explicit page breaks in persisted JSON, text and Word exports', async () => {
  const draft = await create();
  draft.document.content.push(
    { type: 'pageBreak' },
    {
      type: 'heading',
      attrs: { level: 2, appendix: true },
      content: [{ type: 'text', text: 'PHỤ LỤC 1' }],
    },
    {
      type: 'paragraph',
      attrs: { placeholder: 'appendix' },
      content: [{ type: 'text', text: 'Appendix terms' }],
    },
  );
  const response = await call(staff, 'patch', `/${draft.id}`).send(patch(draft));
  expect(response.status).toBe(200);
  const saved = response.body.data;
  expect(saved.content).toContain('PHỤ LỤC 1');
  expect(saved.document.content.at(-3).type).toBe('pageBreak');
  const zip = await JSZip.loadAsync(await createStudioDocx(saved.document, saved.template));
  const xml = await zip.file('word/document.xml').async('string');
  expect(xml).toContain('<w:br w:type="page"/>');
  expect(xml).toContain('Appendix terms');
});

test('labor reference follows the reference layout with complete parties, 12 articles and linked date components', async () => {
  const draft = await create({}, 'labor');
  expect(draft.templateVersion).toBe(4);
  expect(draft.input.companyName).toBe(org.name);
  expect(draft.document.content.filter(node => node.type === 'heading' && node.content[0]?.text.startsWith('ĐIỀU '))).toHaveLength(12);
  expect(draft.document.content.some(node => node.type === 'bulletList')).toBe(true);
  for (const token of ['[SoHopDong]', '[TenNguoiLaoDong]', '[Ngay]', '[Thang]', '[Nam]', '[SoTienLuong]']) expect(draft.content).toContain(token);
  expect(draft.content).toContain('38/2013/QH13'); expect(draft.template.reviewNotes.length).toBeGreaterThan(0);
  expect(draft.content).toContain('a. Số giờ làm việc: 8 giờ/ngày, 40 giờ/tuần.');
  expect(draft.content).toContain('nhân viên phải hoàn trả lại 100% phí đào tạo');
  expect(draft.content).toContain('Trong thời hạn 02 (hai) năm kể từ ngày kết thúc quan hệ lao động');
  expect(draft.content).toContain('bồi thường thiệt hại bằng 06 tháng lương trung bình liền kề gần nhất');
  expect(draft.content).not.toContain('không mặc định');
  const fields = studioInput(draft.document);
  for (const key of ['companyPhone', 'companyFax', 'companyWebsite', 'partnerNationality', 'partnerContactAddress', 'partnerPhone', 'jobTitle', 'salaryInWords']) expect(fields).toHaveProperty(key);
  walkStudio(draft.document, node => { if (node.type === 'templateField' && node.attrs.key === 'signingDate') node.attrs.value = '2026-10-26'; });
  const saved = await call(staff, 'patch', `/${draft.id}`).send(patch(draft)); expect(saved.status).toBe(200);
  expect(saved.body.data.content).toContain('ngày 26 tháng 10 năm 2026');
  const signature = saved.body.data.document.content.at(-1); expect(studioText(signature, draft.template)).toContain('NGƯỜI LAO ĐỘNG\tBÊN SỬ DỤNG LAO ĐỘNG');
  const zip = await JSZip.loadAsync(await createStudioDocx(saved.body.data.document, draft.template));
  expect(await zip.file('word/document.xml').async('string')).not.toContain('{{');
});
test('copying a studio draft to the current reference preserves its original and filled information', async () => {
  const draft = await create({ partnerName: 'Existing Employee' }, 'labor');
  const stored = await ContractDraftModel.findById(draft.id); stored.templateVersion = 3; stored.content = 'Original manually edited content'; await stored.save();
  const response = await call(staff, 'post', `/${draft.id}/copy-latest`).send({ revision: draft.revision });
  expect(response.status).toBe(201); expect(response.body.data.templateVersion).toBe(4); expect(response.body.data.document.type).toBe('doc');
  expect(response.body.data.input.partnerName).toBe('Existing Employee'); expect(response.body.data.id).not.toBe(draft.id);
  expect((await ContractDraftModel.findById(draft.id)).content).toBe('Original manually edited content');
});
beforeEach(() => generateJson.mockReset());

test('pinning is scoped, survives reads, sorts before recent drafts and preserves editing revisions', async () => {
  const first = await create(); const newer = await create();
  expect((await call(otherStaff, 'patch', `/${first.id}/pin`).send({ pinned: true })).status).toBe(404);
  const pinned = await call(owner, 'patch', `/${first.id}/pin`).send({ pinned: true }); expect(pinned.status).toBe(200);
  expect(pinned.body.data.pinnedAt).toBeTruthy(); expect(pinned.body.data.revision).toBe(first.revision);
  expect((await call(staff, 'get')).body.data.items[0].id).toBe(first.id);
  const read = (await call(staff, 'get', `/${first.id}`)).body.data;
  expect(read.pinnedAt).toBe(pinned.body.data.pinnedAt); expect(read.updatedAt).toBe(first.updatedAt);
  const replay = await call(staff, 'patch', `/${first.id}/pin`).send({ pinned: true }); expect(replay.body.data.pinnedAt).toBe(pinned.body.data.pinnedAt);
  expect((await call(staff, 'patch', `/${first.id}/pin`).send({ pinned: false })).body.data.pinnedAt).toBeNull();
  const rows = (await call(staff, 'get')).body.data.items; expect(rows.findIndex(row=>row.id===newer.id)).toBeLessThan(rows.findIndex(row=>row.id===first.id));
});

test('deleting a draft requires its revision and permission, hides it from every draft route and keeps AI usage unchanged', async () => {
  const draft = await create(); const before = await usage();
  expect((await call(otherStaff, 'delete', `/${draft.id}`).send({ revision: draft.revision })).status).toBe(404);
  expect((await call(staff, 'delete', `/${draft.id}`).send({ revision: draft.revision + 1 })).status).toBe(409);
  await ContractDraftModel.updateOne({ _id: draft.id }, { $set: { generationToken: 'active', generationStartedAt: new Date() } });
  expect((await call(owner, 'delete', `/${draft.id}`).send({ revision: draft.revision })).status).toBe(409);
  await ContractDraftModel.updateOne({ _id: draft.id }, { $unset: { generationToken: '', generationStartedAt: '' } });
  expect((await call(owner, 'delete', `/${draft.id}`).send({ revision: draft.revision })).status).toBe(200);
  for (const suffix of ['', '/assistant']) expect((await call(owner, 'get', `/${draft.id}${suffix}`)).status).toBe(404);
  expect((await call(staff, 'patch', `/${draft.id}`).send(patch(draft))).status).toBe(404);
  expect((await call(staff, 'patch', `/${draft.id}/pin`).send({ pinned: true })).status).toBe(404);
  expect((await call(owner, 'get')).body.data.items.some(row=>row.id===draft.id)).toBe(false);
  expect((await ContractDraftModel.findById(draft.id)).deletedAt).toBeTruthy(); expect(await usage()).toEqual(before);
});

test.each(['pending_approval','approved'])('%s cannot be deleted from the draft list', async status => {
  const draft = await create(); await ContractDraftModel.updateOne({ _id: draft.id }, { $set: { status } });
  expect((await call(owner, 'delete', `/${draft.id}`).send({ revision: draft.revision })).status).toBe(409);
  expect((await call(owner, 'get', `/${draft.id}`)).status).toBe(200);
});

test.each(['labor', 'service', 'sales'])(
  '%s opens a complete structured template without AI or quota consumption',
  async (code) => {
    const before = await usage();
    const draft = await create({}, code);
    expect(draft.document.type).toBe('doc');
    expect(draft.content).toContain('CỘNG HÒA');
    const fields = studioInput(draft.document);
    for (const field of draft.template.fields) expect(fields).toHaveProperty(field.key);
    expect(
      draft.document.content.some(
        (node) => node.type === 'table' && node.attrs.layout === 'signature',
      ),
    ).toBe(true);
    expect(await usage()).toEqual(before);
    expect(generateJson).not.toHaveBeenCalled();
    expect(
      (await ContractDraftModel.collection.findOne({ _id: new mongoose.Types.ObjectId(draft.id) }))
        .documentJson,
    ).toMatch(/^enc:v1:/);
    expect((await call(staff, 'post', `/${draft.id}/generate`).send({ revision: 0 })).status).toBe(
      400,
    );
  },
);

test('saving preserves formatting, derives linked field data and clears removed fields', async () => {
  let draft = await create({ representative: 'Private Representative' });
  walkStudio(draft.document, (node) => {
    if (node.type === 'templateField' && node.attrs.key === 'representative')
      node.attrs.value = 'Updated Representative';
  });
  draft.document.content.push({
    type: 'paragraph',
    content: [
      {
        type: 'text',
        text: 'Custom clause & wording',
        marks: [{ type: 'bold' }, { type: 'underline' }],
      },
    ],
  });
  const response = await call(staff, 'patch', `/${draft.id}`).send(patch(draft));
  expect(response.status).toBe(200);
  draft = response.body.data;
  expect(draft.input.representative).toBe('Updated Representative');
  expect(draft.content).toContain('Custom clause & wording');
  expect(draft.document.content.at(-1).content[0].marks).toHaveLength(2);
  expect(
    (await call(staff, 'patch', `/${draft.id}`).send({ ...patch(draft), revision: 0 })).status,
  ).toBe(409);
  walkStudio(draft.document, (node) => {
    if (node.content)
      node.content = node.content.filter(
        (child) => child.type !== 'templateField' || child.attrs.key !== 'representative',
      );
  });
  const removed = await call(staff, 'patch', `/${draft.id}`).send(patch(draft));
  expect(removed.status).toBe(200);
  expect(removed.body.data.input.representative).toBe('');
});

test('malformed documents and inconsistent linked fields are rejected before persistence', async () => {
  const draft = await create();
  for (const document of [
    { type: 'doc', content: [{ type: 'script', text: 'unsafe' }] },
    {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'templateField', attrs: { key: 'unknown', value: 'x' } }],
        },
      ],
    },
    { type: 'doc', content: [{ type: 'table', content: [] }] },
  ]) {
    expect(
      (await call(staff, 'patch', `/${draft.id}`).send({ ...patch(draft), document })).status,
    ).toBe(400);
  }
  const copy = structuredClone(draft.document);
  let changed = false;
  walkStudio(copy, (node) => {
    if (!changed && node.type === 'templateField' && node.attrs.key === 'representative') {
      node.attrs.value = 'Mismatch';
      changed = true;
    }
  });
  expect(
    (await call(staff, 'patch', `/${draft.id}`).send({ ...patch(draft), document: copy })).status,
  ).toBe(400);
});

test('AI proposals charge once, preserve the document until applied, replay safely and mask identities', async () => {
  const draft = await create({
    price: '10000000',
    representative: 'Private Representative',
    partnerName: 'Secret Partner',
  });
  const before = await usage();
  const key = `request-${++sequence}`;
  generateJson.mockResolvedValue({
    message: 'Đề xuất cập nhật giá.',
    fields: [{ key: 'price', value: '15000000' }],
    blocks: [],
  });
  const result = await ask(draft, 'Update the contract price', key);
  expect(result.status).toBe(200);
  const proposal = result.body.data;
  expect((await call(staff, 'get', `/${draft.id}`)).body.data.input.price).toBe('10000000');
  expect(await usage()).toMatchObject({ used: before.used + 1, reserved: 0 });
  for (const privateValue of [org.name, 'Private Representative', 'Secret Partner'])
    expect(generateJson.mock.calls[0][0]).not.toContain(privateValue);
  expect((await ask(draft, 'Update the contract price', key)).body.data.id).toBe(proposal.id);
  expect(generateJson).toHaveBeenCalledTimes(1);
  expect((await ask(draft, 'Different request content', key)).status).toBe(409);
  const applied = await call(staff, 'post', `/${draft.id}/proposals/${proposal.id}`).send({
    revision: draft.revision,
    action: 'apply',
  });
  expect(applied.status).toBe(200);
  expect(applied.body.data.input.price).toBe('15000000');
  expect(applied.body.data.content).toContain('15.000.000');
  expect(
    (
      await call(staff, 'post', `/${draft.id}/proposals/${proposal.id}`).send({
        revision: draft.revision,
        action: 'apply',
      })
    ).status,
  ).toBe(200);
  expect(await usage()).toMatchObject({ used: before.used + 1 });
  expect(
    (
      await DraftAssistantProposalModel.collection.findOne({
        _id: new mongoose.Types.ObjectId(proposal.id),
      })
    ).changesJson,
  ).toMatch(/^enc:v1:/);
});

test('selected-block scope, failed providers and stale proposals cannot alter the document or leave reserved credits', async () => {
  let draft = await create();
  const before = await usage();
  const block = studioBlocks(draft.document, draft.template).find((item) => item.editable);
  generateJson.mockResolvedValueOnce({
    message: 'Outside selection',
    fields: [{ key: 'price', value: '15000000' }],
    blocks: [],
  });
  expect((await ask(draft, 'Edit only this paragraph', undefined, [block.id])).status).toBe(502);
  expect(await usage()).toEqual(before);
  generateJson.mockRejectedValueOnce(new Error('Provider unavailable'));
  expect((await ask(draft)).status).toBe(500);
  expect(await usage()).toEqual(before);
  expect((await ContractDraftModel.findById(draft.id)).generationStartedAt).toBeUndefined();
  generateJson.mockResolvedValueOnce({
    message: 'Add clause',
    fields: [],
    blocks: [{ action: 'insertAfter', blockId: block.id, text: 'New proposed clause.' }],
  });
  const proposal = (await ask(draft, 'Add clause here', undefined, [block.id])).body.data;
  const updated = await call(staff, 'patch', `/${draft.id}`).send({
    ...patch(draft),
    title: 'Manual edit after proposal',
  });
  expect(updated.status).toBe(200);
  draft = updated.body.data;
  expect(
    (
      await call(staff, 'post', `/${draft.id}/proposals/${proposal.id}`).send({
        revision: proposal.baseRevision,
        action: 'apply',
      })
    ).status,
  ).toBe(409);
  expect((await call(staff, 'get', `/${draft.id}`)).body.data.content).not.toContain(
    'New proposed clause.',
  );
});

test('staff permissions apply to history, editing, proposals and exports; approved rich documents remain immutable', async () => {
  const input = Object.fromEntries(
    template.fields
      .filter((field) => field.required)
      .map((field) => [
        field.key,
        field.kind === 'date'
          ? '2026-10-26'
          : field.kind === 'number'
            ? '10000000'
            : field.kind === 'select'
              ? field.options[0].value
              : 'Fixture contract information',
      ]),
  );
  input.endDate = '2027-10-26';
  let draft = await create(input);
  for (const path of ['', '/assistant', '/export'])
    expect((await call(otherStaff, 'get', `/${draft.id}${path}`)).status).toBe(404);
  expect((await call(otherStaff, 'patch', `/${draft.id}`).send(patch(draft))).status).toBe(404);
  expect(
    (
      await call(staff, 'post', `/${draft.id}/decision`).send({
        revision: draft.revision,
        action: 'approve',
      })
    ).status,
  ).toBe(403);
  let response = await call(staff, 'post', `/${draft.id}/decision`).send({
    revision: draft.revision,
    action: 'submit',
  });
  expect(response.status).toBe(200);
  draft = response.body.data;
  response = await call(owner, 'post', `/${draft.id}/decision`).send({
    revision: draft.revision,
    action: 'approve',
  });
  expect(response.status).toBe(200);
  draft = response.body.data;
  expect((await call(staff, 'patch', `/${draft.id}`).send(patch(draft))).status).toBe(409);
  const exported = await call(staff, 'get', `/${draft.id}/export?format=print`);
  expect(exported.status).toBe(200);
  expect(exported.body.data.document).toEqual(draft.document);
  expect((await call(staff, 'get', `/${draft.id}/export`)).status).toBe(200);
});

test('structured Word output retains marks, alignment, lists, tables and borderless signatures; legacy text migrates', async () => {
  const document = buildStudioTemplate(
    template,
    { price: '10000000' },
    'Fixture Company',
    'provider',
  );
  document.content.push({
    type: 'paragraph',
    attrs: { textAlign: 'right' },
    content: [
      {
        type: 'text',
        text: 'Custom & clause',
        marks: [{ type: 'bold' }, { type: 'italic' }, { type: 'underline' }],
      },
    ],
  });
  document.content.push({
    type: 'orderedList',
    attrs: { start: 3 },
    content: [
      {
        type: 'listItem',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Numbered clause' }] }],
      },
    ],
  });
  const zip = await JSZip.loadAsync(
    await createStudioDocx(normalizeStudioDocument(document, template), template),
  );
  const xml = await zip.file('word/document.xml').async('string');
  for (const text of [
    'Custom &amp; clause',
    '<w:b/>',
    '<w:i/>',
    '<w:u w:val="single"/>',
    '<w:jc w:val="right"/>',
    '<w:numPr>',
    '<w:top w:val="nil"',
    '10.000.000',
  ])
    expect(xml).toContain(text);
  expect(await zip.file('word/numbering.xml').async('string')).toContain('w:val="3"');
  const legacy = legacyStudioDocument('Legacy document\n| A | B |\n| 1 | 2 |', template);
  expect(studioText(legacy, template)).toContain('Legacy document');
  const changed = applyStudioChanges(
    legacy,
    { fields: [{ key: 'price', before: '', after: '20000000' }], blocks: [] },
    template,
  );
  expect(studioInput(changed.document).price).toBe('20000000');
});
