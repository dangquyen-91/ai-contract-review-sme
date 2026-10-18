import { PayOS } from '@payos/node';
import type { CreatePaymentLinkRequest, Webhook } from '@payos/node';
import { env } from '../../config/env';
import { AppError } from '../../errors/AppError';

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
  } catch {
    throw new AppError('Could not reach payOS. Check this order before creating another.', 502);
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
