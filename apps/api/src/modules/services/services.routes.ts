/**
 * @file services.routes.ts
 * @description Service catalog routes — public read, admin write.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAdmin, requireRole } from '../../middleware/auth.js';
import * as svcService from './services.service.js';

export default async function servicesRoutes(app: FastifyInstance) {
  // ── GET /services/categories ──────────────────────────────────────────────
  app.get('/categories', {
    schema: {
      tags: ['services'],
      summary: 'List service categories with nested services',
    },
    handler: async (req, reply) => {
      const { petType } = req.query as { petType?: 'DOG' | 'CAT' };
      const data = await svcService.listCategories(petType);
      reply.send({ success: true, data });
    },
  });

  // ── GET /services ──────────────────────────────────────────────────────────
  app.get('/', {
    schema: {
      tags: ['services'],
      summary: 'List services (optionally filtered + price-annotated by pet weight)',
    },
    handler: async (req, reply) => {
      const params = req.query as { categoryId?: string; petType?: 'DOG' | 'CAT'; weightKg?: number };
      const data = await svcService.listServices(params);
      reply.send({ success: true, data });
    },
  });

  // ── GET /services/:id ──────────────────────────────────────────────────────
  app.get('/:id', {
    schema: { tags: ['services'], summary: 'Get service detail with pricing and add-ons' },
    handler: async (req, reply) => {
      const { id } = req.params as { id: string };
      const data = await svcService.getService(id);
      reply.send({ success: true, data });
    },
  });

  // ── POST /services (admin) ─────────────────────────────────────────────────
  app.post('/', {
    preHandler: [requireAdmin],
    schema: {
      tags: ['services'],
      summary: 'Create a new service (admin)',
    },
    handler: async (req, reply) => {
      const data = await svcService.createService(req.body as any);
      reply.code(201).send({ success: true, data });
    },
  });

  // ── PATCH /services/:id (admin) ────────────────────────────────────────────
  app.patch('/:id', {
    preHandler: [requireAdmin],
    schema: {
      tags: ['services'],
      summary: 'Update a service (admin)',
    },
    handler: async (req, reply) => {
      const { id } = req.params as { id: string };
      const data = await svcService.updateService(id, req.body as any);
      reply.send({ success: true, data });
    },
  });

  // ── DELETE /services/:id (admin) ──────────────────────────────────────────
  app.delete('/:id', {
    preHandler: [requireAdmin, requireRole('SUPER_ADMIN', 'ADMIN')],
    schema: { tags: ['services'], summary: 'Soft-delete a service (admin)' },
    handler: async (req, reply) => {
      const { id } = req.params as { id: string };
      await svcService.deleteService(id);
      reply.send({ success: true, message: 'Service deleted' });
    },
  });

  // ── PUT /services/:id/pricing (admin) ─────────────────────────────────────
  app.put('/:id/pricing', {
    preHandler: [requireAdmin],
    schema: {
      tags: ['services'],
      summary: 'Set pricing for all sizes (admin)',
    },
    handler: async (req, reply) => {
      const { id } = req.params as { id: string };
      const { entries } = req.body as { entries: Array<{ sizeLabel: 'SMALL' | 'MEDIUM' | 'LARGE' | 'XL'; price: number }> };
      const data = await svcService.upsertPricing(id, entries);
      reply.send({ success: true, data });
    },
  });

  // ── POST /services/:id/addons (admin) ─────────────────────────────────────
  app.post('/:id/addons', {
    preHandler: [requireAdmin],
    schema: {
      tags: ['services'],
      summary: 'Add an add-on to a service (admin)',
    },
    handler: async (req, reply) => {
      const { id } = req.params as { id: string };
      const { name, price } = req.body as { name: string; price: number };
      const data = await svcService.createAddon(id, name, price);
      reply.code(201).send({ success: true, data });
    },
  });

  // ── PATCH /services/addons/:addonId (admin) ───────────────────────────────
  app.patch('/addons/:addonId', {
    preHandler: [requireAdmin],
    schema: {
      tags: ['services'],
      summary: 'Update an add-on (admin)',
    },
    handler: async (req, reply) => {
      const { addonId } = req.params as { addonId: string };
      const data = await svcService.updateAddon(addonId, req.body as any);
      reply.send({ success: true, data });
    },
  });

  // ── DELETE /services/addons/:addonId (admin) ──────────────────────────────
  app.delete('/addons/:addonId', {
    preHandler: [requireAdmin],
    schema: { tags: ['services'], summary: 'Delete an add-on (admin)' },
    handler: async (req, reply) => {
      const { addonId } = req.params as { addonId: string };
      await svcService.deleteAddon(addonId);
      reply.send({ success: true, message: 'Add-on deleted' });
    },
  });
}
