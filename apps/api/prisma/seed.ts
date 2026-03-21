/**
 * @file seed.ts
 * @description Prisma seed: admin user, service catalog, business settings, FAQs.
 * Run: pnpm --filter @pawroute/api prisma:seed
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Admin User ─────────────────────────────────────────────────────────────
  const adminPassword = process.env['SEED_ADMIN_PASSWORD'] ?? 'Admin@123456';
  const adminHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.adminUser.upsert({
    where: { email: 'admin@pawroute.com' },
    update: {},
    create: {
      name: 'PawRoute Admin',
      email: 'admin@pawroute.com',
      passwordHash: adminHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });
  console.log(`✅ Admin: ${admin.email} (${admin.role})`);

  // ─── Business Settings ───────────────────────────────────────────────────────
  await prisma.businessSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      businessName: 'PawRoute Grooming',
      phone: '+971500000000',
      whatsappNumber: '+971500000000',
      email: 'hello@pawroute.com',
      address: 'Dubai, UAE',
      city: 'Dubai',
      country: 'UAE',
      workingHours: {
        monday:    { open: '09:00', close: '20:00', isOpen: true },
        tuesday:   { open: '09:00', close: '20:00', isOpen: true },
        wednesday: { open: '09:00', close: '20:00', isOpen: true },
        thursday:  { open: '09:00', close: '20:00', isOpen: true },
        friday:    { open: '09:00', close: '20:00', isOpen: true },
        saturday:  { open: '10:00', close: '18:00', isOpen: true },
        sunday:    { open: '10:00', close: '18:00', isOpen: false },
      },
      cancellationWindowHours: 2,
      slotHoldMinutes: 10,
      maxAdvanceBookingDays: 30,
      vatEnabled: false,
      vatRate: 5,
      currency: 'AED',
      timezone: 'Asia/Dubai',
    },
  });
  console.log('✅ Business settings');

  // ─── Service Categories ──────────────────────────────────────────────────────
  const dogCategory = await prisma.serviceCategory.upsert({
    where: { slug: 'dog-grooming' },
    update: {},
    create: {
      name: 'Dog Grooming',
      slug: 'dog-grooming',
      petType: 'DOG',
      sortOrder: 1,
    },
  });

  const catCategory = await prisma.serviceCategory.upsert({
    where: { slug: 'cat-grooming' },
    update: {},
    create: {
      name: 'Cat Grooming',
      slug: 'cat-grooming',
      petType: 'CAT',
      sortOrder: 2,
    },
  });
  console.log('✅ Service categories');

  // ─── Helper: upsert service by name within category ──────────────────────────
  async function upsertService(data: {
    categoryId: string;
    name: string;
    description: string;
    durationMin: number;
    sortOrder: number;
    pricing: { sizeLabel: 'SMALL' | 'MEDIUM' | 'LARGE' | 'XL'; price: number }[];
  }) {
    let service = await prisma.service.findFirst({
      where: { categoryId: data.categoryId, name: data.name },
    });
    if (!service) {
      service = await prisma.service.create({
        data: {
          categoryId: data.categoryId,
          name: data.name,
          description: data.description,
          durationMin: data.durationMin,
          sortOrder: data.sortOrder,
          isActive: true,
        },
      });
    }

    for (const p of data.pricing) {
      await prisma.servicePricing.upsert({
        where: { serviceId_sizeLabel: { serviceId: service.id, sizeLabel: p.sizeLabel } },
        update: {},
        create: { serviceId: service.id, sizeLabel: p.sizeLabel, price: p.price },
      });
    }
    return service;
  }

  // ─── Services ────────────────────────────────────────────────────────────────
  const dogFullGroom = await upsertService({
    categoryId: dogCategory.id,
    name: 'Full Groom',
    description: 'Bath, blow dry, haircut, nail trim, ear cleaning, and finishing spritz.',
    durationMin: 90,
    sortOrder: 1,
    pricing: [
      { sizeLabel: 'SMALL', price: 120 },
      { sizeLabel: 'MEDIUM', price: 160 },
      { sizeLabel: 'LARGE', price: 210 },
      { sizeLabel: 'XL', price: 270 },
    ],
  });

  await upsertService({
    categoryId: dogCategory.id,
    name: 'Bath & Dry',
    description: 'Shampoo, condition, and professional blow dry.',
    durationMin: 60,
    sortOrder: 2,
    pricing: [
      { sizeLabel: 'SMALL', price: 80 },
      { sizeLabel: 'MEDIUM', price: 110 },
      { sizeLabel: 'LARGE', price: 140 },
      { sizeLabel: 'XL', price: 180 },
    ],
  });

  await upsertService({
    categoryId: dogCategory.id,
    name: 'Nail Trim',
    description: 'Safe and stress-free nail trimming.',
    durationMin: 20,
    sortOrder: 3,
    pricing: [
      { sizeLabel: 'SMALL', price: 35 },
      { sizeLabel: 'MEDIUM', price: 35 },
      { sizeLabel: 'LARGE', price: 45 },
      { sizeLabel: 'XL', price: 45 },
    ],
  });

  const catFullGroom = await upsertService({
    categoryId: catCategory.id,
    name: 'Cat Full Groom',
    description: 'Bath, blow dry, de-shedding, nail trim, and ear cleaning.',
    durationMin: 75,
    sortOrder: 1,
    pricing: [
      { sizeLabel: 'SMALL', price: 130 },
      { sizeLabel: 'MEDIUM', price: 160 },
      { sizeLabel: 'LARGE', price: 200 },
      { sizeLabel: 'XL', price: 240 },
    ],
  });

  await upsertService({
    categoryId: catCategory.id,
    name: 'Cat Bath & Dry',
    description: 'Gentle shampoo and professional blow dry.',
    durationMin: 50,
    sortOrder: 2,
    pricing: [
      { sizeLabel: 'SMALL', price: 90 },
      { sizeLabel: 'MEDIUM', price: 110 },
      { sizeLabel: 'LARGE', price: 140 },
      { sizeLabel: 'XL', price: 170 },
    ],
  });

  console.log('✅ Services + pricing');

  // ─── Add-ons ─────────────────────────────────────────────────────────────────
  const addonDefs = [
    { serviceId: dogFullGroom.id, name: 'De-shedding Treatment', price: 40 },
    { serviceId: dogFullGroom.id, name: 'Teeth Brushing', price: 25 },
    { serviceId: dogFullGroom.id, name: 'Paw Balm & Massage', price: 30 },
    { serviceId: dogFullGroom.id, name: 'Blueberry Facial', price: 35 },
    { serviceId: catFullGroom.id, name: 'Cat De-matting', price: 50 },
    { serviceId: catFullGroom.id, name: 'Cat Nail Trim', price: 30 },
  ];

  for (const addon of addonDefs) {
    const exists = await prisma.addon.findFirst({
      where: { serviceId: addon.serviceId, name: addon.name },
    });
    if (!exists) {
      await prisma.addon.create({ data: { ...addon, isActive: true } });
    }
  }
  console.log('✅ Add-ons');

  // ─── FAQs ─────────────────────────────────────────────────────────────────────
  const existingFaqCount = await prisma.fAQ.count();
  if (existingFaqCount === 0) {
    await prisma.fAQ.createMany({
      data: [
        {
          question: 'How do I book an appointment?',
          answer: 'Download the PawRoute app or visit our website, select your pet, choose a service and time slot, and complete the booking in under 2 minutes.',
          sortOrder: 1,
        },
        {
          question: 'What payment methods do you accept?',
          answer: 'We accept all major credit/debit cards via Stripe. Cash on arrival is also available if you select that option during checkout.',
          sortOrder: 2,
        },
        {
          question: 'Can I cancel or reschedule my appointment?',
          answer: 'Yes — you can cancel or reschedule up to 2 hours before your appointment at no charge. Cancellations within 2 hours may incur a fee.',
          sortOrder: 3,
        },
        {
          question: 'Do you groom all dog breeds?',
          answer: 'Yes, we groom all breeds. Pricing is based on your pet\'s size (weight). Our groomers are trained to handle breed-specific coats.',
          sortOrder: 4,
        },
        {
          question: 'How long does a grooming session take?',
          answer: 'A full groom typically takes 60–90 minutes depending on your pet\'s size and coat. You\'ll receive a real-time notification when it\'s done.',
          sortOrder: 5,
        },
        {
          question: 'Are your grooming products pet-safe?',
          answer: 'Absolutely. We use only veterinarian-approved, hypoallergenic shampoos and conditioners that are gentle on all skin types.',
          sortOrder: 6,
        },
        {
          question: 'Will I get a reminder before my appointment?',
          answer: 'You\'ll receive push notifications 24 hours and 2 hours before your appointment.',
          sortOrder: 7,
        },
      ],
    });
  }
  console.log('✅ FAQs');

  console.log('\n🎉 Database seeded successfully!');
  console.log(`\n   Admin login: admin@pawroute.com / ${adminPassword}`);
  console.log('   Change the password immediately in production!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
