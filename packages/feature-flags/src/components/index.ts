/**
 * Headless components for @path-logic/feature-flags
 *
 * These components use the render props pattern to provide business logic
 * while allowing consumers to control the UI rendering.
 */

export type {
    IFeatureFlagListProps,
    IFeatureFlagListRenderProps,
    IFeatureFlagToggleProps,
    IFeatureFlagToggleRenderProps,
    IFlagConfig,
} from '../types';
export { FeatureFlagList } from './FeatureFlagList';
export { FeatureFlagToggle } from './FeatureFlagToggle';
