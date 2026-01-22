/**
 * Rounding mode for tax calculations
 */
export type RoundMode = 'floor' | 'ceil' | 'round';

/**
 * Parameters for calculating tax adjustments
 */
export interface AdjustmentParams {
  /**
   * Subtotal amount before tax (in smallest currency unit, e.g., cents)
   */
  subtotal: number;

  /**
   * Target total amount including tax (in smallest currency unit)
   */
  targetTotal: number;

  /**
   * Tax rate as a decimal (e.g., 0.1 for 10%)
   */
  taxRate: number;

  /**
   * Rounding mode for tax calculations
   * @default 'floor'
   */
  roundMode?: RoundMode;
}

/**
 * Result of tax adjustment calculation
 */
export interface AdjustmentResult {
  /**
   * Calculated discount amount (in smallest currency unit)
   * Positive values represent discounts, negative values represent surcharges
   */
  discount: number;

  /**
   * Whether the adjustment is valid
   */
  isValid: boolean;

  /**
   * Adjusted subtotal after applying discount
   */
  adjustedSubtotal: number;

  /**
   * Tax amount calculated on adjusted subtotal
   */
  taxAmount: number;

  /**
   * Final total (adjustedSubtotal + taxAmount)
   */
  finalTotal: number;

  /**
   * Error message if adjustment is invalid
   */
  error?: string;
}
