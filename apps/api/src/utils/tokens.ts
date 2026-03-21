/**
 * @file tokens.ts
 * @description JWT access + refresh token generation and verification.
 * Separate secrets for customer tokens vs admin tokens.
 */

import jwt from 'jsonwebtoken';
import { appConfig } from '@pawroute/config';
import type { AdminRole } from '@pawroute/types';

const ACCESS_SECRET = process.env['JWT_ACCESS_SECRET']!;
const REFRESH_SECRET = process.env['JWT_REFRESH_SECRET']!;
const ADMIN_SECRET = process.env['JWT_ADMIN_SECRET']!;

const { auth } = appConfig;

// ─── Customer Tokens ─────────────────────────────────────────────────────────

export function generateAccessToken(userId: string): string {
  return jwt.sign(
    { sub: userId, type: 'customer' },
    ACCESS_SECRET,
    { expiresIn: `${auth.accessTokenExpiryMinutes}m` }
  );
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { sub: userId, type: 'customer' },
    REFRESH_SECRET,
    { expiresIn: `${auth.refreshTokenExpiryDays}d` }
  );
}

export function verifyRefreshToken(token: string): { sub: string } | null {
  try {
    return jwt.verify(token, REFRESH_SECRET) as { sub: string };
  } catch {
    return null;
  }
}

// ─── Admin Tokens ─────────────────────────────────────────────────────────────

export function generateAdminAccessToken(adminId: string, role: AdminRole): string {
  return jwt.sign(
    { sub: adminId, type: 'admin', role },
    ADMIN_SECRET,
    { expiresIn: `${auth.accessTokenExpiryMinutes}m` }
  );
}

export function generateAdminRefreshToken(adminId: string, role: AdminRole): string {
  return jwt.sign(
    { sub: adminId, type: 'admin', role },
    ADMIN_SECRET,
    { expiresIn: `${auth.refreshTokenExpiryDays}d` }
  );
}

export function verifyAdminRefreshToken(token: string): { sub: string; role: AdminRole } | null {
  try {
    return jwt.verify(token, ADMIN_SECRET) as { sub: string; role: AdminRole };
  } catch {
    return null;
  }
}

// ─── Password Reset Token ─────────────────────────────────────────────────────

export function generatePasswordResetToken(userId: string): string {
  return jwt.sign(
    { sub: userId, type: 'reset' },
    ACCESS_SECRET,
    { expiresIn: `${auth.passwordResetExpiryMinutes}m` }
  );
}

export function verifyPasswordResetToken(token: string): { sub: string } | null {
  try {
    const payload = jwt.verify(token, ACCESS_SECRET) as { sub: string; type: string };
    if (payload.type !== 'reset') return null;
    return { sub: payload.sub };
  } catch {
    return null;
  }
}
