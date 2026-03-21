/**
 * @file admin.routes.ts
 * @description Admin routes — auth + core admin API endpoints.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { adminLogin, adminRefreshToken, adminLogout } from './admin.auth.service.js';
import { requireAdmin, requireRole } from '../../middleware/auth.js';

async function adminRoutes(app: FastifyInstance) {
  // ── POST /admin/auth/login ───────────────────────────────────────────────
  app.post('/auth/login', {
    schema: {
      tags: ['admin'],
      summary: 'Admin login',
    },
    handler: async (req, reply) => {
      const { email, password } = req.body as { email: string; password: string };
      const result = await adminLogin(email, password);
      reply.send({ success: true, data: result });
    },
  });

  // ── POST /admin/auth/refresh ─────────────────────────────────────────────
  app.post('/auth/refresh', {
    schema: {
      tags: ['admin'],
      summary: 'Rotate admin token pair',
    },
    handler: async (req, reply) => {
      const { refreshToken } = req.body as { refreshToken: string };
      const result = await adminRefreshToken(refreshToken);
      reply.send({ success: true, data: result });
    },
  });

  // ── POST /admin/auth/logout ──────────────────────────────────────────────
  app.post('/auth/logout', {
    preHandler: [requireAdmin],
    schema: { tags: ['admin'], summary: 'Admin logout' },
    handler: async (req, reply) => {
      await adminLogout((req as any).admin.id);
      reply.send({ success: true, message: 'Logged out' });
    },
  });

  // ── GET /admin/auth/me ───────────────────────────────────────────────────
  app.get('/auth/me', {
    preHandler: [requireAdmin],
    schema: { tags: ['admin'], summary: 'Get current admin profile' },
    handler: async (req, reply) => {
      const { prisma } = await import('../../lib/prisma.js');
      const admin = await prisma.adminUser.findUnique({
        where: { id: (req as any).admin.id },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      });
      if (!admin) return reply.code(404).send({ success: false, error: 'Admin not found' });
      reply.send({ success: true, data: admin });
    },
  });

  // ── GET /admin/dashboard/stats ───────────────────────────────────────────
  app.get('/dashboard/stats', {
    preHandler: [requireAdmin],
    schema: { tags: ['admin'], summary: 'Dashboard KPI stats' },
    handler: async (req, reply) => {
      const { prisma } = await import('../../lib/prisma.js');

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayStr = today.toISOString().slice(0, 10); // YYYY-MM-DD (slot.date is a string)

      const [
        totalBookings,
        todayAppointments,
        pendingAppointments,
        totalCustomers,
        revenueResult,
      ] = await Promise.all([
        prisma.appointment.count(),
        prisma.appointment.count({
          where: { slot: { date: todayStr } },
        }),
        prisma.appointment.count({ where: { status: 'PENDING' } }),
        prisma.user.count({ where: { deletedAt: null, isActive: true } }),
        prisma.payment.aggregate({
          where: { status: 'SUCCESS' },
          _sum: { amount: true },
        }),
      ]);

      reply.send({
        success: true,
        data: {
          totalBookings,
          todayAppointments,
          pendingAppointments,
          totalCustomers,
          totalRevenue: revenueResult._sum.amount ?? 0,
        },
      });
    },
  });

  // ── GET /admin/customers ─────────────────────────────────────────────────
  app.get('/customers', {
    preHandler: [requireAdmin],
    schema: {
      tags: ['admin'],
      summary: 'List all customers',
    },
    handler: async (req, reply) => {
      const { prisma } = await import('../../lib/prisma.js');
      const { page, limit, search } = req.query as { page: number; limit: number; search?: string };
      const skip = (page - 1) * limit;

      const where = {
        deletedAt: null,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                { email: { contains: search, mode: 'insensitive' as const } },
                { phone: { contains: search } },
              ],
            }
          : {}),
      };

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            otpVerified: true,
            profilePhoto: true,
            createdAt: true,
            _count: { select: { appointments: true } },
          },
        }),
        prisma.user.count({ where }),
      ]);

      reply.send({
        success: true,
        data: { customers: users, total, page, pageSize: limit },
      });
    },
  });

  // ── GET /admin/customers/:id ─────────────────────────────────────────────
  app.get('/customers/:id', {
    preHandler: [requireAdmin],
    handler: async (req, reply) => {
      const { prisma } = await import('../../lib/prisma.js');
      const { id } = req.params as { id: string };
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          pets: { where: { deletedAt: null }, select: { id: true, name: true, type: true, sizeCategory: true } },
          appointments: {
            orderBy: { createdAt: 'desc' }, take: 10,
            include: { service: { select: { name: true } } },
          },
          adminNotes: {
            orderBy: { createdAt: 'desc' },
            include: { admin: { select: { name: true } } },
          },
        },
      });
      if (!user) return reply.code(404).send({ error: 'Not found' });
      return { data: user };
    },
  });

  // ── PATCH /admin/customers/:id — block/unblock ───────────────────────────
  app.patch('/customers/:id', {
    preHandler: [requireAdmin, requireRole('SUPER_ADMIN', 'ADMIN')],
    handler: async (req, reply) => {
      const { prisma } = await import('../../lib/prisma.js');
      const { id } = req.params as { id: string };
      const { isBlocked, blockReason, isActive } = req.body as any;
      const user = await prisma.user.update({
        where: { id },
        data: { isBlocked, blockReason, isActive },
        select: { id: true, name: true, isBlocked: true, isActive: true },
      });
      return { data: user };
    },
  });

  // ── POST /admin/customers/:id/notes ──────────────────────────────────────
  app.post('/customers/:id/notes', {
    preHandler: [requireAdmin],
    handler: async (req, reply) => {
      const { prisma } = await import('../../lib/prisma.js');
      const { id } = req.params as { id: string };
      const { note } = req.body as { note: string };
      const adminId = (req as any).admin.id as string;
      const created = await prisma.customerNote.create({
        data: { userId: id, adminId, note },
      });
      return reply.code(201).send({ data: created });
    },
  });

  // ── GET /admin/payments — paginated payment list ─────────────────────────
  app.get('/payments', {
    preHandler: [requireAdmin],
    handler: async (req, reply) => {
      const { prisma } = await import('../../lib/prisma.js');
      const { page = '1', limit = '20', status, method } = req.query as {
        page?: string; limit?: string; status?: string; method?: string;
      };
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const where: any = {};
      if (status) where.status = status;
      if (method) where.method = method;

      const [payments, total] = await Promise.all([
        prisma.payment.findMany({
          where,
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: {
            appointment: {
              include: {
                user: { select: { id: true, name: true, email: true } },
                service: { select: { name: true } },
              },
            },
          },
        }),
        prisma.payment.count({ where }),
      ]);

      reply.send({ success: true, data: { payments, total, page: pageNum, pageSize: limitNum } });
    },
  });

  // ── GET /admin/settings — business settings singleton ─────────────────────
  app.get('/settings', {
    preHandler: [requireAdmin],
    handler: async (req, reply) => {
      const { prisma } = await import('../../lib/prisma.js');
      let settings = await prisma.businessSettings.findUnique({ where: { id: 'singleton' } });
      if (!settings) {
        settings = await prisma.businessSettings.create({
          data: { id: 'singleton', workingHours: {} },
        });
      }
      reply.send({ success: true, data: settings });
    },
  });

  // ── PATCH /admin/settings ─────────────────────────────────────────────────
  app.patch('/settings', {
    preHandler: [requireAdmin, requireRole('SUPER_ADMIN', 'ADMIN')],
    handler: async (req, reply) => {
      const { prisma } = await import('../../lib/prisma.js');
      const body = req.body as any;
      const settings = await prisma.businessSettings.upsert({
        where: { id: 'singleton' },
        update: body,
        create: { id: 'singleton', workingHours: {}, ...body },
      });
      reply.send({ success: true, data: settings });
    },
  });

  // ── GET /admin/users — list admin users ─────────────────────────────────
  app.get('/users', {
    preHandler: [requireAdmin, requireRole('SUPER_ADMIN')],
    handler: async (req, reply) => {
      const { prisma } = await import('../../lib/prisma.js');
      const admins = await prisma.adminUser.findMany({
        select: { id: true, name: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      });
      reply.send({ success: true, data: admins });
    },
  });

  // ── POST /admin/users — create admin user (SUPER_ADMIN only) ────────────
  app.post('/users', {
    preHandler: [requireAdmin, requireRole('SUPER_ADMIN')],
    schema: {
      tags: ['admin'],
      summary: 'Create a new admin user (SUPER_ADMIN only)',
    },
    handler: async (req, reply) => {
      const { prisma } = await import('../../lib/prisma.js');
      const bcryptLib = await import('bcryptjs');
      const { appConfig } = await import('@pawroute/config');
      const { name, email, password, role } = req.body as {
        name: string; email: string; password: string; role: 'SUPER_ADMIN' | 'ADMIN' | 'GROOMER';
      };

      const existing = await prisma.adminUser.findUnique({ where: { email } });
      if (existing) {
        return reply.code(409).send({ success: false, error: 'Email already in use' });
      }

      const hash = await bcryptLib.default.hash(password, appConfig.auth.bcryptSaltRounds);
      const admin = await prisma.adminUser.create({
        data: { name, email, passwordHash: hash, role },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      });

      reply.code(201).send({ success: true, data: admin });
    },
  });
}

export default adminRoutes;
