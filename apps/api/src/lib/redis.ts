/**
 * @file redis.ts
 * @description Upstash Redis client for slot locking, rate limiting, and job queues.
 */

import { Redis } from '@upstash/redis';
import { appConfig } from '@pawroute/config';

export const redis = new Redis({
  url: process.env['UPSTASH_REDIS_REST_URL']!,
  token: process.env['UPSTASH_REDIS_REST_TOKEN']!,
});

// ─── Slot Locking ────────────────────────────────────────────────────────────

const SLOT_LOCK_PREFIX = 'slot:lock:';

/**
 * Atomically acquire a slot lock. Returns true if lock was acquired.
 * TTL comes from appConfig.booking.slotHoldMinutes.
 */
export async function acquireSlotLock(slotId: string, userId: string): Promise<boolean> {
  const key = `${SLOT_LOCK_PREFIX}${slotId}`;
  const ttlSeconds = appConfig.booking.slotHoldMinutes * 60;
  // NX = only set if not exists (atomic)
  const result = await redis.set(key, userId, { nx: true, ex: ttlSeconds });
  return result === 'OK';
}

/**
 * Release a slot lock. Only releases if the lock is owned by this user.
 */
export async function releaseSlotLock(slotId: string, userId: string): Promise<void> {
  const key = `${SLOT_LOCK_PREFIX}${slotId}`;
  const owner = await redis.get<string>(key);
  if (owner === userId) {
    await redis.del(key);
  }
}

/**
 * Check if a slot is currently locked.
 */
export async function isSlotLocked(slotId: string): Promise<boolean> {
  const key = `${SLOT_LOCK_PREFIX}${slotId}`;
  return (await redis.exists(key)) === 1;
}

// ─── Rate Limiting ───────────────────────────────────────────────────────────

/**
 * Simple sliding window rate limiter.
 * Returns { allowed: boolean, remaining: number, resetAt: number }
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;
  const redisKey = `ratelimit:${key}`;

  // Remove old entries, add current, count
  await redis.zremrangebyscore(redisKey, 0, windowStart);
  const current = await redis.zcard(redisKey);

  if (current >= limit) {
    return { allowed: false, remaining: 0 };
  }

  await redis.zadd(redisKey, { score: now, member: `${now}-${Math.random()}` });
  await redis.expire(redisKey, windowSeconds);

  return { allowed: true, remaining: limit - current - 1 };
}

// ─── Session Cache ────────────────────────────────────────────────────────────

const REFRESH_TOKEN_PREFIX = 'refresh:';
const ADMIN_SESSION_PREFIX = 'admin:session:';

export async function storeRefreshToken(userId: string, token: string): Promise<void> {
  const ttl = appConfig.auth.refreshTokenExpiryDays * 24 * 60 * 60;
  await redis.set(`${REFRESH_TOKEN_PREFIX}${token}`, userId, { ex: ttl });
}

export async function validateRefreshToken(token: string): Promise<string | null> {
  return redis.get<string>(`${REFRESH_TOKEN_PREFIX}${token}`);
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await redis.del(`${REFRESH_TOKEN_PREFIX}${token}`);
}

export async function storeAdminSession(adminId: string, sessionId: string): Promise<void> {
  const ttl = appConfig.admin.sessionTimeoutMinutes * 60;
  await redis.set(`${ADMIN_SESSION_PREFIX}${sessionId}`, adminId, { ex: ttl });
}

// ─── Login Lockout ────────────────────────────────────────────────────────────

const LOCKOUT_PREFIX = 'lockout:';

export async function incrementLoginAttempts(identifier: string): Promise<number> {
  const key = `${LOCKOUT_PREFIX}${identifier}`;
  const count = await redis.incr(key);
  if (count === 1) {
    // Set expiry on first attempt
    await redis.expire(key, appConfig.auth.lockoutMinutes * 60);
  }
  return count;
}

export async function isLockedOut(identifier: string): Promise<boolean> {
  const key = `${LOCKOUT_PREFIX}${identifier}`;
  const count = await redis.get<number>(key);
  return (count ?? 0) >= appConfig.auth.maxLoginAttempts;
}

export async function clearLoginAttempts(identifier: string): Promise<void> {
  await redis.del(`${LOCKOUT_PREFIX}${identifier}`);
}
