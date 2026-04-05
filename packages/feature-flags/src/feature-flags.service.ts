import { computed, Injectable, type Signal, signal } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class FeatureFlagService {
    private flagsData = signal<Record<string, boolean>>({});

    /**
     * Initializes the flags usually from a backend or cookies
     */
    init(flags: Record<string, boolean>): void {
        this.flagsData.set(flags);
    }

    /**
     * Overrides a flag
     */
    setFlag(key: string, enabled: boolean): void {
        this.flagsData.update(deps => ({ ...deps, [key]: enabled }));
    }

    /**
     * Check if a feature flag is enabled
     */
    isEnabled(key: string): boolean {
        return !!this.flagsData()[key];
    }

    /**
     * Signal for checking flag state reactively
     */
    isFlagEnabledSignal(key: string): Signal<boolean> {
        return computed(() => !!this.flagsData()[key]);
    }

    /**
     * Toggles a flag
     */
    async toggleFlag(key: string, enabled: boolean, apiPath = '/api/flags/toggle'): Promise<void> {
        try {
            await fetch(apiPath, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ flag: key, enabled }),
            });
            this.setFlag(key, enabled);
        } catch (e) {
            console.error('Failed to toggle feature flag', e);
        }
    }
}
