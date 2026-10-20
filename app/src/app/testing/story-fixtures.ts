import type { Provider, WritableSignal } from '@angular/core';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import type {
    Cents,
    IAccount,
    ICategory,
    IPayee,
    IRecurringSchedule,
    ISODateString,
    ITransaction
} from '@core';
import { AccountType, Frequency, PaymentMethod, ScheduleType, TransactionStatus } from '@core';

import { AuthService } from '../services/auth/auth.service';
import { LedgerStore, type SyncStatus } from '../services/ledger-store/ledger.store';
import { PostHogService } from '../services/posthog/posthog.service';
import { SyncService } from '../services/sync/sync.service';
import { UserSettingsStore } from '../services/user-settings-store/user-settings.store';

/**
 * Predefined story presets for initializing mock store state.
 */
export enum StoryPreset {
    Empty = 'EMPTY',
    ActiveLedger = 'ACTIVE_LEDGER',
    SplitLedger = 'SPLIT_LEDGER',
    Reconciliation = 'RECONCILIATION'
}

// ============================================================================
// CANONICAL MOCK SEED DATA
// ============================================================================

export const MOCK_ACCOUNTS: Array<IAccount> = [
    {
        id: 'acc-checking-01',
        name: 'Main Checking',
        type: AccountType.Checking,
        institutionName: 'Chase Bank',
        clearedBalance: 524000 as Cents,
        pendingBalance: 523325 as Cents,
        isActive: true,
        deletedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z' as ISODateString,
        updatedAt: '2026-01-01T00:00:00.000Z' as ISODateString
    },
    {
        id: 'acc-savings-01',
        name: 'High Yield Savings',
        type: AccountType.Savings,
        institutionName: 'Marcus Goldman Sachs',
        clearedBalance: 2500000 as Cents,
        pendingBalance: 2500000 as Cents,
        isActive: true,
        deletedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z' as ISODateString,
        updatedAt: '2026-01-01T00:00:00.000Z' as ISODateString
    },
    {
        id: 'acc-credit-01',
        name: 'Sapphire Preferred',
        type: AccountType.Credit,
        institutionName: 'Chase Bank',
        clearedBalance: -12540 as Cents,
        pendingBalance: -12540 as Cents,
        isActive: true,
        deletedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z' as ISODateString,
        updatedAt: '2026-01-01T00:00:00.000Z' as ISODateString
    }
];

export const MOCK_CATEGORIES: Array<ICategory> = [
    {
        id: 'cat-income-salary',
        name: 'Salary',
        parentId: null,
        description: 'Monthly/biweekly salary income',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z' as ISODateString,
        updatedAt: '2026-01-01T00:00:00.000Z' as ISODateString
    },
    {
        id: 'cat-food-groceries',
        name: 'Groceries',
        parentId: null,
        description: 'Supermarkets and food stores',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z' as ISODateString,
        updatedAt: '2026-01-01T00:00:00.000Z' as ISODateString
    },
    {
        id: 'cat-food-dining',
        name: 'Dining Out',
        parentId: null,
        description: 'Restaurants and cafes',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z' as ISODateString,
        updatedAt: '2026-01-01T00:00:00.000Z' as ISODateString
    },
    {
        id: 'cat-housing-rent',
        name: 'Rent & Mortgage',
        parentId: null,
        description: 'Housing payments',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z' as ISODateString,
        updatedAt: '2026-01-01T00:00:00.000Z' as ISODateString
    },
    {
        id: 'cat-utilities-electric',
        name: 'Electric & Gas',
        parentId: null,
        description: 'Utility bills',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z' as ISODateString,
        updatedAt: '2026-01-01T00:00:00.000Z' as ISODateString
    },
    {
        id: 'cat-taxes-fed',
        name: 'Federal Taxes',
        parentId: null,
        description: 'Tax deductions and payments',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z' as ISODateString,
        updatedAt: '2026-01-01T00:00:00.000Z' as ISODateString
    },
    {
        id: 'cat-health-med',
        name: 'Healthcare Insurance',
        parentId: null,
        description: 'Medical and health insurance',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z' as ISODateString,
        updatedAt: '2026-01-01T00:00:00.000Z' as ISODateString
    }
];

