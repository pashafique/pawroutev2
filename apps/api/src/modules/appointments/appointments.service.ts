/**
 * @file appointments.service.ts
 * @description Appointment lifecycle — create, list, cancel, reschedule, admin status.
 */

import { prisma } from '../../lib/prisma';
import { acquireSlotLock, releaseSlotLock } from '../../lib/redis';
import { generateBookingRef } from '@pawroute/utils';
import { classifyPetSize } from '@pawroute/utils';
import { appConfig } from '@pawroute/config';
import { validateCoupon, applyCouponUsage } from '../coupons/coupons.service';
import { notifyBookingConfirmed, notifyAppointmentCancelled, notifyAppointmentCompleted } from '../notifications/notifications.service';
import { scheduleReminders, cancelReminders } from '../../jobs/reminder.job';

export interface CreateAppointmentInput {
  petId: string;
  serviceId: string;
  slotId: string;
  addonIds?: string[];
  couponCode?: string;
  notes?: string;
}

// ── Create ─────────────────────────────────────────────────────────────────

export async function createAppointment(userId: string, input: CreateAppointmentInput) {
  const { petId, serviceId, slotId, addonIds = [], couponCode, notes } = input;

  // 1. Load pet, service, slot in parallel
  const [pet, service, slot] = await Promise.all([
    prisma.pet.findUnique({ where: { id: petId, userId, deletedAt: null } }),
    prisma.service.findUnique({ where: { id: serviceId, deletedAt: null, isActive: true },
      include: { pricing: true, addons: true } }),
    prisma.timeSlot.findUnique({ where: { id: slotId } }),
  ]);

  if (!pet) throw Object.assign(new Error('Pet not found'), { statusCode: 404 });
  if (!service) throw Object.assign(new Error('Service not found or unavailable'), { statusCode: 404 });
  if (!slot) throw Object.assign(new Error('Slot not found'), { statusCode: 404 });
  if (slot.isBlocked) throw Object.assign(new Error('Slot is blocked'), { statusCode: 409 });
  if (slot.bookedCount >= slot.capacity) throw Object.assign(new Error('Slot is fully booked'), { statusCode: 409 });

  // 2. Check advance booking rules
  const minAdvanceMs = appConfig.booking.minAdvanceBookingHours * 60 * 60 * 1000;
  const slotDateTime = new Date(`${slot.date}T${slot.startTime}:00`);
  if (slotDateTime.getTime() - Date.now() < minAdvanceMs) {
    throw Object.assign(new Error(`Booking must be at least ${appConfig.booking.minAdvanceBookingHours}h in advance`), { statusCode: 400 });
  }

  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + appConfig.booking.maxAdvanceBookingDays);
  if (slotDateTime > maxDate) {
    throw Object.assign(new Error(`Cannot book more than ${appConfig.booking.maxAdvanceBookingDays} days in advance`), { statusCode: 400 });
  }

  // 3. Acquire slot lock
  const locked = await acquireSlotLock(slotId, userId);
  if (!locked) throw Object.assign(new Error('Slot is temporarily held by another user'), { statusCode: 409 });

  try {
    // 4. Price calculation
    const sizeCategory = pet.sizeCategory;
    const pricing = service.pricing.find((p) => p.sizeLabel === sizeCategory);
    if (!pricing) {
      throw Object.assign(new Error(`No pricing available for size ${sizeCategory}`), { statusCode: 400 });
    }
    const serviceFee = pricing.price;

    // 5. Add-ons
    if (addonIds.length > appConfig.booking.maxAddonsPerBooking) {
      throw Object.assign(new Error(`Maximum ${appConfig.booking.maxAddonsPerBooking} add-ons per booking`), { statusCode: 400 });
    }
    const selectedAddons = service.addons.filter(
      (a) => addonIds.includes(a.id) && a.isActive && !a.deletedAt
    );
    const addonFee = selectedAddons.reduce((sum, a) => sum + a.price, 0);

    let subtotal = serviceFee + addonFee;

    // 6. Coupon validation
    let discountAmount = 0;
    let couponId: string | undefined;
    if (couponCode) {
      const couponResult = await validateCoupon(couponCode, userId, serviceId, subtotal);
      if (!couponResult.valid) {
        throw Object.assign(new Error(couponResult.error ?? 'Invalid coupon'), { statusCode: 400 });
      }
      discountAmount = couponResult.discountAmount ?? 0;
      couponId = couponResult.couponId;
    }

    const totalAmount = Math.max(0, subtotal - discountAmount);

    // 7. Generate unique booking ref
    let bookingRef: string;
    let attempts = 0;
    do {
      bookingRef = generateBookingRef();
      const existing = await prisma.appointment.findUnique({ where: { bookingRef } });
      if (!existing) break;
      attempts++;
    } while (attempts < 5);

    // 8. Create appointment in transaction
    const appointment = await prisma.$transaction(async (tx) => {
      const appt = await tx.appointment.create({
        data: {
          bookingRef: bookingRef!,
          userId,
          petId,
          serviceId,
          slotId,
          sizeCategory,
          totalAmount,
          serviceFee,
          addonFee,
          discountAmount,
          couponCode: couponCode ?? null,
          notes: notes ?? null,
          addons: selectedAddons.length > 0
            ? {
                create: selectedAddons.map((a) => ({
                  addonId: a.id,
                  addonName: a.name,
                  addonPrice: a.price,
                })),
              }
            : undefined,
          activities: {
            create: {
              action: 'CREATED',
              performedBy: userId,
              performedByType: 'CUSTOMER',
              note: 'Appointment created',
            },
          },
        },
        include: {
          pet: true,
          service: { select: { id: true, name: true, durationMin: true } },
          slot: true,
          addons: true,
        },
      });

      // Increment slot booked count
      await tx.timeSlot.update({
        where: { id: slotId },
        data: { bookedCount: { increment: 1 } },
      });

      return appt;
    });

    // 9. Record coupon usage (outside transaction — non-critical)
    if (couponId) {
      await applyCouponUsage(couponId, userId, appointment.id).catch(() => {});
    }

    // 10. Send confirmation notification + schedule reminders (non-blocking)
    notifyBookingConfirmed(appointment.id).catch(() => {});
    scheduleReminders(appointment.id, slot.date, slot.startTime).catch(() => {});

    return appointment;
  } finally {
    // Release the Redis slot lock — slot is now persistently booked in DB
    await releaseSlotLock(slotId, userId);
  }
}

