/**
 * @file slots.service.ts
 * @description Time slot management — availability, creation, blocking.
 */

import { prisma } from '../../lib/prisma.js';
import { appConfig } from '@pawroute/config';

export interface SlotInput {
  date: string;        // YYYY-MM-DD
  startTime: string;   // HH:mm
  endTime: string;     // HH:mm
  capacity?: number;
  groomerId?: string;
}

export interface GenerateSlotsInput {
  startDate: string;   // YYYY-MM-DD
  endDate: string;     // YYYY-MM-DD
  startTime: string;   // HH:mm
  endTime: string;     // HH:mm
  slotDurationMin: number;
  breakMinutes?: number;
  capacity?: number;
  groomerId?: string;
  excludeWeekends?: boolean;
}

// ─── Availability ─────────────────────────────────────────────────────────────

export async function getAvailableSlots(date: string) {
  const today = new Date().toISOString().slice(0, 10);
  if (date < today) {
    return [];
  }

  const slots = await prisma.timeSlot.findMany({
    where: {
      date,
      isBlocked: false,
    },
    orderBy: [{ startTime: 'asc' }],
    include: {
      groomer: { select: { id: true, name: true } },
      _count: { select: { appointments: { where: { status: { not: 'CANCELLED' } } } } },
    },
  });

  return slots
    .filter((s: any) => s.bookedCount < s.capacity)
    .map((s: any) => ({
      id: s.id,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      capacity: s.capacity,
      bookedCount: s.bookedCount,
      available: s.capacity - s.bookedCount,
      groomer: s.groomer,
    }));
}

export async function getSlotsByDateRange(startDate: string, endDate: string) {
  const slots = await prisma.timeSlot.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    include: {
      groomer: { select: { id: true, name: true } },
    },
  });

  // Group by date
  const grouped: Record<string, typeof slots> = {};
  for (const slot of slots) {
    if (!grouped[slot.date]) grouped[slot.date] = [];
    grouped[slot.date]!.push(slot);
  }
  return grouped;
}

export async function getSlotById(slotId: string) {
  return prisma.timeSlot.findUnique({
    where: { id: slotId },
    include: { groomer: { select: { id: true, name: true } } },
  });
}

// ─── Admin CRUD ───────────────────────────────────────────────────────────────

export async function createSlot(input: SlotInput) {
  return prisma.timeSlot.create({
    data: {
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      capacity: input.capacity ?? 1,
      groomerId: input.groomerId ?? null,
    },
  });
}

export async function updateSlot(
  slotId: string,
  data: Partial<SlotInput & { isBlocked: boolean; blockReason: string | null }>
) {
  return prisma.timeSlot.update({
    where: { id: slotId },
    data,
  });
}

export async function deleteSlot(slotId: string) {
  // Only allow delete if no confirmed appointments
  const active = await prisma.appointment.count({
    where: {
      slotId,
      status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
    },
  });
  if (active > 0) {
    throw new Error('Cannot delete slot with active appointments');
  }
  return prisma.timeSlot.delete({ where: { id: slotId } });
}

export async function blockSlot(slotId: string, reason?: string) {
  return prisma.timeSlot.update({
    where: { id: slotId },
    data: { isBlocked: true, blockReason: reason ?? null },
  });
}

export async function unblockSlot(slotId: string) {
  return prisma.timeSlot.update({
    where: { id: slotId },
    data: { isBlocked: false, blockReason: null },
  });
}

// ─── Bulk Generation ─────────────────────────────────────────────────────────

export async function generateSlots(input: GenerateSlotsInput): Promise<number> {
  const {
    startDate, endDate, startTime, endTime,
    slotDurationMin, breakMinutes = 0,
    capacity = 1, groomerId, excludeWeekends = false,
  } = input;

  const slots: { date: string; startTime: string; endTime: string; capacity: number; groomerId: string | null }[] = [];

  // Iterate dates
  const current = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  while (current <= end) {
    const dow = current.getDay();
    if (!excludeWeekends || (dow !== 0 && dow !== 6)) {
      const dateStr = current.toISOString().slice(0, 10)!;

      // Generate time slots for this day
      const [startH, startM] = startTime.split(':').map(Number) as [number, number];
      const [endH, endM] = endTime.split(':').map(Number) as [number, number];
      let curMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;

      while (curMin + slotDurationMin <= endMin) {
        const slotStart = `${String(Math.floor(curMin / 60)).padStart(2, '0')}:${String(curMin % 60).padStart(2, '0')}`;
        const slotEndMin = curMin + slotDurationMin;
        const slotEnd = `${String(Math.floor(slotEndMin / 60)).padStart(2, '0')}:${String(slotEndMin % 60).padStart(2, '0')}`;

        slots.push({
          date: dateStr,
          startTime: slotStart,
          endTime: slotEnd,
          capacity,
          groomerId: groomerId ?? null,
        });

        curMin += slotDurationMin + breakMinutes;
      }
    }
    current.setDate(current.getDate() + 1);
  }

  // Bulk insert, skip duplicates
  const result = await prisma.timeSlot.createMany({
    data: slots,
    skipDuplicates: false, // allow multiple slots per time if capacity differs
  });

  return result.count;
}

// ─── Availability calendar (for booking UI) ──────────────────────────────────

export async function getAvailabilityCalendar(year: number, month: number) {
  // Returns array of { date, availableSlots } for the given month
  const pad = (n: number) => String(n).padStart(2, '0');
  const startDate = `${year}-${pad(month)}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${pad(month)}-${pad(lastDay)}`;

  const today = new Date().toISOString().slice(0, 10);
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + appConfig.booking.maxAdvanceBookingDays);
  const maxDateStr = maxDate.toISOString().slice(0, 10);

  const slots = await prisma.timeSlot.groupBy({
    by: ['date'],
    where: {
      date: { gte: startDate, lte: endDate },
      isBlocked: false,
    },
    _sum: { capacity: true, bookedCount: true },
  });

  const result: { date: string; available: number; hasSlots: boolean }[] = [];
  for (const s of slots) {
    if (s.date < today || s.date > maxDateStr) continue;
    const total = s._sum.capacity ?? 0;
    const booked = s._sum.bookedCount ?? 0;
    result.push({ date: s.date, available: total - booked, hasSlots: total > 0 });
  }
  return result;
}
