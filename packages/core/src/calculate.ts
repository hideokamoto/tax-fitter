import type { AdjustmentParams, AdjustmentResult, RoundMode } from './types';

/**
 * Apply tax to an amount with the specified rounding mode
 * @param amount - The base amount (before tax)
 * @param taxRate - Tax rate as decimal (e.g., 0.1 for 10%)
 * @param roundMode - Rounding mode to use
 * @returns The calculated tax amount
 */
export function applyTax(
  amount: number,
  taxRate: number,
  roundMode: RoundMode = 'floor'
): number {
  const taxAmount = amount * taxRate;

  switch (roundMode) {
    case 'floor':
      return Math.floor(taxAmount);
    case 'ceil':
      return Math.ceil(taxAmount);
    case 'round':
      return Math.round(taxAmount);
    default:
      return Math.floor(taxAmount);
  }
}

/**
 * Calculate the discount needed to reach a target total including tax
 *
 * This function uses an iterative algorithm:
 * 1. Start with an initial estimate based on the difference between current and target total
 * 2. Refine the estimate by testing with 1-yen increments
 * 3. Find the exact discount that makes the final total match the target
 *
 * @param params - Adjustment parameters
 * @returns Adjustment result with discount amount and validation metadata
 */
export function calculateAdjustment(params: AdjustmentParams): AdjustmentResult {
  const { subtotal, targetTotal, taxRate, roundMode = 'floor' } = params;

  // Validate inputs
  if (subtotal < 0) {
    return {
      discount: 0,
      isValid: false,
      adjustedSubtotal: subtotal,
      taxAmount: 0,
      finalTotal: subtotal,
      error: 'Subtotal cannot be negative',
    };
  }

  if (taxRate < 0 || taxRate > 1) {
    return {
      discount: 0,
      isValid: false,
      adjustedSubtotal: subtotal,
      taxAmount: 0,
      finalTotal: subtotal,
      error: 'Tax rate must be between 0 and 1',
    };
  }

  // Calculate current total with tax
  const currentTax = applyTax(subtotal, taxRate, roundMode);
  const currentTotal = subtotal + currentTax;

  // If already at target, no adjustment needed
  if (currentTotal === targetTotal) {
    return {
      discount: 0,
      isValid: true,
      adjustedSubtotal: subtotal,
      taxAmount: currentTax,
      finalTotal: currentTotal,
    };
  }

  // Initial estimate: approximate discount based on difference
  // We need to account for tax on the discount as well
  const totalDifference = currentTotal - targetTotal;
  const initialEstimate = Math.floor(totalDifference / (1 + taxRate));

  // Iterative refinement: search for exact discount with 1-yen increments
  // We'll search in a range around the initial estimate
  const searchRadius = Math.abs(Math.ceil(totalDifference)) + 100; // Add buffer for edge cases

  for (let i = -searchRadius; i <= searchRadius; i++) {
    const testDiscount = initialEstimate + i;
    const testSubtotal = subtotal - testDiscount;

    // Skip invalid subtotals
    if (testSubtotal < 0) continue;

    const testTax = applyTax(testSubtotal, taxRate, roundMode);
    const testTotal = testSubtotal + testTax;

    if (testTotal === targetTotal) {
      return {
        discount: testDiscount,
        isValid: true,
        adjustedSubtotal: testSubtotal,
        taxAmount: testTax,
        finalTotal: testTotal,
      };
    }
  }

  // If no exact match found, find the closest match
  let bestDiscount = 0;
  let bestDifference = Math.abs(currentTotal - targetTotal);

  for (let i = -searchRadius; i <= searchRadius; i++) {
    const testDiscount = initialEstimate + i;
    const testSubtotal = subtotal - testDiscount;

    if (testSubtotal < 0) continue;

    const testTax = applyTax(testSubtotal, taxRate, roundMode);
    const testTotal = testSubtotal + testTax;
    const difference = Math.abs(testTotal - targetTotal);

    if (difference < bestDifference) {
      bestDifference = difference;
      bestDiscount = testDiscount;
    }
  }

  const adjustedSubtotal = subtotal - bestDiscount;
  const taxAmount = applyTax(adjustedSubtotal, taxRate, roundMode);
  const finalTotal = adjustedSubtotal + taxAmount;

  return {
    discount: bestDiscount,
    isValid: finalTotal === targetTotal,
    adjustedSubtotal,
    taxAmount,
    finalTotal,
    error: finalTotal !== targetTotal
      ? `Could not find exact adjustment. Closest total: ${finalTotal}, target: ${targetTotal}`
      : undefined,
  };
}
