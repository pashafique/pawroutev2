/**
 * @file server.ts
 * @description PawRoute API — Fastify server entry point.
 * Validates env, registers plugins, mounts all routes, starts listening.
 */

// Sentry must be initialized before any other imports
import { initSentry, Sentry } from './lib/sentry.js';
initSentry();

import Fastify from 'fastify';
import { validateEnv } from '@pawroute/config';
import { appConfig } from '@pawroute/config';

// Validate all env vars before anything else
const env = validateEnv();

const server = Fastify({
  logger:
    env.NODE_ENV === 'development'
      ? {
          transport: {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
          },
        }
      : {
          level: env.LOG_LEVEL,
          // Structured JSON for production — no PII
          redact: ['req.headers.authorization', 'body.password', 'body.newPassword', 'body.otp'],
        },
  trustProxy: true,
  disableRequestLogging: env.NODE_ENV === 'production',
});

async function bootstrap() {
  // ─── Plugins ──────────────────────────────────────────────────────────────
  await server.register(import('@fastify/helmet'), {
    contentSecurityPolicy: env.NODE_ENV === 'production',
  });

  await server.register(import('@fastify/cors'), {
    origin: [env.NEXT_PUBLIC_WEB_URL, env.NEXT_PUBLIC_ADMIN_URL],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await server.register(import('@fastify/multipart'), {
    limits: {
      fileSize: Math.max(
        appConfig.uploads.maxPhotoSizeMb,
        appConfig.uploads.maxGallerySizeMb
      ) * 1024 * 1024,
      files: 10,
    },
  });

  await server.register(import('@fastify/rate-limit'), {
    global: false, // applied per-route
    // Uses in-memory store — compatible with Upstash HTTP client.
    // For multi-instance deployments, swap in an ioredis client here.
    keyGenerator: (req) => req.ip,
  });

  // JWT
  await server.register(import('@fastify/jwt'), {
    secret: {
      private: env.JWT_ACCESS_SECRET,
      public: env.JWT_ACCESS_SECRET,
    },
    sign: { expiresIn: `${appConfig.auth.accessTokenExpiryMinutes}m` },
  });

  // Swagger (disabled in production)
  if (appConfig.api.docsEnabled) {
    await server.register(import('@fastify/swagger'), {
      openapi: {
        info: {
          title: `${appConfig.product.name} API`,
          description: appConfig.product.shortDescription,
          version: appConfig.product.version,
        },
        servers: [{ url: env.NEXT_PUBLIC_API_URL }],
        components: {
          securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          },
        },
      },
    });
    await server.register(import('@fastify/swagger-ui'), {
      routePrefix: appConfig.api.docsPath,
    });
  }

  // ─── Routes ───────────────────────────────────────────────────────────────
  const prefix = `/api/${appConfig.api.version}`;

  await server.register(import('./modules/auth/auth.routes.js'), { prefix: `${prefix}/auth` });
  await server.register(import('./modules/users/users.routes.js'), { prefix: `${prefix}/users` });
  await server.register(import('./modules/pets/pets.routes.js'), { prefix: `${prefix}/pets` });
  await server.register(import('./modules/services/services.routes.js'), { prefix: `${prefix}/services` });
  await server.register(import('./modules/slots/slots.routes.js'), { prefix: `${prefix}/slots` });
  await server.register(import('./modules/appointments/appointments.routes.js'), { prefix: `${prefix}/appointments` });
  await server.register(import('./modules/coupons/coupons.routes.js'), { prefix: `${prefix}/coupons` });
  await server.register(import('./modules/payments/payments.routes.js'), { prefix: `${prefix}/payments` });
  await server.register(import('./modules/notifications/notifications.routes.js'), { prefix: `${prefix}/notifications` });
  await server.register(import('./modules/gallery/gallery.routes.js'), { prefix: `${prefix}/gallery` });
  await server.register(import('./modules/ai/ai.routes.js'), { prefix: `${prefix}/ai` });
  await server.register(import('./modules/admin/admin.routes.js'), { prefix: `${prefix}/admin` });

  // ─── Health / Ready ───────────────────────────────────────────────────────
  server.get(appConfig.api.healthPath, async () => ({
    status: 'ok',
    version: appConfig.product.version,
    timestamp: new Date().toISOString(),
  }));

  server.get(appConfig.api.readyPath, async () => {
    // Could check DB + Redis connectivity here
    return { status: 'ready' };
  });

  // ─── Error Handler ────────────────────────────────────────────────────────
  server.setErrorHandler((error, req, reply) => {
    server.log.error(error);

    if (error.validation) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: error.validation,
      });
    }

    const statusCode = error.statusCode ?? 500;
    if (statusCode >= 500) {
      Sentry.withScope((scope) => {
        scope.setTag('route', req.routerPath ?? req.url);
        scope.setExtra('method', req.method);
        Sentry.captureException(error);
      });
    }

    return reply.status(statusCode).send({
      code: error.code ?? 'INTERNAL_ERROR',
      message: statusCode === 500 ? 'An unexpected error occurred' : error.message,
    });
  });

  // ─── Start ────────────────────────────────────────────────────────────────
  try {
    await server.listen({ port: env.PORT, host: '0.0.0.0' });
    server.log.info(`🐾 ${appConfig.product.name} API running on port ${env.PORT}`);
    server.log.info(`📖 API docs: ${env.NEXT_PUBLIC_API_URL}${appConfig.api.docsPath}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
const shutdown = async (signal: string) => {
  server.log.info(`${signal} received — shutting down gracefully`);
  await server.close();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

bootstrap();
