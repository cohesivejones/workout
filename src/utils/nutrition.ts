import type { BadgeVariant } from '../components/ui/Badge';

export type ProteinQualityTier = 'Excellent' | 'Very good' | 'Good' | 'Moderate' | 'Low';

export interface ProteinQuality {
  /** Grams of protein per 100 kcal. */
  ratio: number;
  tier: ProteinQualityTier;
  /** Badge tone for the tier. */
  variant: BadgeVariant;
}

/**
 * Rates a meal for a strength/weights program by how much protein it delivers
 * per 100 kcal: protein (g) / calories * 100. Higher is leaner/more useful.
 *
 *   > 15 g  Excellent
 *  10–15 g  Very good
 *   7–10 g  Good
 *    5–7 g  Moderate
 *    < 5 g  Low
 *
 * Returns null when there aren't enough numbers to score (no/zero calories).
 */
export function proteinQuality(calories: number, protein: number): ProteinQuality | null {
  if (!Number.isFinite(calories) || !Number.isFinite(protein) || calories <= 0 || protein < 0) {
    return null;
  }

  const ratio = (protein / calories) * 100;

  if (ratio > 15) return { ratio, tier: 'Excellent', variant: 'success' };
  if (ratio >= 10) return { ratio, tier: 'Very good', variant: 'success' };
  if (ratio >= 7) return { ratio, tier: 'Good', variant: 'primary' };
  if (ratio >= 5) return { ratio, tier: 'Moderate', variant: 'warning' };
  return { ratio, tier: 'Low', variant: 'danger' };
}
