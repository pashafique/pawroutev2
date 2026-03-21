/**
 * @file date.ts
 * @description Date and time formatting utilities.
 * Uses appConfig.locale for defaults (timezone, format strings).
 */

import { format, formatDistanceToNow, isToday, isTomorrow, isPast, addHours } from 'date-fns';
import { appConfig } from '@pawroute/config';

const { locale } = appConfig;

/**
 * Format a date string or Date object for display.
 * @example
 * formatDate('2026-03-19') // → '19 Mar 2026'
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'dd MMM yyyy');
}

/**
 * Format a time string or Date object.
 * @example
 * formatTime('14:30') // → '02:30 PM'
 */
export function formatTime(time: string | Date): string {
  if (typeof time === 'string' && time.match(/^\d{2}:\d{2}$/)) {
    const [hours, minutes] = time.split(':').map(Number) as [number, number];
    const d = new Date();
    d.setHours(hours, minutes, 0, 0);
    return format(d, 'hh:mm aa').toUpperCase();
  }
  const d = typeof time === 'string' ? new Date(time) : time;
  return format(d, 'hh:mm aa').toUpperCase();
}

/**
 * Format a date + time together.
 * @example
 * formatDateTime('2026-03-19T14:30:00Z') // → '19 Mar 2026, 02:30 PM'
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'dd MMM yyyy, hh:mm aa').replace('am', 'AM').replace('pm', 'PM');
}

/**
 * Relative time: "2 hours ago", "in 3 days"
 */
export function formatRelative(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Human-readable appointment date label.
 * @example
 * formatAppointmentDate('2026-03-19') // → 'Today', 'Tomorrow', '19 Mar 2026'
 */
export function formatAppointmentDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  return formatDate(d);
}

/**
 * Check if cancellation is allowed based on appointment date/time and config.
 */
export function isCancellationAllowed(
  slotDate: string,
  slotStartTime: string,
  windowHours: number = appConfig.booking.cancellationWindowHours
): boolean {
  const slotDateTime = new Date(`${slotDate}T${slotStartTime}:00`);
  const cutoff = addHours(new Date(), windowHours);
  return slotDateTime > cutoff;
}

/**
 * Format age from years + months.
 * @example
 * formatPetAge(2, 3) // → '2 yrs 3 mos'
 * formatPetAge(0, 6) // → '6 mos'
 * formatPetAge(1, 0) // → '1 yr'
 */
export function formatPetAge(years: number, months: number): string {
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? 'yr' : 'yrs'}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? 'mo' : 'mos'}`);
  return parts.join(' ') || 'Less than 1 month';
}

/**
 * Convert slot time range to display string.
 * @example
 * formatSlotTime('09:00', '10:00') // → '09:00 AM – 10:00 AM'
 */
export function formatSlotTime(startTime: string, endTime: string): string {
  return `${formatTime(startTime)} – ${formatTime(endTime)}`;
}

/**
 * Check if a date string (YYYY-MM-DD) is in the past.
 */
export function isDatePast(dateStr: string): boolean {
  return isPast(new Date(dateStr + 'T23:59:59'));
}

/**
 * Get available booking dates (today + maxAdvanceDays, excluding today if minAdvanceHours applies).
 */
export function getBookingDateRange(): { min: string; max: string } {
  const now = new Date();
  const min = new Date(now);
  min.setHours(min.getHours() + appConfig.booking.minAdvanceBookingHours);

  const max = new Date(now);
  max.setDate(max.getDate() + appConfig.booking.maxAdvanceBookingDays);

  return {
    min: format(min, 'yyyy-MM-dd'),
    max: format(max, 'yyyy-MM-dd'),
  };
}
