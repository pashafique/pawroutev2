/**
 * @file auth.ts
 * @description Fastify auth middleware — verifies JWT access tokens and
 * populates request.user / request.admin on protected routes.
 * Customer tokens use JWT_ACCESS_SECRET; admin tokens use JWT_ADMIN_SECRET.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import type { AdminRole } from '@pawroute/types';

const ADMIN_SECRET = process.env['JWT_ADMIN_SECRET']!;

// ─── Customer Auth ────────────────────────────────────────────────────────────

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const payload = await request.jwtVerify<{ sub: string; type: 'customer' }>();
    if (payload.type !== 'customer') {
      return reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Invalid token type' });
    }
    const user = await prisma.user.findFirst({
      where: { id: payload.sub, isActive: true, deletedAt: null },
      select: { id: true, name: true, email: true, phone: true, isBlocked: true },
    });
    if (!user) {
      return reply.status(401).send({ code: 'UNAUTHORIZED', message: 'User not found' });
    }
    if (user.isBlocked) {
      return reply.status(403).send({ code: 'ACCOUNT_BLOCKED', message: 'Account has been restricted' });
    }
    (request as any).user = user;
  } catch {
    return reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Invalid or expired token' });
  }
}

// ─── Admin Auth ───────────────────────────────────────────────────────────────
// Admin tokens use a separate secret (JWT_ADMIN_SECRET) — verified manually.

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return reply.status(401).send({ code: 'UNAUTHORIZED', message: 'No token provided' });
    }
    const token = header.slice(7);
    const payload = jwt.verify(token, ADMIN_SECRET) as { sub: string; type: string; role: AdminRole };

    if (payload.type !== 'admin') {
      return reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Invalid token type' });
    }

    const admin = await prisma.adminUser.findFirst({
      where: { id: payload.sub, isActive: true },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!admin) {
      return reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Admin not found' });
    }
    (request as any).admin = admin;
  } catch {
    return reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Invalid or expired token' });
  }
}

/**
 * Role guard — must be used after requireAdmin in preHandler chain.
 */
export function requireRole(...roles: AdminRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const admin = (request as any).admin;
    if (!admin || !roles.includes(admin.role)) {
      return reply.status(403).send({
        code: 'FORBIDDEN',
        message: `This action requires one of: ${roles.join(', ')}`,
      });
    }
  };
}
