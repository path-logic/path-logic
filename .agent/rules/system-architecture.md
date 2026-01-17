# Path Logic - System Architecture

This is a **Principal-level Full-Stack** project using **Next.js 15**, **TypeScript**, and **Zustand**.

## Monorepo Strategy

This project uses an **Nx monorepo** with an **Open Core** licensing model:

| Package            | Visibility       | Purpose                                                  |
| ------------------ | ---------------- | -------------------------------------------------------- |
| `@path-logic/core` | **Public (MIT)** | Framework-agnostic engine — your technical business card |
| `apps/web`         | **Private**      | Next.js 15 app — commercial product with protected IP    |

**Key Principle:** The `core` library has **zero framework dependencies** and can be published to npm independently. The private app imports from core, never the reverse.

See [Monorepo Architecture](file:///home/pete/projects/path-logic/docs/architecture/monorepo.md) for full details.

## Core Architectural Principles

### Hexagonal Architecture

Business logic is decoupled from Frameworks. All core domain logic lives in pure TypeScript modules with no framework dependencies. Adapters connect the domain to external concerns (UI, storage, APIs).

### Privacy is Non-Negotiable

- **Local-first**: Data lives on the user's device by default
- **Encryption**: All persistent data is encrypted with **AES-GCM**
- **User-owned storage**: Sync to user-controlled cloud storage (Google Drive / iCloud) — never third-party servers

### UI Design Philosophy: High-Density Professional

We follow a **Bloomberg / Linear aesthetic**:

- Information-dense layouts that respect user expertise
- Minimal chrome, maximum signal
- Monospace/tabular data presentation where appropriate
- Dark mode as the primary experience
- Subtle, purposeful animations
- Keyboard-first navigation

## TypeScript Coding Standards

### Naming Conventions

- **camelCase** is the standard for variables, functions, and properties
- **PascalCase** for types, interfaces, enums, and classes
- **Interface prefix**: All interfaces use the `I` prefix (e.g., `ITransaction`, `ISplit`)

### Type Definitions

- **Enums over union types** for categorical values (e.g., `TransactionStatus`, `AccountType`)
- **Interfaces over types** where object shapes are defined — use `type` only for aliases and unions
- Prefer `enum` for values that represent a fixed set of states or categories

### Explicit Typing (Required)

- **Always add explicit type annotations** — no implicit `any` or inferred types in function signatures
- **`any` is banned** — use `unknown` if type is truly unknown, then narrow with type guards
- All function parameters, return types, and variable declarations must have explicit types

```typescript
// ✅ Correct: Explicit typing everywhere
function calculateTotal(items: Array<ILineItem>): Cents {
  return items.reduce((sum: Cents, item: ILineItem) => sum + item.amount, 0);
}

// ❌ Incorrect: Implicit any / missing return type
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

// ❌ Banned: Using `any`
function processData(data: any): any { ... }

// ✅ Correct: Use `unknown` with type guards
function processData(data: unknown): IProcessedResult {
  if (!isValidInput(data)) throw new Error('Invalid input');
  return transform(data as IValidInput);
}
```

### Array Syntax

- **Always use `Array<T>` generic long form** for both typing and instantiation
- Use `new Array<T>()` for creation, not `[]` literal syntax

```typescript
// ✅ Correct: Long form typing and instantiation
let items: Array<ITransaction> = new Array<ITransaction>();

// ✅ Correct: Resetting an array
items = new Array<ITransaction>();

// ❌ Incorrect: Literal syntax
let items: Array<ITransaction> = [];
items = [];
```

**Exception**: When initializing a number array with values, use literal syntax (constructor interprets single number as length):

```typescript
// ✅ Exception: Number array with initial values
const primes: Array<number> = [2, 3, 5, 7, 11];
```

## Code Formatting

### Prettier (Required)

- **Prettier** is the project formatter — no exceptions
- Run `make format` before all commits
- CI will reject PRs that fail `make lint`

**Workflow:**

```bash
# Format all files
make format

# Check formatting + types (CI uses this)
make lint

# Individual checks
make format-check
make typecheck
```

### Hybrid Script Strategy

- **npm scripts** — App commands only (`dev`, `build`, `start`, `test`)
- **Makefile** — Tooling commands (`format`, `lint`, `typecheck`, `clean`)

## Git Standards

### Commit Messages (Required)

- **Subject line**: 50 characters maximum
- **Body**: 70 characters maximum per line
- **Format**: Subject and body must be separated by a blank line

```text
Subject line (max 50 chars)

Body description providing context for the change.
Each line is wrapped at 70 characters.
```

### Examples

```typescript
// ✅ Correct: Enum for status
enum TransactionStatus {
  Pending = 'pending',
  Cleared = 'cleared',
  Reconciled = 'reconciled'
}

// ✅ Correct: Interface with I prefix
interface ITransaction {
  id: string;
  status: TransactionStatus;
}

// ❌ Incorrect: Union type for categorical values
type TransactionStatus = 'pending' | 'cleared' | 'reconciled';

// ❌ Incorrect: Interface without I prefix
interface Transaction { ... }
```
