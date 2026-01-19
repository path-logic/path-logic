'use client';

import { useState } from 'react';

import { emitFlagChange,useFeatureFlag } from '../client';
import type {
    IFeatureFlagToggleProps,
    IFeatureFlagToggleRenderProps,
    IFlagConfig,
} from '../types';

/**
 * Headless FeatureFlagToggle component using render props pattern
 * 
 * Provides all the business logic for toggling feature flags while allowing
 * consumers to provide their own UI via the children render prop.
 * 
 * @example
 * <FeatureFlagToggle flag="dev" flagConfigs={FLAG_CONFIGS}>
 *   {({ enabled, isToggling, toggle, flagConfig }) => (
 *     <button onClick={() => toggle(enabled ? 'disable' : 'enable')}>
 *       {enabled ? 'Disable' : 'Enable'} {flagConfig?.name}
 *     </button>
 *   )}
 * </FeatureFlagToggle>
 */
export function FeatureFlagToggle({
    flag,
    flagConfigs,
    apiBasePath = '/ff',
    onToggleComplete,
    children,
}: IFeatureFlagToggleProps): React.ReactElement {
    const enabled: boolean = useFeatureFlag(flag);
    const [isToggling, setIsToggling] = useState<boolean>(false);

    // Find the flag config if provided
    const flagConfig: IFlagConfig | undefined = flagConfigs?.[flag];

    const toggle = async (action: 'enable' | 'disable'): Promise<void> => {
        setIsToggling(true);

        try {
            // Call the toggle API endpoint
            const response: Response = await fetch(`${apiBasePath}/${flag}/${action}`);

            if (!response.ok) {
                throw new Error(`Failed to toggle flag: ${response.statusText}`);
            }

            // Emit event to notify all listeners
            const newEnabled: boolean = action === 'enable';
            emitFlagChange(flag, newEnabled);

            // Call optional completion callback
            if (onToggleComplete) {
                onToggleComplete(flag, newEnabled);
            }

            setIsToggling(false);
        } catch (error: unknown) {
            console.error('Failed to toggle flag:', error);
            setIsToggling(false);
            throw error;
        }
    };

    const renderProps: IFeatureFlagToggleRenderProps = {
        enabled,
        isToggling,
        toggle,
        ...(flagConfig ? { flagConfig } : {}),
    };

    return children(renderProps);
}
