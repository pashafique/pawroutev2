/**
 * @file pets.routes.ts
 * @description Pet management routes — CRUD + photo upload + AI breed detection.
 */

import type { FastifyInstance } from 'fastify';
import { PetSchema, UpdatePetSchema } from '@pawroute/types';
import type { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import * as petsService from './pets.service.js';

export default async function petsRoutes(app: FastifyInstance) {
  // All routes require customer auth
  app.addHook('preHandler', requireAuth);

  // ── GET /pets ────────────────────────────────────────────────────────────
  app.get('/', {
    schema: { tags: ['pets'], summary: "List current user's pets" },
    handler: async (req, reply) => {
      const pets = await petsService.listPets(req.user!.id);
      reply.send({ success: true, data: pets });
    },
  });

  // ── GET /pets/:id ─────────────────────────────────────────────────────────
  app.get('/:id', {
    schema: { tags: ['pets'], summary: 'Get a single pet' },
    handler: async (req, reply) => {
      const { id } = req.params as { id: string };
      const pet = await petsService.getPet(id, req.user!.id);
      reply.send({ success: true, data: pet });
    },
  });

  // ── POST /pets ────────────────────────────────────────────────────────────
  app.post('/', {
    schema: { tags: ['pets'], summary: 'Create a new pet' },
    handler: async (req, reply) => {
      const pet = await petsService.createPet(
        req.user!.id,
        req.body as z.infer<typeof PetSchema>
      );
      reply.code(201).send({ success: true, data: pet });
    },
  });

  // ── PATCH /pets/:id ───────────────────────────────────────────────────────
  app.patch('/:id', {
    schema: { tags: ['pets'], summary: 'Update a pet' },
    handler: async (req, reply) => {
      const { id } = req.params as { id: string };
      const pet = await petsService.updatePet(
        id,
        req.user!.id,
        req.body as z.infer<typeof UpdatePetSchema>
      );
      reply.send({ success: true, data: pet });
    },
  });

  // ── DELETE /pets/:id ──────────────────────────────────────────────────────
  app.delete('/:id', {
    schema: { tags: ['pets'], summary: 'Soft-delete a pet' },
    handler: async (req, reply) => {
      const { id } = req.params as { id: string };
      await petsService.deletePet(id, req.user!.id);
      reply.send({ success: true, message: 'Pet deleted' });
    },
  });

  // ── POST /pets/:id/photo ──────────────────────────────────────────────────
  app.post('/:id/photo', {
    schema: { tags: ['pets'], summary: 'Upload pet photo (WebP, AI breed detection)' },
    handler: async (req, reply) => {
      const { id } = req.params as { id: string };
      const data = await req.file();
      if (!data) {
        return reply.code(400).send({ success: false, error: 'No file provided' });
      }

      const chunks: Buffer[] = [];
      for await (const chunk of data.file) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      const mimeType = data.mimetype;

      const result = await petsService.uploadPetPhoto(id, req.user!.id, buffer, mimeType);
      reply.send({ success: true, data: result });
    },
  });

  // ── DELETE /pets/:id/photo ────────────────────────────────────────────────
  app.delete('/:id/photo', {
    schema: { tags: ['pets'], summary: 'Remove pet photo' },
    handler: async (req, reply) => {
      const { id } = req.params as { id: string };
      await petsService.deletePetPhoto(id, req.user!.id);
      reply.send({ success: true, message: 'Photo removed' });
    },
  });
}
