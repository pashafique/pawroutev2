/**
 * @file resend.ts
 * @description Transactional email via Resend (free tier: 3,000/month).
 */

import { Resend } from 'resend';
import { appConfig } from '@pawroute/config';
import { formatDateTime } from '@pawroute/utils';

const RESEND_KEY = process.env["RESEND_API_KEY"] || "";
let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!RESEND_KEY) return null;
  if (!_resend) _resend = new Resend(RESEND_KEY);
  return _resend;
}
async function sendEmail(p: Parameters<Resend["emails"]["send"]>[0]): Promise<void> {
  const c2 = getResend();
  if (!c2) { console.warn("[Resend] No API key — email skipped:", p.subject); return; }
  await c2.emails.send(p);
}
const resend = { emails: { send: sendEmail } } as unknown as Resend;
const FROM = process.env['EMAIL_FROM'] ?? 'noreply@pawroute.com';
const c = appConfig.brand.colors;

// ─── Welcome Email ────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  const bookUrl = `${appConfig.product.website}/book`;
  await resend.emails.send({
    from: `${appConfig.product.name} <${FROM}>`,
    to,
    subject: `Welcome to ${appConfig.product.name}, ${name}! 🐾`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="font-size: 48px; margin-bottom: 8px;">🐾</div>
          <h1 style="color: ${c.primary}; font-size: 24px; margin: 0;">${appConfig.product.name}</h1>
          <p style="color: ${c.textSecondary}; margin: 4px 0 0;">${appConfig.product.tagline}</p>
        </div>

        <div style="background: ${c.lavender}; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
          <h2 style="color: ${c.primary}; margin: 0 0 12px; font-size: 20px;">Welcome, ${name}! 👋</h2>
          <p style="color: ${c.textPrimary}; margin: 0 0 16px; line-height: 1.6;">
            Your account has been created successfully. We're so excited to have you and your furry friend join the ${appConfig.product.name} family!
          </p>
          <p style="color: ${c.textSecondary}; margin: 0; font-size: 14px; line-height: 1.6;">
            You can now book grooming appointments, track your pet's history, and receive reminders — all in one place.
          </p>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${bookUrl}"
             style="background: ${c.primary}; color: #fff; text-decoration: none; padding: 14px 36px; border-radius: 12px; font-weight: 600; font-size: 15px; display: inline-block;">
            Book Your First Appointment
          </a>
        </div>

        <p style="color: ${c.textSecondary}; font-size: 12px; text-align: center; margin: 0;">
          ${appConfig.product.name} — ${appConfig.product.tagline}
        </p>
      </div>
    `,
  });
}

// ─── OTP Email ────────────────────────────────────────────────────────────────

export async function sendOtpEmail(to: string, otp: string, name: string): Promise<void> {
  await resend.emails.send({
    from: `${appConfig.product.name} <${FROM}>`,
    to,
    subject: `Your ${appConfig.product.name} verification code: ${otp}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="font-size: 40px; margin-bottom: 8px;">🐾</div>
          <h1 style="color: ${c.primary}; font-size: 24px; margin: 0;">${appConfig.product.name}</h1>
          <p style="color: ${c.textSecondary}; margin: 4px 0 0;">${appConfig.product.tagline}</p>
        </div>
        <div style="background: ${c.lavender}; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <p style="color: ${c.textPrimary}; margin: 0 0 16px;">Hi ${name}, your verification code is:</p>
          <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: ${c.primary}; background: #fff; display: inline-block; padding: 12px 24px; border-radius: 12px; border: 2px solid ${c.lavenderDark};">
            ${otp}
          </div>
          <p style="color: ${c.textSecondary}; font-size: 13px; margin: 16px 0 0;">
            This code expires in ${appConfig.auth.otpExpiryMinutesEmail} minutes.
          </p>
        </div>
        <p style="color: ${c.textSecondary}; font-size: 12px; text-align: center; margin: 0;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

// ─── Password Reset Email ─────────────────────────────────────────────────────

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetUrl: string
): Promise<void> {
  await resend.emails.send({
    from: `${appConfig.product.name} <${FROM}>`,
    to,
    subject: `Reset your ${appConfig.product.name} password`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="font-size: 40px; margin-bottom: 8px;">🐾</div>
          <h1 style="color: ${c.primary}; font-size: 24px; margin: 0;">${appConfig.product.name}</h1>
        </div>
        <p style="color: ${c.textPrimary};">Hi ${name},</p>
        <p style="color: ${c.textSecondary};">We received a request to reset your password. Click the button below to create a new password:</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="background: ${c.accent}; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 15px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: ${c.textSecondary}; font-size: 13px;">
          This link expires in ${appConfig.auth.passwordResetExpiryMinutes} minutes.
          If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

// ─── Booking Confirmation Email ───────────────────────────────────────────────

export async function sendBookingConfirmationEmail(params: {
  to: string;
  name: string;
  bookingRef: string;
  petName: string;
  serviceName: string;
  date: string;
  time: string;
  totalAmount: number;
  personalizedMessage?: string;
}): Promise<void> {
  const { to, name, bookingRef, petName, serviceName, date, time, totalAmount, personalizedMessage } = params;

  await resend.emails.send({
    from: `${appConfig.product.name} <${FROM}>`,
    to,
    subject: `Booking Confirmed! ${bookingRef} — ${petName}'s grooming`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="font-size: 40px; margin-bottom: 8px;">🐾</div>
          <h1 style="color: ${c.primary}; font-size: 24px; margin: 0;">${appConfig.product.name}</h1>
        </div>

        <div style="background: ${c.lavender}; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
          <h2 style="color: ${c.primary}; margin: 0 0 16px; font-size: 18px;">Booking Confirmed!</h2>
          ${personalizedMessage ? `<p style="color: ${c.textSecondary}; margin: 0 0 16px;">${personalizedMessage}</p>` : ''}
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="color: ${c.textSecondary}; padding: 6px 0; font-size: 13px;">Booking Ref</td>
              <td style="color: ${c.textPrimary}; padding: 6px 0; font-weight: 600; text-align: right;">${bookingRef}</td>
            </tr>
            <tr>
              <td style="color: ${c.textSecondary}; padding: 6px 0; font-size: 13px;">Pet</td>
              <td style="color: ${c.textPrimary}; padding: 6px 0; text-align: right;">${petName}</td>
            </tr>
            <tr>
              <td style="color: ${c.textSecondary}; padding: 6px 0; font-size: 13px;">Service</td>
              <td style="color: ${c.textPrimary}; padding: 6px 0; text-align: right;">${serviceName}</td>
            </tr>
            <tr>
              <td style="color: ${c.textSecondary}; padding: 6px 0; font-size: 13px;">Date</td>
              <td style="color: ${c.textPrimary}; padding: 6px 0; text-align: right;">${date}</td>
            </tr>
            <tr>
              <td style="color: ${c.textSecondary}; padding: 6px 0; font-size: 13px;">Time</td>
              <td style="color: ${c.textPrimary}; padding: 6px 0; text-align: right;">${time}</td>
            </tr>
            <tr style="border-top: 1px solid ${c.border};">
              <td style="color: ${c.textPrimary}; padding: 10px 0 4px; font-weight: 600;">Total</td>
              <td style="color: ${c.primary}; padding: 10px 0 4px; font-weight: 700; text-align: right; font-size: 18px;">
                ${appConfig.locale.currencySymbol} ${totalAmount.toFixed(2)}
              </td>
            </tr>
          </table>
        </div>

        <p style="color: ${c.textSecondary}; font-size: 12px; text-align: center; margin: 0;">
          ${appConfig.product.name} — ${appConfig.product.tagline}
        </p>
      </div>
    `,
  });
}

// ─── Appointment Cancellation Email ──────────────────────────────────────────

export async function sendCancellationEmail(params: {
  to: string;
  name: string;
  bookingRef: string;
  petName: string;
  date: string;
  reason?: string;
}): Promise<void> {
  const { to, name, bookingRef, petName, date, reason } = params;

  await resend.emails.send({
    from: `${appConfig.product.name} <${FROM}>`,
    to,
    subject: `Appointment Cancelled — ${bookingRef}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="font-size: 40px; margin-bottom: 8px;">🐾</div>
          <h1 style="color: ${c.primary}; font-size: 24px; margin: 0;">${appConfig.product.name}</h1>
        </div>
        <p style="color: ${c.textPrimary};">Hi ${name},</p>
        <p style="color: ${c.textSecondary};">
          Your appointment for <strong>${petName}</strong> on <strong>${date}</strong> (${bookingRef}) has been cancelled.
          ${reason ? `<br/><br/>Reason: ${reason}` : ''}
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${appConfig.product.website}/book" style="background: ${c.accent}; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 600; display: inline-block;">
            Rebook Now
          </a>
        </div>
      </div>
    `,
  });
}
