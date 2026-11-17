process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/unused';
process.env.JWT_ACCESS_SECRET = 'expert-chat-test-access';
process.env.JWT_REFRESH_SECRET = 'expert-chat-test-refresh';
process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
process.env.MONGOMS_DOWNLOAD_DIR = require('path').join(__dirname, '../node_modules/.cache/mongodb-memory-server');

const mongoose = require('mongoose');
const express = require('express');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { randomUUID } = require('crypto');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { UserModel } = require('../dist/models/user.model');
const { MembershipModel } = require('../dist/models/membership.model');
const { ContractModel } = require('../dist/models/contract.model');
const { OrganizationModel } = require('../dist/models/organization.model');
const { deleteContract } = require('../dist/services/contract/contract.service');
const { ExpertReviewModel } = require('../dist/models/expertReview.model');
const { ExpertWorkRecordModel } = require('../dist/models/expertWorkRecord.model');
const { ExpertChatMessageModel } = require('../dist/models/expertChatMessage.model');
const router = require('../dist/routes/review.routes').default;
const { errorHandler } = require('../dist/middlewares/errorHandler');
const oid = () => new mongoose.Types.ObjectId();
const ids = Object.fromEntries(['owner', 'staff', 'otherStaff', 'expert', 'otherExpert', 'user', 'otherUser', 'administrator', 'manager', 'org', 'otherOrg'].map(k => [k, oid()]));
let replica, app, reviewId, contractId, verification;

function token(role) {
  const payload = { sub: String(ids[role]), role: role === 'otherExpert' ? 'expert' : role === 'otherUser' ? 'user' : role === 'otherStaff' ? 'staff' : role };
  if (['owner', 'staff', 'otherStaff'].includes(role)) payload.orgId = String(ids.org);
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET);
}
function get(role, query = {}) {
  return request(app).get(`/reviews/${reviewId}/verification/messages`).query(query).set('Authorization', `Bearer ${token(role)}`);
}
function send(role, body = {}) {
  return request(app).post(`/reviews/${reviewId}/verification/messages`).set('Authorization', `Bearer ${token(role)}`)
    .send({ attempt: 1, clientMessageId: randomUUID(), content: 'Xin chuyên gia giải thích điều khoản thanh toán.', ...body });
}

beforeAll(async () => {
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replica.getUri());
  await Promise.all(mongoose.modelNames().map(name => mongoose.model(name).init()));
  await Promise.all([UserModel.init(), MembershipModel.init(), ContractModel.init(), ExpertReviewModel.init(), ExpertWorkRecordModel.init(), ExpertChatMessageModel.init()]);
  for (const role of ['owner', 'staff', 'otherStaff', 'expert', 'otherExpert', 'user', 'otherUser', 'administrator', 'manager']) {
    await UserModel.create({ _id: ids[role], name: role, email: `${role}@test.local`, passwordHash: 'unused', emailVerifiedAt: new Date(),
      ...(['expert', 'otherExpert', 'administrator', 'manager'].includes(role) ? { platformRole: role === 'otherExpert' ? 'expert' : role } : {}) });
  }
  await MembershipModel.create(['owner', 'staff', 'otherStaff'].map(role => ({ userId: ids[role], orgId: ids.org, role: role === 'owner' ? 'owner' : 'staff' })));
  await OrganizationModel.create({ _id: ids.org, name: 'Chat test organization' });
  app = express(); app.use(express.json()); app.use('/reviews', router); app.use(errorHandler);
});
beforeEach(async () => {
  await Promise.all([ExpertChatMessageModel.deleteMany({}), ExpertReviewModel.deleteMany({}), ExpertWorkRecordModel.deleteMany({}), ContractModel.deleteMany({})]);
  reviewId = oid(); contractId = oid();
  await ContractModel.collection.insertOne({ _id: contractId, orgId: ids.org, title: 'Test contract' });
  verification = await ExpertReviewModel.create({ reviewId, contractId, orgId: ids.org, requestedBy: ids.staff, expertId: ids.expert, status: 'in_progress', attempt: 1, requestedAt: new Date(), assignedAt: new Date() });
});
afterAll(async () => { await mongoose.disconnect(); if (replica) await replica.stop(); });

