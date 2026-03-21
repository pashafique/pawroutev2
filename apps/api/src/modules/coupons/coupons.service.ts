/**
 * @file coupons.service.ts
 * @description Coupon validation and management.
 */

import { prisma } from '../../lib/prisma.js';

export interface CouponValidationResult {
  valid: boolean;
  couponId?: string;
  code?: string;
  discountType?: 'FLAT' | 'PERCENTAGE';
  discountValue?: number;
  discountAmount?: number;
  error?: string;
}

export async function validateCoupon(
  code: string,
  userId: string,
  serviceId: string,
  orderAmount: number
): Promise<CouponValidationResult> {
  const coupon = await prisma.coupon.findUnique({
    where: { code: code.toUpperCase() },
    include: { couponServices: true, usages: { where: { userId } } },
  });

  if (!coupon) return { valid: false, error: 'Coupon not found' };
  if (!coupon.isActive) return { valid: false, error: 'Coupon is no longer active' };

  const now = new Date();
  if (now < coupon.validFrom) return { valid: false, error: 'Coupon is not yet valid' };
  if (coupon.validUntil && now > coupon.validUntil) return { valid: false, error: 'Coupon has expired' };

  // Check usage limits
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    return { valid: false, error: 'Coupon usage limit reached' };
  }

  if (coupon.perUserLimit != null && coupon.usages.length >= coupon.perUserLimit) {
    return { valid: false, error: 'You have already used this coupon the maximum number of times' };
  }

  // Check minimum order value
  if (coupon.minOrderValue != null && orderAmount < coupon.minOrderValue) {
    return { valid: false, error: `Minimum order value is ${coupon.minOrderValue}` };
  }

  // Check service restrictions (empty = applies to all)
  if (coupon.couponServices.length > 0) {
    const applies = coupon.couponServices.some((cs: any) => cs.serviceId === serviceId);
    if (!applies) return { valid: false, error: 'Coupon does not apply to this service' };
  }

  // Calculate discount
  let discountAmount = 0;
  if (coupon.discountType === 'FLAT') {
    discountAmount = Math.min(coupon.discountValue, orderAmount);
  } else {
    discountAmount = Math.round((orderAmount * coupon.discountValue) / 100 * 100) / 100;
  }

  return {
    valid: true,
    couponId: coupon.id,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    discountAmount,
  };
}

export async function applyCouponUsage(couponId: string, userId: string, appointmentId: string) {
  await prisma.$transaction([
    prisma.couponUsage.create({ data: { couponId, userId, appointmentId } }),
    prisma.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } }),
  ]);
}

// ── Admin CRUD ────────────────────────────────────────────────────────────────

export async function listCoupons(page = 1, pageSize = 20) {
  const skip = (page - 1) * pageSize;
  const [coupons, total] = await prisma.$transaction([
    prisma.coupon.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { usages: true } } },
    }),
    prisma.coupon.count(),
  ]);
  return { coupons, total, page, pageSize };
}

export async function getCoupon(id: string) {
  return prisma.coupon.findUnique({
    where: { id },
    include: {
      couponServices: { include: { service: { select: { id: true, name: true } } } },
      _count: { select: { usages: true } },
    },
  });
}

export async function createCoupon(data: {
  code: string;
  discountType: 'FLAT' | 'PERCENTAGE';
  discountValue: number;
  minOrderValue?: number;
  usageLimit?: number;
  perUserLimit?: number;
  validFrom: string;
  validUntil?: string;
  serviceIds?: string[];
}) {
  const { serviceIds = [], ...couponData } = data;
  return prisma.coupon.create({
    data: {
      ...couponData,
      code: couponData.code.toUpperCase(),
      validFrom: new Date(couponData.validFrom),
      validUntil: couponData.validUntil ? new Date(couponData.validUntil) : null,
      couponServices: serviceIds.length > 0
        ? { create: serviceIds.map((serviceId) => ({ serviceId })) }
        : undefined,
    },
  });
}

export async function updateCoupon(
  id: string,
  data: Partial<{ isActive: boolean; usageLimit: number; validUntil: string }>
) {
  return prisma.coupon.update({
    where: { id },
    data: {
      ...data,
      validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
    },
  });
}

export async function deleteCoupon(id: string) {
  return prisma.coupon.delete({ where: { id } });
}
