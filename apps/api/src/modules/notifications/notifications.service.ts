/**
 * @file notifications.service.ts
 * @description Push notification delivery and in-app notification management.
 */

import { prisma } from '../../lib/prisma';
import { sendPush, sendMulticastPush } from '../../lib/fcm';
import { appConfig } from '@pawroute/config';

// ── Trigger helpers ──────────────────────────────────────────────────────────

export async function notifyBookingConfirmed(appointmentId: string) {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      user: { select: { id: true, fcmToken: true, notifPushBookings: true, name: true } },
      service: { select: { name: true } },
      slot: { select: { date: true, startTime: true } },
    },
  });
  if (!appt || !appt.user.notifPushBookings || !appt.user.fcmToken) return;

  const title = 'Booking Confirmed! 🎉';
  const body = `${appt.service.name} on ${appt.slot.date} at ${appt.slot.startTime}. Ref: ${appt.bookingRef}`;

  await Promise.all([
    sendPush(appt.user.fcmToken, { title, body, data: { appointmentId, type: 'BOOKING_CONFIRMED' } }),
    prisma.notification.create({
      data: {
        userId: appt.user.id,
        type: 'BOOKING_CONFIRMED',
        title,
        body,
        data: { appointmentId, bookingRef: appt.bookingRef },
      },
    }),
  ]);
}

export async function notifyAppointmentCancelled(appointmentId: string, cancelledBy: 'CUSTOMER' | 'ADMIN') {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      user: { select: { id: true, fcmToken: true, notifPushBookings: true } },
      service: { select: { name: true } },
      slot: { select: { date: true, startTime: true } },
    },
  });
  if (!appt || !appt.user.notifPushBookings || !appt.user.fcmToken) return;

  const title = 'Appointment Cancelled';
  const body = `Your ${appt.service.name} appointment on ${appt.slot.date} has been cancelled${cancelledBy === 'ADMIN' ? ' by the salon' : ''}.`;

  await Promise.all([
    sendPush(appt.user.fcmToken, { title, body, data: { appointmentId, type: 'CANCELLED' } }),
    prisma.notification.create({
      data: { userId: appt.user.id, type: 'CANCELLED', title, body, data: { appointmentId } },
    }),
  ]);
}

export async function notifyAppointmentCompleted(appointmentId: string) {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      user: { select: { id: true, fcmToken: true, notifPushBookings: true } },
      service: { select: { name: true } },
    },
  });
  if (!appt || !appt.user.notifPushBookings || !appt.user.fcmToken) return;

  const title = 'Grooming Complete! 🐾';
  const body = `${appt.service.name} is done. Your pet is ready to be picked up!`;

  await Promise.all([
    sendPush(appt.user.fcmToken, { title, body, data: { appointmentId, type: 'COMPLETED' } }),
    prisma.notification.create({
      data: { userId: appt.user.id, type: 'COMPLETED', title, body, data: { appointmentId } },
    }),
  ]);
}

export async function notifyPaymentSuccess(appointmentId: string) {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      user: { select: { id: true, fcmToken: true, notifPushBookings: true } },
      payment: { select: { amount: true } },
    },
  });
  if (!appt || !appt.user.fcmToken) return;

  const amount = appt.payment?.amount ?? 0;
  const title = 'Payment Successful';
  const body = `${appConfig.locale.currencySymbol} ${amount} received. Booking confirmed!`;

  await Promise.all([
    sendPush(appt.user.fcmToken, { title, body, data: { appointmentId, type: 'PAYMENT_SUCCESS' } }),
    prisma.notification.create({
      data: { userId: appt.user.id, type: 'PAYMENT_SUCCESS', title, body, data: { appointmentId } },
    }),
  ]);
}

// ── Reminder scheduling (called by BullMQ job) ───────────────────────────────

export async function sendReminder(appointmentId: string, hoursBeforeLabel: string) {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      user: { select: { id: true, fcmToken: true, notifPushReminders: true } },
      service: { select: { name: true } },
      slot: { select: { date: true, startTime: true } },
    },
  });
  if (!appt || appt.status !== 'CONFIRMED' || !appt.user.notifPushReminders || !appt.user.fcmToken) return;

  const type = hoursBeforeLabel === '24' ? 'REMINDER_24H' : 'REMINDER_2H';
  const title = `Appointment Reminder ⏰`;
  const body = `${appt.service.name} tomorrow at ${appt.slot.startTime}` +
    (hoursBeforeLabel === '2' ? ` (in 2 hours!)` : '');

  await Promise.all([
    sendPush(appt.user.fcmToken, { title, body, data: { appointmentId, type } }),
    prisma.notification.create({
      data: { userId: appt.user.id, type, title, body, data: { appointmentId } },
    }),
  ]);
}

// ── User notification list ───────────────────────────────────────────────────

export async function getUserNotifications(userId: string, page = 1, pageSize = 20) {
  const skip = (page - 1) * pageSize;
  const [notifications, total, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where: { userId },
      skip, take: pageSize,
      orderBy: { sentAt: 'desc' },
    }),
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);
  return { notifications, total, unreadCount, page, pageSize };
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
  return prisma.notification.updateMany({
    where: { userId, ...(ids ? { id: { in: ids } } : {}) },
    data: { isRead: true },
  });
}

// ── FCM token registration ───────────────────────────────────────────────────

export async function registerFcmToken(userId: string, fcmToken: string) {
  await prisma.user.update({ where: { id: userId }, data: { fcmToken } });
}

// ── Admin: broadcast ─────────────────────────────────────────────────────────

export async function sendBroadcast(
  adminId: string,
  title: string,
  body: string,
  segment: 'ALL' | 'ACTIVE'
) {
  const where = segment === 'ALL'
    ? { fcmToken: { not: null }, notifPushPromotions: true }
    : { fcmToken: { not: null }, notifPushPromotions: true, isActive: true };

  const users = await prisma.user.findMany({
    where,
    select: { fcmToken: true },
  });

  const tokens = users.map((u) => u.fcmToken!).filter(Boolean);
  const result = await sendMulticastPush(tokens, { title, body });

  await prisma.broadcastLog.create({
    data: {
      title, body, segment,
      recipientCount: tokens.length,
      deliveredCount: result.successCount,
      sentAt: new Date(),
      createdBy: adminId,
    },
  });

  return result;
}
