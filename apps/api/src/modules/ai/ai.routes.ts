/**
 * @file ai.routes.ts
 * @description AI endpoints — breed detection + chatbot.
 * All AI features are feature-flagged via appConfig.features.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { detectBreed } from '../../lib/huggingface.js';
import { chatWithGemini } from '../../lib/gemini.js';
import { appConfig } from '@pawroute/config';
import { prisma } from '../../lib/prisma.js';

export default async function aiRoutes(app: FastifyInstance) {
  // ── POST /ai/breed-detect ─────────────────────────────────────────────────
  // Upload a photo to get breed predictions (without saving to pet record)
  app.post('/breed-detect', {
    preHandler: [requireAuth],
    schema: {
      tags: ['ai'],
      summary: 'Detect pet breed from uploaded photo',
    },
    handler: async (req, reply) => {
      if (!appConfig.features.aiBreedDetection) {
        return reply.code(400).send({ success: false, error: 'Breed detection is not enabled' });
      }

      const data = await req.file();
      if (!data) {
        return reply.code(400).send({ success: false, error: 'No file provided' });
      }

      const chunks: Buffer[] = [];
      for await (const chunk of data.file) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);

      const predictions = await detectBreed(buffer);
      reply.send({ success: true, data: { predictions } });
    },
  });

  // ── POST /ai/chat ─────────────────────────────────────────────────────────
  app.post('/chat', {
    schema: {
      tags: ['ai'],
      summary: 'Chat with AI assistant (Gemini + FAQ context)',
    },
    handler: async (req, reply) => {
      if (!appConfig.features.aiChatbot) {
        return reply.code(400).send({ success: false, error: 'AI chatbot is not enabled' });
      }

      const { message } = req.body as { message: string };

      // Load FAQ context for grounding the chatbot
      const faqs = await prisma.fAQ.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: { question: true, answer: true },
      });

      const response = await chatWithGemini(message, faqs);
      reply.send({ success: true, data: { response } });
    },
  });
}
