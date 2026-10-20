import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { KnownCategory } from '@core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LedgerStore } from '../ledger-store/ledger.store';
import { SecurityManagerService } from '../security-manager/security-manager.service';
import { SyncService } from '../sync/sync.service';
import { ImportOrchestrationService } from './import-orchestration.service';

describe('ImportOrchestrationService', () => {
    let service: ImportOrchestrationService;

    let mockLedgerStore: {
        categories: ReturnType<typeof signal<Array<any>>>;
        payees: ReturnType<typeof signal<Array<any>>>;
        transactions: ReturnType<typeof signal<Array<any>>>;
        getCategoryAlias: ReturnType<typeof vi.fn>;
        bulkUpsertPayeesAndAliases: ReturnType<typeof vi.fn>;
        applyReconciliationBatch: ReturnType<typeof vi.fn>;
    };

    let mockSyncService: {
        flushPendingUpload: ReturnType<typeof vi.fn>;
    };

    let mockSecurityManager: {
        acquireExtendedTimeout: ReturnType<typeof vi.fn>;
    };

    const SAMPLE_QIF_WITH_UNKNOWNS = `!Type:Bank
D04/01/2024
T-50.00
PUnknown Grocery Store
MWeekly groceries
LUnknownGroceries
^
D04/02/2024
T-120.00
PUnknown Electric Co
MElectric bill
^
`;

    beforeEach(() => {
        mockLedgerStore = {
            categories: signal<Array<any>>([
                { id: KnownCategory.Uncategorized, name: 'Uncategorized', parentId: null }
            ]),
            payees: signal<Array<any>>([]),
            transactions: signal<Array<any>>([]),
            getCategoryAlias: vi.fn().mockReturnValue(null),
            bulkUpsertPayeesAndAliases: vi.fn().mockResolvedValue(undefined),
            applyReconciliationBatch: vi.fn().mockResolvedValue(undefined)
        };

        mockSyncService = {
            flushPendingUpload: vi.fn().mockResolvedValue(undefined)
        };

        mockSecurityManager = {
            acquireExtendedTimeout: vi.fn().mockReturnValue(vi.fn())
        };

        TestBed.configureTestingModule({
            providers: [
                ImportOrchestrationService,
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: SyncService, useValue: mockSyncService },
                { provide: SecurityManagerService, useValue: mockSecurityManager }
            ]
        });

        service = TestBed.inject(ImportOrchestrationService);
    });

    describe('startImport with deferCategoryMapping', () => {
        it('should halt at mapping_categories when deferCategoryMapping is false (default)', async () => {
            const file = new File([SAMPLE_QIF_WITH_UNKNOWNS], 'sample.qif', { type: 'text/plain' });

            service.startImport(file, 'acc-1');

            // Wait for FileReader onload
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(service.progress().stage).toBe('mapping_categories');
            expect(service.unknownCategories().length).toBeGreaterThan(0);
            expect(service.matches().length).toBe(0); // Pending, not completed yet
        });

        it('should complete to stage "done" with pct 100 when deferCategoryMapping is true', async () => {
            const file = new File([SAMPLE_QIF_WITH_UNKNOWNS], 'sample.qif', { type: 'text/plain' });

            service.startImport(file, 'acc-1', { deferCategoryMapping: true });

            // Wait for FileReader onload
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(service.progress().stage).toBe('done');
            expect(service.progress().pct).toBe(100);
            expect(service.unknownCategories().length).toBe(0);
            expect(service.matches().length).toBe(2);
            expect(service.stats()).toEqual({
                newCount: 2,
                fuzzyCount: 0,
                exactCount: 0,
                totalCount: 2
            });
        });

        it('should commit all transactions with unmapped items defaulting to Uncategorized when deferCategoryMapping was used', async () => {
            const file = new File([SAMPLE_QIF_WITH_UNKNOWNS], 'sample.qif', { type: 'text/plain' });

            service.startImport(file, 'acc-1', { deferCategoryMapping: true });

            // Wait for FileReader onload
            await new Promise(resolve => setTimeout(resolve, 50));

            const imported = await service.commitImport('acc-1');

            expect(imported.length).toBe(2);
            expect(mockLedgerStore.applyReconciliationBatch).toHaveBeenCalled();
            const callArgs = mockLedgerStore.applyReconciliationBatch.mock.calls[0] ?? [];
            const newPayees = (callArgs[0] ?? []) as Array<any>;
            const txsToImport = (callArgs[1] ?? []) as Array<any>;

            expect(newPayees.length).toBe(2);
            expect(txsToImport.length).toBe(2);
            expect(txsToImport[0]?.splits[0]?.categoryId).toBe(KnownCategory.Uncategorized);
            expect(txsToImport[1]?.splits[0]?.categoryId).toBe(KnownCategory.Uncategorized);
        });
    });
});
