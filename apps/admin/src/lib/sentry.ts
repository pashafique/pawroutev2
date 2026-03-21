/**
 * @file sentry.ts
 * @description Sentry error tracking for the PawRoute Admin panel.
 * Import and call initSentry() at the top of main.tsx.
 */

import * as Sentry from '@sentry/react';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE ?? 'development',
    release: '2.0.0',
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: true }),
    ],
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.05,
  });
}

export { Sentry };
