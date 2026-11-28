import { APIError, PayOS } from '@payos/node';
import type { CreatePaymentLinkRequest, Webhook } from '@payos/node';
import { env } from '../../config/env';
import { AppError } from '../../errors/AppError';

/** payOS answered the request and refused it, e.g. the order does not exist there. */
export const PROVIDER_REJECTED = 'PAYOS_REJECTED';

// payOS reports a refused request either as HTTP 404 or as HTTP 200 with a non-"00"
// code in the body. Network failures, timeouts, auth and server errors are not answers.
const isProviderAnswer = (error: unknown) =>
  error instanceof APIError &&
  typeof error.status === 'number' &&
  (error.status === 404 || (error.status >= 200 && error.status < 300));

let client: PayOS | undefined;
export function getPayOS() {
  if (!env.PAYOS_CLIENT_ID || !env.PAYOS_API_KEY || !env.PAYOS_CHECKSUM_KEY) {
    throw new AppError('payOS is not configured', 503);
  }
  return (client ??= new PayOS({
    clientId: env.PAYOS_CLIENT_ID,
    apiKey: env.PAYOS_API_KEY,
    checksumKey: env.PAYOS_CHECKSUM_KEY,
    timeout: 20_000,
    maxRetries: 0,
    logLevel: 'off',
  }));
}

// Never expose provider errors: they can include request headers and credentials.
async function providerRequest<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isProviderAnswer(error))
      throw new AppError('Cổng thanh toán payOS không tìm thấy hoặc từ chối đơn này.', 502, true, PROVIDER_REJECTED);
    throw new AppError('Chưa kết nối được cổng thanh toán payOS. Hãy kiểm tra lại đơn này trước khi tạo đơn mới.', 502);
  }
}
export const createPaymentLink = (input: CreatePaymentLinkRequest) => {
  const payos = getPayOS();
  return providerRequest(() => payos.paymentRequests.create(input));
};
export const getPaymentLink = (orderCode: number) => {
  const payos = getPayOS();
  return providerRequest(() => payos.paymentRequests.get(orderCode));
};
export const cancelPaymentLink = (orderCode: number) => {
  const payos = getPayOS();
  return providerRequest(() => payos.paymentRequests.cancel(orderCode, 'Cancelled by customer'));
};
export async function verifyPaymentWebhook(body: Webhook) {
  const payos = getPayOS();
  try {
    return await payos.webhooks.verify(body);
  } catch {
    throw AppError.badRequest('Invalid payOS webhook signature');
  }
}