export const MOCK_PAYEES: Array<IPayee> = [
    {
        id: 'payee-employer',
        name: 'Acme Corp Payroll',
        address: '100 Main St',
        city: 'Metropolis',
        state: 'NY',
        zipCode: '10001',
        latitude: null,
        longitude: null,
        website: 'https://acme.example.com',
        phone: '555-0100',
        notes: null,
        defaultCategoryId: 'cat-income-salary',
        createdAt: '2026-01-01T00:00:00.000Z' as ISODateString,
        updatedAt: '2026-01-01T00:00:00.000Z' as ISODateString
    },
    {
        id: 'payee-landlord',
        name: 'Highland Properties',
        address: '200 High St',
        city: 'Metropolis',
        state: 'NY',
        zipCode: '10002',
        latitude: null,
        longitude: null,
        website: null,
        phone: '555-0102',
        notes: null,
        defaultCategoryId: 'cat-housing-rent',
        createdAt: '2026-01-01T00:00:00.000Z' as ISODateString,
        updatedAt: '2026-01-01T00:00:00.000Z' as ISODateString
    },
    {
        id: 'payee-grocer',
        name: "Trader Joe's",
        address: '300 Market Way',
        city: 'Metropolis',
        state: 'NY',
        zipCode: '10003',
        latitude: null,
        longitude: null,
        website: 'https://traderjoes.example.com',
        phone: null,
        notes: null,
        defaultCategoryId: 'cat-food-groceries',
        createdAt: '2026-01-01T00:00:00.000Z' as ISODateString,
        updatedAt: '2026-01-01T00:00:00.000Z' as ISODateString
    },
    {
        id: 'payee-utility',
        name: 'Metro Electric',
        address: '400 Power Ave',
        city: 'Metropolis',
        state: 'NY',
        zipCode: '10004',
        latitude: null,
        longitude: null,
        website: 'https://metroelectric.example.com',
        phone: '555-0104',
        notes: null,
        defaultCategoryId: 'cat-utilities-electric',
        createdAt: '2026-01-01T00:00:00.000Z' as ISODateString,
        updatedAt: '2026-01-01T00:00:00.000Z' as ISODateString
    },
    {
        id: 'payee-cafe',
        name: 'Blue Bottle Coffee',
        address: '500 Bean St',
        city: 'Metropolis',
        state: 'NY',
        zipCode: '10005',
        latitude: null,
        longitude: null,
        website: null,
        phone: null,
        notes: null,
        defaultCategoryId: 'cat-food-dining',
        createdAt: '2026-01-01T00:00:00.000Z' as ISODateString,
        updatedAt: '2026-01-01T00:00:00.000Z' as ISODateString
    }
];

