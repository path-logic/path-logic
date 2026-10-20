import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LedgerStore } from '../ledger-store/ledger.store';
import { UserSettingsStore } from './user-settings.store';

describe('UserSettingsStore', () => {
    let store: UserSettingsStore;
    let mockLedgerStore: any;

    beforeEach(() => {
        mockLedgerStore = {
            isInitialized: signal(false),
            commitToLocal: vi.fn().mockResolvedValue(undefined)
        };

        TestBed.configureTestingModule({
            providers: [UserSettingsStore, { provide: LedgerStore, useValue: mockLedgerStore }]
        });

        store = TestBed.inject(UserSettingsStore);
    });

    it('should initialize with empty settings', () => {
        expect(store.settings()).toEqual({});
        expect(store.primaryAccountId()).toBeNull();
    });

    it('should update and retrieve primary account id', async () => {
        await store.setPrimaryAccountId('acc-123');
        expect(store.primaryAccountId()).toBe('acc-123');
        expect(store.getSetting('primary_account_id')).toBe('acc-123');

        await store.setPrimaryAccountId(null);
        expect(store.primaryAccountId()).toBeNull();
    });
});
