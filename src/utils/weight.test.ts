/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { lbsToKg, kgToLbs, formatWeightWithKg } from './weight';

describe('weight utilities', () => {
  describe('lbsToKg', () => {
    it('converts pounds to kilograms correctly', () => {
      expect(lbsToKg(100)).toBe(45.4);
      expect(lbsToKg(220)).toBe(99.8);
      expect(lbsToKg(50)).toBe(22.7);
    });

    it('rounds to 1 decimal place', () => {
      expect(lbsToKg(10)).toBe(4.5);
      expect(lbsToKg(1)).toBe(0.5);
    });

    it('handles zero', () => {
      expect(lbsToKg(0)).toBe(0);
    });

    it('handles decimal input', () => {
      expect(lbsToKg(22.5)).toBe(10.2);
      expect(lbsToKg(45.5)).toBe(20.6);
    });
  });

  describe('kgToLbs', () => {
    it('converts kilograms to pounds correctly', () => {
      expect(kgToLbs(45.4)).toBe(100.1);
      expect(kgToLbs(100)).toBe(220.5);
      expect(kgToLbs(22.7)).toBe(50);
    });

    it('rounds to 1 decimal place', () => {
      expect(kgToLbs(10)).toBe(22);
      expect(kgToLbs(1)).toBe(2.2);
    });

    it('handles zero', () => {
      expect(kgToLbs(0)).toBe(0);
    });

    it('handles decimal input', () => {
      expect(kgToLbs(10.5)).toBe(23.1);
      expect(kgToLbs(20.5)).toBe(45.2);
    });
  });

  describe('conversion round-trip accuracy', () => {
    it('maintains reasonable accuracy when converting back and forth', () => {
      const originalLbs = 100;
      const kg = lbsToKg(originalLbs);
      const backToLbs = kgToLbs(kg);

      // Due to rounding, we expect it to be close but not exact
      expect(Math.abs(backToLbs - originalLbs)).toBeLessThan(0.5);
    });

    it('handles common gym weights', () => {
      // Common plate weights
      expect(lbsToKg(45)).toBe(20.4); // Standard barbell
      expect(lbsToKg(25)).toBe(11.3); // 25lb plate
      expect(lbsToKg(10)).toBe(4.5); // 10lb plate
      expect(lbsToKg(5)).toBe(2.3); // 5lb plate
      expect(lbsToKg(2.5)).toBe(1.1); // 2.5lb plate
    });
  });

  describe('formatWeightWithKg', () => {
    it('formats weight with both units', () => {
      expect(formatWeightWithKg(100)).toBe('100 lbs (45.4 kg)');
      expect(formatWeightWithKg(50)).toBe('50 lbs (22.7 kg)');
    });

    it('handles decimal pounds', () => {
      expect(formatWeightWithKg(22.5)).toBe('22.5 lbs (10.2 kg)');
    });

    it('handles zero', () => {
      expect(formatWeightWithKg(0)).toBe('0 lbs (0 kg)');
    });
  });
});
