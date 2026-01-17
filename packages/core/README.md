# @path-logic/core

Penny-perfect transaction engine for personal finance applications.

## Features

- 🔢 **Integer-based math** (cents) — zero floating-point errors
- ✂️ **Split-transaction reconciliation** with invariant validation
- 📈 **90-day cashflow projection** engine
- 📄 **Defensive parsing** for legacy QIF/CSV formats
- 🎯 **100% test coverage** requirement

## Installation

```bash
npm install @path-logic/core
```

## Quick Start

```typescript
import { TransactionEngine, Money } from '@path-logic/core';

const engine = new TransactionEngine();
const amount = Money.dollarsToCents(100.50);
// ...
```

## Documentation

API documentation is available in the `docs/api` directory or hosted on GitHub Pages.
