# tax-fitter

目標の税込金額を達成するために必要な調整額を正確に計算するTypeScriptライブラリです。「逆税計算問題」を解決します。税込み後の最終金額が決まっている場合に、必要な割引額や追加料金を計算できます。

## 解決する問題

税金の計算と端数処理を行う際、よくある課題があります。最終的な税込金額は分かっているが、その金額に到達するために小計をどれだけ調整すべきかを計算する必要がある場合です。この問題が難しい理由は以下の通りです:

- 税金は小計に対するパーセンテージで計算される
- 計算結果は端数処理される（切り捨て、切り上げ、四捨五入）
- 小計のわずかな変更が、端数処理により最終金額を大きく変える可能性がある

**具体例:**
- 現在の小計: ¥290,000
- 税率: 10%
- 現在の合計: ¥319,000（290,000 + 29,000の税金）
- 目標の合計: ¥315,000
- **問題:** ちょうど¥315,000にするには、いくら割引すべきか？

`tax-fitter`は、効率的なバイナリサーチアルゴリズムを使用して、必要な調整額を正確に見つけます。

## 特徴

- **正確な計算**: バイナリサーチで正確な割引額・追加料金を算出
- **複数の端数処理モード**: `floor`（切り捨て）、`ceil`（切り上げ）、`round`（四捨五入）に対応
- **型安全**: TypeScriptで記述され、完全な型定義を提供
- **依存関係ゼロ**: コアパッケージは依存関係なし
- **Stripe連携**: Stripe請求書への統合機能を提供
- **十分なテスト**: エッジケースを含む包括的なテストカバレッジ

## パッケージ

このモノレポには2つのパッケージが含まれています:

