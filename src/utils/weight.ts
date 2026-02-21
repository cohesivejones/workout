/**
 * Weight conversion utilities
 */

const LBS_TO_KG_FACTOR = 0.453592;

/**
 * Convert pounds to kilograms
 * @param lbs - Weight in pounds
 * @returns Weight in kilograms, rounded to 1 decimal place
 */
export function lbsToKg(lbs: number): number {
  return Number((lbs * LBS_TO_KG_FACTOR).toFixed(1));
}

/**
 * Format weight display showing both lbs and kg
 * @param lbs - Weight in pounds
 * @returns Formatted string like "20 lbs (9.1 kg)"
 */
export function formatWeightWithKg(lbs: number): string {
  return `${lbs} lbs (${lbsToKg(lbs)} kg)`;
}
