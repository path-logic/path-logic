/**
 * Shared TypeScript interfaces for @feature-flags
 */

/**
 * Configuration for a single feature flag
 */
export interface IFlagConfig {
    key: string;
    name: string;
    description: string;
    route?: string;
}
