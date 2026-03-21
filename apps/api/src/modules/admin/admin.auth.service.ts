/**
 * @file admin.auth.service.ts
 * @description Admin authentication: separate login endpoint with role-based access.
 * Admin tokens are signed with JWT_ADMIN_SECRET and carry a role claim.
 */

import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import { redis, isLockedOut, incrementLoginAttempts, clearLoginAttempts, storeRefreshToken, validateRefreshToken } from '../../lib/redis.js';
import { appConfig } from '@pawroute/config';
import type { AdminRole } from '@pawroute/types';
import {
  generateAdminAccessToken,
  generateAdminRefreshToken,
  verifyAdminRefreshToken,
} from '../../utils/tokens.js';

const { auth } = appConfig;

export async function adminLogin(email: string, password: string) {
  const locked = await isLockedOut(`admin:${email}`);
  if (locked) {
    throw Object.assign(
      new Error(`Account locked. Try again after ${auth.lockoutMinutes} minutes.`),
      { statusCode: 429 }
    );
  }

  const admin = await prisma.adminUser.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, role: true, passwordHash: true, isActive: true },
  });

  if (!admin || !admin.isActive) {
    await incrementLoginAttempts(`admin:${email}`);
    throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    await incrementLoginAttempts(`admin:${email}`);
    throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
  }

  await clearLoginAttempts(`admin:${email}`);

  const role = admin.role as AdminRole;
  const accessToken = generateAdminAccessToken(admin.id, role);
  const refreshToken = generateAdminRefreshToken(admin.id, role);
  await storeRefreshToken(`admin:${admin.id}`, refreshToken);

  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      adminId: admin.id,
      action: 'ADMIN_LOGIN',
      entity: 'AdminUser',
      entityId: admin.id,
    },
  });

  return {
    admin: { id: admin.id, name: admin.name, email: admin.email, role },
    accessToken,
    refreshToken,
  };
}

export async function adminRefreshToken(token: string) {
  const payload = verifyAdminRefreshToken(token);
  if (!payload) {
    throw Object.assign(new Error('Invalid or expired refresh token'), { statusCode: 401 });
  }

  const valid = await validateRefreshToken(token);
  if (!valid) {
    throw Object.assign(new Error('Refresh token revoked'), { statusCode: 401 });
  }

  const newAccess = generateAdminAccessToken(payload.sub, payload.role);
  const newRefresh = generateAdminRefreshToken(payload.sub, payload.role);
  await storeRefreshToken(`admin:${payload.sub}`, newRefresh);

  return { accessToken: newAccess, refreshToken: newRefresh };
}

export async function adminLogout(adminId: string): Promise<void> {
  await redis.del(`refresh:admin:${adminId}`);
}
