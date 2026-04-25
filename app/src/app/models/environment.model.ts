import type { FirebaseOptions } from '@firebase/app';

/**
 * Typed environment interface.
 * All environment files must satisfy this interface.
 */
export interface IEnvironment {
    readonly production: boolean;
    readonly appEnv: 'development' | 'staging' | 'production';
    readonly firebase: FirebaseOptions;
    /** When true, auth guard is bypassed for Playwright E2E tests. */
    readonly e2e?: boolean;
    /** Sentry Public DSN for crashlytics reporting. Only initializes Sentry if present. */
    readonly sentryDsn?: string;
    /** PostHog project token for product analytics. */
    readonly posthogKey?: string;
    /** PostHog ingestion host. */
    readonly posthogHost?: string;
}
