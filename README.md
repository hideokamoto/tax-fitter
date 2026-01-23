# tax-fitter

A TypeScript library for calculating precise tax adjustments to reach target totals. Solves the "reverse tax calculation" problem where you need to determine the exact discount or surcharge required to achieve a specific final amount after tax is applied.

## The Problem

When dealing with taxes and rounding, a common challenge arises: you know the final total you want (including tax), but need to figure out what adjustment to make to the subtotal to reach that exact amount. This is particularly tricky because:

- Tax is calculated as a percentage of the subtotal
- The result is often rounded (floor, ceil, or round)
- Small changes to the subtotal can cause the final total to jump due to rounding

**Example scenario:**
- Current subtotal: ¥290,000
- Tax rate: 10%
- Current total: ¥319,000 (290,000 + 29,000 tax)
- Target total: ¥315,000
- **Question:** What discount should you apply to reach exactly ¥315,000?

`tax-fitter` solves this using an efficient binary search algorithm to find the exact adjustment needed.

## Features

- **Precise calculations**: Uses binary search to find exact discounts/surcharges
- **Multiple rounding modes**: Supports `floor`, `ceil`, and `round` tax calculations
- **Type-safe**: Written in TypeScript with full type definitions
- **Zero dependencies**: Core package has no dependencies
- **Stripe integration**: Ready-to-use integration for Stripe invoices
- **Well-tested**: Comprehensive test coverage including edge cases

## Packages

This monorepo contains two packages:

