process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/unused';
process.env.JWT_ACCESS_SECRET = 'contract-list-test-access';
process.env.JWT_REFRESH_SECRET = 'contract-list-test-refresh';
process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
process.env.MONGOMS_DOWNLOAD_DIR = require('path').join(__dirname, '../node_modules/.cache/mongodb-memory-server');

const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { ContractModel } = require('../dist/models/contract.model');
const { ContractVersionModel } = require('../dist/models/contractVersion.model');
const { ReviewModel } = require('../dist/models/review.model');
const { ExpertReviewModel } = require('../dist/models/expertReview.model');
const { listContracts } = require('../dist/services/contract/contract.service');
const { listContractsQuerySchema } = require('../dist/validations/contract.validation');
const { listVerificationQueue } = require('../dist/services/review/verification.service');
const { getExpertOriginalFile, getExpertFullText, shareVerificationOriginal } = require('../dist/services/review/verification.service');
const storage = require('../dist/services/contract/storage.service');
const { ExpertWorkRecordModel } = require('../dist/models/expertWorkRecord.model');
const { listExpertWork } = require('../dist/services/review/expertWork.service');
const oid = () => new mongoose.Types.ObjectId();
const org = oid(), otherOrg = oid();
const pagination = { page: 1, limit: 10, skip: 0, sortBy: 'updatedAt', sortOrder: -1 };
let replica, sent, unsent, oldReview, newReview;

beforeAll(async () => {
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replica.getUri());
  sent = oid(); unsent = oid(); oldReview = oid(); newReview = oid();
  const version = oid();
  await ContractModel.collection.insertMany([
    { _id: sent, orgId: org, title: 'Đã gửi', status: 'reviewed', type: 'service', createdAt: new Date('2026-10-01'), updatedAt: new Date('2026-10-31') },
    { _id: unsent, orgId: org, title: 'Chưa gửi', status: 'uploaded', createdAt: new Date('2026-10-01'), updatedAt: new Date('2026-10-30') },
    { _id: oid(), orgId: otherOrg, title: 'Khác tổ chức', status: 'reviewed', updatedAt: new Date('2026-11-01') },
  ]);
  await ContractVersionModel.collection.insertOne({ _id: version, contractId: sent, versionNumber: 1, overallRiskLevel: 'high', extractedText: 'PRIVATE DOCUMENT CONTENT' });
  await ReviewModel.collection.insertMany([
    { _id: oldReview, orgId: org, contractId: sent, versionId: version, status: 'completed', createdAt: new Date('2026-10-29') },
    { _id: newReview, orgId: org, contractId: sent, versionId: version, status: 'completed', createdAt: new Date('2026-10-31') },
  ]);
  await ExpertReviewModel.collection.insertMany([
    { _id: oid(), orgId: org, contractId: sent, reviewId: oldReview, status: 'approved', attempt: 2, requestedAt: new Date('2026-10-30'), requestNote: 'PRIVATE NOTE', decisionNote: 'PRIVATE DECISION', expertId: oid() },
    { _id: oid(), orgId: otherOrg, contractId: sent, reviewId: oid(), status: 'returned', requestedAt: new Date('2026-11-01') },
  ]);
});
afterAll(async () => { await mongoose.disconnect(); if (replica) await replica.stop(); });

test('original file access requires the assigned expert, the current attempt and explicit sharing', async () => {
  const versionId = oid(), newerVersionId = oid(), reviewId = oid(), expertId = oid();
  await ContractVersionModel.collection.insertMany([
    { _id: versionId, contractId: unsent, versionNumber: 1, fileKey: 'reviewed-file', fileResourceType: 'raw', mimeType: 'application/pdf', extractedText: 'Reviewed unmasked text' },
    { _id: newerVersionId, contractId: unsent, versionNumber: 2, fileKey: 'newer-file', fileResourceType: 'raw', extractedText: 'Newer text' },
  ]);
  await ReviewModel.collection.insertOne({ _id: reviewId, orgId: org, contractId: unsent, versionId });
  const verification = await ExpertReviewModel.create({ reviewId, contractId: unsent, orgId: org, expertId, requestedBy: oid(), requestedAt: new Date(), attempt: 2, status: 'in_progress' });
  const download = jest.spyOn(storage, 'downloadContractFile').mockResolvedValue(Buffer.from('reviewed bytes'));
  const view = (viewer = expertId, attempt = 2) => getExpertOriginalFile(String(viewer), String(reviewId), attempt);
  const text = (viewer = expertId) => getExpertFullText(String(viewer), String(reviewId), 2);
  const grant = (sender = verification.requestedBy, attempt = 2) => shareVerificationOriginal(String(org), String(sender), String(reviewId), attempt);
  try {
    await expect(view()).rejects.toMatchObject({ statusCode: 404 });
    await expect(text()).rejects.toMatchObject({ statusCode: 404 });
    await expect(grant(oid())).rejects.toMatchObject({ statusCode: 404 });
    await expect(grant(verification.requestedBy, 1)).rejects.toMatchObject({ statusCode: 404 });
    await expect(grant()).resolves.toBeUndefined();
    await verification.updateOne({ status: 'requested' });
    await expect(view()).rejects.toMatchObject({ statusCode: 404 });
    await verification.updateOne({ status: 'in_progress' });
    await expect(view(oid())).rejects.toMatchObject({ statusCode: 404 });
    await expect(text(oid())).rejects.toMatchObject({ statusCode: 404 });
    await expect(view(expertId, 1)).rejects.toMatchObject({ statusCode: 404 });
    expect(download).not.toHaveBeenCalled();
    await expect(view()).resolves.toMatchObject({ mimeType: 'application/pdf', buffer: Buffer.from('reviewed bytes') });
    await expect(text()).resolves.toEqual({ text: 'Reviewed unmasked text' });
    expect(download).toHaveBeenCalledWith(expect.objectContaining({ key: 'reviewed-file' }));
    await verification.updateOne({ status: 'approved' });
    await expect(view()).rejects.toMatchObject({ statusCode: 404 });
    await expect(text()).rejects.toMatchObject({ statusCode: 404 });
    await expect(grant()).rejects.toMatchObject({ statusCode: 404 });
  } finally {
    download.mockRestore();
    await ExpertReviewModel.deleteOne({ _id: verification._id });
    await ReviewModel.deleteOne({ _id: reviewId });
    await ContractVersionModel.deleteMany({ _id: { $in: [versionId, newerVersionId] } });
  }
});

