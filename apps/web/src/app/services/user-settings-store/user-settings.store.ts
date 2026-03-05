import type { WritableSignal } from '@angular/core';
import { Injectable, signal } from '@angular/core';

import { getUserSetting, setUserSetting } from '../../lib/storage/SQLiteAdapter';

/**
 * Angular signal-based user settings store.
 * Replaces the Zustand `useUserStore`.
 *
 * Provides a reactive wrapper around the SQLite user_settings table.
 */
@Injectable({ providedIn: 'root' })
export class UserSettingsStore {
    readonly settings: WritableSignal<Record<string, string>> = signal<Record<string, string>>({});
    readonly isLoading: WritableSignal<boolean> = signal<boolean>(false);

    getSetting(key: string, defaultValue?: string): string | undefined {
        const current: Record<string, string> = this.settings();
        if (current[key] !== undefined) return current[key];

        // Try DB
        try {
            const value: string | null = getUserSetting(key);
            if (value !== null) {
                this.settings.update(
                    (s: Record<string, string>): Record<string, string> => ({
                        ...s,
                        [key]: value,
                    }),
                );
                return value;
            }
        } catch (e: unknown) {
            console.error('Failed to get setting from DB:', e);
        }

        return defaultValue;
    }

    updateSetting(key: string, value: string): void {
        try {
            setUserSetting(key, value);
            this.settings.update(
                (s: Record<string, string>): Record<string, string> => ({
                    ...s,
                    [key]: value,
                }),
            );
        } catch (e: unknown) {
            console.error('Failed to update setting in DB:', e);
        }
    }
}
