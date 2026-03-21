/**
 * @file sentry.ts
 * @description Sentry error tracking initialization for the PawRoute API.
 * Import this at the very top of server.ts before any other imports.
 */

import * as Sentry from '@sentry/node';

export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.npm_package_version ?? '2.0.0',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Do not capture health check endpoints
    ignoreErrors: [
      'Not Found',
      'Route GET:/health not found',
      'Route GET:/ready not found',
    ],
    beforeSend(event) {
      // Strip PII from request bodies
      if (event.request?.data) {
        const data = event.request.data as Record<string, unknown>;
        for (const key of ['password', 'newPassword', 'otp', 'accessToken', 'refreshToken']) {
          if (key in data) data[key] = '[Filtered]';
        }
      }
      return event;
    },
  });
}

export { Sentry };
