'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { appConfig } from '@pawroute/config';

const c = appConfig.brand.colors;

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            fontFamily: 'sans-serif',
            backgroundColor: '#F8F7FF',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>🐾</div>
          <h1 style={{ color: c.primary, fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
            Something went wrong
          </h1>
          <p style={{ color: c.textSecondary, marginBottom: 24, textAlign: 'center', maxWidth: 400 }}>
            An unexpected error occurred. Our team has been notified. Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              backgroundColor: c.primary,
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '12px 32px',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
