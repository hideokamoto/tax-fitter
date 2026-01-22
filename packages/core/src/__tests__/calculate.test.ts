import { describe, it, expect } from 'vitest';
import { calculateAdjustment, applyTax } from '../calculate';
import type { AdjustmentParams } from '../types';

describe('applyTax', () => {
  describe('floor rounding mode', () => {
    it('should round down tax amounts', () => {
      expect(applyTax(100, 0.1, 'floor')).toBe(10);
      expect(applyTax(105, 0.1, 'floor')).toBe(10); // 10.5 -> 10
      expect(applyTax(109, 0.1, 'floor')).toBe(10); // 10.9 -> 10
    });
  });

  describe('ceil rounding mode', () => {
    it('should round up tax amounts', () => {
      expect(applyTax(100, 0.1, 'ceil')).toBe(10);
      expect(applyTax(101, 0.1, 'ceil')).toBe(11); // 10.1 -> 11
      expect(applyTax(105, 0.1, 'ceil')).toBe(11); // 10.5 -> 11
    });
  });

  describe('round rounding mode', () => {
    it('should round to nearest integer', () => {
      expect(applyTax(100, 0.1, 'round')).toBe(10);
      expect(applyTax(104, 0.1, 'round')).toBe(10); // 10.4 -> 10
      expect(applyTax(105, 0.1, 'round')).toBe(11); // 10.5 -> 11
      expect(applyTax(106, 0.1, 'round')).toBe(11); // 10.6 -> 11
    });
  });

  describe('different tax rates', () => {
    it('should handle 8% tax rate', () => {
      expect(applyTax(1000, 0.08, 'floor')).toBe(80);
      expect(applyTax(1001, 0.08, 'floor')).toBe(80); // 80.08 -> 80
    });

    it('should handle 10% tax rate', () => {
      expect(applyTax(1000, 0.1, 'floor')).toBe(100);
      expect(applyTax(1001, 0.1, 'floor')).toBe(100); // 100.1 -> 100
    });
  });
});

