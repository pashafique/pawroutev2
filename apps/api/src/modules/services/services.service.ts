/**
 * @file services.service.ts
 * @description Service catalog business logic — categories, services, pricing, add-ons.
 */

import { prisma } from '../../lib/prisma.js';
import { classifyPetSize } from '@pawroute/utils';

// ─── Categories ───────────────────────────────────────────────────────────────

export async function listCategories(petType?: 'DOG' | 'CAT') {
  return prisma.serviceCategory.findMany({
    where: {
      isActive: true,
      ...(petType ? { petType } : {}),
    },
    orderBy: { sortOrder: 'asc' },
    include: {
      services: {
        where: { isActive: true, deletedAt: null },
        orderBy: { sortOrder: 'asc' },
        include: { pricing: true, addons: { where: { isActive: true } } },
      },
    },
  });
}

// ─── Services ─────────────────────────────────────────────────────────────────

export async function listServices(params: {
  categoryId?: string;
  petType?: 'DOG' | 'CAT';
  weightKg?: number;
}) {
  const { categoryId, petType, weightKg } = params;

  const services = await prisma.service.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      ...(categoryId ? { categoryId } : {}),
      ...(petType ? { category: { petType } } : {}),
    },
    orderBy: { sortOrder: 'asc' },
    include: {
      category: true,
      pricing: true,
      addons: { where: { isActive: true, deletedAt: null }, orderBy: { name: 'asc' } },
    },
  });

  // If weightKg is provided, annotate each service with the price for that pet's size
  if (weightKg != null) {
    const sizeKey = classifyPetSize(weightKg);
    return services.map((svc: any) => ({
      ...svc,
      priceForSize: svc.pricing.find((p: any) => p.sizeLabel === sizeKey)?.price ?? null,
      sizeCategory: sizeKey,
    }));
  }

  return services;
}

export async function getService(serviceId: string) {
  const service = await prisma.service.findFirst({
    where: { id: serviceId, isActive: true, deletedAt: null },
    include: {
      category: true,
      pricing: true,
      addons: { where: { isActive: true, deletedAt: null }, orderBy: { name: 'asc' } },
    },
  });
  if (!service) throw Object.assign(new Error('Service not found'), { statusCode: 404 });
  return service;
}

// ─── Admin: Service Management ────────────────────────────────────────────────

export async function createService(data: {
  categoryId: string;
  name: string;
  description: string;
  durationMin: number;
  sortOrder?: number;
}) {
  return prisma.service.create({
    data: { ...data, sortOrder: data.sortOrder ?? 0, isActive: true },
    include: { pricing: true, addons: true },
  });
}

export async function updateService(
  serviceId: string,
  data: Partial<{
    name: string;
    description: string;
    durationMin: number;
    sortOrder: number;
    isActive: boolean;
  }>
) {
  return prisma.service.update({
    where: { id: serviceId },
    data,
    include: { pricing: true, addons: true },
  });
}

export async function deleteService(serviceId: string) {
  await prisma.service.update({
    where: { id: serviceId },
    data: { deletedAt: new Date() },
  });
}

// ─── Admin: Pricing ───────────────────────────────────────────────────────────

export async function upsertPricing(
  serviceId: string,
  entries: Array<{ sizeLabel: 'SMALL' | 'MEDIUM' | 'LARGE' | 'XL'; price: number }>
) {
  await Promise.all(
    entries.map((e) =>
      prisma.servicePricing.upsert({
        where: { serviceId_sizeLabel: { serviceId, sizeLabel: e.sizeLabel } },
        update: { price: e.price },
        create: { serviceId, sizeLabel: e.sizeLabel, price: e.price },
      })
    )
  );
  return prisma.servicePricing.findMany({ where: { serviceId } });
}

// ─── Admin: Add-ons ───────────────────────────────────────────────────────────

export async function createAddon(serviceId: string, name: string, price: number) {
  return prisma.addon.create({ data: { serviceId, name, price, isActive: true } });
}

export async function updateAddon(
  addonId: string,
  data: Partial<{ name: string; price: number; isActive: boolean }>
) {
  return prisma.addon.update({ where: { id: addonId }, data });
}

export async function deleteAddon(addonId: string) {
  await prisma.addon.update({ where: { id: addonId }, data: { deletedAt: new Date() } });
}
