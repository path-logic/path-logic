# NPM Package Structure for @path-logic/feature-flags

## Overview

The feature flags system has been prepared for extraction as a standalone npm package. This will allow you to:
1. Open source the package for community use
2. Reuse across multiple projects
3. Accept community contributions
4. Build your portfolio with a published package

## Package Structure

```
packages/feature-flags/
├── src/
│   ├── index.ts          # Server-side exports (getFlag, setFlag, etc.)
│   ├── client.ts         # Client-side exports (useFeatureFlag, useAllFlags)
│   ├── route.ts          # Route handler export
│   └── components.tsx    # UI components (FeatureFlagToggle)
├── package.json
├── tsconfig.json
├── README.md
└── LICENSE
```

## Next Steps to Publish

### 1. Copy Source Files

Move the following files from `apps/web/src` to `packages/feature-flags/src`:

```bash
# Server-side
cp apps/web/src/lib/featureFlags/featureFlags.ts packages/feature-flags/src/index.ts

# Client-side
cp apps/web/src/lib/featureFlags/useFeatureFlag.ts packages/feature-flags/src/client.ts

# Route handler
cp apps/web/src/app/ff/[...flag]/route.ts packages/feature-flags/src/route.ts

# Components
cp apps/web/src/components/FeatureFlagToggle.tsx packages/feature-flags/src/components.tsx
```

### 2. Update Imports

In the copied files, remove Next.js-specific imports and make them generic:

**index.ts**: Keep as-is (uses `next/headers`)
**client.ts**: Keep as-is (pure React)
**route.ts**: Keep as-is (uses `next/server`)
**components.tsx**: Update to use package imports

### 3. Build the Package

```bash
cd packages/feature-flags
npm install
npm run build
```

### 4. Test Locally

Link the package locally to test:

```bash
cd packages/feature-flags
npm link

cd ../../apps/web
npm link @path-logic/feature-flags
```

Update imports in `apps/web`:
```typescript
// Before
import { getFlag } from '@/lib/featureFlags/featureFlags';

// After
import { getFlag } from '@path-logic/feature-flags';
```

### 5. Publish to npm

```bash
cd packages/feature-flags
npm login
npm publish --access public
```

## Usage in Other Projects

After publishing, anyone can use it:

```bash
npm install @path-logic/feature-flags
```

Then follow the README instructions.

## Benefits

✅ **Portfolio Piece**: Demonstrates ability to build and publish npm packages
✅ **Open Source Contribution**: Builds your GitHub profile
✅ **Reusability**: Use in future projects
✅ **Community**: Others can contribute improvements
✅ **Learning**: Experience with package management and versioning

## Recommended Additions Before Publishing

1. **Tests**: Add unit tests with Jest/Vitest
2. **Examples**: Create example Next.js app in `examples/`
3. **CI/CD**: GitHub Actions for automated testing and publishing
4. **Changelog**: Maintain CHANGELOG.md for version history
5. **License**: Add MIT license file
6. **Contributing Guide**: Add CONTRIBUTING.md

## Alternative: Monorepo Package

If you want to keep it private but still organized:

1. Keep in `packages/feature-flags`
2. Reference it in `apps/web/package.json`:
   ```json
   {
     "dependencies": {
       "@path-logic/feature-flags": "workspace:*"
     }
   }
   ```
3. Use workspace protocol for local development
4. Publish later when ready
