/**
 * @file appointments.routes.ts
 * @description Appointment routes — customer booking + admin management.
 */

import type { FastifyInstance } from 'fastify';
import { requireAuth, requireAdmin, requireRole } from '../../middleware/auth';
import * as appointmentsService from './appointments.service';

export default async function appointmentsRoutes(app: FastifyInstance) {
  // ── Customer routes ────────────────────────────────────────────────────────
  app.register(async (customerRoutes) => {
    customerRoutes.addHook('preHandler', requireAuth);

    // GET /appointments — list my appointments
    customerRoutes.get('/', async (req) => {
      const userId = (req as any).user.id as string;
      const { status, page, pageSize } = req.query as Record<string, string>;
      const result = await appointmentsService.listUserAppointments(userId, {
        status,
        page: page ? parseInt(page, 10) : 1,
        pageSize: pageSize ? parseInt(pageSize, 10) : 20,
      });
      return { data: result };
    });

    // GET /appointments/:id
    customerRoutes.get('/:id', async (req, reply) => {
      const userId = (req as any).user.id as string;
      const { id } = req.params as { id: string };
      const appt = await appointmentsService.getAppointmentById(id, userId);
      if (!appt) return reply.code(404).send({ error: 'Appointment not found' });
      return { data: appt };
    });

    // POST /appointments — create booking
    customerRoutes.post('/', async (req, reply) => {
      const userId = (req as any).user.id as string;
      try {
        const appt = await appointmentsService.createAppointment(userId, req.body as any);
        return reply.code(201).send({ data: appt });
      } catch (err: any) {
        const code = err.statusCode ?? 500;
        return reply.code(code).send({ error: err.message });
      }
    });

    // POST /appointments/:id/cancel
    customerRoutes.post('/:id/cancel', async (req, reply) => {
      const userId = (req as any).user.id as string;
      const { id } = req.params as { id: string };
      const { reason } = (req.body as any) ?? {};
      try {
        const appt = await appointmentsService.cancelAppointment(id, userId, reason);
        return { data: appt };
      } catch (err: any) {
        return reply.code(err.statusCode ?? 400).send({ error: err.message });
      }
    });

    // POST /appointments/:id/reschedule
    customerRoutes.post('/:id/reschedule', async (req, reply) => {
      const userId = (req as any).user.id as string;
      const { id } = req.params as { id: string };
      const { slotId } = req.body as { slotId: string };
      if (!slotId) return reply.code(400).send({ error: 'slotId required' });
      try {
        const appt = await appointmentsService.rescheduleAppointment(id, userId, slotId);
        return { data: appt };
      } catch (err: any) {
        return reply.code(err.statusCode ?? 400).send({ error: err.message });
      }
    });
  });

  // ── Admin routes ────────────────────────────────────────────────────────────
  app.register(async (adminRoutes) => {
    adminRoutes.addHook('preHandler', requireAdmin);

    // GET /appointments/admin — list all
    adminRoutes.get('/admin', async (req) => {
      const { status, date, userId, page, pageSize, search } = req.query as Record<string, string>;
      const result = await appointmentsService.listAllAppointments({
        status, date, userId, search,
        page: page ? parseInt(page, 10) : 1,
        pageSize: pageSize ? parseInt(pageSize, 10) : 20,
      });
      return { data: result };
    });

    // GET /appointments/admin/:id
    adminRoutes.get('/admin/:id', async (req, reply) => {
      const { id } = req.params as { id: string };
      const appt = await appointmentsService.adminGetAppointment(id);
      if (!appt) return reply.code(404).send({ error: 'Not found' });
      return { data: appt };
    });

    // PATCH /appointments/admin/:id/status
    adminRoutes.patch(
      '/admin/:id/status',
      { preHandler: requireRole('SUPER_ADMIN', 'ADMIN', 'GROOMER') },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const adminId = (req as any).admin.id as string;
        const { status, notes } = req.body as { status: string; notes?: string };
        if (!status) return reply.code(400).send({ error: 'status required' });
        try {
          const appt = await appointmentsService.adminUpdateStatus(id, adminId, status, notes);
          return { data: appt };
        } catch (err: any) {
          return reply.code(err.statusCode ?? 400).send({ error: err.message });
        }
      }
    );
  });
}
