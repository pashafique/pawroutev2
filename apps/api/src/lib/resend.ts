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
  const firstName = name.split(' ')[0];
  await resend.emails.send({
    from: `${appConfig.product.name} <${FROM}>`,
    to,
    subject: `Welcome to ${appConfig.product.name}, ${firstName}! 🐾`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Welcome to ${appConfig.product.name}</title></head>
<body style="margin:0;padding:0;background:#f4f0fb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f0fb;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,${c.primary} 0%,#7c3aed 100%);border-radius:20px 20px 0 0;padding:40px 40px 32px;text-align:center;">
          <div style="font-size:52px;margin-bottom:12px;">🐾</div>
          <h1 style="color:#ffffff;font-size:28px;font-weight:800;margin:0 0 6px;letter-spacing:-0.5px;">${appConfig.product.name}</h1>
          <p style="color:rgba(255,255,255,0.8);font-size:14px;margin:0;">${appConfig.product.tagline}</p>
        </td></tr>

        <!-- Hero Body -->
        <tr><td style="background:#ffffff;padding:40px 40px 32px;">
          <h2 style="color:#1a1a2e;font-size:24px;font-weight:700;margin:0 0 8px;">Welcome aboard, ${firstName}! 👋</h2>
          <p style="color:#555577;font-size:15px;line-height:1.7;margin:0 0 28px;">
            Your account has been created successfully. We're thrilled to have you and your furry friend join the <strong>${appConfig.product.name}</strong> family — where every pet gets the royal treatment! 🌟
          </p>

          <!-- Feature cards -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
            <tr>
              <td width="33%" style="padding:0 6px 0 0;vertical-align:top;">
                <div style="background:#f4f0fb;border-radius:14px;padding:18px 14px;text-align:center;">
                  <div style="font-size:28px;margin-bottom:8px;">📅</div>
                  <p style="color:#1a1a2e;font-size:13px;font-weight:600;margin:0 0 4px;">Easy Booking</p>
                  <p style="color:#888;font-size:12px;margin:0;line-height:1.5;">Book grooming in seconds</p>
                </div>
              </td>
              <td width="33%" style="padding:0 3px;vertical-align:top;">
                <div style="background:#f4f0fb;border-radius:14px;padding:18px 14px;text-align:center;">
                  <div style="font-size:28px;margin-bottom:8px;">🐶</div>
                  <p style="color:#1a1a2e;font-size:13px;font-weight:600;margin:0 0 4px;">Pet Profiles</p>
                  <p style="color:#888;font-size:12px;margin:0;line-height:1.5;">Track your pet's history</p>
                </div>
              </td>
              <td width="33%" style="padding:0 0 0 6px;vertical-align:top;">
                <div style="background:#f4f0fb;border-radius:14px;padding:18px 14px;text-align:center;">
                  <div style="font-size:28px;margin-bottom:8px;">🔔</div>
                  <p style="color:#1a1a2e;font-size:13px;font-weight:600;margin:0 0 4px;">Reminders</p>
                  <p style="color:#888;font-size:12px;margin:0;line-height:1.5;">Never miss an appointment</p>
                </div>
              </td>
            </tr>
          </table>

          <!-- CTA Button -->
          <div style="text-align:center;margin-bottom:8px;">
            <a href="${bookUrl}" style="display:inline-block;background:linear-gradient(135deg,${c.primary} 0%,#7c3aed 100%);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 44px;border-radius:14px;letter-spacing:0.2px;">
              Book First Appointment →
            </a>
          </div>
          <p style="color:#aaa;font-size:12px;text-align:center;margin:12px 0 0;">Takes less than 2 minutes</p>
        </td></tr>

        <!-- Divider strip -->
        <tr><td style="background:linear-gradient(135deg,${c.primary} 0%,#7c3aed 100%);height:4px;"></td></tr>

        <!-- Footer -->
        <tr><td style="background:#faf8ff;border-radius:0 0 20px 20px;padding:24px 40px;text-align:center;">
          <p style="color:#999;font-size:12px;margin:0 0 6px;">
            You're receiving this because you registered at <strong>${appConfig.product.name}</strong>.
          </p>
          <p style="color:#bbb;font-size:11px;margin:0;">&copy; ${new Date().getFullYear()} ${appConfig.product.name}. All rights reserved.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
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
