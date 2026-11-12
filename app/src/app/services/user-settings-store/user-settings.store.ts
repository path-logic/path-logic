import type { Signal, WritableSignal } from '@angular/core';
import { computed, effect, inject, Injectable, signal } from '@angular/core';

import {
    getAllUserSettings,
    getUserSetting,
    setUserSetting
} from '../../lib/storage/SQLiteAdapter';
import { LedgerStore } from '../ledger-store/ledger.store';

const LOCAL_STORAGE_SETTINGS_KEY = 'path_logic_user_settings';

/**
 * Angular signal-based user settings store.
 * Replaces the Zustand `useUserStore`.
 *
 * Provides a reactive wrapper around the SQLite user_settings table
 * with local browser storage fallback so API keys and preferences
 * survive database resets or pre-initialization reads.
 */
@Injectable({ providedIn: 'root' })
export class UserSettingsStore {
    readonly settings: WritableSignal<Record<string, string>> = signal<Record<string, string>>(
        this.readFromLocalStorage()
    );
    readonly isLoading: WritableSignal<boolean> = signal<boolean>(false);

    /** Primary/Hero account ID selected by the user. */
    readonly primaryAccountId: Signal<string | null> = computed(() => {
        const id = this.settings()['primary_account_id'];
        return id && id.trim().length > 0 ? id : null;
    });

    private readonly ledgerStore = inject(LedgerStore);

    constructor() {
        effect(() => {
            const initialized =
                typeof this.ledgerStore.isInitialized === 'function'
                    ? this.ledgerStore.isInitialized()
                    : false;
            // Track dbRevision so reloading encrypted snapshots from IndexedDB refreshes settings
            const revision =
                typeof this.ledgerStore.dbRevision === 'function'
                    ? this.ledgerStore.dbRevision()
                    : 0;
            if (initialized || revision > 0) {
                try {
                    const dbSettings = getAllUserSettings();
                    const localSettings = this.readFromLocalStorage();
                    const merged: Record<string, string> = {
                        ...localSettings,
                        ...dbSettings
                    };
                    this.settings.set(merged);
                    this.writeToLocalStorage(merged);

                    // Ensure any local settings (e.g., API keys after a workspace reset) are synced to SQLite
                    for (const [k, v] of Object.entries(localSettings)) {
                        if (dbSettings[k] === undefined && v) {
                            try {
                                setUserSetting(k, v);
                            } catch {
                                // Ignore if DB is not writable yet
                            }
                        }
                    }
                } catch (err) {
                    console.error('Failed to pre-load settings from DB:', err);
                }
            }
        });
    }

    getSetting(key: string, defaultValue?: string): string | undefined {
        const current: Record<string, string> = this.settings();
        if (current[key] !== undefined && current[key] !== '') return current[key];

        // Try DB
        try {
            const value: string | null = getUserSetting(key);
            if (value !== null && value !== '') {
                return value;
            }
        } catch {
            // Database might not be initialized yet on app startup
        }

        // Fallback to localStorage mirror
        const local = this.readFromLocalStorage();
        if (local[key] !== undefined && local[key] !== '') {
            return local[key];
        }

        if (current[key] !== undefined) return current[key];
        return defaultValue;
    }

    async updateSetting(key: string, value: string): Promise<void> {
        this.settings.update((s: Record<string, string>): Record<string, string> => {
            const next = {
                ...s,
                [key]: value
            };
            this.writeToLocalStorage(next);
            return next;
        });

        try {
            setUserSetting(key, value);
            await this.ledgerStore.commitToLocal();
        } catch (err: unknown) {
            console.error('Failed to update setting in DB:', err);
        }
    }

    /**
     * Sets or unsets the primary/hero account ID.
     * @param accountId The ID of the account to set as primary, or null to clear.
     */
    async setPrimaryAccountId(accountId: string | null): Promise<void> {
        await this.updateSetting('primary_account_id', accountId ?? '');
    }

    private readFromLocalStorage(): Record<string, string> {
        if (typeof localStorage === 'undefined') return {};
        try {
            const raw = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
            if (!raw) return {};
            const parsed: unknown = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return parsed as Record<string, string>;
            }
        } catch {
            // Ignore malformed storage
        }
        return {};
    }

    private writeToLocalStorage(data: Record<string, string>): void {
        if (typeof localStorage === 'undefined') return;
        try {
            localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(data));
        } catch {
            // Ignore quota or storage errors
        }
    }
}
