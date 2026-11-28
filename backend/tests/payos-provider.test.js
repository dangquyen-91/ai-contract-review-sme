// The payOS adapter tells "payOS answered no" apart from "payOS could not be reached".
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/unused';
process.env.JWT_ACCESS_SECRET = 'payos-provider-access';
process.env.JWT_REFRESH_SECRET = 'payos-provider-refresh';
process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
process.env.PAYOS_CLIENT_ID = 'test-client';
process.env.PAYOS_API_KEY = 'test-api';
process.env.PAYOS_CHECKSUM_KEY = 'test-checksum';
const { APIError, ConnectionError, ConnectionTimeoutError } = require('@payos/node');
const provider = require('../dist/services/billing/payos.service');

const requests = provider.getPayOS().paymentRequests;
const failWith = (error) => jest.spyOn(requests, 'get').mockRejectedValueOnce(error);
const answered = (status, code) => APIError.generateError(status, { code, desc: 'Đơn thanh toán không tồn tại' }, 'desc', new Headers());

afterEach(() => jest.restoreAllMocks());

test.each([
  ['a non-success code in a 200 response', answered(200, '101')],
  ['a 404 response', answered(404, '101')],
])('payOS refusing the request (%s) is reported as rejected', async (_case, error) => {
  failWith(error);
  await expect(provider.getPaymentLink(123)).rejects.toMatchObject({ statusCode: 502, code: provider.PROVIDER_REJECTED });
});

test.each([
  ['a connection error', new ConnectionError('offline')],
  ['a timeout', new ConnectionTimeoutError('timeout')],
  ['an authentication error', answered(401, '01')],
  ['a payOS server error', answered(500, '99')],
  ['an unexpected error', new Error('boom')],
])('%s is never reported as rejected', async (_case, error) => {
  failWith(error);
  const failure = await provider.getPaymentLink(123).catch((caught) => caught);
  expect(failure.statusCode).toBe(502);
  expect(failure.code).toBeUndefined();
  expect(failure.message).toMatch(/^Chưa kết nối được cổng thanh toán payOS/);
  expect(failure.message).not.toMatch(/offline|timeout|boom/);
});
