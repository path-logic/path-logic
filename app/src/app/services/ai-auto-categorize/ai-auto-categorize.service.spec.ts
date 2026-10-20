import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ICategory, ITransaction } from '@core';
import { KnownCategory, TransactionStatus, type Cents, type ISODateString } from '@core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GeminiService } from '../gemini/gemini.service';
import { LedgerStore } from '../ledger-store/ledger.store';
import { SecurityManagerService } from '../security-manager/security-manager.service';
import { AiAutoCategorizeService } from './ai-auto-categorize.service';
import type { IAiCategorySuggestion } from './ai-auto-categorize.types';

describe('AiAutoCategorizeService', () => {
    let service: AiAutoCategorizeService;
    let mockSecurityManager: {
        acquireExtendedTimeout: ReturnType<typeof vi.fn>;
        releaseExtendedTimeout: ReturnType<typeof vi.fn>;
    };
    let mockLedgerStore: {
        categories: ReturnType<typeof signal>;
        payees: ReturnType<typeof signal>;
        transactions: ReturnType<typeof signal>;
        createCategory: ReturnType<typeof vi.fn>;
        bulkUpsertPayeesAndAliases: ReturnType<typeof vi.fn>;
        updateTransaction: ReturnType<typeof vi.fn>;
    };
    let mockGeminiService: {
        hasKey: ReturnType<typeof vi.fn>;
        apiKey: ReturnType<typeof vi.fn>;
        generateContent: ReturnType<typeof vi.fn>;
    };

    const mockCategories: Array<ICategory> = [
        {
            id: KnownCategory.Groceries,
            name: 'Groceries',
            parentId: null,
            description: null,
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z' as ISODateString,
            updatedAt: '2026-01-01T00:00:00Z' as ISODateString
        },
        {
            id: KnownCategory.CoffeeShops,
            name: 'Coffee Shops',
            parentId: null,
            description: null,
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z' as ISODateString,
            updatedAt: '2026-01-01T00:00:00Z' as ISODateString
        },
        {
            id: KnownCategory.Restaurants,
            name: 'Restaurants',
            parentId: null,
            description: null,
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z' as ISODateString,
            updatedAt: '2026-01-01T00:00:00Z' as ISODateString
        }
    ];

    const mockTransactions: Array<ITransaction> = [
        {
            id: 'tx-1',
            accountId: 'acc-1',
            date: '2026-08-15' as ISODateString,
            payee: 'Trader Joe',
            payeeId: 'p-1',
            memo: '',
            totalAmount: -5000 as Cents,
            status: TransactionStatus.Cleared,
            splits: [
                {
                    id: 's-1',
                    amount: -5000 as Cents,
                    categoryId: KnownCategory.Uncategorized,
                    memo: ''
                }
            ],
            checkNumber: null,
            importHash: 'h-1',
            createdAt: '2026-08-15T00:00:00Z' as ISODateString,
            updatedAt: '2026-08-15T00:00:00Z' as ISODateString
        },
        {
            id: 'tx-2',
            accountId: 'acc-1',
            date: '2026-08-16' as ISODateString,
            payee: 'Starbucks Coffee',
            payeeId: 'p-2',
            memo: '',
            totalAmount: -650 as Cents,
            status: TransactionStatus.Cleared,
            splits: [
                {
                    id: 's-2',
                    amount: -650 as Cents,
                    categoryId: KnownCategory.Uncategorized,
                    memo: ''
                }
            ],
            checkNumber: null,
            importHash: 'h-2',
            createdAt: '2026-08-16T00:00:00Z' as ISODateString,
            updatedAt: '2026-08-16T00:00:00Z' as ISODateString
        }
    ];

    beforeEach(() => {
        const releaseFn = vi.fn();
        mockSecurityManager = {
            acquireExtendedTimeout: vi.fn().mockReturnValue(releaseFn),
            releaseExtendedTimeout: vi.fn()
        };

        mockLedgerStore = {
            categories: signal(mockCategories),
            payees: signal([]),
            transactions: signal(mockTransactions),
            createCategory: vi
                .fn()
                .mockResolvedValue({ id: 'cat-new-1', name: 'Snacks', parentId: null }),
            bulkUpsertPayeesAndAliases: vi.fn().mockResolvedValue(undefined),
            updateTransaction: vi.fn().mockResolvedValue(undefined)
        };

        mockGeminiService = {
            hasKey: vi.fn().mockReturnValue(true),
            apiKey: vi.fn().mockReturnValue('test-key'),
            generateContent: vi.fn().mockResolvedValue(JSON.stringify({ mappings: [] }))
        };

        TestBed.configureTestingModule({
            providers: [
                AiAutoCategorizeService,
                { provide: SecurityManagerService, useValue: mockSecurityManager },
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: GeminiService, useValue: mockGeminiService }
            ]
        });

        service = TestBed.inject(AiAutoCategorizeService);
    });

    it('should be created in idle status', () => {
        expect(service).toBeTruthy();
        expect(service.status()).toBe('idle');
        expect(service.suggestions()).toEqual([]);
    });

    it('should acquire extended timeout when background matching starts', async () => {
        await service.startBackgroundCategorization(mockTransactions);

        expect(mockSecurityManager.acquireExtendedTimeout).toHaveBeenCalledWith(
            'ai_autocategorize'
        );
        expect(service.status()).toBe('completed');
        expect(service.suggestions().length).toBeGreaterThan(0);

        // Trader Joe should be matched to Groceries via heuristics
        const traderJoeMatch = service
            .suggestions()
            .find((s: IAiCategorySuggestion) => s.unknownCategory.includes('Trader Joe'));
        expect(traderJoeMatch).toBeDefined();
        expect(traderJoeMatch?.matchedCategoryId).toBe(KnownCategory.Groceries);

        // Starbucks should be matched to CoffeeShops via heuristics
        const starbucksMatch = service
            .suggestions()
            .find((s: IAiCategorySuggestion) => s.unknownCategory.includes('Starbucks'));
        expect(starbucksMatch).toBeDefined();
        expect(starbucksMatch?.matchedCategoryId).toBe(KnownCategory.CoffeeShops);
    });

    it('should apply categories and bulk upsert on acceptAll', async () => {
        await service.startBackgroundCategorization(mockTransactions);
        expect(service.status()).toBe('completed');

        const updatedCount = await service.acceptAll();
        expect(updatedCount).toBe(2);
        expect(mockLedgerStore.updateTransaction).toHaveBeenCalledTimes(2);
        expect(mockLedgerStore.bulkUpsertPayeesAndAliases).toHaveBeenCalled();
        expect(service.status()).toBe('idle');
    });

    it('should reset and release timeout on dismiss or cancel', async () => {
        const releaseFn = vi.fn();
        mockSecurityManager.acquireExtendedTimeout.mockReturnValue(releaseFn);

        await service.startBackgroundCategorization(mockTransactions);
        service.dismiss();

        expect(service.status()).toBe('idle');
        expect(service.suggestions()).toEqual([]);
        expect(releaseFn).toHaveBeenCalled();
    });
});
