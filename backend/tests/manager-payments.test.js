// Read-only payment history across every account, for Managers.
const { start, stop, account, ownerWithCompany, call, errorOf } = require('./helpers/invitations');
const { PaymentModel } = require('../dist/models/payment.model');

let sequence = 9_100_000_000_000;
const MINUTE = 60_000;
/** Stores an order directly; `minutesAgo` sets its creation time for ordering. */
async function order(orgId, createdBy, fields = {}, minutesAgo = 0) {
  const createdAt = new Date(Date.now() - minutesAgo * MINUTE);
  const [stored] = await PaymentModel.create([{
    orderCode: ++sequence, orgId, createdBy, idempotencyKey: `history-${sequence}`,
    purpose: 'subscription', planCode: 'business_starter', action: 'purchase', amount: 499000,
    status: 'cancelled', isOpen: false, expiresAt: new Date(createdAt.getTime() + 15 * MINUTE),
    checkoutUrl: 'https://pay.payos.vn/web/secret', qrCode: 'secret-qr',
    createdAt, ...fields,
  }]);
  return stored;
}
const list = (user, query = '') => call('get', `/manager/payments${query}`, user);
const codes = (response) => response.body.data.map((item) => item.orderCode);

let manager, company, owner, person, orders;
beforeAll(async () => {
  await start();
  manager = await account('manager');
  ({ company, owner } = await ownerWithCompany('Công ty Lịch Sử'));
  person = await account('user', undefined, { name: 'Phạm Cá Nhân', email: 'ca-nhan-lich-su@example.com' });
  const paidAt = new Date();
  orders = {
    fulfilled: await order(company._id, owner._id, { status: 'paid', paidAt, fulfilledAt: paidAt }, 50),
    activating: await order(company._id, owner._id, { status: 'paid', paidAt, planCode: 'business_pro', action: 'upgrade', amount: 512000 }, 40),
    topUp: await order(company._id, owner._id, { purpose: 'top_up', planCode: undefined, packCode: 'business_analysis_50', topUpKind: 'analysis', topUpUnits: 50, amount: 199000, status: 'expired' }, 30),
    review: await order(person._id, person._id, { purpose: 'contract_review', planCode: undefined, reviewUnits: 2, amount: 20000, status: 'pending', isOpen: true }, 20),
    legacy: await order(person._id, person._id, { purpose: undefined, planCode: 'personal_pro', amount: 99000, status: 'failed' }, 10),
  };
  await PaymentModel.collection.updateOne({ _id: orders.legacy._id }, { $unset: { purpose: '' } });
});
afterAll(stop);

test('a Manager sees every order, newest first, with the paying account and who ordered it', async () => {
  const response = await list(manager);
  expect(response.status).toBe(200);
  expect(response.headers['cache-control']).toBe('private, no-store');
  const mine = response.body.data.filter((item) => Object.values(orders).some((o) => o.orderCode === item.orderCode));
  expect(mine.map((item) => item.orderCode)).toEqual([orders.legacy, orders.review, orders.topUp, orders.activating, orders.fulfilled].map((o) => o.orderCode));
  expect(mine.find((item) => item.orderCode === orders.fulfilled.orderCode)).toMatchObject({
    account: { id: company.id, type: 'organization', name: 'Công ty Lịch Sử' },
    createdBy: { name: owner.name, email: owner.email },
    purpose: 'subscription', planCode: 'business_starter', amount: 499000, currency: 'VND',
  });
  expect(mine.find((item) => item.orderCode === orders.review.orderCode).account).toEqual({ id: person.id, type: 'personal', name: 'Phạm Cá Nhân' });
  expect(mine.find((item) => item.orderCode === orders.legacy.orderCode).purpose).toBe('subscription');
});

test('payment links and request keys are never exposed', async () => {
  const body = JSON.stringify((await list(manager)).body);
  for (const secret of ['checkoutUrl', 'qrCode', 'secret-qr', 'pay.payos.vn', 'idempotencyKey', 'history-']) expect(body).not.toContain(secret);
});

test.each([
  ['fulfilled', 'fulfilled'],
  ['activating', 'activating'],
  ['pending', 'review'],
  ['expired', 'topUp'],
  ['failed', 'legacy'],
])('the %s status filter returns only matching orders', async (status, key) => {
  const response = await list(manager, `?status=${status}&search=`);
  expect(codes(response)).toContain(orders[key].orderCode);
  for (const other of Object.keys(orders).filter((name) => name !== key)) expect(codes(response)).not.toContain(orders[other].orderCode);
});

test('the purpose filter separates plans, extra units and contract reviews, counting older plan orders as plans', async () => {
  const plans = codes(await list(manager, '?purpose=subscription'));
  expect(plans).toEqual(expect.arrayContaining([orders.fulfilled, orders.activating, orders.legacy].map((o) => o.orderCode)));
  expect(plans).not.toContain(orders.topUp.orderCode);
  expect(codes(await list(manager, '?purpose=top_up'))).toEqual([orders.topUp.orderCode]);
  expect(codes(await list(manager, '?purpose=contract_review'))).toEqual([orders.review.orderCode]);
});

test('search finds an order by its code, its account name or the email of who ordered it', async () => {
  expect(codes(await list(manager, `?search=${orders.topUp.orderCode}`))).toEqual([orders.topUp.orderCode]);
  expect(codes(await list(manager, `?search=${encodeURIComponent('lịch sử')}`))).toHaveLength(3);
  expect(codes(await list(manager, `?search=${encodeURIComponent('ca-nhan-lich-su@')}`)).sort()).toEqual([orders.review, orders.legacy].map((o) => o.orderCode).sort());
  expect((await list(manager, '?search=khong-co-ai')).body).toMatchObject({ data: [], meta: { total: 0, totalPages: 1 } });
});

test('a search with regular-expression characters is treated as plain text', async () => {
  const response = await list(manager, `?search=${encodeURIComponent('.*')}`);
  expect(response.status).toBe(200);
  expect(response.body.data).toEqual([]);
});

test('results are paginated', async () => {
  const response = await list(manager, '?limit=2&page=2');
  expect(response.body.data).toHaveLength(2);
  expect(response.body.meta).toMatchObject({ page: 2, limit: 2 });
  expect(response.body.meta.totalPages).toBe(Math.ceil(response.body.meta.total / 2));
});

test('invalid filters are rejected', async () => {
  for (const query of ['?status=paid', '?purpose=gift', '?limit=101', '?page=0']) expect((await list(manager, query)).status).toBe(400);
});

test.each(['administrator', 'expert', 'user'])('a %s cannot read the payment history', async (role) => {
  const response = await list(await account(role));
  expect(response.status).toBe(403);
  expect(errorOf(response)).toBe('Requires role: manager');
});

test('an organization Owner cannot read the payment history', async () => {
  expect((await list(owner)).status).toBe(403);
});

test('a signed-out request is rejected', async () => {
  expect((await list()).status).toBe(401);
});
