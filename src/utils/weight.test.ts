import { describe, it, expect } from 'vitest';
import { lbsToKg, formatWeightWithKg } from './weight';

describe('weight utilities', () => {
  describe('lbsToKg', () => {
    it('converts 0 lbs to 0 kg', () => {
      expect(lbsToKg(0)).toBe(0);
    });

    it('converts 20 lbs to 9.1 kg', () => {
      expect(lbsToKg(20)).toBe(9.1);
    });

    it('converts 100 lbs to 45.4 kg', () => {
      expect(lbsToKg(100)).toBe(45.4);
    });

    it('converts 135 lbs to 61.2 kg', () => {
      expect(lbsToKg(135)).toBe(61.2);
    });

    it('rounds to 1 decimal place', () => {
      expect(lbsToKg(25)).toBe(11.3);
    });
  });

  describe('formatWeightWithKg', () => {
    it('formats weight with both lbs and kg', () => {
      expect(formatWeightWithKg(20)).toBe('20 lbs (9.1 kg)');
    });

    it('formats 0 lbs correctly', () => {
      expect(formatWeightWithKg(0)).toBe('0 lbs (0 kg)');
    });

    it('formats 135 lbs correctly', () => {
      expect(formatWeightWithKg(135)).toBe('135 lbs (61.2 kg)');
    });
  });
});
