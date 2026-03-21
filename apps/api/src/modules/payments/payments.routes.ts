/**
 * @file payments.routes.ts
 * @description Payment routes — Stripe integration, cash on arrival, webhooks.
 */

import type { FastifyInstance } from 'fastify';
import { requireAuth, requireAdmin, requireRole } from '../../middleware/auth.js';
import { constructWebhookEvent } from '../../lib/stripe.js';
import * as paymentsService from './payments.service.js';

export default async function paymentsRoutes(app: FastifyInstance) {
  // ── Customer routes ────────────────────────────────────────────────────────
  app.register(async (customerRoutes) => {
    customerRoutes.addHook('preHandler', requireAuth);

    // POST /payments/initiate — create Stripe PaymentIntent
    customerRoutes.post('/initiate', async (req, reply) => {
      const userId = (req as any).user.id as string;
      const { appointmentId } = req.body as { appointmentId: string };
      if (!appointmentId) return reply.code(400).send({ error: 'appointmentId required' });
      try {
        const result = await paymentsService.initiateStripePayment(appointmentId, userId);
        return { data: result };
      } catch (err: any) {
        return reply.code(err.statusCode ?? 400).send({ error: err.message });
      }
    });

    // POST /payments/cash — mark cash on arrival
    customerRoutes.post('/cash', async (req, reply) => {
      const userId = (req as any).user.id as string;
      const { appointmentId } = req.body as { appointmentId: string };
      if (!appointmentId) return reply.code(400).send({ error: 'appointmentId required' });
      try {
        const payment = await paymentsService.markCashPayment(appointmentId, userId);
        return { data: payment };
      } catch (err: any) {
        return reply.code(err.statusCode ?? 400).send({ error: err.message });
      }
    });

    // GET /payments/history
    customerRoutes.get('/history', async (req) => {
      const userId = (req as any).user.id as string;
      const payments = await paymentsService.getUserPayments(userId);
      return { data: payments };
    });
  });

  // ── Stripe Webhook ─────────────────────────────────────────────────────────
  // Must be before body parsing — uses raw body
  app.post('/webhook/stripe',
    {
      config: { rawBody: true },
      // Skip JWT auth — Stripe signature is the auth
    },
    async (req, reply) => {
      if (!process.env['STRIPE_WEBHOOK_SECRET']) {
        return reply.code(503).send({ error: 'Stripe webhook not configured' });
      }
      const signature = req.headers['stripe-signature'] as string;
      if (!signature) return reply.code(400).send({ error: 'Missing stripe-signature' });

      try {
        const rawBody = (req as any).rawBody as Buffer;
        const event = constructWebhookEvent(rawBody, signature);
        await paymentsService.handleStripeWebhook(event);
        return { received: true };
      } catch (err: any) {
        app.log.error({ err }, 'Stripe webhook error');
        return reply.code(400).send({ error: err.message });
      }
    }
  );

  // ── Admin routes ────────────────────────────────────────────────────────────
  app.register(async (adminRoutes) => {
    adminRoutes.addHook('preHandler', requireAdmin);

    // POST /payments/admin/refund/:id
    adminRoutes.post('/admin/refund/:id',
      { preHandler: requireRole('SUPER_ADMIN', 'ADMIN') },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const { reason } = (req.body as any) ?? {};
        try {
          const payment = await paymentsService.refundPayment(id, reason);
          return { data: payment };
        } catch (err: any) {
          return reply.code(err.statusCode ?? 400).send({ error: err.message });
        }
      }
    );
  });
}