// ── List ───────────────────────────────────────────────────────────────────

export async function listUserAppointments(
  userId: string,
  options: { status?: string; page?: number; pageSize?: number } = {}
) {
  const { status, page = 1, pageSize = 20 } = options;
  const skip = (page - 1) * pageSize;

  const where: any = { userId };
  if (status) where.status = status;

  const [appointments, total] = await prisma.$transaction([
    prisma.appointment.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        pet: { select: { id: true, name: true, type: true, thumbnailPhoto: true } },
        service: { select: { id: true, name: true, durationMin: true } },
        slot: { select: { date: true, startTime: true, endTime: true } },
        addons: true,
        payment: { select: { status: true, method: true, amount: true } },
      },
    }),
    prisma.appointment.count({ where }),
  ]);

  return { appointments, total, page, pageSize };
}

export async function getAppointmentById(appointmentId: string, userId: string) {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      pet: true,
      service: { include: { pricing: true } },
      slot: true,
      addons: true,
      payment: true,
      activities: { orderBy: { createdAt: 'asc' } },
      review: true,
    },
  });
  if (!appt || appt.userId !== userId) return null;
  return appt;
}

export async function getAppointmentByRef(bookingRef: string) {
  return prisma.appointment.findUnique({
    where: { bookingRef },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      pet: true,
      service: { select: { id: true, name: true, durationMin: true } },
      slot: true,
      addons: true,
      payment: true,
    },
  });
}

// ── Cancel ─────────────────────────────────────────────────────────────────

export async function cancelAppointment(
  appointmentId: string,
  userId: string,
  reason?: string
) {
  const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appt || appt.userId !== userId) {
    throw Object.assign(new Error('Appointment not found'), { statusCode: 404 });
  }
  if (!['PENDING', 'CONFIRMED'].includes(appt.status)) {
    throw Object.assign(new Error('Appointment cannot be cancelled in its current state'), { statusCode: 400 });
  }

  // Cancellation window check
  const slot = await prisma.timeSlot.findUnique({ where: { id: appt.slotId } });
  if (slot) {
    const slotDateTime = new Date(`${slot.date}T${slot.startTime}:00`);
    const windowMs = appConfig.booking.cancellationWindowHours * 60 * 60 * 1000;
    if (Date.now() > slotDateTime.getTime() - windowMs) {
      throw Object.assign(new Error(`Cancellations must be made at least ${appConfig.booking.cancellationWindowHours}h before the appointment`), { statusCode: 400 });
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'CANCELLED',
        cancelledBy: 'CUSTOMER',
        cancellationReason: reason ?? null,
        cancelledAt: new Date(),
        activities: {
          create: {
            action: 'CANCELLED',
            performedBy: userId,
            performedByType: 'CUSTOMER',
            note: reason ?? 'Cancelled by customer',
          },
        },
      },
    });
    // Decrement slot count
    if (slot) {
      await tx.timeSlot.update({
        where: { id: appt.slotId },
        data: { bookedCount: { decrement: 1 } },
      });
    }
    return updated;
  });

  // Cancel pending reminders (non-blocking)
  cancelReminders(appointmentId).catch(() => {});
  notifyAppointmentCancelled(appointmentId, 'CUSTOMER').catch(() => {});

  return result;
}

