/**
 * Shared TypeScript interfaces for @path-logic/feature-flags
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

/**
 * Render props provided to FeatureFlagToggle children function
 */
export interface IFeatureFlagToggleRenderProps {
    enabled: boolean;
    isToggling: boolean;
    toggle: (action: 'enable' | 'disable') => Promise<void>;
    flagConfig?: IFlagConfig;
}

/**
 * Props for the headless FeatureFlagToggle component
 */
export interface IFeatureFlagToggleProps {
    flag: string;
    flagConfigs?: Record<string, IFlagConfig>;
    apiBasePath?: string;
    onToggleComplete?: (flag: string, enabled: boolean) => void;
    children: (props: IFeatureFlagToggleRenderProps) => React.ReactElement;
}

/**
 * Render props provided to FeatureFlagList children function
 */
export interface IFeatureFlagListRenderProps {
    flag: IFlagConfig;
    index: number;
    total: number;
}

/**
 * Props for the headless FeatureFlagList component
 */
export interface IFeatureFlagListProps {
    flagConfigs: Array<IFlagConfig>;
    children: (props: IFeatureFlagListRenderProps) => React.ReactElement;
}
