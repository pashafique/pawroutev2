/**
 * @file reminder.job.ts
 * @description BullMQ job processor for appointment reminders.
 * Scheduled at appointment creation for each reminderHoursBefore interval.
 */

import { Queue, Worker, type Job } from 'bullmq';
import { redis } from '../lib/redis.js';
import { sendReminder } from '../modules/notifications/notifications.service.js';
import { appConfig } from '@pawroute/config';

const QUEUE_NAME = 'reminders';

export const reminderQueue = new Queue(QUEUE_NAME, {
  connection: {
    // BullMQ needs a standard ioredis connection, not Upstash HTTP
    // In production use REDIS_URL env var with ioredis
    // This stub uses the Upstash client's underlying connection
    url: process.env['UPSTASH_REDIS_REST_URL'],
  } as any,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: { type: 'exponential', delay: 60_000 },
  },
});

/**
 * Schedule reminders for a newly confirmed appointment.
 */
export async function scheduleReminders(appointmentId: string, slotDate: string, slotStartTime: string) {
  const slotDateTime = new Date(`${slotDate}T${slotStartTime}:00`).getTime();

  for (const hoursBefore of appConfig.notifications.reminderHoursBefore) {
    const triggerAt = slotDateTime - hoursBefore * 60 * 60 * 1000;
    const delay = triggerAt - Date.now();
    if (delay < 0) continue; // past — skip

    await reminderQueue.add(
      `reminder-${appointmentId}-${hoursBefore}h`,
      { appointmentId, hoursBefore: String(hoursBefore) },
      {
        delay,
        jobId: `reminder:${appointmentId}:${hoursBefore}h`, // dedup
      }
    );
  }
}

/**
 * Remove all pending reminders for a cancelled/rescheduled appointment.
 */
export async function cancelReminders(appointmentId: string) {
  for (const hoursBefore of appConfig.notifications.reminderHoursBefore) {
    const jobId = `reminder:${appointmentId}:${hoursBefore}h`;
    const job = await reminderQueue.getJob(jobId);
    if (job) await job.remove();
  }
}

// ── Worker (start in a separate process or alongside server) ──────────────────
export function startReminderWorker() {
  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const { appointmentId, hoursBefore } = job.data as { appointmentId: string; hoursBefore: string };
      await sendReminder(appointmentId, hoursBefore);
    },
    {
      connection: { url: process.env['UPSTASH_REDIS_REST_URL'] } as any,
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    console.log(`Reminder job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Reminder job ${job?.id} failed:`, err.message);
  });

  return worker;
}
