import { describe, it, expect, vi, beforeEach } from 'vitest';
import type Stripe from 'stripe';
import { TaxFitter, applyStripeAdjustment } from '../adjuster';

// Mock Stripe SDK
const createMockStripe = () => {
  const mockInvoices = {
    retrieve: vi.fn(),
  };

  const mockInvoiceItems = {
    create: vi.fn(),
  };

  return {
    invoices: mockInvoices,
    invoiceItems: mockInvoiceItems,
  } as unknown as Stripe;
};

describe('TaxFitter', () => {
  let mockStripe: Stripe;
  let taxFitter: TaxFitter;

  beforeEach(() => {
    mockStripe = createMockStripe();
    taxFitter = new TaxFitter(mockStripe);
  });

  describe('applyAdjustment', () => {
    it('should calculate and apply correct adjustment for valid invoice', async () => {
      // Mock invoice with subtotal 290000, expecting target 315000 with 10% tax
      const mockInvoice = {
        id: 'in_test123',
        status: 'draft',
        subtotal: 290000,
        customer: 'cus_test123',
        currency: 'jpy',
      } as Stripe.Invoice;

      const mockInvoiceItem = {
        id: 'ii_test123',
        amount: -3636, // Example adjustment amount
      } as Stripe.InvoiceItem;

      vi.spyOn(mockStripe.invoices, 'retrieve').mockResolvedValue(mockInvoice);
      vi.spyOn(mockStripe.invoiceItems, 'create').mockResolvedValue(mockInvoiceItem);

      const result = await taxFitter.applyAdjustment({
        invoiceId: 'in_test123',
        targetTotal: 315000,
        taxRate: 0.1,
        roundMode: 'floor',
      });

      // Verify invoice was retrieved
      expect(mockStripe.invoices.retrieve).toHaveBeenCalledWith('in_test123');

      // Verify invoice item was created with correct parameters
      expect(mockStripe.invoiceItems.create).toHaveBeenCalledWith(
        expect.objectContaining({
          invoice: 'in_test123',
          customer: 'cus_test123',
          currency: 'jpy',
          description: 'Tax adjustment',
          amount: expect.any(Number),
          metadata: expect.objectContaining({
            tax_fitter_adjustment: 'true',
            original_subtotal: '290000',
            target_total: '315000',
          }),
        })
      );

      // Verify result
      expect(result.invoiceItem).toBe(mockInvoiceItem);
      expect(result.finalTotal).toBe(315000);
    });

    it('should handle expanded customer object on invoice', async () => {
      const mockInvoice = {
        id: 'in_test123',
        status: 'draft',
        subtotal: 1000,
        customer: {
          id: 'cus_test123',
          object: 'customer',
          email: 'test@example.com',
        } as Stripe.Customer,
        currency: 'usd',
      } as Stripe.Invoice;

      const mockInvoiceItem = {
        id: 'ii_test123',
      } as Stripe.InvoiceItem;

      vi.spyOn(mockStripe.invoices, 'retrieve').mockResolvedValue(mockInvoice);
      vi.spyOn(mockStripe.invoiceItems, 'create').mockResolvedValue(mockInvoiceItem);

      await taxFitter.applyAdjustment({
        invoiceId: 'in_test123',
        targetTotal: 1100,
        taxRate: 0.1,
      });

      // Verify customer ID was correctly extracted from expanded object
      expect(mockStripe.invoiceItems.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_test123',
        })
      );
    });

    it('should throw error for invoice with missing customer', async () => {
      const mockInvoice = {
        id: 'in_test123',
        status: 'draft',
        subtotal: 1000,
        customer: null,
        currency: 'usd',
      } as unknown as Stripe.Invoice;

      vi.spyOn(mockStripe.invoices, 'retrieve').mockResolvedValue(mockInvoice);

      await expect(
        taxFitter.applyAdjustment({
          invoiceId: 'in_test123',
          targetTotal: 1100,
          taxRate: 0.1,
        })
      ).rejects.toThrow('Invoice in_test123 has invalid or missing customer');
    });

    it('should use custom description when provided', async () => {
      const mockInvoice = {
        id: 'in_test123',
        status: 'draft',
        subtotal: 1000,
        customer: 'cus_test123',
        currency: 'usd',
      } as Stripe.Invoice;

      const mockInvoiceItem = {
        id: 'ii_test123',
      } as Stripe.InvoiceItem;

      vi.spyOn(mockStripe.invoices, 'retrieve').mockResolvedValue(mockInvoice);
      vi.spyOn(mockStripe.invoiceItems, 'create').mockResolvedValue(mockInvoiceItem);

      await taxFitter.applyAdjustment({
        invoiceId: 'in_test123',
        targetTotal: 1100,
        taxRate: 0.1,
        description: 'Custom discount',
      });

      expect(mockStripe.invoiceItems.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Custom discount',
        })
      );
    });

    it('should include custom metadata when provided', async () => {
      const mockInvoice = {
        id: 'in_test123',
        status: 'draft',
        subtotal: 1000,
        customer: 'cus_test123',
        currency: 'usd',
      } as Stripe.Invoice;

      const mockInvoiceItem = {
        id: 'ii_test123',
      } as Stripe.InvoiceItem;

      vi.spyOn(mockStripe.invoices, 'retrieve').mockResolvedValue(mockInvoice);
      vi.spyOn(mockStripe.invoiceItems, 'create').mockResolvedValue(mockInvoiceItem);

      await taxFitter.applyAdjustment({
        invoiceId: 'in_test123',
        targetTotal: 1100,
        taxRate: 0.1,
        metadata: {
          campaign: 'summer_sale',
          discount_type: 'promotional',
        },
      });

      expect(mockStripe.invoiceItems.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            campaign: 'summer_sale',
            discount_type: 'promotional',
            tax_fitter_adjustment: 'true',
          }),
        })
      );
    });

    it('should throw error for non-draft invoice', async () => {
      const mockInvoice = {
        id: 'in_test123',
        status: 'open',
        subtotal: 1000,
      } as Stripe.Invoice;

      vi.spyOn(mockStripe.invoices, 'retrieve').mockResolvedValue(mockInvoice);

      await expect(
        taxFitter.applyAdjustment({
          invoiceId: 'in_test123',
          targetTotal: 1100,
          taxRate: 0.1,
        })
      ).rejects.toThrow('Invoice in_test123 is not in draft state');
    });

    it('should throw error for finalized invoice', async () => {
      const mockInvoice = {
        id: 'in_test123',
        status: 'paid',
        subtotal: 1000,
      } as Stripe.Invoice;

      vi.spyOn(mockStripe.invoices, 'retrieve').mockResolvedValue(mockInvoice);

      await expect(
        taxFitter.applyAdjustment({
          invoiceId: 'in_test123',
          targetTotal: 1100,
          taxRate: 0.1,
        })
      ).rejects.toThrow('Invoice in_test123 is not in draft state');
    });

    it('should throw error for invoice with zero subtotal', async () => {
      const mockInvoice = {
        id: 'in_test123',
        status: 'draft',
        subtotal: 0,
      } as Stripe.Invoice;

      vi.spyOn(mockStripe.invoices, 'retrieve').mockResolvedValue(mockInvoice);

      await expect(
        taxFitter.applyAdjustment({
          invoiceId: 'in_test123',
          targetTotal: 1100,
          taxRate: 0.1,
        })
      ).rejects.toThrow('Invoice in_test123 has zero subtotal');
    });

    it('should handle different rounding modes', async () => {
      const mockInvoice = {
        id: 'in_test123',
        status: 'draft',
        subtotal: 1000,
        customer: 'cus_test123',
        currency: 'usd',
      } as Stripe.Invoice;

      const mockInvoiceItem = {
        id: 'ii_test123',
      } as Stripe.InvoiceItem;

      vi.spyOn(mockStripe.invoices, 'retrieve').mockResolvedValue(mockInvoice);
      vi.spyOn(mockStripe.invoiceItems, 'create').mockResolvedValue(mockInvoiceItem);

      // Test with ceil rounding
      await taxFitter.applyAdjustment({
        invoiceId: 'in_test123',
        targetTotal: 1100,
        taxRate: 0.1,
        roundMode: 'ceil',
      });

      expect(mockStripe.invoiceItems.create).toHaveBeenCalled();
    });

    it('should calculate correct adjustment amount for discount scenario', async () => {
      const mockInvoice = {
        id: 'in_test123',
        status: 'draft',
        subtotal: 10000, // 100.00 in cents
        customer: 'cus_test123',
        currency: 'usd',
      } as Stripe.Invoice;

      const mockInvoiceItem = {
        id: 'ii_test123',
      } as Stripe.InvoiceItem;

      vi.spyOn(mockStripe.invoices, 'retrieve').mockResolvedValue(mockInvoice);
      vi.spyOn(mockStripe.invoiceItems, 'create').mockResolvedValue(mockInvoiceItem);

      const result = await taxFitter.applyAdjustment({
        invoiceId: 'in_test123',
        targetTotal: 9900, // 99.00 - a discount scenario
        taxRate: 0.1,
        roundMode: 'floor',
      });

      // Verify that invoiceItems.create was called with a negative amount (discount)
      const createCall = vi.mocked(mockStripe.invoiceItems.create).mock.calls[0]?.[0];
      expect(createCall?.amount).toBeLessThan(0); // Should be negative for discount

      expect(result.finalTotal).toBe(9900);
    });

    it('should calculate correct adjustment amount for surcharge scenario', async () => {
      const mockInvoice = {
        id: 'in_test123',
        status: 'draft',
        subtotal: 10000,
        customer: 'cus_test123',
        currency: 'usd',
      } as Stripe.Invoice;

      const mockInvoiceItem = {
        id: 'ii_test123',
      } as Stripe.InvoiceItem;

      vi.spyOn(mockStripe.invoices, 'retrieve').mockResolvedValue(mockInvoice);
      vi.spyOn(mockStripe.invoiceItems, 'create').mockResolvedValue(mockInvoiceItem);

      const result = await taxFitter.applyAdjustment({
        invoiceId: 'in_test123',
        targetTotal: 12100, // Higher than current total - surcharge scenario
        taxRate: 0.1,
        roundMode: 'floor',
      });

      // Verify that invoiceItems.create was called with a positive amount (surcharge)
      const createCall = vi.mocked(mockStripe.invoiceItems.create).mock.calls[0]?.[0];
      expect(createCall?.amount).toBeGreaterThan(0); // Should be positive for surcharge

      expect(result.finalTotal).toBe(12100);
    });
  });
});

describe('applyStripeAdjustment (functional interface)', () => {
  it('should work as a standalone function', async () => {
    const mockStripe = createMockStripe();

    const mockInvoice = {
      id: 'in_test123',
      status: 'draft',
      subtotal: 1000,
      customer: 'cus_test123',
      currency: 'usd',
    } as Stripe.Invoice;

    const mockInvoiceItem = {
      id: 'ii_test123',
    } as Stripe.InvoiceItem;

    vi.spyOn(mockStripe.invoices, 'retrieve').mockResolvedValue(mockInvoice);
    vi.spyOn(mockStripe.invoiceItems, 'create').mockResolvedValue(mockInvoiceItem);

    const result = await applyStripeAdjustment(mockStripe, {
      invoiceId: 'in_test123',
      targetTotal: 1100,
      taxRate: 0.1,
    });

    expect(result.invoiceItem).toBe(mockInvoiceItem);
    expect(mockStripe.invoices.retrieve).toHaveBeenCalledWith('in_test123');
  });
});
