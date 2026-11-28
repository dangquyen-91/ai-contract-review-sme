// AI job monitoring and the audit log, for Administrators.
jest.mock('../dist/services/review/reviewWorker.service', () => ({
  ...jest.requireActual('../dist/services/review/reviewWorker.service'),
  // No queue in tests: nothing is waiting in Redis and no worker is alive.
  removeIdleReviewJob: jest.fn(async () => false),
  isReviewJobAlive: jest.fn(async () => false),
}));
const { start, stop, account, ownerWithCompany, call, errorOf, missingId } = require('./helpers/invitations');
const mongoose = require('mongoose');
const { ReviewModel } = require('../dist/models/review.model');
const { ContractModel } = require('../dist/models/contract.model');
const { UsageRunModel } = require('../dist/models/subscription.model');
const { AuditEventModel } = require('../dist/models/auditEvent.model');
const { recordAudit } = require('../dist/services/audit/audit.service');
const { getAiJobOverview, STUCK_RUNNING_MS } = require('../dist/services/reporting/aiJobs.service');

const MINUTE = 60_000;
const id = () => new mongoose.Types.ObjectId();
let admin, company, owner, contract, sequence = 0;

async function review(fields) {
  const run = await UsageRunModel.create({
    orgId: company._id, userId: owner._id, kind: 'analysis', units: 2, status: 'reserved',
    idempotencyKey: `job-run-${++sequence}`, fingerprint: 'fixture', periodId: id(), contractId: id(), leaseExpiresAt: new Date(Date.now() + MINUTE),
  });
  return ReviewModel.create({
    orgId: company._id, contractId: contract._id, versionId: id(), requestedBy: owner._id,
    idempotencyKey: `job-${sequence}`, usageRunId: run._id, ...fields,
  });
}
const jobs = (query = '') => call('get', `/admin/ai-jobs${query}`, admin);

beforeAll(async () => {
  await start();
  admin = await account('administrator');
  ({ company, owner } = await ownerWithCompany('Công ty Giám Sát'));
  contract = await ContractModel.create({ ownerType: 'organization', orgId: company._id, uploadedBy: owner._id, title: 'Hợp đồng thuê kho', status: 'reviewed' });
});
afterAll(stop);

describe('AI job monitoring', () => {
  let stuck, queued, completed, failed;
  beforeAll(async () => {
    const now = Date.now();
    stuck = await review({ status: 'running', currentStage: 'risk_detection', startedAt: new Date(now - STUCK_RUNNING_MS - MINUTE) });
    queued = await review({ status: 'queued' });
    completed = await review({ status: 'completed', startedAt: new Date(now - 3 * MINUTE), finishedAt: new Date(now - MINUTE) });
    failed = await review({ status: 'failed', errorCode: 'AI_OVERLOADED', error: 'AI quá tải', startedAt: new Date(now - 2 * MINUTE), finishedAt: new Date(now - MINUTE) });
    await UsageRunModel.create([
      { orgId: company._id, userId: owner._id, kind: 'chat', units: 1, status: 'succeeded', idempotencyKey: 'chat-ok', fingerprint: 'f', periodId: id(), contractId: id(), leaseExpiresAt: new Date() },
      { orgId: company._id, userId: owner._id, kind: 'drafting', units: 1, status: 'failed', idempotencyKey: 'draft-ko', fingerprint: 'f', periodId: id(), contractId: id(), leaseExpiresAt: new Date() },
    ]);
  });

  test('the overview counts the queue, stuck jobs, the last 24 hours and failures by cause', async () => {
    const overview = await getAiJobOverview();
    expect(overview).toMatchObject({ queued: 1, running: 1, stuck: 1 });
    expect(overview.last24h).toMatchObject({ completed: 1, failed: 1, successRate: 50, averageDurationMs: 2 * MINUTE });
    expect(overview.errors).toEqual([{ code: 'AI_OVERLOADED', count: 1 }]);
    expect(overview.usage.find((row) => row.kind === 'chat')).toMatchObject({ succeeded: 1, units: 1 });
    expect(overview.usage.find((row) => row.kind === 'drafting')).toMatchObject({ failed: 1 });
  });

  test('the job list shows the account, contract title, stage and timing but no contract text', async () => {
    const response = await jobs();
    expect(response.status).toBe(200);
    const row = response.body.data.find((item) => item.id === completed.id);
    expect(row).toMatchObject({
      account: { id: company.id, type: 'organization', name: 'Công ty Giám Sát' },
      contractTitle: 'Hợp đồng thuê kho', requestedBy: { email: owner.email }, status: 'completed', durationMs: 2 * MINUTE, stuck: false,
    });
    expect(response.body.data.find((item) => item.id === stuck.id)).toMatchObject({ stuck: true, currentStage: 'risk_detection' });
    expect(JSON.stringify(response.body)).not.toMatch(/extractedText|usageRunId|idempotencyKey/);
  });

  test('jobs can be filtered by status, stuck, error and search', async () => {
    const ids = async (query) => (await jobs(query)).body.data.map((item) => item.id);
    expect(await ids('?status=queued')).toEqual([queued.id]);
    expect(await ids('?status=stuck')).toEqual([stuck.id]);
    expect(await ids('?errorCode=AI_OVERLOADED')).toEqual([failed.id]);
    expect((await ids(`?search=${encodeURIComponent('thuê kho')}`)).length).toBe(4);
    expect(await ids('?search=khong-co')).toEqual([]);
    expect((await jobs('?status=done')).status).toBe(400);
  });

  test('cancelling a stuck job ends it, returns its units and is audited', async () => {
    const response = await call('post', `/admin/ai-jobs/${stuck.id}/cancel`, admin, {});
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ id: stuck.id, status: 'cancelled' });
    const run = await UsageRunModel.findById(stuck.usageRunId);
    expect(run.status).toBe('failed');
    expect(response.body.data).not.toHaveProperty('orgId');
    const event = await AuditEventModel.findOne({ action: 'ai_job.cancel', 'target.id': stuck.id, actorId: admin._id }).lean();
    expect(event.target.label).toBe('Hợp đồng thuê kho');
    expect(String(event.orgId)).toBe(company.id);
    expect(event.changes).toEqual({ status: { from: 'running', to: 'cancelled' }, refunded: true });
    const listed = (await call('get', '/admin/audit-log?group=ai_job', admin)).body.data[0];
    expect(listed.organization).toEqual({ id: company.id, type: 'organization', name: 'Công ty Giám Sát' });
  });

  test('a finished or unknown job cannot be cancelled', async () => {
    expect((await call('post', `/admin/ai-jobs/${completed.id}/cancel`, admin, {})).status).toBe(409);
    expect((await call('post', `/admin/ai-jobs/${missingId()}/cancel`, admin, {})).status).toBe(404);
  });
});

