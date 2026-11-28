// Importing an uploaded contract file (DOCX/PDF/TXT) as an editable studio draft.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/unused';
process.env.JWT_ACCESS_SECRET = 'draft-import-access';
process.env.JWT_REFRESH_SECRET = 'draft-import-refresh';
process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
process.env.MONGOMS_DOWNLOAD_DIR = require('path').join(__dirname, '../node_modules/.cache/mongodb-memory-server');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const request = require('supertest');
const { createApp } = require('../dist/app');
require('../dist/config/logger').logger.silent = true;
const { OrganizationModel } = require('../dist/models/organization.model');
const { ContractDraftModel } = require('../dist/models/contractDraft.model');
const { seedDefaultRoles } = require('../dist/services/identity/role.service');
const { createAccount } = require('./helpers/accounts');
const { createDraftDocx } = require('../dist/services/drafting/docx.service');
const { seedPlans, activatePaidSubscription } = require('../dist/services/billing/subscription.service');
const { PlanModel, initializeSubscriptionModels } = require('../dist/models/subscription.model');

let repl, app, org, staff, otherStaff, sequence = 0;
const member = (role, orgId) => createAccount({ role, orgId, name: `Import ${role}`, email: `import-${++sequence}@example.com` });
const upload = (user, buffer, filename, fields = { templateCode: 'service', ourParty: 'provider' }) => {
  let req = request(app).post('/api/v1/contract-drafts/import').set('Authorization', `Bearer ${user.testSession.accessToken}`);
  for (const [key, value] of Object.entries(fields)) req = req.field(key, value);
  return buffer ? req.attach('file', buffer, filename) : req;
};
const CONTRACT = [
  'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
  'HỢP ĐỒNG DỊCH VỤ QUẢNG CÁO',
  '',
  'Điều 1. Phạm vi công việc',
  'Bên B thực hiện chiến dịch quảng cáo cho Bên A.',
  'Điều 2. Giá dịch vụ',
  'Giá dịch vụ là 50.000.000 đồng.',
].join('\n');
const blocks = (document) => document.content.map((node) => [node.type, node.content?.[0]?.text]);

beforeAll(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(repl.getUri());
  await seedDefaultRoles();
  await initializeSubscriptionModels();
  await seedPlans();
  org = await OrganizationModel.create({ name: 'Công ty Nhập Mẫu', taxCode: '0101234567', address: 'Hà Nội' });
  const plan = await PlanModel.findOne({ code: 'business_starter' });
  await activatePaidSubscription({ orgId: org.id, planCode: plan.code, action: 'purchase', amount: plan.price, paymentReference: 'import-test-plan' });
  staff = await member('staff', org._id);
  otherStaff = await member('staff', org._id);
  app = createApp();
});
afterAll(async () => {
  await mongoose.disconnect();
  if (repl) await repl.stop();
});

test('a TXT contract becomes a studio draft with headings for its articles', async () => {
  const response = await upload(staff, Buffer.from(CONTRACT), 'Hợp đồng quảng cáo.txt');
  expect(response.status).toBe(201);
  const draft = response.body.data;
  expect(draft).toMatchObject({ title: 'Hợp đồng quảng cáo', templateCode: 'service', ourParty: 'provider', status: 'draft' });
  expect(blocks(draft.document)).toEqual([
    ['paragraph', 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'],
    ['heading', 'HỢP ĐỒNG DỊCH VỤ QUẢNG CÁO'],
    ['heading', 'Điều 1. Phạm vi công việc'],
    ['paragraph', 'Bên B thực hiện chiến dịch quảng cáo cho Bên A.'],
    ['heading', 'Điều 2. Giá dịch vụ'],
    ['paragraph', 'Giá dịch vụ là 50.000.000 đồng.'],
  ]);
  expect(draft.document.content[1].attrs).toMatchObject({ level: 1, textAlign: 'center' });
  expect(draft.content).toContain('Giá dịch vụ là 50.000.000 đồng.');
});

test('a Word contract is imported and the given title is used', async () => {
  const docx = await createDraftDocx(CONTRACT);
  const response = await upload(staff, docx, 'hop-dong.docx', { templateCode: 'service', ourParty: 'provider', title: 'Quảng cáo Tết' });
  expect(response.status).toBe(201);
  expect(response.body.data.title).toBe('Quảng cáo Tết');
  expect(response.body.data.content).toContain('Điều 2. Giá dịch vụ');
});

test('the imported draft is only visible to its author', async () => {
  const { body } = await upload(staff, Buffer.from(CONTRACT), 'rieng.txt');
  const other = await request(app).get(`/api/v1/contract-drafts/${body.data.id}`).set('Authorization', `Bearer ${otherStaff.testSession.accessToken}`);
  expect(other.status).toBe(404);
});

test('a request without a file is rejected', async () => {
  const response = await upload(staff, null);
  expect(response.status).toBe(400);
  expect(response.body.error.message).toBe('Vui lòng chọn tệp hợp đồng tối đa 10 MB.');
});

test('an unsupported file type is rejected and nothing is saved', async () => {
  const before = await ContractDraftModel.countDocuments();
  const response = await upload(staff, Buffer.from('image'), 'scan.png');
  expect(response.status).toBe(400);
  expect(response.body.error.message).toBe('Chỉ hỗ trợ tệp PDF có chữ, Word .docx hoặc TXT UTF-8.');
  expect(await ContractDraftModel.countDocuments()).toBe(before);
});

test('an empty file is rejected', async () => {
  const response = await upload(staff, Buffer.from('   \n  '), 'trong.txt');
  expect(response.status).toBe(400);
  expect(response.body.error.message).toBe('Tệp chưa có nội dung chữ đọc được. PDF dạng ảnh cần chuyển thành văn bản trước.');
});

test('an unknown contract type is rejected', async () => {
  const response = await upload(staff, Buffer.from(CONTRACT), 'a.txt', { templateCode: 'unknown', ourParty: 'provider' });
  expect(response.status).toBe(400);
});

test('an invalid role is rejected', async () => {
  const response = await upload(staff, Buffer.from(CONTRACT), 'a.txt', { templateCode: 'service', ourParty: 'Z' });
  expect(response.status).toBe(400);
  expect(response.body.error.message).toBe('Vai trò giao kết hợp đồng không hợp lệ.');
});
