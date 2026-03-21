/**
 * @file currency.ts
 * @description Currency formatting utilities.
 * All formatting uses appConfig.locale settings as defaults.
 */

import { appConfig } from '@pawroute/config';

const { locale } = appConfig;

/**
 * Format a number as currency string.
 * @example
 * formatCurrency(150)      // → 'AED 150.00'
 * formatCurrency(150, 'USD') // → 'USD 150.00'
 */
export function formatCurrency(
  amount: number,
  currency: string = locale.defaultCurrency,
  options?: { showSymbolOnly?: boolean }
): string {
  const formatted = amount.toFixed(locale.decimalPlaces);
  const symbol = options?.showSymbolOnly ? currency : currency;

  return locale.currencyPosition === 'before'
    ? `${symbol} ${formatted}`
    : `${formatted} ${symbol}`;
}

/**
 * Parse a currency string back to number.
 */
export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^0-9.]/g, '');
  return parseFloat(cleaned) || 0;
}

/**
 * Calculate discount amount from coupon.
 */
export function calculateDiscount(
  total: number,
  discountType: 'FLAT' | 'PERCENTAGE',
  discountValue: number
): number {
  if (discountType === 'FLAT') {
    return Math.min(discountValue, total);
  }
  return Math.round((total * discountValue) / 100 * 100) / 100;
}

/**
 * Calculate VAT amount.
 */
export function calculateVat(amount: number, vatRate: number): number {
  return Math.round((amount * vatRate) / 100 * 100) / 100;
}

/**
 * Format percentage.
 */
export function formatPercent(value: number, decimals = 1): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}
