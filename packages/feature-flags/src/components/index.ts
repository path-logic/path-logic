/**
 * Headless components for @path-logic/feature-flags
 * 
 * These components use the render props pattern to provide business logic
 * while allowing consumers to control the UI rendering.
 */

export { FeatureFlagToggle } from './FeatureFlagToggle';
export { FeatureFlagList } from './FeatureFlagList';
export type {
    IFlagConfig,
    IFeatureFlagToggleProps,
    IFeatureFlagToggleRenderProps,
    IFeatureFlagListProps,
    IFeatureFlagListRenderProps,
} from '../types';
