import type Stripe from 'stripe';
import { calculateAdjustment } from '@tax-fitter/core';
import type { StripeAdjustmentOptions, StripeAdjustmentResult } from './types';

/**
 * TaxFitter class for adjusting Stripe invoices to match target totals
 */
export class TaxFitter {
  constructor(private stripe: Stripe) {}

  /**
   * Apply a tax adjustment to a Stripe invoice
   *
   * This function:
   * 1. Retrieves the invoice from Stripe
   * 2. Validates the invoice is in draft state
   * 3. Extracts the subtotal from the invoice
   * 4. Calculates the required adjustment using @tax-fitter/core
   * 5. Creates an invoice item with the calculated discount
   *
   * @param options - Adjustment options
   * @returns The result including the created invoice item
   * @throws Error if the invoice is not in draft state or if adjustment calculation fails
   */
  async applyAdjustment(
    options: StripeAdjustmentOptions
  ): Promise<StripeAdjustmentResult> {
    const {
      invoiceId,
      targetTotal,
      taxRate,
      roundMode = 'floor',
      description = 'Tax adjustment',
      metadata,
    } = options;

    // Retrieve the invoice
    const invoice = await this.stripe.invoices.retrieve(invoiceId);

    // Validate invoice is in draft state
    if (invoice.status !== 'draft') {
      throw new Error(
        `Invoice ${invoiceId} is not in draft state. Current status: ${invoice.status}. ` +
          'Tax adjustments can only be applied to draft invoices.'
      );
    }

    // Extract subtotal (in smallest currency unit)
    // Stripe amounts are already in cents/smallest unit
    const subtotal = invoice.subtotal ?? 0;

    if (subtotal === 0) {
      throw new Error(
        `Invoice ${invoiceId} has zero subtotal. Cannot calculate adjustment.`
      );
    }

    // Calculate the required adjustment
    const adjustmentResult = calculateAdjustment({
      subtotal,
      targetTotal,
      taxRate,
      roundMode,
    });

    if (!adjustmentResult.isValid) {
      throw new Error(
        `Failed to calculate valid adjustment: ${adjustmentResult.error ?? 'Unknown error'}`
      );
    }

    // Create invoice item with the calculated discount
    // Negative amount for discount, positive for surcharge
    const invoiceItem = await this.stripe.invoiceItems.create({
      invoice: invoiceId,
      customer: invoice.customer as string,
      amount: -adjustmentResult.discount, // Negative for discount
      currency: invoice.currency,
      description,
      metadata: {
        ...metadata,
        tax_fitter_adjustment: 'true',
        original_subtotal: subtotal.toString(),
        target_total: targetTotal.toString(),
        calculated_discount: adjustmentResult.discount.toString(),
      },
    });

    return {
      invoiceItem,
      discount: adjustmentResult.discount,
      adjustedSubtotal: adjustmentResult.adjustedSubtotal,
      taxAmount: adjustmentResult.taxAmount,
      finalTotal: adjustmentResult.finalTotal,
    };
  }
}

/**
 * Apply a tax adjustment to a Stripe invoice (functional interface)
 *
 * This is a convenience function that creates a TaxFitter instance and calls applyAdjustment.
 *
 * @param stripe - Stripe instance
 * @param options - Adjustment options
 * @returns The result including the created invoice item
 */
export async function applyStripeAdjustment(
  stripe: Stripe,
  options: StripeAdjustmentOptions
): Promise<StripeAdjustmentResult> {
  const fitter = new TaxFitter(stripe);
  return fitter.applyAdjustment(options);
}
