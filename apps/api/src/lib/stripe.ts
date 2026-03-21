import Stripe from 'stripe';
import { appConfig } from '@pawroute/config';

export const stripe = new Stripe(process.env['STRIPE_SECRET_KEY']!, {
  apiVersion: '2024-06-20',
  appInfo: {
    name: appConfig.product.name,
    version: appConfig.product.version,
  },
});

/**
 * Create a Stripe PaymentIntent for an appointment.
 */
export async function createPaymentIntent(
  amountAed: number,
  appointmentId: string,
  userId: string,
  metadata?: Record<string, string>
): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.create({
    amount: Math.round(amountAed * 100), // Stripe uses smallest currency unit
    currency: appConfig.payment.currency.toLowerCase(),
    capture_method: appConfig.payment.captureMethod,
    statement_descriptor: appConfig.payment.statementDescriptor,
    metadata: {
      appointmentId,
      userId,
      platform: appConfig.product.name,
      ...metadata,
    },
  });
}

/**
 * Verify Stripe webhook signature. Returns parsed event or throws.
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env['STRIPE_WEBHOOK_SECRET']!
  );
}

/**
 * Create a refund for a PaymentIntent.
 */
export async function createRefund(
  paymentIntentId: string,
  amountAed?: number,
  reason?: Stripe.RefundCreateParams.Reason
): Promise<Stripe.Refund> {
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    ...(amountAed !== undefined && { amount: Math.round(amountAed * 100) }),
    ...(reason !== undefined && { reason }),
  });
}
