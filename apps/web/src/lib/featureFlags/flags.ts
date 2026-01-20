/**
 * Feature flag configuration for Path Logic
 * Define your feature flags here with their associated routes
 */

import type { IFlagConfig } from '@path-logic/feature-flags/components';

/**
 * Enum of allowed feature flag keys
 * The values here correspond to the normalized flag identifiers used in cookies
 */
export enum FlagKey {
    DEV_TOOLS = 'dev',
    BETA_FEATURES = 'beta',
    STYLE_GUIDE = 'style_guide',
}

export const FLAG_CONFIGS: Record<FlagKey, IFlagConfig> = {
    [FlagKey.DEV_TOOLS]: {
        key: FlagKey.DEV_TOOLS,
        name: 'Developer Tools',
        description: 'Access sync test suite and debugging tools',
        route: '/dev',
    },
    [FlagKey.BETA_FEATURES]: {
        key: FlagKey.BETA_FEATURES,
        name: 'Beta Features',
        description: 'Try out experimental features before they\'re released',
    },
    [FlagKey.STYLE_GUIDE]: {
        key: FlagKey.STYLE_GUIDE,
        name: 'Style Guide',
        description: 'Living design system and component showcase',
        route: '/style-guide',
    },
};
