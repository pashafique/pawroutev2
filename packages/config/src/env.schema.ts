/**
 * @file env.schema.ts
 * @description Zod schema for environment variable validation.
 * Call validateEnv() at startup — throws descriptive errors if any required
 * variable is missing, preventing silent runtime failures.
 */

import { z } from 'zod';

// In development/test, third-party services are optional so the server can
// start without every account being configured. In production all are required.
const isProd = process.env.NODE_ENV === 'production';

// Treat empty strings the same as undefined so `KEY=` in .env is skipped.
const emptyToUndefined = z.string().transform((v) => v === '' ? undefined : v);

// Optional string — empty string treated as absent.
const optStr = emptyToUndefined.pipe(z.string().optional());
// Optional URL — empty string treated as absent.
const optUrl = emptyToUndefined.pipe(z.string().url().optional());

const prodOnly = <T extends z.ZodTypeAny>(schema: T) =>
  isProd ? schema : emptyToUndefined.pipe(schema.optional() as z.ZodTypeAny) as unknown as z.ZodOptional<T>;

const envSchema = z.object({
  // ─── Node ───────────────────────────────────────────────────────────────
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  // ─── Database (Supabase) — always required ────────────────────────────
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection URL'),
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  SUPABASE_STORAGE_BUCKET: z.string().default('pawroute-media'),

  // ─── Redis (Upstash) — required in prod; optional in dev (slot locking degrades) ──
  UPSTASH_REDIS_REST_URL: prodOnly(z.string().url('UPSTASH_REDIS_REST_URL must be a valid URL')),
  UPSTASH_REDIS_REST_TOKEN: prodOnly(z.string().min(1, 'UPSTASH_REDIS_REST_TOKEN is required')),

  // ─── JWT Auth — always required ──────────────────────────────────────
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters for security'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters for security'),
  JWT_ADMIN_SECRET: z
    .string()
    .min(32, 'JWT_ADMIN_SECRET must be at least 32 characters for security'),

  // ─── Google (OAuth + Gemini) — always optional (SSO + AI chatbot are additive features)
  GOOGLE_CLIENT_ID: optStr,
  GOOGLE_CLIENT_SECRET: optStr,
  GEMINI_API_KEY: optStr,

  // ─── Facebook OAuth — always optional ────────────────────────────────
  FACEBOOK_APP_ID: z.string().optional(),
  FACEBOOK_APP_SECRET: z.string().optional(),

  // ─── Stripe — optional in dev (payment flow won't work until set) ─────
  STRIPE_SECRET_KEY: prodOnly(
    z.string().startsWith('sk_', 'STRIPE_SECRET_KEY must start with sk_').min(1)
  ),
  STRIPE_WEBHOOK_SECRET: prodOnly(
    z.string().startsWith('whsec_', 'STRIPE_WEBHOOK_SECRET must start with whsec_').min(1)
  ),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: emptyToUndefined.pipe(
    z.string().startsWith('pk_', 'STRIPE_PUBLISHABLE_KEY must start with pk_').optional()
  ),

  // ─── Firebase FCM — optional in dev (push notifications skip gracefully) ─
  FIREBASE_PROJECT_ID: prodOnly(z.string().min(1, 'FIREBASE_PROJECT_ID is required')),
  FIREBASE_PRIVATE_KEY: prodOnly(z.string().min(1, 'FIREBASE_PRIVATE_KEY is required')),
  FIREBASE_CLIENT_EMAIL: prodOnly(
    z.string().email('FIREBASE_CLIENT_EMAIL must be a valid email')
  ),

  // ─── Resend (Email) — optional in dev (emails logged to console instead) ─
  RESEND_API_KEY: prodOnly(
    z.string().startsWith('re_', 'RESEND_API_KEY must start with re_').min(1)
  ),
  EMAIL_FROM: z.string().email().default('noreply@pawroute.com'),

  // ─── WhatsApp Cloud API ──────────────────────────────────────────────────
  WHATSAPP_PHONE_NUMBER_ID: optStr,
  WHATSAPP_ACCESS_TOKEN: optStr,

  // ─── Hugging Face ─────────────────────────────────────────────────────────
  HUGGINGFACE_API_KEY: optStr,

  // ─── Frontend URLs ────────────────────────────────────────────────────────
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_WEB_URL: z.string().url().default('http://localhost:3001'),
  NEXT_PUBLIC_ADMIN_URL: z.string().url().default('http://localhost:3002'),

  // ─── Sentry ──────────────────────────────────────────────────────────────
  SENTRY_DSN: optUrl,
  NEXT_PUBLIC_SENTRY_DSN: optUrl,

  // ─── App Settings ────────────────────────────────────────────────────────
  ADMIN_IP_ALLOWLIST: optStr, // comma-separated IPs for admin panel
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates process.env against the schema.
 * Call this once at application startup before any other code runs.
 *
 * @throws {Error} Descriptive error listing all missing/invalid env vars
 */
export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `❌ Invalid environment variables. Please check your .env file:\n\n${errors}\n\n` +
        `Refer to .env.example for the full list of required variables.`
    );
  }
  return result.data;
}

export { envSchema };
