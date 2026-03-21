/**
 * @file booking-ref.ts
 * @description Booking reference number generator.
 * Format: {PREFIX}-{YYYYMMDD}-{XXXX} e.g. PAW-20260319-A3K7
 * Prefix and length defined in appConfig.booking.
 */

import { appConfig } from '@pawroute/config';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // omit 0/O/1/I to avoid confusion

/**
 * Generate a booking reference code.
 * NOTE: Collision must be checked against the database.
 *
 * @example
 * generateBookingRef()  // → 'PAW-20260319-A3K7'
 */
export function generateBookingRef(date?: Date): string {
  const d = date ?? new Date();
  const prefix = appConfig.booking.bookingRefPrefix;
  const length = appConfig.booking.bookingRefLength;

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const datePart = `${yyyy}${mm}${dd}`;

  const randomPart = Array.from(
    { length },
    () => CHARS[Math.floor(Math.random() * CHARS.length)]!
  ).join('');

  return `${prefix}-${datePart}-${randomPart}`;
}

/**
 * Parse a booking reference to extract its components.
 */
export function parseBookingRef(ref: string): {
  prefix: string;
  date: string;
  random: string;
} | null {
  const parts = ref.split('-');
  if (parts.length !== 3) return null;
  const [prefix, date, random] = parts as [string, string, string];
  if (!prefix || !date || !random) return null;
  if (date.length !== 8) return null;
  return { prefix, date, random };
}

/**
 * Validate booking reference format.
 */
export function isValidBookingRef(ref: string): boolean {
  const prefix = appConfig.booking.bookingRefPrefix;
  const length = appConfig.booking.bookingRefLength;
  const pattern = new RegExp(`^${prefix}-\\d{8}-[A-Z0-9]{${length}}$`);
  return pattern.test(ref);
}