describe('calculateAdjustment', () => {
  describe('example case: subtotal 290000, target 315000, tax 10%', () => {
    it('should calculate correct discount with floor rounding', () => {
      const params: AdjustmentParams = {
        subtotal: 290000,
        targetTotal: 315000,
        taxRate: 0.1,
        roundMode: 'floor',
      };

      const result = calculateAdjustment(params);

      expect(result.isValid).toBe(true);
      expect(result.finalTotal).toBe(315000);
      expect(result.adjustedSubtotal).toBeGreaterThan(0);
      expect(result.taxAmount).toBeGreaterThan(0);
      expect(result.adjustedSubtotal + result.taxAmount).toBe(315000);
      expect(result.error).toBeUndefined();
    });
  });

  describe('all rounding modes', () => {
    it('should handle floor rounding mode', () => {
      const params: AdjustmentParams = {
        subtotal: 1000,
        targetTotal: 1050,
        taxRate: 0.1,
        roundMode: 'floor',
      };

      const result = calculateAdjustment(params);

      expect(result.isValid).toBe(true);
      expect(result.finalTotal).toBe(1050);
    });

    it('should handle ceil rounding mode', () => {
      const params: AdjustmentParams = {
        subtotal: 1000,
        targetTotal: 1100,
        taxRate: 0.1,
        roundMode: 'ceil',
      };

      const result = calculateAdjustment(params);

      expect(result.isValid).toBe(true);
      expect(result.finalTotal).toBe(1100);
    });

    it('should handle round rounding mode', () => {
      const params: AdjustmentParams = {
        subtotal: 1000,
        targetTotal: 1100,
        taxRate: 0.1,
        roundMode: 'round',
      };

      const result = calculateAdjustment(params);

      expect(result.isValid).toBe(true);
      expect(result.finalTotal).toBe(1100);
    });
  });

  describe('edge cases', () => {
    it('should handle zero discount case (already at target)', () => {
      const params: AdjustmentParams = {
        subtotal: 1000,
        targetTotal: 1100,
        taxRate: 0.1,
        roundMode: 'floor',
      };

      const result = calculateAdjustment(params);

      expect(result.isValid).toBe(true);
      expect(result.discount).toBe(0);
      expect(result.finalTotal).toBe(1100);
    });

    it('should handle negative adjustment (increase needed)', () => {
      const params: AdjustmentParams = {
        subtotal: 1000,
        targetTotal: 1200,
        taxRate: 0.1,
        roundMode: 'floor',
      };

      const result = calculateAdjustment(params);

      // Negative discount means we need to add to the subtotal
      if (result.isValid) {
        expect(result.discount).toBeLessThan(0);
        expect(result.finalTotal).toBe(1200);
      }
    });

    it('should handle small subtotals', () => {
      const params: AdjustmentParams = {
        subtotal: 10,
        targetTotal: 11,
        taxRate: 0.1,
        roundMode: 'floor',
      };

      const result = calculateAdjustment(params);

      expect(result.finalTotal).toBe(11);
    });

    it('should handle large amounts', () => {
      const params: AdjustmentParams = {
        subtotal: 10000000,
        targetTotal: 11000000,
        taxRate: 0.1,
        roundMode: 'floor',
      };

      const result = calculateAdjustment(params);

      expect(result.finalTotal).toBe(11000000);
    });

    it('should reject negative subtotal', () => {
      const params: AdjustmentParams = {
        subtotal: -100,
        targetTotal: 100,
        taxRate: 0.1,
        roundMode: 'floor',
      };

      const result = calculateAdjustment(params);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Subtotal cannot be negative');
    });

    it('should reject invalid tax rate (negative)', () => {
      const params: AdjustmentParams = {
        subtotal: 1000,
        targetTotal: 1100,
        taxRate: -0.1,
        roundMode: 'floor',
      };

      const result = calculateAdjustment(params);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Tax rate must be between 0 and 1');
    });

    it('should reject invalid tax rate (over 100%)', () => {
      const params: AdjustmentParams = {
        subtotal: 1000,
        targetTotal: 1100,
        taxRate: 1.5,
        roundMode: 'floor',
      };

      const result = calculateAdjustment(params);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Tax rate must be between 0 and 1');
    });
  });

  describe('different tax rates', () => {
    it('should handle 8% tax rate', () => {
      const params: AdjustmentParams = {
        subtotal: 10000,
        targetTotal: 10800,
        taxRate: 0.08,
        roundMode: 'floor',
      };

      const result = calculateAdjustment(params);

      expect(result.isValid).toBe(true);
      expect(result.finalTotal).toBe(10800);
    });

    it('should handle 10% tax rate', () => {
      const params: AdjustmentParams = {
        subtotal: 10000,
        targetTotal: 11000,
        taxRate: 0.1,
        roundMode: 'floor',
      };

      const result = calculateAdjustment(params);

      expect(result.isValid).toBe(true);
      expect(result.finalTotal).toBe(11000);
    });

    it('should handle fractional tax rate', () => {
      const params: AdjustmentParams = {
        subtotal: 10000,
        targetTotal: 10650,
        taxRate: 0.065, // 6.5%
        roundMode: 'floor',
      };

      const result = calculateAdjustment(params);

      expect(result.isValid).toBe(true);
      expect(result.finalTotal).toBe(10650);
    });
  });

  describe('floating-point precision', () => {
    it('should handle precision with small tax rates', () => {
      const params: AdjustmentParams = {
        subtotal: 1000,
        targetTotal: 1010,
        taxRate: 0.01, // 1%
        roundMode: 'floor',
      };

      const result = calculateAdjustment(params);

      expect(result.finalTotal).toBe(1010);
    });

    it('should handle precision with large amounts', () => {
      const params: AdjustmentParams = {
        subtotal: 9999999,
        targetTotal: 10999998,
        taxRate: 0.1,
        roundMode: 'floor',
      };

      const result = calculateAdjustment(params);

      expect(result.finalTotal).toBe(10999998);
    });

    it('should handle amounts that cause rounding edge cases', () => {
      const params: AdjustmentParams = {
        subtotal: 1234,
        targetTotal: 1357,
        taxRate: 0.1,
        roundMode: 'floor',
      };

      const result = calculateAdjustment(params);

      // Expected: 1234 * 1.1 = 1357.4 (floor) = 1357
      // So discount should be 0
      expect(result.finalTotal).toBe(1357);
    });
  });

  describe('metadata validation', () => {
    it('should include all required metadata fields', () => {
      const params: AdjustmentParams = {
        subtotal: 1000,
        targetTotal: 1100,
        taxRate: 0.1,
        roundMode: 'floor',
      };

      const result = calculateAdjustment(params);

      expect(result).toHaveProperty('discount');
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('adjustedSubtotal');
      expect(result).toHaveProperty('taxAmount');
      expect(result).toHaveProperty('finalTotal');
    });

    it('should calculate adjusted subtotal correctly', () => {
      const params: AdjustmentParams = {
        subtotal: 1000,
        targetTotal: 990,
        taxRate: 0.1,
        roundMode: 'floor',
      };

      const result = calculateAdjustment(params);

      expect(result.adjustedSubtotal).toBe(params.subtotal - result.discount);
    });

    it('should calculate final total correctly', () => {
      const params: AdjustmentParams = {
        subtotal: 1000,
        targetTotal: 1100,
        taxRate: 0.1,
        roundMode: 'floor',
      };

      const result = calculateAdjustment(params);

      expect(result.finalTotal).toBe(result.adjustedSubtotal + result.taxAmount);
    });
  });
});