test('requester and assigned Expert exchange messages; content is encrypted at rest', async () => {
  expect((await send('staff')).status).toBe(201);
  const response = await send('expert', { content: 'Tôi sẽ kiểm tra giúp bạn.' });
  expect(response.status).toBe(201);
  const history = await get('staff');
  expect(history.headers['cache-control']).toBe('no-store');
  expect(history.body.data.items.map(m => m.senderType)).toEqual(['requester', 'expert']);
  expect(history.body.data.canSend).toBe(true);
  const raw = await ExpertChatMessageModel.collection.findOne({ senderId: ids.expert });
  expect(raw.content).toMatch(/^enc:v1:/);
  expect(raw.content).not.toContain('kiểm tra');
});

test.each(['owner', 'otherStaff', 'otherExpert', 'otherUser'])('%s cannot read or send in someone else’s chat', async role => {
  expect((await get(role)).status).toBe(404);
  expect((await send(role)).status).toBe(404);
});

test.each(['administrator', 'manager'])('%s has no implicit chat access', async role => {
  expect((await get(role)).status).toBe(403);
  expect((await send(role)).status).toBe(403);
});

test('requires authentication and rejects invalid IDs, blank/long content and forged sender', async () => {
  expect((await request(app).get(`/reviews/${reviewId}/verification/messages`)).status).toBe(401);
  expect((await get('staff', { before: 'invalid' })).status).toBe(400);
  for (const body of [{ content: '  ' }, { content: 'a'.repeat(2001) }, { content: 'enc:v1:invalid' }, { senderId: String(ids.expert) }, { attempt: '1' }, { clientMessageId: 'invalid' }]) {
    expect((await send('staff', body)).status).toBe(400);
  }
  expect(await ExpertChatMessageModel.countDocuments()).toBe(0);
});

test('duplicate and concurrent retries create one message; changed content conflicts', async () => {
  const body = { clientMessageId: randomUUID(), content: 'Một tin nhắn duy nhất' };
  const responses = await Promise.all([send('staff', body), send('staff', body)]);
  expect(responses.map(r => r.status).sort()).toEqual([200, 201]);
  expect(await ExpertChatMessageModel.countDocuments()).toBe(1);
  expect((await send('staff', { ...body, content: 'Nội dung khác' })).status).toBe(409);
});

test('latest page, older history and polling use stable bounded cursors', async () => {
  for (let i = 0; i < 5; i++) await send('staff', { content: `Message ${i}` });
  const latest = (await get('expert', { limit: 2 })).body.data;
  expect(latest.items.map(m => m.content)).toEqual(['Message 3', 'Message 4']);
  expect(latest.hasMore).toBe(true);
  const older = (await get('expert', { limit: 2, before: latest.nextBefore })).body.data;
  expect(older.items.map(m => m.content)).toEqual(['Message 1', 'Message 2']);
  await send('expert', { content: 'New reply' });
  expect((await get('staff', { after: latest.nextAfter })).body.data.items.map(m => m.content)).toEqual(['New reply']);
  expect((await get('staff', { limit: 101 })).status).toBe(400);
  expect((await get('staff', { before: latest.nextBefore, after: latest.nextAfter })).status).toBe(400);
});

test.each(['requested', 'approved', 'returned'])('chat is read-only in %s state', async status => {
  await ExpertReviewModel.updateOne({ _id: verification.id }, { $set: { status } });
  expect((await send('staff')).status).toBe(409);
  const history = await get('staff');
  expect(history.status).toBe(200);
  expect(history.body.data.canSend).toBe(false);
});

test('unassigned Expert cannot access a waiting chat', async () => {
  await ExpertReviewModel.updateOne({ _id: verification.id }, { $set: { status: 'requested' }, $unset: { expertId: '' } });
  expect((await get('expert')).status).toBe(404);
});