export const MOCK_TRANSACTIONS: Array<ITransaction> = [
    // 1. Split Paycheck: Total +$2,500.00 (+250,000 cents) = +$3,200 Gross - $550 Tax - $150 Insurance
    {
        id: 'tx-paycheck-01',
        accountId: 'acc-checking-01',
        payeeId: 'payee-employer',
        date: '2026-09-15T00:00:00.000Z' as ISODateString,
        payee: 'Acme Corp Payroll',
        memo: 'Biweekly Direct Deposit',
        totalAmount: 250000,
        status: TransactionStatus.Cleared,
        splits: [
            {
                id: 'split-paycheck-gross',
                categoryId: 'cat-income-salary',
                memo: 'Gross Salary',
                amount: 320000
            },
            {
                id: 'split-paycheck-tax',
                categoryId: 'cat-taxes-fed',
                memo: 'Federal Withholding Tax',
                amount: -55000
            },
            {
                id: 'split-paycheck-health',
                categoryId: 'cat-health-med',
                memo: 'Health Insurance Pre-tax',
                amount: -15000
            }
        ],
        checkNumber: null,
        importHash: 'hash-paycheck-01',
        createdAt: '2026-09-15T00:00:00.000Z' as ISODateString,
        updatedAt: '2026-09-15T00:00:00.000Z' as ISODateString
    },
    // 2. Rent Payment: -$1,800.00 (-180,000 cents)
    {
        id: 'tx-rent-01',
        accountId: 'acc-checking-01',
        payeeId: 'payee-landlord',
        date: '2026-09-01T00:00:00.000Z' as ISODateString,
        payee: 'Highland Properties',
        memo: 'September Apartment Rent',
        totalAmount: -180000,
        status: TransactionStatus.Cleared,
        splits: [
            {
                id: 'split-rent-01',
                categoryId: 'cat-housing-rent',
                memo: 'September Apartment Rent',
                amount: -180000
            }
        ],
        checkNumber: '1042',
        importHash: 'hash-rent-01',
        createdAt: '2026-09-01T00:00:00.000Z' as ISODateString,
        updatedAt: '2026-09-01T00:00:00.000Z' as ISODateString
    },
    // 3. Grocery run: -$125.40 (-12,540 cents)
    {
        id: 'tx-groceries-01',
        accountId: 'acc-credit-01',
        payeeId: 'payee-grocer',
        date: '2026-09-18T00:00:00.000Z' as ISODateString,
        payee: "Trader Joe's",
        memo: 'Weekly groceries',
        totalAmount: -12540,
        status: TransactionStatus.Cleared,
        splits: [
            {
                id: 'split-groc-01',
                categoryId: 'cat-food-groceries',
                memo: 'Weekly groceries',
                amount: -12540
            }
        ],
        checkNumber: null,
        importHash: 'hash-groceries-01',
        createdAt: '2026-09-18T00:00:00.000Z' as ISODateString,
        updatedAt: '2026-09-18T00:00:00.000Z' as ISODateString
    },
    // 4. Coffee shop pending: -$6.75 (-675 cents)
    {
        id: 'tx-coffee-01',
        accountId: 'acc-checking-01',
        payeeId: 'payee-cafe',
        date: '2026-09-26T00:00:00.000Z' as ISODateString,
        payee: 'Blue Bottle Coffee',
        memo: 'Latte & Pastry',
        totalAmount: -675,
        status: TransactionStatus.Pending,
        splits: [
            {
                id: 'split-coffee-01',
                categoryId: 'cat-food-dining',
                memo: 'Latte & Pastry',
                amount: -675
            }
        ],
        checkNumber: null,
        importHash: 'hash-coffee-01',
        createdAt: '2026-09-26T00:00:00.000Z' as ISODateString,
        updatedAt: '2026-09-26T00:00:00.000Z' as ISODateString
    }
];

export const MOCK_SCHEDULES: Array<IRecurringSchedule> = [
    {
        id: 'sched-rent-01',
        accountId: 'acc-checking-01',
        payee: 'Highland Properties',
        amount: -180000,
        type: ScheduleType.Debit,
        frequency: Frequency.Monthly,
        paymentMethod: PaymentMethod.DirectDebit,
        startDate: '2026-01-01T00:00:00.000Z' as ISODateString,
        endDate: null,
        nextDueDate: '2026-10-01T00:00:00.000Z' as ISODateString,
        lastOccurredDate: '2026-09-01T00:00:00.000Z' as ISODateString,
        splits: [
            {
                id: 'split-sched-rent',
                categoryId: 'cat-housing-rent',
                memo: 'Apartment Rent',
                amount: -180000
            }
        ],
        memo: 'Monthly Apartment Rent',
        autoPost: true,
        isActive: true
    },
    {
        id: 'sched-electric-01',
        accountId: 'acc-checking-01',
        payee: 'Metro Electric',
        amount: -11500,
        type: ScheduleType.Debit,
        frequency: Frequency.Monthly,
        paymentMethod: PaymentMethod.DirectDebit,
        startDate: '2026-01-15T00:00:00.000Z' as ISODateString,
        endDate: null,
        nextDueDate: '2026-10-15T00:00:00.000Z' as ISODateString,
        lastOccurredDate: '2026-09-15T00:00:00.000Z' as ISODateString,
        splits: [
            {
                id: 'split-sched-elec',
                categoryId: 'cat-utilities-electric',
                memo: 'Electric bill',
                amount: -11500
            }
        ],
        memo: 'Electric bill',
        autoPost: false,
        isActive: true
    }
];

