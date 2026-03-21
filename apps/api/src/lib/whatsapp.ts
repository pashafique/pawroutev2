/**
 * @file whatsapp.ts
 * @description WhatsApp Cloud API (Meta) client for OTP delivery.
 * Uses the free WhatsApp Business Cloud API — no monthly fee after verification.
 */

import { appConfig } from '@pawroute/config';

const PHONE_NUMBER_ID = process.env['WHATSAPP_PHONE_NUMBER_ID']!;
const ACCESS_TOKEN = process.env['WHATSAPP_ACCESS_TOKEN']!;
const API_URL = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;

export async function sendWhatsappOtp(to: string, otp: string, name: string): Promise<void> {
  // Normalize phone: ensure E.164 format (strip leading + if present for WA API)
  const phone = to.startsWith('+') ? to.slice(1) : to;

  const body = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: {
      name: 'otp_verification',
      language: { code: 'en' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: name },
            { type: 'text', text: otp },
            { type: 'text', text: String(appConfig.auth.otpExpiryMinutesWhatsapp) },
          ],
        },
        {
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [{ type: 'text', text: otp }],
        },
      ],
    },
  };

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(`WhatsApp API error: ${JSON.stringify(error)}`);
  }
}
