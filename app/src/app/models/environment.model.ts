import type { FirebaseOptions } from '@firebase/app';

export interface IEnvTheme {
    readonly primary: Record<number, string>;
    readonly success: Record<number, string>;
    readonly faviconLight: string;
    readonly faviconDark: string;
    readonly bannerBg: string;
    readonly bannerText: string;
}

/**
 * Typed environment interface.
 * All environment files must satisfy this interface.
 */
export interface IEnvironment {
    readonly production: boolean;
    readonly appEnv: 'development' | 'staging' | 'production';
    readonly firebase: FirebaseOptions;
    readonly theme: IEnvTheme;
    /** When true, auth guard is bypassed for Playwright E2E tests. */
    readonly e2e?: boolean;
    /** PostHog project token for product analytics. */
    readonly posthogKey?: string;
    /** PostHog ingestion host. */
    readonly posthogHost?: string;
    /** When true, console logging and uncaught exceptions are posted to the local dev proxy. */
    readonly enableRemoteLogging?: boolean;
    /** Dev proxy endpoint for receiving browser logs (defaults to '/api/log'). */
    readonly remoteLogEndpoint?: string;
}
