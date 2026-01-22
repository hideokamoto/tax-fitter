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

  // Helper function to calculate total for a given discount
  const calculateTotal = (discount: number): number => {
    const adjustedSub = subtotal - discount;
    if (adjustedSub < 0) return -1; // Invalid
    const tax = applyTax(adjustedSub, taxRate, roundMode);
    return adjustedSub + tax;
  };

  // Binary search for the exact discount
  // Search range: allow negative discounts (surcharges) up to the full subtotal
  let minDiscount = -subtotal; // Maximum surcharge (doubles the subtotal)
  let maxDiscount = subtotal; // Maximum discount (reduces subtotal to 0)

  let bestDiscount = 0;
  let bestDifference = Math.abs(currentTotal - targetTotal);

  // Binary search to narrow down the range
  while (maxDiscount - minDiscount > 1) {
    const midDiscount = Math.floor((minDiscount + maxDiscount) / 2);
    const midTotal = calculateTotal(midDiscount);

    if (midTotal === -1) {
      // Invalid subtotal, adjust range
      maxDiscount = midDiscount - 1;
      continue;
    }

    if (midTotal === targetTotal) {
      // Exact match found
      const adjustedSubtotal = subtotal - midDiscount;
      const taxAmount = applyTax(adjustedSubtotal, taxRate, roundMode);
      return {
        discount: midDiscount,
        isValid: true,
        adjustedSubtotal,
        taxAmount,
        finalTotal: targetTotal,
      };
    }

    // Track best match so far
    const difference = Math.abs(midTotal - targetTotal);
    if (difference < bestDifference) {
      bestDifference = difference;
      bestDiscount = midDiscount;
    }

    // Since total decreases as discount increases (monotonic)
    if (midTotal > targetTotal) {
      // Need more discount
      minDiscount = midDiscount + 1;
    } else {
      // Need less discount
      maxDiscount = midDiscount - 1;
    }
  }

  // Check remaining candidates in the final range
  for (let discount = minDiscount; discount <= maxDiscount; discount++) {
    const total = calculateTotal(discount);
    if (total === -1) continue;

    if (total === targetTotal) {
      const adjustedSubtotal = subtotal - discount;
      const taxAmount = applyTax(adjustedSubtotal, taxRate, roundMode);
      return {
        discount,
        isValid: true,
        adjustedSubtotal,
        taxAmount,
        finalTotal: targetTotal,
      };
    }

    const difference = Math.abs(total - targetTotal);
    if (difference < bestDifference) {
      bestDifference = difference;
      bestDiscount = discount;
    }
  }

  // Return best match found
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
