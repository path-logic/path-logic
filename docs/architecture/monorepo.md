# Path Logic — Monorepo Architecture

## Overview

Path Logic uses an **Nx monorepo** with an **Open Core** licensing model.

```
path-logic/
├── packages/
│   └── core/                    # @path-logic/core (PUBLIC - MIT)
│       ├── src/
│       │   ├── domain/          # Entity definitions
│       │   ├── engine/          # Transaction engine, projection
│       │   ├── parsers/         # QIF/CSV parsers
│       │   └── shared/          # Utilities (Result, Money, etc.)
│       ├── package.json
│       └── tsconfig.json
│
├── apps/
│   └── web/                     # path-logic-app (PRIVATE)
│       ├── src/
│       │   ├── app/             # Angular App
│       │   ├── assets/          # Static assets
│       │   ├── styles.css       # Global styles
│       │   └── main.ts          # App bootstrap
│       ├── package.json
│       └── project.json         # Nx project config
│
├── nx.json                      # Nx workspace config
├── package.json                 # Root package.json
├── tsconfig.base.json           # Shared TS config
└── Makefile                     # Tooling commands
```

---

## Package Breakdown

### `@path-logic/core` (Public / OSS)

| Aspect       | Details                                                     |
| ------------ | ----------------------------------------------------------- |
| **License**  | MIT                                                         |
| **Purpose**  | Technical business card — proves library-grade code quality |
| **Audience** | Recruiters, OSS community                                   |
| **Registry** | Published to npm                                            |

**Contents:**

- Pure TypeScript, **zero framework dependencies**
- QIF/CSV Parser with defensive date handling
- Penny-Perfect Reconciler (integer math, split validation)
- 90-Day Cashflow Projection Engine
- 100% test coverage requirement

**Import Example:**

```typescript
import { TransactionEngine, QIFParser, generateProjection } from '@path-logic/core';
```

---

### `path-logic-app` (Private / Commercial)

| Aspect         | Details                                   |
| -------------- | ----------------------------------------- |
| **License**    | Proprietary                               |
| **Purpose**    | Commercial product for passive income     |
| **Audience**   | End users, power users tired of Mint/YNAB |
| **Deployment** | Vercel                                    |

**Contents:**

- **Angular 21 UI**
- High-Density Professional design system (Bloomberg/Linear aesthetic)
- iCloud (CloudKit) and Google Drive (appDataFolder) adapters
- Angular Signals + RXJS / Zustand
- SSO integration (Google, Apple)
- AES-GCM encryption implementation
- Branding, assets, API keys

**Protected IP:**

- User-owned storage adapter implementations
- Design system and UX patterns
- SSO key derivation for encryption

---

## Nx Workspace Configuration

### Project Graph

```
┌─────────────────────────────────────────────────────┐
│                    apps/web                         │
│               (Angular 21 Private App)              │
│                                                     │
│   ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │
│   │  UI Layer   │  │   Signals   │  │ Adapters  │  │
│   │ (Components)│  │ / RxJS      │  │ (Storage) │  │
│   └──────┬──────┘  └──────┬──────┘  └─────┬─────┘  │
│          │                │               │         │
│          └────────────────┴───────────────┘         │
│                           │                         │
└───────────────────────────┼─────────────────────────┘
                            │ imports
                            ▼
┌─────────────────────────────────────────────────────┐
│                  packages/core                      │
│            (@path-logic/core - Public)              │
│                                                     │
│   ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │
│   │   Domain    │  │   Engine    │  │  Parsers  │  │
│   │  (Entities) │  │   (Logic)   │  │ (QIF/CSV) │  │
│   └─────────────┘  └─────────────┘  └───────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Dependency Rules

```json
// nx.json - enforce boundary rules
{
    "targetDefaults": {
        "build": {
            "dependsOn": ["^build"]
        }
    },
    "plugins": [
        {
            "plugin": "@nx/enforce-module-boundaries",
            "options": {
                "rules": [
                    {
                        "sourceTag": "scope:core",
                        "onlyDependOnLibsWithTags": []
                    },
                    {
                        "sourceTag": "scope:app",
                        "onlyDependOnLibsWithTags": ["scope:core"]
                    }
                ]
            }
        }
    ]
}
```

**Boundary Enforcement:**

- `@path-logic/core` has **zero external dependencies** (except dev/test)
- `apps/web` can import from `@path-logic/core`
- `@path-logic/core` **cannot** import from `apps/web`

---

## Build & Development

### Nx Commands

```bash
# Development
npx nx serve web                    # Start Angular dev server
npx nx test core                    # Run core library tests
npx nx test web                     # Run app tests

# Building
npx nx build core                   # Build core for npm publish
npx nx build web                    # Build Angular for production

# Linting (use Makefile for consistency)
make lint                           # Format + typecheck all projects

# Affected (CI optimization)
npx nx affected --target=test       # Only test changed projects
npx nx affected --target=build      # Only build changed projects
```

### Publishing @path-logic/core

```bash
# From packages/core
npm version patch|minor|major
npm publish --access public
```

---

## TypeScript Configuration

### Shared Base Config (`tsconfig.base.json`)

```json
{
    "compilerOptions": {
        "target": "ES2022",
        "lib": ["ES2022"],
        "strict": true,
        "noImplicitAny": true,
        "strictNullChecks": true,
        "noUncheckedIndexedAccess": true,
        "exactOptionalPropertyTypes": true,
        "moduleResolution": "bundler",
        "paths": {
            "@path-logic/core": ["packages/core/src/index.ts"]
        }
    }
}
```

### Core Library (`packages/core/tsconfig.json`)

```json
{
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
        "outDir": "./dist",
        "declaration": true,
        "declarationMap": true
    },
    "include": ["src/**/*"],
    "exclude": ["**/*.spec.ts", "**/*.test.ts"]
}
```

### App (`apps/web/tsconfig.app.json`)

```json
{
    "extends": "./tsconfig.json",
    "compilerOptions": {
        "outDir": "../../dist/out-tsc",
        "types": []
    },
    "files": ["src/main.ts"],
    "include": ["src/**/*.d.ts"]
}
```

---

## CI/CD Strategy

### GitHub Actions

| Workflow           | Trigger                      | Jobs                           |
| ------------------ | ---------------------------- | ------------------------------ |
| `code-quality.yml` | Push/PR to `main`, `develop` | Lint, typecheck, test affected |
| `publish-core.yml` | Tag `core@*`                 | Build & publish to npm         |
| `deploy-app.yml`   | Push to `main`               | Deploy to Vercel               |

### Branch Strategy

- `main` — Production (deploys app, can trigger core publish)
- `develop` — Integration branch
- `feature/*` — Feature branches
- `core/*` — Core library changes (triggers extra test coverage checks)

---

## Open Source Strategy

### What's Public (@path-logic/core)

✅ Transaction domain model (entities, types)
✅ Split-sum invariant validation
✅ QIF/CSV parsers with date normalization
✅ Cashflow projection algorithm
✅ Money utilities (cents conversion, formatting)
✅ Functional Result type for error handling

### What's Private (apps/web)

🔒 Angular UI implementation
🔒 Design system (colors, typography, components)
🔒 Google Drive appDataFolder adapter
🔒 iCloud CloudKit adapter
🔒 AES-GCM encryption with SSO key derivation
🔒 Branding and marketing assets
🔒 OAuth client IDs and secrets
