import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    // Only upload source maps in production CI (requires SENTRY_AUTH_TOKEN)
    process.env.SENTRY_AUTH_TOKEN
      ? sentryVitePlugin({
          org: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT,
          authToken: process.env.SENTRY_AUTH_TOKEN,
          telemetry: false,
        })
      : null,
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  // Expose VITE_API_URL as process.env.NEXT_PUBLIC_API_URL so that
  // @pawroute/config (shared with Next.js) resolves the correct Railway URL
  // in the Vite build environment.
  define: {
    'process.env.NEXT_PUBLIC_API_URL': JSON.stringify(
      process.env.VITE_API_URL ?? 'http://localhost:3000'
    ),
  },
  server: { port: 3002 },
  build: {
    outDir: 'dist',
    sourcemap: true, // needed for Sentry source maps
  },
});
