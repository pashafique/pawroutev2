import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging, type MulticastMessage } from 'firebase-admin/messaging';
import { appConfig } from '@pawroute/config';

// Initialize Firebase Admin only when credentials are present.
// In dev without Firebase, push notifications are silently skipped.
const FIREBASE_CONFIGURED =
  !!process.env['FIREBASE_PROJECT_ID'] &&
  !!process.env['FIREBASE_PRIVATE_KEY'] &&
  !!process.env['FIREBASE_CLIENT_EMAIL'];

if (FIREBASE_CONFIGURED && !getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env['FIREBASE_PROJECT_ID']!,
      privateKey: process.env['FIREBASE_PRIVATE_KEY']!.replace(/\\n/g, '\n'),
      clientEmail: process.env['FIREBASE_CLIENT_EMAIL']!,
    }),
  });
}

const messaging = FIREBASE_CONFIGURED ? getMessaging() : null;

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Send push notification to a single FCM token.
 */
export async function sendPush(fcmToken: string, payload: PushPayload): Promise<void> {
  if (!messaging) { console.warn("[FCM] Firebase not configured ÃÂ push skipped"); return; }
  try {
    await messaging.send({
      token: fcmToken,
      notification: { title: payload.title, body: payload.body },
      ...(payload.data !== undefined && { data: payload.data }),
      android: {
        priority: 'high',
        notification: {
          channelId: 'pawroute_default',
          color: appConfig.brand.colors.accent, // #FFC212 yellow
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    });
  } catch (err) {
    // Log but don't throw ÃÂ¢ÃÂÃÂ notification failure should not fail the main operation
    console.error('FCM send failed:', err);
  }
}

/**
 * Send push to multiple FCM tokens (batched per appConfig).
 */
export async function sendMulticastPush(
  fcmTokens: string[],
  payload: PushPayload
): Promise<{ successCount: number; failureCount: number }> {
  if (!messaging) { console.warn("[FCM] Firebase not configured ÃÂ multicast skipped"); return { successCount: 0, failureCount: fcmTokens.length }; }
  const batchSize = appConfig.notifications.broadcastBatchSize;
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < fcmTokens.length; i += batchSize) {
    const batch = fcmTokens.slice(i, i + batchSize);
    const message: MulticastMessage = {
      tokens: batch,
      notification: { title: payload.title, body: payload.body },
      ...(payload.data !== undefined && { data: payload.data }),
    };
    const response = await messaging.sendEachForMulticast(message);
    successCount += response.successCount;
    failureCount += response.failureCount;
  }

  return { successCount, failureCount };
}
