/**
 * @file coupons.routes.ts
 * @description Coupon routes — validation (public/auth) + admin CRUD.
 */

import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/auth.js';
import { requireAdmin, requireRole } from '../../middleware/auth.js';
import * as couponsService from './coupons.service.js';

export default async function couponsRoutes(app: FastifyInstance) {
  // POST /coupons/validate — requires auth
  app.post('/validate', { preHandler: requireAuth }, async (req, reply) => {
    const { code, serviceId, orderAmount } = req.body as {
      code: string;
      serviceId: string;
      orderAmount: number;
    };
    if (!code || !serviceId || !orderAmount) {
      return reply.code(400).send({ error: 'code, serviceId, orderAmount required' });
    }
    const userId = (req as any).user.id as string;
    const result = await couponsService.validateCoupon(code, userId, serviceId, orderAmount);
    if (!result.valid) {
      return reply.code(400).send({ error: result.error });
    }
    return { data: result };
  });

  // ── Admin ─────────────────────────────────────────────────────────────────
  app.register(async (adminRoutes) => {
    adminRoutes.addHook('preHandler', requireAdmin);

    adminRoutes.get('/', async (req) => {
      const { page, pageSize } = req.query as { page?: string; pageSize?: string };
      const result = await couponsService.listCoupons(
        parseInt(page ?? '1', 10),
        parseInt(pageSize ?? '20', 10)
      );
      return { data: result };
    });

    adminRoutes.get('/:id', async (req, reply) => {
      const { id } = req.params as { id: string };
      const coupon = await couponsService.getCoupon(id);
      if (!coupon) return reply.code(404).send({ error: 'Not found' });
      return { data: coupon };
    });

    adminRoutes.post('/', { preHandler: requireRole('SUPER_ADMIN', 'ADMIN') }, async (req, reply) => {
      const coupon = await couponsService.createCoupon(req.body as any);
      return reply.code(201).send({ data: coupon });
    });

    adminRoutes.patch('/:id', { preHandler: requireRole('SUPER_ADMIN', 'ADMIN') }, async (req) => {
      const { id } = req.params as { id: string };
      const coupon = await couponsService.updateCoupon(id, req.body as any);
      return { data: coupon };
    });

    adminRoutes.delete('/:id', { preHandler: requireRole('SUPER_ADMIN', 'ADMIN') }, async (req) => {
      const { id } = req.params as { id: string };
      await couponsService.deleteCoupon(id);
      return { success: true };
    });
  });
}
