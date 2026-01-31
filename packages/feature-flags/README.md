# @path-logic/feature-flags

> Lightweight, cookie-based feature flags for Next.js with route-based toggling

## Features

- 🚀 **Simple Route-Based Toggling**: Navigate to `/ff/[flag]/enable` or `/ff/[flag]/disable`
- 🍪 **Cookie Persistence**: Flags persist across sessions (30 days)
- 🔒 **Type-Safe**: Full TypeScript support with strict typing
- ⚛️ **React Hooks**: Client-side hooks for conditional rendering
- 🎯 **Server-Side Support**: Use in Server Components, Route Handlers, and Middleware
- 📦 **Zero Dependencies**: No external packages required (except Next.js)

## Installation

```bash
npm install @path-logic/feature-flags
```

## Quick Start

### 1. Define Your Flags

```typescript
// lib/featureFlags/featureFlags.ts
export const FLAGS = {
    DEV_TOOLS: 'dev',
    BETA_FEATURES: 'beta',
} as const;
```

### 2. Add Route Handler

Create `app/ff/[...flag]/route.ts`:

```typescript
import { GET } from '@path-logic/feature-flags/route';
export { GET };
```

### 3. Use in Components

**Server Component:**

```typescript
import { getFlag, FLAGS } from '@path-logic/feature-flags';

export default async function Page() {
    const devEnabled = await getFlag(FLAGS.DEV_TOOLS);

    if (!devEnabled) {
        redirect('/');
    }

    return <DevTools />;
}
```

**Client Component:**

```typescript
'use client';
import { useFeatureFlag } from '@path-logic/feature-flags/client';

export function DevToolsLink() {
    const devEnabled = useFeatureFlag('dev');

    if (!devEnabled) return null;

    return <a href="/dev">Dev Tools</a>;
}
```

## API

### Server-Side Functions

#### `getFlag(flag: string): Promise<boolean>`

Check if a feature flag is enabled.

#### `setFlag(flag: string, enabled: boolean): Promise<void>`

Set a feature flag value.

#### `getAllFlags(): Promise<Record<string, boolean>>`

Get all feature flags.

#### `isValidFlag(flag: string): boolean`

Validate if a flag name is allowed.

### Client-Side Hooks

#### `useFeatureFlag(flag: string): boolean`

React hook to check if a flag is enabled.

#### `useAllFlags(): Record<string, boolean>`

React hook to get all flags.

## Usage

### Toggle Flags

Navigate to these URLs to toggle flags:

- Enable: `/ff/dev/enable`
- Disable: `/ff/dev/disable`

Or use the headless UI components with render props:

```typescript
'use client';
import { FeatureFlagToggle } from '@path-logic/feature-flags/components';

export function MyFeatureFlagToggle({ flag, label }) {
    return (
        <FeatureFlagToggle flag={flag}>
            {({ enabled, isToggling, toggle, flagConfig }) => (
                <div>
                    <h3>{label}</h3>
                    <button
                        onClick={() => toggle(enabled ? 'disable' : 'enable')}
                        disabled={isToggling}
                    >
                        {isToggling ? 'Loading...' : (enabled ? 'Disable' : 'Enable')}
                    </button>
                    {enabled && flagConfig?.route && (
                        <a href={flagConfig.route}>View →</a>
                    )}
                </div>
            )}
        </FeatureFlagToggle>
    );
}
```

### Headless Components

The package provides headless components using the render props pattern, giving you complete control over styling:

#### FeatureFlagToggle

```typescript
import { FeatureFlagToggle } from '@path-logic/feature-flags/components';
import type { IFlagConfig } from '@path-logic/feature-flags/components';

<FeatureFlagToggle
    flag="dev"
    flagConfigs={YOUR_FLAG_CONFIGS}
    apiBasePath="/ff"
    onToggleComplete={(flag, enabled) => console.log(`${flag} is now ${enabled}`)}
>
    {({ enabled, isToggling, toggle, flagConfig }) => (
        // Your custom UI here
        <YourCustomComponent
            enabled={enabled}
            loading={isToggling}
            onToggle={() => toggle(enabled ? 'disable' : 'enable')}
            config={flagConfig}
        />
    )}
</FeatureFlagToggle>
```

**Render Props:**

- `enabled: boolean` - Current flag state
- `isToggling: boolean` - Loading state during API call
- `toggle: (action: 'enable' | 'disable') => Promise<void>` - Toggle function
- `flagConfig?: IFlagConfig` - Flag configuration (if provided)

#### FeatureFlagList

```typescript
import { FeatureFlagList } from '@path-logic/feature-flags/components';

<FeatureFlagList flagConfigs={Object.values(FLAG_CONFIGS)}>
    {({ flag, index, total }) => (
        <div key={flag.key}>
            <h3>{flag.name}</h3>
            <p>{flag.description}</p>
            {/* Use FeatureFlagToggle here for each flag */}
        </div>
    )}
</FeatureFlagList>
```

**Render Props:**

- `flag: IFlagConfig` - Flag configuration object
- `index: number` - Current index in the list
- `total: number` - Total number of flags

### Route Protection

```typescript
// app/dev/layout.tsx
import { getFlag, FLAGS } from '@path-logic/feature-flags';
import { redirect } from 'next/navigation';

export default async function DevLayout({ children }) {
    const devEnabled = await getFlag(FLAGS.DEV_TOOLS);

    if (!devEnabled) {
        redirect('/');
    }

    return <>{children}</>;
}
```

## Configuration

### Cookie Settings

Flags are stored as cookies with the following defaults:

- **Prefix**: `ff_`
- **Max Age**: 30 days
- **HttpOnly**: `false` (allows client-side access)
- **Secure**: `true` (in production)
- **SameSite**: `lax`

### Custom Configuration

```typescript
// lib/featureFlags/config.ts
export const COOKIE_CONFIG = {
    prefix: 'ff_',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
};
```

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.

## Author

Path Logic Team
