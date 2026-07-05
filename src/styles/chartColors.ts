/**
 * Data-visualization palette — the JS mirror of the CSS design tokens
 * (src/styles/tokens.css). Charts (Recharts) and inline SVG can't read CSS
 * custom properties directly, so the brand hexes live here as the single
 * source of truth for anything drawn in JS: chart series, PR markers, and
 * the pain/sleep severity ramps used on the calendar and lists.
 *
 * Keep these values in sync with tokens.css.
 */

export const chartColors = {
  // Brand
  primary: '#0e6e5e',
  accent: '#ff6a45',

  // Semantic
  success: '#2e9e6b',
  warning: '#e0a13b',
  danger: '#db4b3f',

  // Neutrals for chart chrome
  grid: '#dbe3de',
  axis: '#5b6b64',
  muted: '#8a968f',
} as const;

/**
 * Personal-record marker colors for the progression charts.
 * Distinct hues so a glance separates a rep PR from a weight PR.
 */
export const prColors = {
  none: chartColors.primary,
  reps: chartColors.warning, // amber
  weight: chartColors.success, // green
  both: chartColors.accent, // coral — the strongest signal
} as const;

/**
 * Five-stop severity ramp, best -> worst, harmonized with the token palette
 * (endpoints are the success/danger tokens, midpoint is the warning token).
 */
const SEVERITY_RAMP = [
  '#2e9e6b', // best  (success)
  '#7aa93f', // good  (yellow-green)
  '#e0a13b', // fair  (warning amber)
  '#e0743b', // poor  (orange)
  '#db4b3f', // worst (danger)
] as const;

/** Pain score 0 (none) -> 10 (extreme). Higher = worse. */
export function getPainSeverityColor(score: number): string {
  if (score <= 0) return SEVERITY_RAMP[0];
  if (score <= 2) return SEVERITY_RAMP[1];
  if (score <= 5) return SEVERITY_RAMP[2];
  if (score <= 7) return SEVERITY_RAMP[3];
  return SEVERITY_RAMP[4];
}

/** Sleep score 5 (excellent) -> 1 (very poor). Higher = better. */
export function getSleepSeverityColor(score: number): string {
  switch (score) {
    case 5:
      return SEVERITY_RAMP[0];
    case 4:
      return SEVERITY_RAMP[1];
    case 3:
      return SEVERITY_RAMP[2];
    case 2:
      return SEVERITY_RAMP[3];
    case 1:
      return SEVERITY_RAMP[4];
    default:
      return SEVERITY_RAMP[2];
  }
}
