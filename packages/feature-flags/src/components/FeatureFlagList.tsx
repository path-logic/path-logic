'use client';

import type { IFeatureFlagListProps, IFeatureFlagListRenderProps } from '../types';

/**
 * Headless FeatureFlagList component using render props pattern
 *
 * Iterates over flag configurations and provides render props for each flag.
 * Allows consumers to control the layout and styling of the list.
 *
 * @example
 * <FeatureFlagList flagConfigs={Object.values(FLAG_CONFIGS)}>
 *   {({ flag, index, total }) => (
 *     <div key={flag.key}>
 *       <h3>{flag.name}</h3>
 *       <p>{flag.description}</p>
 *     </div>
 *   )}
 * </FeatureFlagList>
 */
export function FeatureFlagList({
    flagConfigs,
    children,
}: IFeatureFlagListProps): React.ReactElement {
    const total: number = flagConfigs.length;

    return (
        <>
            {flagConfigs.map((flag, index) => {
                const renderProps: IFeatureFlagListRenderProps = {
                    flag,
                    index,
                    total,
                };
                return children(renderProps);
            })}
        </>
    );
}
