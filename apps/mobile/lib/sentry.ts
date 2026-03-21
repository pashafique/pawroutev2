/**
 * @file sentry.ts
 * @description Sentry initialization for the PawRoute mobile app.
 * Call initSentry() before SplashScreen.preventAutoHideAsync() in _layout.tsx.
 */

import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

export function initSentry() {
  const dsn = Constants.expoConfig?.extra?.sentryDsn as string | undefined;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: __DEV__ ? 'development' : 'production',
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,
    attachStacktrace: true,
    // Wrap React Native components for better error reporting
    enableNativeNagger: false,
  });
}

export { Sentry };