// ============================================================================
// TYPED MOCK STORE FACTORIES
// ============================================================================

export interface IMockLedgerStore {
    readonly transactions: WritableSignal<Array<ITransaction>>;
    readonly accounts: WritableSignal<Array<IAccount>>;
    readonly trashedAccounts: WritableSignal<Array<IAccount>>;
    readonly payees: WritableSignal<Array<IPayee>>;
    readonly categories: WritableSignal<Array<ICategory>>;
    readonly schedules: WritableSignal<Array<IRecurringSchedule>>;
    readonly isLoading: WritableSignal<boolean>;
    readonly isInitialized: WritableSignal<boolean>;
    readonly authError: WritableSignal<boolean>;
    readonly isDirty: WritableSignal<boolean>;
    readonly syncStatus: WritableSignal<SyncStatus>;
    readonly syncError: WritableSignal<string | null>;
    readonly hasLocalFallback: WritableSignal<boolean>;
    readonly mergeCount: WritableSignal<number>;

    initialize: () => Promise<void>;
    addTransaction: (tx: ITransaction) => Promise<void>;
    addTransactions: (txs: Array<ITransaction>) => Promise<void>;
    updateTransaction: (tx: ITransaction) => Promise<void>;
    removeTransaction: (txId: string) => Promise<void>;
    addAccount: (acc: IAccount) => Promise<void>;
    updateAccount: (acc: IAccount) => Promise<void>;
    removeAccount: (accId: string) => Promise<void>;
    addCategory: (cat: ICategory) => Promise<void>;
    updateCategory: (cat: ICategory) => Promise<void>;
    createCategory: (name: string, parentId?: string | null) => Promise<ICategory>;
    getOrCreatePayee: (name: string) => Promise<IPayee>;
    applyReconciliationBatch: (
        newPayees: Array<IPayee>,
        txsToImport: Array<ITransaction>,
        txsToUpdate: Array<ITransaction>
    ) => Promise<void>;
    addSchedule: (sched: IRecurringSchedule) => Promise<void>;
    updateSchedule: (sched: IRecurringSchedule) => Promise<void>;
    removeSchedule: (schedId: string) => Promise<void>;
    reset: () => void;
}

/**
 * Creates a fully reactive, in-memory mock of the Angular LedgerStore.
 * Changes made by forms and user actions dynamically update the signals.
 */
