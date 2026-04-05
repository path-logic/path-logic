/**
 * Shared TypeScript interfaces for feature flags.
 * Framework-agnostic types kept from @path-logic/feature-flags.
 */

/**
 * Configuration for a single feature flag
 */
export interface IFlagConfig {
    readonly key: string;
    readonly name: string;
    readonly description: string;
    readonly route?: string;
}
