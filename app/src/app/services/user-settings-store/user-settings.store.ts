import type { WritableSignal } from '@angular/core';
import { effect, inject, Injectable, signal } from '@angular/core';

import {
    getAllUserSettings,
    getUserSetting,
    setUserSetting
} from '../../lib/storage/SQLiteAdapter';
import { LedgerStore } from '../ledger-store/ledger.store';

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

    private readonly ledgerStore = inject(LedgerStore);

    constructor() {
        effect(() => {
            if (this.ledgerStore.isInitialized()) {
                try {
                    const all = getAllUserSettings();
                    this.settings.set(all);
                } catch (err) {
                    console.error('Failed to pre-load settings from DB:', err);
                }
            }
        });
    }

    getSetting(key: string, defaultValue?: string): string | undefined {
        const current: Record<string, string> = this.settings();
        if (current[key] !== undefined) return current[key];

        // Try DB
        try {
            const value: string | null = getUserSetting(key);
            if (value !== null) {
                return value;
            }
        } catch {
            // Database might not be initialized yet on app startup
        }

        return defaultValue;
    }

    async updateSetting(key: string, value: string): Promise<void> {
        try {
            setUserSetting(key, value);
            this.settings.update(
                (s: Record<string, string>): Record<string, string> => ({
                    ...s,
                    [key]: value
                })
            );
            await this.ledgerStore.commitToLocal();
        } catch (err: unknown) {
            console.error('Failed to update setting in DB:', err);
        }
    }
}
