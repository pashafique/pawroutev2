/**
 * @file slots.routes.ts
 * @description Time slot routes — public availability + admin CRUD.
 */

import type { FastifyInstance } from 'fastify';
import { requireAdmin, requireRole } from '../../middleware/auth';
import * as slotsService from './slots.service';

export default async function slotsRoutes(app: FastifyInstance) {
  // ── Public: availability ─────────────────────────────────────────────────

  // GET /slots/available?date=2026-03-19
  app.get('/available', async (req, reply) => {
    const { date } = req.query as { date?: string };
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return reply.code(400).send({ error: 'date param required (YYYY-MM-DD)' });
    }
    const slots = await slotsService.getAvailableSlots(date);
    return { data: slots };
  });

  // GET /slots/calendar?year=2026&month=3
  app.get('/calendar', async (req, reply) => {
    const { year, month } = req.query as { year?: string; month?: string };
    const y = parseInt(year ?? '', 10);
    const m = parseInt(month ?? '', 10);
    if (!y || !m || m < 1 || m > 12) {
      return reply.code(400).send({ error: 'year and month (1-12) required' });
    }
    const calendar = await slotsService.getAvailabilityCalendar(y, m);
    return { data: calendar };
  });

  // ── Admin routes ─────────────────────────────────────────────────────────

  app.register(async (adminRoutes) => {
    adminRoutes.addHook('preHandler', requireAdmin);

    // GET /slots — list by date range
    adminRoutes.get('/', async (req) => {
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
      const today = new Date().toISOString().slice(0, 10);
      const grouped = await slotsService.getSlotsByDateRange(
        startDate ?? today,
        endDate ?? today
      );
      return { data: grouped };
    });

    // POST /slots — create single slot
    adminRoutes.post('/', { preHandler: requireRole('SUPER_ADMIN', 'ADMIN') }, async (req, reply) => {
      const body = req.body as any;
      const slot = await slotsService.createSlot(body);
      return reply.code(201).send({ data: slot });
    });

    // POST /slots/generate — bulk generate from template
    adminRoutes.post('/generate', { preHandler: requireRole('SUPER_ADMIN', 'ADMIN') }, async (req, reply) => {
      const body = req.body as any;
      const count = await slotsService.generateSlots(body);
      return reply.code(201).send({ data: { created: count } });
    });

    // PATCH /slots/:id — update slot
    adminRoutes.patch('/:id', { preHandler: requireRole('SUPER_ADMIN', 'ADMIN') }, async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = req.body as any;
      try {
        const slot = await slotsService.updateSlot(id, body);
        return { data: slot };
      } catch {
        return reply.code(404).send({ error: 'Slot not found' });
      }
    });

    // POST /slots/:id/block
    adminRoutes.post('/:id/block', { preHandler: requireRole('SUPER_ADMIN', 'ADMIN') }, async (req) => {
      const { id } = req.params as { id: string };
      const { reason } = (req.body as any) ?? {};
      const slot = await slotsService.blockSlot(id, reason);
      return { data: slot };
    });

    // POST /slots/:id/unblock
    adminRoutes.post('/:id/unblock', { preHandler: requireRole('SUPER_ADMIN', 'ADMIN') }, async (req) => {
      const { id } = req.params as { id: string };
      const slot = await slotsService.unblockSlot(id);
      return { data: slot };
    });

    // DELETE /slots/:id
    adminRoutes.delete('/:id', { preHandler: requireRole('SUPER_ADMIN', 'ADMIN') }, async (req, reply) => {
      const { id } = req.params as { id: string };
      try {
        await slotsService.deleteSlot(id);
        return { success: true };
      } catch (err: any) {
        return reply.code(400).send({ error: err.message });
      }
    });
  });
}
