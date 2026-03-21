/**
 * @file users.routes.ts
 * @description User profile routes — get/update profile, notification preferences.
 */

import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';

export default async function usersRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  // GET /users/me
  app.get('/me', async (req) => {
    const userId = (req as any).user.id as string;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, phone: true,
        profilePhoto: true, otpVerified: true, isActive: true,
        notifPushBookings: true, notifPushReminders: true,
        notifPushPromotions: true, notifEmailBookings: true,
        createdAt: true,
      },
    });
    return { data: user };
  });

  // PATCH /users/me
  app.patch('/me', async (req) => {
    const userId = (req as any).user.id as string;
    const {
      name, phone,
      notifPushBookings, notifPushReminders, notifPushPromotions,
      notifEmailBookings, notifEmailPromotions,
    } = req.body as any;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(notifPushBookings !== undefined ? { notifPushBookings } : {}),
        ...(notifPushReminders !== undefined ? { notifPushReminders } : {}),
        ...(notifPushPromotions !== undefined ? { notifPushPromotions } : {}),
        ...(notifEmailBookings !== undefined ? { notifEmailBookings } : {}),
        ...(notifEmailPromotions !== undefined ? { notifEmailPromotions } : {}),
      },
      select: {
        id: true, name: true, email: true, phone: true,
        profilePhoto: true, otpVerified: true,
        notifPushBookings: true, notifPushReminders: true,
        notifPushPromotions: true, notifEmailBookings: true,
      },
    });
    return { data: user };
  });

  // DELETE /users/me — soft delete (GDPR)
  app.delete('/me', async (req) => {
    const userId = (req as any).user.id as string;
    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date(), isActive: false },
    });
    return { success: true };
  });
}
