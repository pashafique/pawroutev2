/**
 * @file notifications.routes.ts
 * @description Notification routes — in-app list, FCM token, admin broadcast.
 */

import type { FastifyInstance } from 'fastify';
import { requireAuth, requireAdmin, requireRole } from '../../middleware/auth';
import * as notificationsService from './notifications.service';

export default async function notificationsRoutes(app: FastifyInstance) {
  // ── Customer ───────────────────────────────────────────────────────────────
  app.register(async (customerRoutes) => {
    customerRoutes.addHook('preHandler', requireAuth);

    // GET /notifications
    customerRoutes.get('/', async (req) => {
      const userId = (req as any).user.id as string;
      const { page, pageSize } = req.query as { page?: string; pageSize?: string };
      const result = await notificationsService.getUserNotifications(
        userId,
        parseInt(page ?? '1', 10),
        parseInt(pageSize ?? '20', 10)
      );
      return { data: result };
    });

    // POST /notifications/read — mark as read
    customerRoutes.post('/read', async (req) => {
      const userId = (req as any).user.id as string;
      const { ids } = (req.body as any) ?? {};
      await notificationsService.markNotificationsRead(userId, ids);
      return { success: true };
    });

    // POST /notifications/fcm-token — register device token
    customerRoutes.post('/fcm-token', async (req, reply) => {
      const userId = (req as any).user.id as string;
      const { fcmToken } = req.body as { fcmToken: string };
      if (!fcmToken) return reply.code(400).send({ error: 'fcmToken required' });
      await notificationsService.registerFcmToken(userId, fcmToken);
      return { success: true };
    });
  });

  // ── Admin ──────────────────────────────────────────────────────────────────
  app.register(async (adminRoutes) => {
    adminRoutes.addHook('preHandler', requireAdmin);

    // POST /notifications/admin/broadcast
    adminRoutes.post('/admin/broadcast',
      { preHandler: requireRole('SUPER_ADMIN', 'ADMIN') },
      async (req, reply) => {
        const adminId = (req as any).admin.id as string;
        const { title, body, segment = 'ALL' } = req.body as {
          title: string; body: string; segment?: 'ALL' | 'ACTIVE';
        };
        if (!title || !body) return reply.code(400).send({ error: 'title and body required' });
        const result = await notificationsService.sendBroadcast(adminId, title, body, segment);
        return { data: result };
      }
    );
  });
}