| Package | Description | npm |
|---------|-------------|-----|
| [`@tax-fitter/core`](#tax-fittercore) | Core calculation library | [![npm version](https://badge.fury.io/js/%40tax-fitter%2Fcore.svg)](https://www.npmjs.com/package/@tax-fitter/core) |
| [`stripe-tax-fitter`](#stripe-tax-fitter) | Stripe invoice integration | [![npm version](https://badge.fury.io/js/stripe-tax-fitter.svg)](https://www.npmjs.com/package/stripe-tax-fitter) |

## Installation

### Core Library

```bash
npm install @tax-fitter/core
# or
pnpm add @tax-fitter/core
# or
yarn add @tax-fitter/core
```

### Stripe Integration

```bash
npm install stripe-tax-fitter stripe
# or
pnpm add stripe-tax-fitter stripe
# or
yarn add stripe-tax-fitter stripe
```

## Usage

### @tax-fitter/core

Basic usage for calculating tax adjustments:

```typescript
import { calculateAdjustment } from '@tax-fitter/core';

const result = calculateAdjustment({
  subtotal: 290000,      // Current subtotal (in smallest currency unit - for JPY: yen, for USD: cents)
  targetTotal: 315000,   // Desired total including tax
  taxRate: 0.1,          // 10% tax rate
  roundMode: 'floor',    // How to round tax amounts
});

console.log(result);
// {
//   discount: 3636,              // Amount to discount
//   isValid: true,               // Whether calculation succeeded
//   adjustedSubtotal: 286364,    // Subtotal after discount
//   taxAmount: 28636,            // Tax on adjusted subtotal
//   finalTotal: 315000,          // Final total (matches target!)
// }
```

#### Rounding Modes

```typescript
import { calculateAdjustment } from '@tax-fitter/core';

// Floor rounding (most common in Japan)
const floor = calculateAdjustment({
  subtotal: 1000,
  targetTotal: 1100,
  taxRate: 0.1,
  roundMode: 'floor',  // Rounds tax down: floor(100) = 100
});

// Ceiling rounding
const ceil = calculateAdjustment({
  subtotal: 1000,
  targetTotal: 1100,
  taxRate: 0.1,
  roundMode: 'ceil',   // Rounds tax up: ceil(100) = 100
});

// Standard rounding
const round = calculateAdjustment({
  subtotal: 1000,
  targetTotal: 1100,
  taxRate: 0.1,
  roundMode: 'round',  // Rounds tax to nearest: round(100) = 100
});
```

#### Handling Invalid Cases

```typescript
import { calculateAdjustment } from '@tax-fitter/core';

// Invalid tax rate
const invalid = calculateAdjustment({
  subtotal: 1000,
  targetTotal: 1100,
  taxRate: 1.5,  // Tax rate must be between 0 and 1
});

console.log(invalid);
// {
//   discount: 0,
//   isValid: false,
//   error: 'Tax rate must be between 0 and 1',
//   ...
// }
```

### stripe-tax-fitter

Apply calculated adjustments directly to Stripe invoices:

```typescript
import Stripe from 'stripe';
import { TaxFitter } from 'stripe-tax-fitter';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const fitter = new TaxFitter(stripe);

// Apply adjustment to a draft invoice
const result = await fitter.applyAdjustment({
  invoiceId: 'in_1234567890',
  targetTotal: 315000,        // Target amount in smallest currency unit
  taxRate: 0.1,               // 10% tax
  roundMode: 'floor',
  description: 'Price adjustment',
  metadata: {
    campaign: 'summer-sale',
  },
});

console.log(result);
// {
//   invoiceItem: { ... },      // Created Stripe invoice item
//   discount: 3636,            // Calculated discount
//   adjustedSubtotal: 286364,  // New subtotal
//   taxAmount: 28636,          // Tax amount
//   finalTotal: 315000,        // Final total
// }
```

#### Functional API

```typescript
import Stripe from 'stripe';
import { applyStripeAdjustment } from 'stripe-tax-fitter';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const result = await applyStripeAdjustment(stripe, {
  invoiceId: 'in_1234567890',
  targetTotal: 315000,
  taxRate: 0.1,
});
```

## API Reference

### @tax-fitter/core

#### `calculateAdjustment(params: AdjustmentParams): AdjustmentResult`

Calculates the discount/surcharge needed to reach a target total.

**Parameters:**

```typescript
interface AdjustmentParams {
  subtotal: number;      // Subtotal before tax (in smallest currency unit)
  targetTotal: number;   // Desired total including tax
  taxRate: number;       // Tax rate as decimal (0.1 = 10%)
  roundMode?: RoundMode; // 'floor' | 'ceil' | 'round' (default: 'floor')
}
```

**Returns:**

```typescript
interface AdjustmentResult {
  discount: number;           // Discount to apply (negative = surcharge)
  isValid: boolean;           // Whether calculation succeeded
  adjustedSubtotal: number;   // Subtotal after discount
  taxAmount: number;          // Tax on adjusted subtotal
  finalTotal: number;         // Final total after tax
  error?: string;             // Error message if invalid
}
```

#### `applyTax(amount: number, taxRate: number, roundMode?: RoundMode): number`

Calculates tax on an amount with the specified rounding mode.

**Example:**

```typescript
import { applyTax } from '@tax-fitter/core';

const tax = applyTax(1000, 0.1, 'floor');  // 100
```

### stripe-tax-fitter

#### `class TaxFitter`

Main class for applying adjustments to Stripe invoices.

**Constructor:**

```typescript
constructor(stripe: Stripe)
```

**Methods:**

##### `applyAdjustment(options: StripeAdjustmentOptions): Promise<StripeAdjustmentResult>`

Applies a tax adjustment to a Stripe invoice.

**Parameters:**

```typescript
interface StripeAdjustmentOptions {
  invoiceId: string;         // Stripe invoice ID
  targetTotal: number;       // Target total (in smallest currency unit)
  taxRate: number;           // Tax rate as decimal
  roundMode?: RoundMode;     // Rounding mode (default: 'floor')
  description?: string;      // Line item description
  metadata?: Record<string, string>; // Custom metadata
}
```

**Returns:**

```typescript
interface StripeAdjustmentResult {
  invoiceItem: Stripe.InvoiceItem;  // Created invoice item
  discount: number;                 // Calculated discount
  adjustedSubtotal: number;         // Adjusted subtotal
  taxAmount: number;                // Tax amount
  finalTotal: number;               // Final total
}
```

**Throws:**
- Error if invoice is not in draft state
- Error if invoice has zero subtotal
- Error if adjustment calculation fails

#### `applyStripeAdjustment(stripe: Stripe, options: StripeAdjustmentOptions): Promise<StripeAdjustmentResult>`

Functional interface for applying adjustments.

**Parameters:**
- `stripe`: Stripe instance
- `options`: Same as `TaxFitter.applyAdjustment()` options (see [StripeAdjustmentOptions](#applyadjustmentoptions-stripeadjustmentoptions-promisestripeadjustmentresult))

**Returns:** Promise resolving to `StripeAdjustmentResult`

## Use Cases

### E-commerce Pricing

Adjust product prices to match psychological pricing points:

```typescript
// Want final price of ¥9,999 (including tax)
const result = calculateAdjustment({
  subtotal: 10000,
  targetTotal: 9999,
  taxRate: 0.1,
  roundMode: 'floor',
});
// Apply result.discount to your product price
```

### Subscription Services

Match specific monthly billing amounts:

```typescript
const result = await fitter.applyAdjustment({
  invoiceId: subscription.latest_invoice,
  targetTotal: 50000,  // ¥50,000 (or $500.00 in cents)
  taxRate: 0.1,
  description: 'Subscription tier adjustment',
});
```

### Promotional Campaigns

Calculate precise discounts for campaigns:

```typescript
// Customer has ¥500,000 budget (including tax)
const result = calculateAdjustment({
  subtotal: 550000,
  targetTotal: 500000,
  taxRate: 0.08,
  roundMode: 'floor',
});
// result.discount tells you the exact promotional discount
```

### Regional Tax Differences

Handle different tax rates across regions:

```typescript
// Japan: 10% consumption tax (floor rounding)
const jpResult = calculateAdjustment({
  subtotal: 10000,
  targetTotal: 11000,
  taxRate: 0.1,
  roundMode: 'floor',
});

// US: 8.5% sales tax (standard rounding)
const usResult = calculateAdjustment({
  subtotal: 10000,
  targetTotal: 10850,
  taxRate: 0.085,
  roundMode: 'round',
});
```

## How It Works

The library uses a binary search algorithm to efficiently find the exact discount needed:

1. **Initial bounds**: Start with a search range from maximum surcharge to maximum discount
2. **Binary search**: Iteratively narrow down the range by testing midpoints
3. **Validation**: Calculate the final total for each candidate and compare with target
4. **Exact match**: Return when an exact match is found, or the closest valid result

This approach is much faster than brute-force iteration and handles edge cases gracefully.

**Time complexity**: O(log n) where n is the subtotal amount

## Development

### Prerequisites

- Node.js >= 18
- pnpm >= 8

### Setup

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Type checking
pnpm typecheck

# Clean build artifacts
pnpm clean
```

### Project Structure

```text
tax-fitter/
├── packages/
│   ├── core/              # @tax-fitter/core
│   │   ├── src/
│   │   │   ├── calculate.ts    # Core calculation logic
│   │   │   ├── types.ts        # Type definitions
│   │   │   └── index.ts        # Public API
│   │   └── package.json
│   └── stripe/            # stripe-tax-fitter
│       ├── src/
│       │   ├── adjuster.ts     # Stripe integration
│       │   ├── types.ts        # Stripe-specific types
│       │   └── index.ts        # Public API
│       └── package.json
├── package.json           # Root package
└── pnpm-workspace.yaml    # Workspace configuration
```

## Requirements

### @tax-fitter/core
- No runtime dependencies
- TypeScript >= 5.0 (dev dependency)

### stripe-tax-fitter
- `stripe` >= 12.0.0 (peer dependency)
- `@tax-fitter/core` (workspace dependency)

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

If you encounter any issues or have questions, please file an issue on the [GitHub repository](https://github.com/hideokamoto/tax-fitter).
