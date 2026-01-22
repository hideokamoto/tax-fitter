import type Stripe from 'stripe';
import type { RoundMode } from '@tax-fitter/core';

/**
 * Options for applying tax adjustments to Stripe invoices
 */
export interface StripeAdjustmentOptions {
  /**
   * The Stripe invoice ID to apply the adjustment to
   */
  invoiceId: string;

  /**
   * Target total amount including tax (in smallest currency unit, e.g., cents)
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

  /**
   * Description for the adjustment line item
   * @default 'Tax adjustment'
   */
  description?: string;

  /**
   * Optional metadata to attach to the invoice item
   */
  metadata?: Record<string, string>;
}

/**
 * Result of applying a tax adjustment to a Stripe invoice
 */
export interface StripeAdjustmentResult {
  /**
   * The created Stripe invoice item
   */
  invoiceItem: Stripe.InvoiceItem;

  /**
   * The calculated discount amount
   */
  discount: number;

  /**
   * The adjusted subtotal
   */
  adjustedSubtotal: number;

  /**
   * The tax amount
   */
  taxAmount: number;

  /**
   * The final total
   */
  finalTotal: number;
}