// ── Reschedule ─────────────────────────────────────────────────────────────

export async function rescheduleAppointment(
  appointmentId: string,
  userId: string,
  newSlotId: string
) {
  const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appt || appt.userId !== userId) {
    throw Object.assign(new Error('Appointment not found'), { statusCode: 404 });
  }
  if (!['PENDING', 'CONFIRMED'].includes(appt.status)) {
    throw Object.assign(new Error('Appointment cannot be rescheduled in its current state'), { statusCode: 400 });
  }

  const newSlot = await prisma.timeSlot.findUnique({ where: { id: newSlotId } });
  if (!newSlot || newSlot.isBlocked) throw Object.assign(new Error('New slot unavailable'), { statusCode: 409 });
  if (newSlot.bookedCount >= newSlot.capacity) throw Object.assign(new Error('New slot is fully booked'), { statusCode: 409 });

  const locked = await acquireSlotLock(newSlotId, userId);
  if (!locked) throw Object.assign(new Error('New slot is temporarily held'), { statusCode: 409 });

  try {
    return await prisma.$transaction(async (tx) => {
      const oldSlot = await tx.timeSlot.findUnique({ where: { id: appt.slotId } });

      const updated = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          slotId: newSlotId,
          activities: {
            create: {
              action: 'RESCHEDULED',
              performedBy: userId,
              performedByType: 'CUSTOMER',
              note: `Rescheduled to ${newSlot.date} ${newSlot.startTime}`,
            },
          },
        },
      });

      // Swap slot counts
      if (oldSlot) {
        await tx.timeSlot.update({ where: { id: appt.slotId }, data: { bookedCount: { decrement: 1 } } });
      }
      await tx.timeSlot.update({ where: { id: newSlotId }, data: { bookedCount: { increment: 1 } } });

      return updated;
    });
  } finally {
    await releaseSlotLock(newSlotId, userId);
  }
}

// ── Admin ──────────────────────────────────────────────────────────────────

export async function listAllAppointments(options: {
  status?: string;
  date?: string;
  userId?: string;
  page?: number;
  pageSize?: number;
  search?: string;
} = {}) {
  const { status, date, userId, page = 1, pageSize = 20, search } = options;
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (status) where.status = status;
  if (userId) where.userId = userId;
  if (date) where.slot = { date };
  if (search) {
    where.OR = [
      { bookingRef: { contains: search, mode: 'insensitive' } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [appointments, total] = await prisma.$transaction([
    prisma.appointment.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        pet: { select: { id: true, name: true, type: true } },
        service: { select: { id: true, name: true } },
        slot: { select: { date: true, startTime: true, endTime: true } },
        payment: { select: { status: true, amount: true, method: true } },
      },
    }),
    prisma.appointment.count({ where }),
  ]);

  return { appointments, total, page, pageSize };
}

export async function adminUpdateStatus(
  appointmentId: string,
  adminId: string,
  status: string,
  notes?: string
) {
  const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appt) throw Object.assign(new Error('Not found'), { statusCode: 404 });

  const data: any = { status };
  if (status === 'COMPLETED') data.completedAt = new Date();
  if (status === 'CANCELLED') {
    data.cancelledBy = 'ADMIN';
    data.cancelledAt = new Date();
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      ...data,
      internalNotes: notes ?? appt.internalNotes,
      activities: {
        create: {
          action: `STATUS_${status}`,
          performedBy: adminId,
          performedByType: 'ADMIN',
          note: notes ?? `Status updated to ${status}`,
        },
      },
    },
  });

  // Trigger notifications (non-blocking)
  if (status === 'COMPLETED') notifyAppointmentCompleted(appointmentId).catch(() => {});
  if (status === 'CANCELLED') {
    cancelReminders(appointmentId).catch(() => {});
    notifyAppointmentCancelled(appointmentId, 'ADMIN').catch(() => {});
  }
  if (status === 'CONFIRMED') {
    // Re-schedule reminders if admin manually confirms
    const apptWithSlot = await prisma.appointment.findUnique({
      where: { id: appointmentId }, include: { slot: true },
    });
    if (apptWithSlot) {
      scheduleReminders(appointmentId, apptWithSlot.slot.date, apptWithSlot.slot.startTime).catch(() => {});
    }
  }

  return updated;
}

export async function adminGetAppointment(appointmentId: string) {
  return prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      pet: true,
      service: { include: { pricing: true } },
      slot: true,
      groomer: { select: { id: true, name: true } },
      addons: true,
      payment: true,
      activities: { orderBy: { createdAt: 'asc' } },
      review: true,
    },
  });
}
