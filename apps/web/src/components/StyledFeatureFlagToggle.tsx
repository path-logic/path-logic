'use client';

import Link from 'next/link';
import { FeatureFlagToggle } from '@path-logic/feature-flags/components';
import type { IFlagConfig } from '@path-logic/feature-flags/components';
import { FLAG_CONFIGS } from '@/lib/featureFlags/flags';

interface IStyledFeatureFlagToggleProps {
    flag: string;
    label: string;
    description?: string;
}

/**
 * Styled wrapper around the headless FeatureFlagToggle component
 * Applies Path Logic's design system styling
 */
export function StyledFeatureFlagToggle({
    flag,
    label,
    description,
}: IStyledFeatureFlagToggleProps): React.ReactElement {
    return (
        <FeatureFlagToggle flag={flag} flagConfigs={FLAG_CONFIGS}>
            {({
                enabled,
                isToggling,
                toggle,
                flagConfig,
            }: {
                enabled: boolean;
                isToggling: boolean;
                toggle: (action: 'enable' | 'disable') => Promise<void>;
                flagConfig?: IFlagConfig;
            }) => (
                <div className="group flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-blue-200 hover:shadow-md">
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <h3 className="text-base font-bold text-gray-900">{label}</h3>
                            {enabled && flagConfig?.route && (
                                <Link
                                    href={flagConfig.route}
                                    className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-600 transition-colors hover:bg-blue-100"
                                >
                                    View →
                                </Link>
                            )}
                        </div>
                        {description && (
                            <p className="mt-1 text-sm leading-relaxed text-gray-500">{description}</p>
                        )}
                    </div>

                    <div className="ml-6 flex items-center gap-4">
                        <span
                            className={`text-[11px] font-bold uppercase tracking-widest ${enabled ? 'text-green-600' : 'text-gray-400'
                                }`}
                        >
                            {enabled ? 'Active' : 'Inactive'}
                        </span>

                        <button
                            onClick={(): Promise<void> => toggle(enabled ? 'disable' : 'enable')}
                            disabled={isToggling}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${enabled ? 'bg-blue-600' : 'bg-gray-200'
                                } ${isToggling ? 'opacity-50' : ''}`}
                            type="button"
                            role="switch"
                            aria-checked={enabled}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${enabled ? 'translate-x-6' : 'translate-x-1'
                                    } ${isToggling ? 'animate-pulse' : ''}`}
                            />
                        </button>
                    </div>
                </div>
            )}
        </FeatureFlagToggle>
    );
}
