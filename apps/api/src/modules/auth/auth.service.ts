/**
 * @file auth.service.ts
 * @description Full authentication service: register, login, OTP, JWT, SSO, password reset.
 */

import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import { redis, isLockedOut, incrementLoginAttempts, clearLoginAttempts, storeRefreshToken, validateRefreshToken } from '../../lib/redis.js';
import { appConfig } from '@pawroute/config';
import {
  generateAccessToken,
  generateRefreshToken,
  generatePasswordResetToken,
  verifyRefreshToken,
  verifyPasswordResetToken,
} from '../../utils/tokens.js';
import { sendOtpEmail, sendPasswordResetEmail } from '../../lib/resend.js';
import { sendWhatsappOtp } from '../../lib/whatsapp.js';

const { auth } = appConfig;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function otpRedisKey(target: string, type: 'email' | 'whatsapp'): string {
  return `otp:${type}:${target}`;
}

function otpCooldownKey(target: string): string {
  return `otp:cooldown:${target}`;
}

// ─── Register ─────────────────────────────────────────────────────────────────

export interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export async function register(input: RegisterInput) {
  const { name, email, phone, password } = input;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { phone }], deletedAt: null },
  });
  if (existing) {
    const conflict = existing.email === email ? 'Email' : 'Phone';
    throw Object.assign(new Error(`${conflict} already registered`), { statusCode: 409 });
  }

  const hash = await bcrypt.hash(password, auth.bcryptSaltRounds);

  const user = await prisma.user.create({
    data: { name, email, phone, passwordHash: hash },
    select: { id: true, name: true, email: true, phone: true, otpVerified: true, createdAt: true },
  });

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);
  await storeRefreshToken(user.id, refreshToken);

  return { user, accessToken, refreshToken };
}

// ─── Login ────────────────────────────────────────────────────────────────────

export interface LoginInput {
  email: string;   // may be email or phone number (identifier)
  password: string;
}

export async function login(input: LoginInput) {
  const { email: identifier, password } = input;

  const locked = await isLockedOut(identifier);
  if (locked) {
    throw Object.assign(
      new Error(`Account locked. Try again after ${auth.lockoutMinutes} minutes.`),
      { statusCode: 429 }
    );
  }

  const isEmail = identifier.includes('@');
  const user = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      isActive: true,
      ...(isEmail ? { email: identifier } : { phone: identifier }),
    },
  });

  if (!user || !user.passwordHash) {
    await incrementLoginAttempts(identifier);
    throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    await incrementLoginAttempts(identifier);
    throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
  }

  await clearLoginAttempts(identifier);

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);
  await storeRefreshToken(user.id, refreshToken);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      otpVerified: user.otpVerified,
      profilePhoto: user.profilePhoto,
    },
    accessToken,
    refreshToken,
  };
}

// ─── Send OTP ─────────────────────────────────────────────────────────────────

export async function sendOtp(target: string, channel: 'email' | 'whatsapp', name: string) {
  const cooldownKey = otpCooldownKey(target);
  const onCooldown = await redis.get(cooldownKey);
  if (onCooldown) {
    throw Object.assign(
      new Error(`Please wait ${auth.otpResendCooldownSeconds} seconds before requesting a new code.`),
      { statusCode: 429 }
    );
  }

  const otp = generateOtp();
  const expirySeconds =
    channel === 'email'
      ? auth.otpExpiryMinutesEmail * 60
      : auth.otpExpiryMinutesWhatsapp * 60;

  const key = otpRedisKey(target, channel);
  await redis.set(key, otp, { ex: expirySeconds });
  await redis.set(cooldownKey, '1', { ex: auth.otpResendCooldownSeconds });

  if (channel === 'email') {
    await sendOtpEmail(target, otp, name);
  } else {
    await sendWhatsappOtp(target, otp, name);
  }
}

// ─── Verify OTP ───────────────────────────────────────────────────────────────

export async function verifyOtp(
  target: string,
  otp: string,
  channel: 'email' | 'whatsapp'
): Promise<boolean> {
  const key = otpRedisKey(target, channel);
  const stored = await redis.get(key);

  if (!stored || stored !== otp) {
    return false;
  }

  // Consume immediately — single use
  await redis.del(key);

  // Mark otp as verified on the user record
  await prisma.user.updateMany({
    where: {
      deletedAt: null,
      ...(channel === 'email' ? { email: target } : { phone: target }),
    },
    data: { otpVerified: true },
  });

  return true;
}

