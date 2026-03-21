/**
 * @file reminder.job.ts
 * @description Appointment reminder scheduling.
 *
 * NOTE: BullMQ requires a standard ioredis-compatible Redis connection (redis:// protocol).
 * Upstash only exposes an HTTP REST API (https://) which ioredis cannot use.
 * Until a standard Redis URL is configured, reminders are scheduled as in-process
 * setTimeout calls — suitable for single-instance deployments.
 * For multi-instance production, provide REDIS_URL=redis://... and re-enable BullMQ.
 */

import { sendReminder } from '../modules/notifications/notifications.service.js';
import { appConfig } from '@pawroute/config';

/**
 * Schedule reminders for a newly confirmed appointment using in-process timers.
 * Works fine for single-instance deployments; timers are lost on restart.
 */
export async function scheduleReminders(
  appointmentId: string,
  slotDate: string,
  slotStartTime: string
): Promise<void> {
  const slotDateTime = new Date(`${slotDate}T${slotStartTime}:00`).getTime();

  for (const hoursBefore of appConfig.notifications.reminderHoursBefore) {
    const triggerAt = slotDateTime - hoursBefore * 60 * 60 * 1000;
    const delay = triggerAt - Date.now();
    if (delay < 0) continue; // already past — skip

    // Cap at ~24.5 days to avoid 32-bit overflow in setTimeout
    const safeDelay = Math.min(delay, 2_100_000_000);

    setTimeout(async () => {
      try {
        await sendReminder(appointmentId, String(hoursBefore));
      } catch (err) {
        console.error(`[Reminder] Failed for appointment ${appointmentId}:`, err);
      }
    }, safeDelay);

    console.log(
      `[Reminder] Scheduled ${hoursBefore}h reminder for appointment ${appointmentId} in ${Math.round(delay / 60_000)} min`
    );
  }
}

/**
 * Cancel pending reminders. With setTimeout-based scheduling there is no
 * persistent registry to cancel from — this is a no-op until BullMQ is enabled.
 */
export async function cancelReminders(_appointmentId: string): Promise<void> {
  // No-op: in-process timers cannot be cancelled by appointment ID without
  // storing a map of timerIds. Acceptable for MVP — reminders may still fire
  // after cancellation but sendReminder checks appointment status before sending.
}

/** startReminderWorker is a no-op in setTimeout mode. */
export function startReminderWorker() {
  console.log('[Reminder] Using in-process setTimeout scheduler (BullMQ disabled)');
}
