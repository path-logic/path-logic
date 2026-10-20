import type { ITransaction } from '@core';
import { TransactionStatus } from '@core';
import { describe, expect, it } from 'vitest';
import {
    createMockLedgerStore,
    MOCK_ACCOUNTS,
    MOCK_TRANSACTIONS,
    provideStoryFixtures,
    StoryPreset
} from './story-fixtures';

describe('StoryFixtures & MockLedgerStore', () => {
    it('initializes with ActiveLedger preset by default', () => {
        const store = createMockLedgerStore();
        expect(store.accounts().length).toBe(MOCK_ACCOUNTS.length);
        expect(store.transactions().length).toBe(MOCK_TRANSACTIONS.length);
        expect(store.isInitialized()).toBe(true);
        expect(store.syncStatus()).toBe('synced');
    });

    it('initializes with empty lists when Empty preset is selected', () => {
        const store = createMockLedgerStore(StoryPreset.Empty);
        expect(store.accounts().length).toBe(0);
        expect(store.transactions().length).toBe(0);
        expect(store.categories().length).toBe(0);
        expect(store.payees().length).toBe(0);
        expect(store.schedules().length).toBe(0);
    });

    it('reactively updates signals on transaction CRUD operations', async () => {
        const store = createMockLedgerStore(StoryPreset.Empty);
        const testTx: ITransaction = {
            id: 'tx-test-unit-01',
            accountId: 'acc-checking-01',
            payeeId: 'payee-employer',
            date: '2026-09-20T00:00:00.000Z',
            payee: 'Acme Corp',
            memo: 'Bonus check',
            totalAmount: 100000,
            status: TransactionStatus.Cleared,
            splits: [{ id: 's1', categoryId: null, memo: 'Bonus', amount: 100000 }],
            checkNumber: null,
            importHash: 'hash-test-01',
            createdAt: '2026-09-20T00:00:00.000Z',
            updatedAt: '2026-09-20T00:00:00.000Z'
        };

        // Add
        await store.addTransaction(testTx);
        expect(store.transactions().length).toBe(1);
        expect(store.transactions()[0]?.memo).toBe('Bonus check');
        expect(store.isDirty()).toBe(true);

        // Update
        const updatedTx: ITransaction = { ...testTx, memo: 'Updated Bonus' };
        await store.updateTransaction(updatedTx);
        expect(store.transactions()[0]?.memo).toBe('Updated Bonus');

        // Remove
        await store.removeTransaction('tx-test-unit-01');
        expect(store.transactions().length).toBe(0);
    });

    it('creates new payee on demand when getOrCreatePayee is called', async () => {
        const store = createMockLedgerStore(StoryPreset.Empty);
        const payee = await store.getOrCreatePayee('Brand New Payee');
        expect(payee.name).toBe('Brand New Payee');
        expect(store.payees().length).toBe(1);

        // Subsequent call returns existing payee without duplicating
        const samePayee = await store.getOrCreatePayee('Brand New Payee');
        expect(samePayee.id).toBe(payee.id);
        expect(store.payees().length).toBe(1);
    });

    it('resets signals back to initial preset state on reset()', async () => {
        const store = createMockLedgerStore(StoryPreset.ActiveLedger);
        const originalCount = store.transactions().length;

        const firstTx = store.transactions()[0];
        expect(firstTx).toBeDefined();
        if (firstTx) {
            await store.removeTransaction(firstTx.id);
        }
        expect(store.transactions().length).toBe(originalCount - 1);

        store.reset();
        expect(store.transactions().length).toBe(originalCount);
    });

    it('returns valid Angular providers array from provideStoryFixtures', () => {
        const providers = provideStoryFixtures({ preset: StoryPreset.ActiveLedger });
        expect(providers.length).toBe(6);
    });
});