| パッケージ | 説明 | npm |
|---------|-------------|-----|
| [`@tax-fitter/core`](#tax-fittercore) | コア計算ライブラリ | [![npm version](https://badge.fury.io/js/%40tax-fitter%2Fcore.svg)](https://www.npmjs.com/package/@tax-fitter/core) |
| [`stripe-tax-fitter`](#stripe-tax-fitter) | Stripe請求書連携 | [![npm version](https://badge.fury.io/js/stripe-tax-fitter.svg)](https://www.npmjs.com/package/stripe-tax-fitter) |

## インストール

### コアライブラリ

```bash
npm install @tax-fitter/core
# または
pnpm add @tax-fitter/core
# または
yarn add @tax-fitter/core
```

### Stripe連携

```bash
npm install stripe-tax-fitter stripe
# または
pnpm add stripe-tax-fitter stripe
# または
yarn add stripe-tax-fitter stripe
```

## 使い方

### @tax-fitter/core

税金調整の計算の基本的な使い方:

```typescript
import { calculateAdjustment } from '@tax-fitter/core';

const result = calculateAdjustment({
  subtotal: 290000,      // 現在の小計（最小通貨単位 - 日本円: 円、米ドル: セント）
  targetTotal: 315000,   // 目標の税込合計
  taxRate: 0.1,          // 10%の税率
  roundMode: 'floor',    // 税額の端数処理方法
});

console.log(result);
// {
//   discount: 3636,              // 割引額
//   isValid: true,               // 計算が成功したか
//   adjustedSubtotal: 286364,    // 割引後の小計
//   taxAmount: 28636,            // 調整後の小計に対する税額
//   finalTotal: 315000,          // 最終合計（目標と一致！）
// }
```

#### 端数処理モード

```typescript
import { calculateAdjustment } from '@tax-fitter/core';

// 切り捨て（日本で最も一般的）
const floor = calculateAdjustment({
  subtotal: 1000,
  targetTotal: 1100,
  taxRate: 0.1,
  roundMode: 'floor',  // 税額を切り捨て: floor(100) = 100
});

// 切り上げ
const ceil = calculateAdjustment({
  subtotal: 1000,
  targetTotal: 1100,
  taxRate: 0.1,
  roundMode: 'ceil',   // 税額を切り上げ: ceil(100) = 100
});

// 四捨五入
const round = calculateAdjustment({
  subtotal: 1000,
  targetTotal: 1100,
  taxRate: 0.1,
  roundMode: 'round',  // 税額を四捨五入: round(100) = 100
});
```

#### 無効なケースの処理

```typescript
import { calculateAdjustment } from '@tax-fitter/core';

// 無効な税率
const invalid = calculateAdjustment({
  subtotal: 1000,
  targetTotal: 1100,
  taxRate: 1.5,  // 税率は0から1の間でなければならない
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

Stripe請求書に計算した調整額を直接適用:

```typescript
import Stripe from 'stripe';
import { TaxFitter } from 'stripe-tax-fitter';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const fitter = new TaxFitter(stripe);

// 下書き請求書に調整を適用
const result = await fitter.applyAdjustment({
  invoiceId: 'in_1234567890',
  targetTotal: 315000,        // 目標金額（最小通貨単位）
  taxRate: 0.1,               // 10%の税率
  roundMode: 'floor',
  description: '価格調整',
  metadata: {
    campaign: 'summer-sale',
  },
});

console.log(result);
// {
//   invoiceItem: { ... },      // 作成されたStripe請求項目
//   discount: 3636,            // 計算された割引額
//   adjustedSubtotal: 286364,  // 新しい小計
//   taxAmount: 28636,          // 税額
//   finalTotal: 315000,        // 最終合計
// }
```

#### 関数型API

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

## APIリファレンス

### @tax-fitter/core

#### `calculateAdjustment(params: AdjustmentParams): AdjustmentResult`

目標の合計金額に到達するために必要な割引/追加料金を計算します。

**パラメータ:**

```typescript
interface AdjustmentParams {
  subtotal: number;      // 税抜き小計（最小通貨単位）
  targetTotal: number;   // 目標の税込合計
  taxRate: number;       // 小数での税率（0.1 = 10%）
  roundMode?: RoundMode; // 'floor' | 'ceil' | 'round'（デフォルト: 'floor'）
}
```

**戻り値:**

```typescript
interface AdjustmentResult {
  discount: number;           // 適用する割引額（負の値 = 追加料金）
  isValid: boolean;           // 計算が成功したか
  adjustedSubtotal: number;   // 割引後の小計
  taxAmount: number;          // 調整後の小計に対する税額
  finalTotal: number;         // 税込み後の最終合計
  error?: string;             // 無効な場合のエラーメッセージ
}
```

#### `applyTax(amount: number, taxRate: number, roundMode?: RoundMode): number`

指定された端数処理モードで金額に税金を計算します。

**例:**

```typescript
import { applyTax } from '@tax-fitter/core';

const tax = applyTax(1000, 0.1, 'floor');  // 100
```

### stripe-tax-fitter

#### `class TaxFitter`

Stripe請求書に調整を適用するメインクラス。

**コンストラクタ:**

```typescript
constructor(stripe: Stripe)
```

**メソッド:**

##### `applyAdjustment(options: StripeAdjustmentOptions): Promise<StripeAdjustmentResult>`

Stripe請求書に税金調整を適用します。

**パラメータ:**

```typescript
interface StripeAdjustmentOptions {
  invoiceId: string;         // Stripe請求書ID
  targetTotal: number;       // 目標合計（最小通貨単位）
  taxRate: number;           // 小数での税率
  roundMode?: RoundMode;     // 端数処理モード（デフォルト: 'floor'）
  description?: string;      // 明細行の説明
  metadata?: Record<string, string>; // カスタムメタデータ
}
```

**戻り値:**

```typescript
interface StripeAdjustmentResult {
  invoiceItem: Stripe.InvoiceItem;  // 作成された請求項目
  discount: number;                 // 計算された割引額
  adjustedSubtotal: number;         // 調整後の小計
  taxAmount: number;                // 税額
  finalTotal: number;               // 最終合計
}
```

**例外:**
- 請求書が下書き状態でない場合、エラーをスロー
- 請求書の小計がゼロの場合、エラーをスロー
- 調整計算が失敗した場合、エラーをスロー

#### `applyStripeAdjustment(stripe: Stripe, options: StripeAdjustmentOptions): Promise<StripeAdjustmentResult>`

調整を適用する関数型インターフェース。

**パラメータ:**
- `stripe`: Stripeインスタンス
- `options`: `TaxFitter.applyAdjustment()`と同じオプション（[StripeAdjustmentOptions](#applyadjustmentoptions-stripeadjustmentoptions-promisestripeadjustmentresult)を参照）

**戻り値:** `StripeAdjustmentResult`を解決するPromise

## ユースケース

### ECサイトの価格設定

心理的価格設定ポイントに合わせて商品価格を調整:

```typescript
// 税込み¥9,999にしたい
const result = calculateAdjustment({
  subtotal: 10000,
  targetTotal: 9999,
  taxRate: 0.1,
  roundMode: 'floor',
});
// result.discountを商品価格に適用
```

### サブスクリプションサービス

特定の月額請求金額に合わせる:

```typescript
const result = await fitter.applyAdjustment({
  invoiceId: subscription.latest_invoice,
  targetTotal: 50000,  // ¥50,000（または米ドルの場合$500.00のセント単位）
  taxRate: 0.1,
  description: 'サブスクリプションティア調整',
});
```

### プロモーションキャンペーン

キャンペーン用の正確な割引を計算:

```typescript
// 顧客の予算が税込み¥500,000
const result = calculateAdjustment({
  subtotal: 550000,
  targetTotal: 500000,
  taxRate: 0.08,
  roundMode: 'floor',
});
// result.discountが正確なプロモーション割引額
```

### 地域別の税率対応

異なる地域の税率を処理:

```typescript
// 日本: 10%消費税（切り捨て）
const jpResult = calculateAdjustment({
  subtotal: 10000,
  targetTotal: 11000,
  taxRate: 0.1,
  roundMode: 'floor',
});

// アメリカ: 8.5%売上税（四捨五入）
const usResult = calculateAdjustment({
  subtotal: 10000,
  targetTotal: 10850,
  taxRate: 0.085,
  roundMode: 'round',
});
```

## 仕組み

このライブラリは、バイナリサーチアルゴリズムを使用して必要な割引額を効率的に見つけます:

1. **初期範囲**: 最大追加料金から最大割引までの検索範囲でスタート
2. **バイナリサーチ**: 中間点をテストして範囲を反復的に絞り込む
3. **検証**: 各候補の最終合計を計算し、目標と比較
4. **正確な一致**: 正確な一致が見つかった時点で返す、または最も近い有効な結果を返す

このアプローチは総当たり反復よりもはるかに高速で、エッジケースを適切に処理します。

**時間計算量**: O(log n) ここでnは小計金額

## 開発

### 必要要件

- Node.js >= 18
- pnpm >= 8

### セットアップ

```bash
# 依存関係のインストール
pnpm install

# 全パッケージのビルド
pnpm build

# テストの実行
pnpm test

# 型チェック
pnpm typecheck

# ビルド成果物のクリーン
pnpm clean
```

### プロジェクト構造

```text
tax-fitter/
├── packages/
│   ├── core/              # @tax-fitter/core
│   │   ├── src/
│   │   │   ├── calculate.ts    # コア計算ロジック
│   │   │   ├── types.ts        # 型定義
│   │   │   └── index.ts        # 公開API
│   │   └── package.json
│   └── stripe/            # stripe-tax-fitter
│       ├── src/
│       │   ├── adjuster.ts     # Stripe連携
│       │   ├── types.ts        # Stripe固有の型
│       │   └── index.ts        # 公開API
│       └── package.json
├── package.json           # ルートパッケージ
└── pnpm-workspace.yaml    # ワークスペース設定
```

## 必要要件

### @tax-fitter/core
- ランタイム依存関係なし
- TypeScript >= 5.0（開発依存関係）

### stripe-tax-fitter
- `stripe` >= 12.0.0（ピア依存関係）
- `@tax-fitter/core`（ワークスペース依存関係）

## ライセンス

MIT

## 貢献

貢献を歓迎します！プルリクエストをお気軽に送信してください。

## サポート

問題が発生した場合や質問がある場合は、[GitHubリポジトリ](https://github.com/hideokamoto/tax-fitter)にイシューを作成してください。
