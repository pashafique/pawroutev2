/**
 * @file size-classifier.ts
 * @description Pet size classification based on weight.
 * Uses appConfig.petSizes as the single source of truth for weight thresholds.
 * Shared across API (booking validation) and frontends (price display).
 */

import { appConfig } from '@pawroute/config';
import type { PetSizeKey } from '@pawroute/config';

/**
 * Classify a pet's size category from its weight in kilograms.
 * Weight thresholds are defined in appConfig.petSizes.
 *
 * @example
 * classifyPetSize(3.5)  // → 'SMALL'
 * classifyPetSize(12)   // → 'MEDIUM'
 * classifyPetSize(20)   // → 'LARGE'
 * classifyPetSize(40)   // → 'XL'
 */
export function classifyPetSize(weightKg: number): PetSizeKey {
  const size = appConfig.petSizes.find(
    (s) => weightKg >= s.min && weightKg <= s.max
  );
  // Default to XL if weight exceeds all ranges (shouldn't happen with max: 9999)
  return (size?.key ?? 'XL') as PetSizeKey;
}

/**
 * Get the full size definition for a given size key.
 */
export function getPetSizeInfo(key: PetSizeKey) {
  return appConfig.petSizes.find((s) => s.key === key) ?? appConfig.petSizes[appConfig.petSizes.length - 1]!;
}

/**
 * Get all size options for UI dropdowns.
 */
export function getPetSizeOptions() {
  return appConfig.petSizes.map((s) => ({
    value: s.key,
    label: s.label,
    labelShort: s.labelShort,
    range: `${s.min}–${s.max === 9999 ? '30+' : s.max} kg`,
  }));
}
