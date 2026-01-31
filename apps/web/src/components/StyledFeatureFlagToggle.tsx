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
                <div className="flex items-center justify-between p-4 px-5">
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <h3 className="text-sm font-bold text-foreground uppercase tracking-tight">
                                {label}
                            </h3>
                            {enabled && flagConfig?.route && (
                                <Link
                                    href={flagConfig.route}
                                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-primary transition-colors hover:bg-primary/20"
                                >
                                    Jump →
                                </Link>
                            )}
                        </div>
                        {description && (
                            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 leading-relaxed italic line-clamp-1">
                                {description}
                            </p>
                        )}
                    </div>

                    <div className="ml-6 flex items-center gap-4">
                        <span
                            className={`text-[9px] font-black uppercase tracking-[0.2em] ${
                                enabled ? 'text-emerald-500' : 'text-muted-foreground/40'
                            }`}
                        >
                            {enabled ? 'Active' : 'Offline'}
                        </span>

                        <button
                            onClick={(): Promise<void> => toggle(enabled ? 'disable' : 'enable')}
                            disabled={isToggling}
                            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-primary focus:ring-offset-1 focus:ring-offset-background ${
                                enabled ? 'bg-primary' : 'bg-muted-foreground/20'
                            } ${isToggling ? 'opacity-50' : ''}`}
                            type="button"
                            role="switch"
                            aria-checked={enabled}
                        >
                            <span
                                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                                    enabled ? 'translate-x-[18px]' : 'translate-x-[2px]'
                                } ${isToggling ? 'animate-pulse' : ''}`}
                            />
                        </button>
                    </div>
                </div>
            )}
        </FeatureFlagToggle>
    );
}