test('list returns latest request metadata without text, notes or other organization data', async () => {
  const result = await listContracts(String(org), {}, pagination);
  expect(result.total).toBe(2);
  const row = result.items.find(item => String(item._id) === String(sent));
  expect(String(row.latestReviewId)).toBe(String(newReview));
  expect(String(row.expertVerification.reviewId)).toBe(String(oldReview));
  expect(row.expertVerification.status).toBe('approved');
  expect(row.expertVerification.attempt).toBe(2);
  expect(JSON.stringify(result)).not.toMatch(/PRIVATE|expertId|Khác tổ chức/);
});

test('verification filters apply before pagination and totals', async () => {
  const unassigned = await listContracts(String(org), { verificationStatus: 'not_sent' }, { ...pagination, limit: 1 });
  expect(unassigned.total).toBe(1);
  expect(String(unassigned.items[0]._id)).toBe(String(unsent));
  const approved = await listContracts(String(org), { verificationStatus: 'approved', riskLevel: 'high' }, pagination);
  expect(approved.total).toBe(1);
  expect(approved.items[0].expertVerification.status).toBe('approved');
  const secondPage = await listContracts(String(org), { verificationStatus: 'approved' }, { ...pagination, page: 2, skip: 1, limit: 1 });
  expect(secondPage.total).toBe(1);
  expect(secondPage.items).toHaveLength(0);
  expect((await listContracts(String(org), { verificationStatus: 'returned' }, pagination)).total).toBe(0);
});

test('request updates are reflected and validation rejects unknown statuses', async () => {
  await ExpertReviewModel.updateOne({ reviewId: oldReview }, { $set: { status: 'in_progress' } });
  expect((await listContracts(String(org), { verificationStatus: 'in_progress' }, pagination)).total).toBe(1);
  expect((await listContracts(String(org), { verificationStatus: 'approved' }, pagination)).total).toBe(0);
  expect(listContractsQuerySchema.safeParse({ verificationStatus: 'cancelled' }).success).toBe(false);
});

test('expert queue redacts priority notes even when their data does not appear in the contract', async () => {
  await ContractModel.collection.updateOne({ _id: sent }, { $unset: { type: '' } });
  await ExpertReviewModel.updateOne({ reviewId: oldReview }, { $set: { status: 'requested', requestNote: 'Ưu tiên thanh toán. Email: priority@example.com. Điện thoại: 0903123456' } });
  const rows = await listVerificationQueue(String(oid()), 'requested');
  const row = rows.find(item => String(item.reviewId) === String(oldReview));
  expect(row.requestNote).toContain('Ưu tiên thanh toán');
  expect(row.requestNote).not.toContain('priority@example.com');
  expect(row.requestNote).not.toContain('0903123456');
});

test('personal work previews mask notes and keep the completed attempt after reassignment', async () => {
  const expertId = oid();
  const session = await ExpertReviewModel.create({ reviewId: oid(), contractId: sent, orgId: org, expertId, requestedBy: oid(), requestedAt: new Date(), assignedAt: new Date(), completedAt: new Date(), status: 'returned', attempt: 1, decisionNote: 'Cần bổ sung tiêu chuẩn nghiệm thu. Email: expert-note@example.com' });
  const query = { status: 'all', page: 1, limit: 10 };
  const current = await listExpertWork(String(expertId), query);
  expect(current.items[0].decisionPreview).toContain('Cần bổ sung');
  expect(JSON.stringify(current)).not.toMatch(/expert-note@example.com|decisionNote|workspaceJson/);
  const record = await ExpertWorkRecordModel.create({ expertReviewId: session._id, reviewId: session.reviewId, contractId: sent, expertId, requestedBy: session.requestedBy, status: 'returned', attempt: 1, title: 'Bản lưu', completedAt: new Date(), requestedAt: session.requestedAt, assignedAt: session.assignedAt, workspaceJson: '{}', decisionNote: 'Kết luận cũ. Email: archived-note@example.com' });
  const raw = await ExpertWorkRecordModel.collection.findOne({ _id: record._id });
  expect(raw.decisionNote).not.toContain('archived-note@example.com');
  await ExpertReviewModel.updateOne({ _id: session._id }, { $set: { attempt: 2, expertId: oid(), status: 'in_progress', decisionNote: 'Kết luận mới không được lẫn vào bản cũ' } });
  const archived = await listExpertWork(String(expertId), query);
  expect(archived.total).toBe(1);
  expect(archived.items[0].decisionPreview).toContain('Kết luận cũ');
  expect(JSON.stringify(archived)).not.toMatch(/archived-note@example.com|Kết luận mới|decisionNote|workspaceJson/);
  expect((await listExpertWork(String(oid()), query)).total).toBe(0);
});
