/**
 * @file gallery.routes.ts
 * @description Gallery routes — public image listing + admin upload/manage.
 */

import type { FastifyInstance } from 'fastify';
import { requireAdmin, requireRole } from '../../middleware/auth';
import { processImage } from '../../utils/image';
import { supabase } from '../../lib/supabase';
import { prisma } from '../../lib/prisma';
import { appConfig } from '@pawroute/config';

const BUCKET = process.env['SUPABASE_STORAGE_BUCKET'] ?? 'pawroute-media';

export default async function galleryRoutes(app: FastifyInstance) {
  // ── Public ──────────────────────────────────────────────────────────────────

  // GET /gallery?petType=DOG&type=BEFORE
  app.get('/', async (req) => {
    const { petType, type } = req.query as { petType?: string; type?: string };
    const where: any = {};
    if (petType) where.petType = petType;
    if (type) where.beforeAfterType = type;

    const images = await prisma.galleryImage.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
    return { data: images };
  });

  // ── Admin ────────────────────────────────────────────────────────────────────
  app.register(async (adminRoutes) => {
    adminRoutes.addHook('preHandler', requireAdmin);

    // POST /gallery — upload image
    adminRoutes.post('/', { preHandler: requireRole('SUPER_ADMIN', 'ADMIN') }, async (req, reply) => {
      const parts = req.parts();
      let imageBuffer: Buffer | null = null;
      let mimeType = 'image/jpeg';
      let caption = '';
      let petType: string | null = null;
      let beforeAfterType = 'GENERAL';
      let sortOrder = 0;

      for await (const part of parts) {
        if (part.type === 'file') {
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) {
            chunks.push(Buffer.from(chunk));
          }
          imageBuffer = Buffer.concat(chunks);
          mimeType = part.mimetype;
        } else {
          if (part.fieldname === 'caption') caption = (part as any).value;
          if (part.fieldname === 'petType') petType = (part as any).value || null;
          if (part.fieldname === 'beforeAfterType') beforeAfterType = (part as any).value;
          if (part.fieldname === 'sortOrder') sortOrder = parseInt((part as any).value, 10) || 0;
        }
      }

      if (!imageBuffer) return reply.code(400).send({ error: 'Image file required' });

      const { webpBuffer, thumbnailBuffer } = await processImage(imageBuffer);
      const ts = Date.now();
      const imagePath = `gallery/${ts}.webp`;
      const thumbPath = `gallery/thumbs/${ts}.webp`;

      const [uploadResult, thumbResult] = await Promise.all([
        supabase.storage.from(BUCKET).upload(imagePath, webpBuffer, { contentType: 'image/webp', upsert: true }),
        supabase.storage.from(BUCKET).upload(thumbPath, thumbnailBuffer, { contentType: 'image/webp', upsert: true }),
      ]);

      if (uploadResult.error) return reply.code(500).send({ error: 'Upload failed' });

      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(imagePath);
      const { data: { publicUrl: thumbUrl } } = supabase.storage.from(BUCKET).getPublicUrl(thumbPath);

      const image = await prisma.galleryImage.create({
        data: {
          imageUrl: publicUrl,
          thumbnailUrl: thumbUrl,
          petType: petType as any,
          beforeAfterType: beforeAfterType as any,
          caption: caption || null,
          sortOrder,
        },
      });

      return reply.code(201).send({ data: image });
    });

    // PATCH /gallery/:id — update caption/sortOrder
    adminRoutes.patch('/:id', { preHandler: requireRole('SUPER_ADMIN', 'ADMIN') }, async (req) => {
      const { id } = req.params as { id: string };
      const { caption, sortOrder, beforeAfterType, petType } = req.body as any;
      const image = await prisma.galleryImage.update({
        where: { id },
        data: { caption, sortOrder, beforeAfterType, petType },
      });
      return { data: image };
    });

    // DELETE /gallery/:id
    adminRoutes.delete('/:id', { preHandler: requireRole('SUPER_ADMIN', 'ADMIN') }, async (req) => {
      const { id } = req.params as { id: string };
      await prisma.galleryImage.delete({ where: { id } });
      return { success: true };
    });
  });
}