describe('audit log', () => {
  const log = (query = '') => call('get', `/admin/audit-log${query}`, admin);

  test('creating, updating and deleting an account is recorded with who did it and what changed', async () => {
    const created = await call('post', '/admin/users', admin, { name: 'Người Kiểm Thử', email: 'audit-target@example.com', password: 'AuditPassword#2026', role: 'expert', isActive: true });
    expect(created.status).toBe(201);
    const userId = created.body.data.id;
    expect((await call('patch', `/admin/users/${userId}`, admin, { isActive: false })).status).toBe(200);
    expect((await call('delete', `/admin/users/${userId}`, admin)).status).toBe(204);
    const { body } = await log('?group=user');
    const events = body.data.filter((item) => item.target.id === userId);
    expect(events.map((item) => item.action)).toEqual(['user.delete', 'user.update', 'user.create']);
    expect(events[1].changes).toEqual({ isActive: { from: true, to: false } });
    expect(events[2]).toMatchObject({ actor: { id: admin.id, role: 'administrator', email: admin.email }, target: { label: 'audit-target@example.com' } });
    expect(JSON.stringify(body)).not.toContain('AuditPassword');
  });

  test('changing a password is recorded without the password', async () => {
    await recordAudit({ action: 'account.password_change', actor: { id: owner.id, role: 'owner' }, target: { type: 'user', id: owner.id } });
    const { body } = await log('?group=account');
    expect(body.data[0]).toMatchObject({ action: 'account.password_change', actor: { email: owner.email }, changes: null });
  });

  test('events from payOS are shown as the system', async () => {
    await recordAudit({ action: 'payment.fulfilled', actor: { role: 'system' }, target: { type: 'payment', id: '123', label: 'business_starter' }, changes: { amount: 499000 } });
    const { body } = await log('?group=payment');
    expect(body.data[0].actor).toEqual({ id: null, role: 'system', name: 'Hệ thống', email: null });
  });

  test('search finds events by the actor or the target, and dates follow Vietnam days', async () => {
    expect((await log(`?search=${encodeURIComponent(admin.email)}`)).body.data.length).toBeGreaterThan(0);
    expect((await log('?search=audit-target')).body.data.length).toBe(3);
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    expect((await log(`?from=${today}&to=${today}`)).body.meta.total).toBeGreaterThan(0);
    expect((await log('?from=2020-01-01&to=2020-01-02')).body.data).toEqual([]);
    expect((await log('?from=2026-02-02&to=2026-01-01')).status).toBe(400);
    expect((await log('?group=secret')).status).toBe(400);
  });

  test('an audit write failure never blocks the action', async () => {
    const spy = jest.spyOn(AuditEventModel, 'create').mockRejectedValueOnce(new Error('db down'));
    await expect(recordAudit({ action: 'user.create', actor: { role: 'administrator' }, target: { type: 'user' } })).resolves.toBeUndefined();
    spy.mockRestore();
  });
});

test.each(['manager', 'expert', 'user'])('a %s cannot use the admin operations', async (role) => {
  const someone = await account(role);
  for (const path of ['/admin/ai-jobs', '/admin/ai-jobs/overview', '/admin/audit-log']) {
    const response = await call('get', path, someone);
    expect(response.status).toBe(403);
    expect(errorOf(response)).toBe('Requires role: administrator');
  }
});

test('an organization Owner cannot cancel AI jobs', async () => {
  expect((await call('post', `/admin/ai-jobs/${missingId()}/cancel`, owner, {})).status).toBe(403);
});

test('an Owner removing a member is recorded under the organization', async () => {
  const { company: team, owner: teamOwner } = await ownerWithCompany('Công ty Nhật Ký');
  const staff = await account('staff', team._id);
  expect((await call('delete', `/organizations/${team.id}/members/${staff.id}`, teamOwner)).status).toBe(204);
  const event = await AuditEventModel.findOne({ action: 'member.remove', 'target.id': staff.id }).lean();
  expect(event).toMatchObject({ actorRole: 'owner', target: { label: staff.email } });
  expect(String(event.orgId)).toBe(team.id);
  expect(String(event.actorId)).toBe(teamOwner.id);
});
