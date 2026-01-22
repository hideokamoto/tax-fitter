export const version = '0.0.0';

// Export types
export type {
  StripeAdjustmentOptions,
  StripeAdjustmentResult,
} from './types';

// Export main API
export { TaxFitter, applyStripeAdjustment } from './adjuster';

// Re-export core types for convenience
export type { RoundMode, AdjustmentParams, AdjustmentResult } from '@tax-fitter/core';
