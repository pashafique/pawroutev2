/**
 * @file payments.service.ts
 * @description Payment processing — Stripe + Cash on arrival.
 */

import { prisma } from '../../lib/prisma';
import { createPaymentIntent, createRefund } from '../../lib/stripe';
import { appConfig } from '@pawroute/config';

// ── Create Stripe PaymentIntent ──────────────────────────────────────────────

export async function initiateStripePayment(appointmentId: string, userId: string) {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { payment: true },
  });
  if (!appt || appt.userId !== userId) {
    throw Object.assign(new Error('Appointment not found'), { statusCode: 404 });
  }
  if (!['PENDING', 'CONFIRMED'].includes(appt.status)) {
    throw Object.assign(new Error('Appointment is not in a payable state'), { statusCode: 400 });
  }
  if (appt.payment?.status === 'SUCCESS') {
    throw Object.assign(new Error('Appointment is already paid'), { statusCode: 400 });
  }

  const intent = await createPaymentIntent(appt.totalAmount, appointmentId, userId);

  // Upsert Payment record
  await prisma.payment.upsert({
    where: { appointmentId },
    create: {
      appointmentId,
      userId,
      amount: appt.totalAmount,
      currency: appConfig.locale.defaultCurrency,
      method: 'CARD',
      status: 'PENDING',
      gatewayRef: intent.id,
      clientSecret: intent.client_secret,
    },
    update: {
      gatewayRef: intent.id,
      clientSecret: intent.client_secret,
      status: 'PENDING',
    },
  });

  return { clientSecret: intent.client_secret, paymentIntentId: intent.id };
}

// ── Cash on Arrival ──────────────────────────────────────────────────────────

export async function markCashPayment(appointmentId: string, userId: string) {
  if (!appConfig.features.cashOnArrival) {
    throw Object.assign(new Error('Cash on arrival is not enabled'), { statusCode: 400 });
  }

  const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appt || appt.userId !== userId) {
    throw Object.assign(new Error('Appointment not found'), { statusCode: 404 });
  }

  return prisma.payment.upsert({
    where: { appointmentId },
    create: {
      appointmentId,
      userId,
      amount: appt.totalAmount,
      currency: appConfig.locale.defaultCurrency,
      method: 'CASH',
      status: 'PENDING', // marked SUCCESS when admin marks appointment COMPLETED
    },
    update: {
      method: 'CASH',
      status: 'PENDING',
    },
  });
}

// ── Stripe Webhook Handler ────────────────────────────────────────────────────

export async function handleStripeWebhook(event: any) {
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object;
      const appointmentId = pi.metadata?.appointmentId;
      if (!appointmentId) break;

      await prisma.$transaction([
        prisma.payment.updateMany({
          where: { gatewayRef: pi.id },
          data: { status: 'SUCCESS', paidAt: new Date() },
        }),
        prisma.appointment.update({
          where: { id: appointmentId },
          data: { status: 'CONFIRMED' },
        }),
      ]);
      break;
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object;
      await prisma.payment.updateMany({
        where: { gatewayRef: pi.id },
        data: { status: 'FAILED' },
      });
      break;
    }
    case 'charge.refunded': {
      const charge = event.data.object;
      const pi = charge.payment_intent as string;
      if (pi) {
        await prisma.payment.updateMany({
          where: { gatewayRef: pi },
          data: {
            status: 'REFUNDED',
            refundedAmount: (charge.amount_refunded ?? 0) / 100,
          },
        });
      }
      break;
    }
  }
}

// ── Admin: Refund ──────────────────────────────────────────────────────────────

export async function refundPayment(paymentId: string, reason?: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw Object.assign(new Error('Payment not found'), { statusCode: 404 });
  if (payment.status !== 'SUCCESS') throw Object.assign(new Error('Payment is not in a refundable state'), { statusCode: 400 });
  if (!payment.gatewayRef) throw Object.assign(new Error('No gateway reference for refund'), { statusCode: 400 });

  await createRefund(payment.gatewayRef, undefined, reason as any);

  return prisma.payment.update({
    where: { id: paymentId },
    data: { status: 'REFUNDED', refundReason: reason ?? null },
  });
}

// ── User payment history ──────────────────────────────────────────────────────

export async function getUserPayments(userId: string) {
  return prisma.payment.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      appointment: {
        select: {
          bookingRef: true,
          service: { select: { name: true } },
          slot: { select: { date: true, startTime: true } },
        },
      },
    },
  });
}
