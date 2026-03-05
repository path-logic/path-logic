/**
 * Typed environment interface.
 * All environment files must satisfy this interface.
 */
export interface IFirebaseConfig {
    readonly apiKey: string;
    readonly authDomain: string;
    readonly projectId: string;
    readonly storageBucket: string;
    readonly messagingSenderId: string;
    readonly appId: string;
    readonly measurementId?: string;
}

export interface IEnvironment {
    readonly production: boolean;
    readonly appEnv: 'development' | 'staging' | 'production';
    readonly firebase: IFirebaseConfig;
    /** When true, auth guard is bypassed for Playwright E2E tests. */
    readonly e2e?: boolean;
}