// ─── Refresh Token ────────────────────────────────────────────────────────────

export async function refreshAccessToken(token: string) {
  const payload = verifyRefreshToken(token);
  if (!payload) {
    throw Object.assign(new Error('Invalid or expired refresh token'), { statusCode: 401 });
  }

  const valid = await validateRefreshToken(token);
  if (!valid) {
    throw Object.assign(new Error('Refresh token revoked'), { statusCode: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, deletedAt: true, isActive: true },
  });
  if (!user || user.deletedAt || !user.isActive) {
    throw Object.assign(new Error('User not found'), { statusCode: 401 });
  }

  const newAccess = generateAccessToken(payload.sub);
  const newRefresh = generateRefreshToken(payload.sub);
  await storeRefreshToken(payload.sub, newRefresh);

  return { accessToken: newAccess, refreshToken: newRefresh };
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logout(userId: string): Promise<void> {
  await redis.del(`refresh:${userId}`);
}

// ─── Forgot Password ──────────────────────────────────────────────────────────

export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null },
    select: { id: true, name: true },
  });

  // Always succeed — prevents email enumeration
  if (!user) return;

  const token = generatePasswordResetToken(user.id);
  const resetUrl = `${process.env['NEXT_PUBLIC_WEB_URL'] ?? 'http://localhost:3001'}/reset-password?token=${token}`;
  await sendPasswordResetEmail(email, user.name, resetUrl);
}

// ─── Reset Password ───────────────────────────────────────────────────────────

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const payload = verifyPasswordResetToken(token);
  if (!payload) {
    throw Object.assign(new Error('Invalid or expired reset link'), { statusCode: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, deletedAt: true },
  });
  if (!user || user.deletedAt) {
    throw Object.assign(new Error('User not found'), { statusCode: 400 });
  }

  const hash = await bcrypt.hash(newPassword, auth.bcryptSaltRounds);
  await prisma.user.update({
    where: { id: payload.sub },
    data: { passwordHash: hash },
  });

  // Invalidate all refresh tokens for safety
  await redis.del(`refresh:${payload.sub}`);
}

// ─── Google SSO ───────────────────────────────────────────────────────────────

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  emailVerified?: boolean;
}

export async function googleSso(profile: GoogleProfile) {
  let user = await prisma.user.findFirst({
    where: {
      OR: [{ googleId: profile.googleId }, { email: profile.email }],
      deletedAt: null,
    },
  });

  if (user) {
    if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: profile.googleId,
          profilePhoto: user.profilePhoto ?? profile.avatarUrl ?? null,
          otpVerified: true,
        },
      });
    }
  } else {
    user = await prisma.user.create({
      data: {
        name: profile.name,
        email: profile.email,
        phone: '',   // SSO users may not have phone; required field — they can add later
        googleId: profile.googleId,
        profilePhoto: profile.avatarUrl ?? null,
        otpVerified: profile.emailVerified ?? true,
      },
    });
  }

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);
  await storeRefreshToken(user.id, refreshToken);

  return {
    user: { id: user.id, name: user.name, email: user.email, profilePhoto: user.profilePhoto },
    accessToken,
    refreshToken,
  };
}

// ─── Facebook SSO ─────────────────────────────────────────────────────────────

export interface FacebookProfile {
  facebookId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export async function facebookSso(profile: FacebookProfile) {
  let user = await prisma.user.findFirst({
    where: {
      OR: [{ facebookId: profile.facebookId }, { email: profile.email }],
      deletedAt: null,
    },
  });

  if (user) {
    if (!user.facebookId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          facebookId: profile.facebookId,
          profilePhoto: user.profilePhoto ?? profile.avatarUrl ?? null,
          otpVerified: true,
        },
      });
    }
  } else {
    user = await prisma.user.create({
      data: {
        name: profile.name,
        email: profile.email,
        phone: '',
        facebookId: profile.facebookId,
        profilePhoto: profile.avatarUrl ?? null,
        otpVerified: true,
      },
    });
  }

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);
  await storeRefreshToken(user.id, refreshToken);

  return {
    user: { id: user.id, name: user.name, email: user.email, profilePhoto: user.profilePhoto },
    accessToken,
    refreshToken,
  };
}