export function createMockLedgerStore(
    preset: StoryPreset = StoryPreset.ActiveLedger
): IMockLedgerStore {
    const initialAccounts = preset === StoryPreset.Empty ? [] : [...MOCK_ACCOUNTS];
    const initialCategories = preset === StoryPreset.Empty ? [] : [...MOCK_CATEGORIES];
    const initialPayees = preset === StoryPreset.Empty ? [] : [...MOCK_PAYEES];
    const initialTransactions = preset === StoryPreset.Empty ? [] : [...MOCK_TRANSACTIONS];
    const initialSchedules = preset === StoryPreset.Empty ? [] : [...MOCK_SCHEDULES];

    const transactions = signal<Array<ITransaction>>(initialTransactions);
    const accounts = signal<Array<IAccount>>(initialAccounts);
    const trashedAccounts = signal<Array<IAccount>>([]);
    const payees = signal<Array<IPayee>>(initialPayees);
    const categories = signal<Array<ICategory>>(initialCategories);
    const schedules = signal<Array<IRecurringSchedule>>(initialSchedules);
    const isLoading = signal<boolean>(false);
    const isInitialized = signal<boolean>(true);
    const authError = signal<boolean>(false);
    const isDirty = signal<boolean>(false);
    const syncStatus = signal<SyncStatus>('synced');
    const syncError = signal<string | null>(null);
    const hasLocalFallback = signal<boolean>(true);
    const mergeCount = signal<number>(0);

    const store: IMockLedgerStore = {
        transactions,
        accounts,
        trashedAccounts,
        payees,
        categories,
        schedules,
        isLoading,
        isInitialized,
        authError,
        isDirty,
        syncStatus,
        syncError,
        hasLocalFallback,
        mergeCount,

        initialize: async (): Promise<void> => {
            isInitialized.set(true);
        },

        addTransaction: async (tx: ITransaction): Promise<void> => {
            transactions.update(prev => [tx, ...prev]);
            isDirty.set(true);
        },

        addTransactions: async (txs: Array<ITransaction>): Promise<void> => {
            transactions.update(prev => [...txs, ...prev]);
            isDirty.set(true);
        },

        updateTransaction: async (tx: ITransaction): Promise<void> => {
            transactions.update(prev => prev.map(t => (t.id === tx.id ? tx : t)));
            isDirty.set(true);
        },

        removeTransaction: async (txId: string): Promise<void> => {
            transactions.update(prev => prev.filter(t => t.id !== txId));
            isDirty.set(true);
        },

        addAccount: async (acc: IAccount): Promise<void> => {
            accounts.update(prev => [...prev, acc]);
            isDirty.set(true);
        },

        updateAccount: async (acc: IAccount): Promise<void> => {
            accounts.update(prev => prev.map(a => (a.id === acc.id ? acc : a)));
            isDirty.set(true);
        },

        removeAccount: async (accId: string): Promise<void> => {
            accounts.update(prev => prev.filter(a => a.id !== accId));
            isDirty.set(true);
        },

        addCategory: async (cat: ICategory): Promise<void> => {
            categories.update(prev => [...prev, cat]);
            isDirty.set(true);
        },

        updateCategory: async (cat: ICategory): Promise<void> => {
            categories.update(prev => prev.map(c => (c.id === cat.id ? cat : c)));
            isDirty.set(true);
        },

        createCategory: async (
            name: string,
            parentId: string | null = null
        ): Promise<ICategory> => {
            const existing = categories().find(c => c.name.toLowerCase() === name.toLowerCase());
            if (existing) return existing;
            const newCat: ICategory = {
                id: `cat-mock-${Date.now()}`,
                name,
                parentId,
                description: null,
                isActive: true,
                createdAt: new Date().toISOString() as ISODateString,
                updatedAt: new Date().toISOString() as ISODateString
            };
            categories.update(prev => [...prev, newCat]);
            isDirty.set(true);
            return newCat;
        },

        getOrCreatePayee: async (name: string): Promise<IPayee> => {
            const existing = payees().find(p => p.name.toLowerCase() === name.toLowerCase());
            if (existing) return existing;
            const newPayee: IPayee = {
                id: `payee-mock-${Date.now()}`,
                name,
                address: null,
                city: null,
                state: null,
                zipCode: null,
                latitude: null,
                longitude: null,
                website: null,
                phone: null,
                notes: null,
                defaultCategoryId: null,
                createdAt: new Date().toISOString() as ISODateString,
                updatedAt: new Date().toISOString() as ISODateString
            };
            payees.update(prev => [...prev, newPayee]);
            return newPayee;
        },

        applyReconciliationBatch: async (
            newPayees: Array<IPayee>,
            txsToImport: Array<ITransaction>,
            txsToUpdate: Array<ITransaction>
        ): Promise<void> => {
            if (newPayees.length > 0) {
                payees.update(prev => [...newPayees, ...prev]);
            }
            if (txsToImport.length > 0) {
                transactions.update(prev => [...txsToImport, ...prev]);
            }
            if (txsToUpdate.length > 0) {
                const updateMap = new Map(txsToUpdate.map(t => [t.id, t]));
                transactions.update(prev => prev.map(t => updateMap.get(t.id) ?? t));
            }
            isDirty.set(true);
        },

        addSchedule: async (sched: IRecurringSchedule): Promise<void> => {
            schedules.update(prev => [...prev, sched]);
            isDirty.set(true);
        },

        updateSchedule: async (sched: IRecurringSchedule): Promise<void> => {
            schedules.update(prev => prev.map(s => (s.id === sched.id ? sched : s)));
            isDirty.set(true);
        },

        removeSchedule: async (schedId: string): Promise<void> => {
            schedules.update(prev => prev.filter(s => s.id !== schedId));
            isDirty.set(true);
        },

        reset: (): void => {
            accounts.set(initialAccounts);
            categories.set(initialCategories);
            payees.set(initialPayees);
            transactions.set(initialTransactions);
            schedules.set(initialSchedules);
            isLoading.set(false);
            isInitialized.set(true);
            authError.set(false);
            isDirty.set(false);
            syncStatus.set('synced');
            syncError.set(null);
            hasLocalFallback.set(true);
            mergeCount.set(0);
        }
    };

    return store;
}