test('personal requester is scoped by their account ID', async () => {
  await ExpertReviewModel.updateOne({ _id: verification.id }, { $set: { orgId: ids.user, requestedBy: ids.user } });
  await ContractModel.collection.updateOne({ _id: contractId }, { $set: { orgId: ids.user } });
  expect((await send('user')).status).toBe(201);
  expect((await get('expert')).body.data.items).toHaveLength(1);
  expect((await get('otherUser')).status).toBe(404);
});

test('reopening isolates attempts and experts; historical participants retain read-only history', async () => {
  await send('staff', { content: 'First attempt private' });
  await ExpertWorkRecordModel.create({ expertReviewId: verification.id, reviewId, contractId, expertId: ids.expert, requestedBy: ids.staff, attempt: 1, status: 'returned', title: 'Contract', completedAt: new Date(), workspaceJson: '{}' });
  await ExpertReviewModel.updateOne({ _id: verification.id }, { $set: { attempt: 2, expertId: ids.otherExpert, requestedBy: ids.owner } });
  expect((await get('expert')).status).toBe(404);
  expect((await get('staff')).status).toBe(404);
  expect((await get('expert', { attempt: 1 })).body.data.items[0].content).toBe('First attempt private');
  expect((await get('otherExpert', { attempt: 1 })).status).toBe(404);
  expect((await send('staff')).status).toBe(409);
  expect((await send('owner', { attempt: 2, content: 'Second attempt' })).status).toBe(201);
  expect((await get('otherExpert')).body.data.items.map(m => m.content)).toEqual(['Second attempt']);
});

test('removed member and deleted contract lose access', async () => {
  await MembershipModel.deleteOne({ userId: ids.staff });
  expect((await get('staff')).status).toBe(401);
  await MembershipModel.create({ userId: ids.staff, orgId: ids.org, role: 'staff' });
  await ContractModel.deleteOne({ _id: contractId });
  expect((await get('expert')).status).toBe(404);
  expect((await send('staff')).status).toBe(404);
});

test('cursor order follows committed sequence even when ObjectIds sort differently', async () => {
  await send('staff', { content: 'First' });
  await send('expert', { content: 'Second' });
  const rows = await ExpertChatMessageModel.collection.find({}).sort({ sequence: 1 }).toArray();
  await ExpertChatMessageModel.collection.deleteMany({});
  rows[0]._id = new mongoose.Types.ObjectId('ffffffffffffffffffffffff');
  rows[1]._id = new mongoose.Types.ObjectId('000000000000000000000001');
  await ExpertChatMessageModel.collection.insertMany(rows);
  const page = (await get('staff', { limit: 1 })).body.data;
  expect(page.items[0].content).toBe('Second');
  const older = (await get('staff', { before: page.nextBefore })).body.data;
  expect(older.items[0].content).toBe('First');
  expect((await get('staff', { after: older.nextAfter })).body.data.items[0].content).toBe('Second');
  expect((await get('staff', { after: String(oid()) })).status).toBe(400);
});

test('sending concurrently with closure either saves before closure or returns a conflict', async () => {
  const [response] = await Promise.all([
    send('staff'),
    ExpertReviewModel.updateOne({ _id: verification.id }, { $set: { status: 'returned' } }),
  ]);
  expect([201, 409]).toContain(response.status);
  expect(await ExpertChatMessageModel.countDocuments()).toBe(response.status === 201 ? 1 : 0);
  expect((await send('expert')).status).toBe(409);
});

test('deleting a contract removes expert messages without removing another conversation', async () => {
  await send('staff');
  const untouchedContract = oid();
  await ExpertChatMessageModel.create({ expertReviewId: oid(), contractId: untouchedContract, attempt: 1, sequence: 1, senderId: ids.staff, senderType: 'requester', clientMessageId: randomUUID(), content: 'Other chat' });
  await deleteContract(String(ids.org), String(contractId));
  expect(await ExpertChatMessageModel.countDocuments({ contractId })).toBe(0);
  expect(await ExpertChatMessageModel.countDocuments({ contractId: untouchedContract })).toBe(1);
});
