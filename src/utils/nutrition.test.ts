import { describe, it, expect } from 'vitest';
import { proteinQuality } from './nutrition';

describe('proteinQuality', () => {
  it('computes grams of protein per 100 kcal', () => {
    // Chicken breast: ~31 g protein, 165 kcal → 18.8 g / 100 kcal
    expect(proteinQuality(165, 31)?.ratio).toBeCloseTo(18.79, 1);
  });

  it('classifies the tiers per the rating table', () => {
    expect(proteinQuality(100, 20)?.tier).toBe('Excellent'); // 20  (>15)
    expect(proteinQuality(100, 12)?.tier).toBe('Very good'); // 12  (10–15)
    expect(proteinQuality(100, 8)?.tier).toBe('Good'); //  8  (7–10)
    expect(proteinQuality(100, 6)?.tier).toBe('Moderate'); //  6  (5–7)
    expect(proteinQuality(100, 3)?.tier).toBe('Low'); //  3  (<5)
  });

  it('places tier boundaries on the higher tier', () => {
    expect(proteinQuality(100, 15)?.tier).toBe('Very good'); // 15 is not >15
    expect(proteinQuality(100, 10)?.tier).toBe('Very good');
    expect(proteinQuality(100, 7)?.tier).toBe('Good');
    expect(proteinQuality(100, 5)?.tier).toBe('Moderate');
  });

  it('maps each tier to a badge variant', () => {
    expect(proteinQuality(100, 20)?.variant).toBe('success');
    expect(proteinQuality(100, 8)?.variant).toBe('primary');
    expect(proteinQuality(100, 6)?.variant).toBe('warning');
    expect(proteinQuality(100, 3)?.variant).toBe('danger');
  });

  it('returns null when it cannot be scored', () => {
    expect(proteinQuality(NaN, 20)).toBeNull();
    expect(proteinQuality(0, 20)).toBeNull(); // no calories → no ratio
    expect(proteinQuality(100, NaN)).toBeNull();
    expect(proteinQuality(-100, 20)).toBeNull();
  });

  it('scores a zero-protein meal as Low rather than null', () => {
    expect(proteinQuality(100, 0)?.tier).toBe('Low');
  });
});