export interface IMockAuthService {
    currentUser: WritableSignal<{ displayName: string; email: string; uid: string } | null>;
    logout: () => Promise<void>;
}

export function createMockAuthService(
    user = { displayName: 'Alex Mercer', email: 'alex@example.com', uid: 'user-story-mock-01' }
): IMockAuthService {
    return {
        currentUser: signal(user),
        logout: async (): Promise<void> => {
            // no-op for story mock
        }
    };
}

export interface IMockSyncService {
    isSyncing: WritableSignal<boolean>;
    syncError: WritableSignal<string | null>;
    triggerSync: () => Promise<void>;
    getSyncStatus: () => { lastSyncTime: number };
}

export function createMockSyncService(): IMockSyncService {
    return {
        isSyncing: signal(false),
        syncError: signal(null),
        triggerSync: async (): Promise<void> => {
            // no-op for story mock
        },
        getSyncStatus: (): { lastSyncTime: number } => ({ lastSyncTime: Date.now() })
    };
}

export interface IMockUserSettingsStore {
    getSetting: (key: string) => string;
    updateSetting: (key: string, value: string) => void;
}

export function createMockUserSettingsStore(
    settings: Record<string, string> = { 'feature.ai-categorize': 'true' }
): IMockUserSettingsStore {
    const store = { ...settings };
    return {
        getSetting: (key: string): string => store[key] ?? 'false',
        updateSetting: (key: string, value: string): void => {
            store[key] = value;
        }
    };
}

export interface IMockPostHogService {
    posthog: {
        capture: (eventName: string, properties?: Record<string, unknown>) => void;
    };
}

export function createMockPostHogService(): IMockPostHogService {
    return {
        posthog: {
            capture: (): void => {
                // no-op for story mock
            }
        }
    };
}

export interface IMockRouter {
    navigate: (commands: Array<string>, extras?: Record<string, unknown>) => Promise<boolean>;
}

export function createMockRouter(): IMockRouter {
    return {
        navigate: async (): Promise<boolean> => true
    };
}

export interface IProvideStoryFixturesOptions {
    preset?: StoryPreset;
    customLedger?: IMockLedgerStore;
    customAuth?: IMockAuthService;
    customSync?: IMockSyncService;
    customSettings?: IMockUserSettingsStore;
    customPostHog?: IMockPostHogService;
    customRouter?: IMockRouter;
}

/**
 * Returns a standardized Angular Provider array for Storybook decorators and Vitest test beds.
 */
export function provideStoryFixtures(options: IProvideStoryFixturesOptions = {}): Array<Provider> {
    const ledger =
        options.customLedger ?? createMockLedgerStore(options.preset ?? StoryPreset.ActiveLedger);
    const auth = options.customAuth ?? createMockAuthService();
    const sync = options.customSync ?? createMockSyncService();
    const settings = options.customSettings ?? createMockUserSettingsStore();
    const posthog = options.customPostHog ?? createMockPostHogService();
    const router = options.customRouter ?? createMockRouter();

    return [
        { provide: LedgerStore, useValue: ledger },
        { provide: AuthService, useValue: auth },
        { provide: SyncService, useValue: sync },
        { provide: UserSettingsStore, useValue: settings },
        { provide: PostHogService, useValue: posthog },
        { provide: Router, useValue: router }
    ];
}
