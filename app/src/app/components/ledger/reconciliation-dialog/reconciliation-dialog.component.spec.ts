import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type { ICategory, IParsedTransaction, IReconciliationMatch, ITransaction } from '@core';
import { TransactionStatus } from '@core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LARGE_DATASET_THRESHOLD } from '../../../services/import/import.types';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { PostHogService } from '../../../services/posthog/posthog.service';
import { ReconciliationDialogComponent } from './reconciliation-dialog.component';

function createParsedTx(overrides: Partial<IParsedTransaction> = {}): IParsedTransaction {
    return {
        date: '2024-03-01',
        amount: -4500,
        payee: 'Payee',
        memo: '',
        checkNumber: null,
        category: null,
        splits: [],
        importHash: 'hash-default',
        ...overrides
    };
}

describe('ReconciliationDialogComponent', () => {
    let component: ReconciliationDialogComponent;
    let fixture: ComponentFixture<ReconciliationDialogComponent>;

    const mockTransactions: Array<ITransaction> = [
        {
            id: 'tx-1',
            accountId: 'acc-1',
            date: '2024-03-01T00:00:00Z',
            payeeId: 'p1',
            payee: 'Chevron',
            totalAmount: -4500,
            status: TransactionStatus.Pending,
            splits: [],
            createdAt: '2024-03-01T00:00:00Z',
            updatedAt: '2024-03-01T00:00:00Z'
        },
        {
            id: 'tx-2',
            accountId: 'acc-1',
            date: '2024-03-02T00:00:00Z',
            payeeId: 'p2',
            payee: 'Target Store',
            totalAmount: 15000,
            status: TransactionStatus.Cleared,
            splits: [],
            createdAt: '2024-03-02T00:00:00Z',
            updatedAt: '2024-03-02T00:00:00Z'
        },
        {
            id: 'tx-old',
            accountId: 'acc-1',
            date: '2023-01-01T00:00:00Z',
            payeeId: 'p3',
            payee: 'Old Tx',
            totalAmount: 1000,
            status: TransactionStatus.Cleared,
            splits: [],
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z'
        }
    ] as Array<any>;

    const mockCategories: Array<ICategory> = [
        {
            id: 'cat-1',
            name: 'Groceries',
            parentId: null,
            isActive: true,
            description: '',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01'
        },
        {
            id: 'cat-2',
            name: 'Utilities',
            parentId: null,
            isActive: true,
            description: '',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01'
        }
    ] as Array<any>;

    const mockMatches: Array<IReconciliationMatch> = [
        {
            type: 'fuzzy',
            parsedTx: createParsedTx({
                date: '2024-03-01',
                amount: -4500,
                payee: 'Chevron Oil',
                memo: 'Gas station'
            }),
            confidence: 0.85,
            existingTxId: 'tx-1'
        },
        {
            type: 'none',
            parsedTx: createParsedTx({
                date: '2024-03-05',
                amount: -1200,
                payee: 'Netflix'
            }),
            confidence: 0
        },
        {
            type: 'exact',
            parsedTx: createParsedTx({
                date: '2024-03-02',
                amount: 15000,
                payee: 'Target Store'
            }),
            confidence: 1.0,
            existingTxId: 'tx-2'
        }
    ];

    let mockLedgerStore: {
        transactions: ReturnType<typeof signal<Array<ITransaction>>>;
        categories: ReturnType<typeof signal<Array<ICategory>>>;
        addTransactions: ReturnType<typeof vi.fn>;
        updateTransactions: ReturnType<typeof vi.fn>;
    };

    let mockPosthogService: {
        posthog: {
            capture: ReturnType<typeof vi.fn>;
        };
    };

    beforeEach(async () => {
        vi.clearAllMocks();

        mockLedgerStore = {
            transactions: signal<Array<ITransaction>>(mockTransactions),
            categories: signal<Array<ICategory>>(mockCategories),
            addTransactions: vi.fn().mockResolvedValue(undefined),
            updateTransactions: vi.fn().mockResolvedValue(undefined)
        };

        mockPosthogService = {
            posthog: {
                capture: vi.fn()
            }
        };

        await TestBed.configureTestingModule({
            imports: [ReconciliationDialogComponent],
            providers: [
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: PostHogService, useValue: mockPosthogService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ReconciliationDialogComponent);
        component = fixture.componentInstance;
    });

    afterEach(() => {
        // Clean up PrimeNG dialog masks appended to document.body
        const dialogMasks = document.querySelectorAll('.p-dialog-mask');
        dialogMasks.forEach(mask => mask.remove());
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    describe('Initialization & Inputs', () => {
        it('should initialize with default states', () => {
            expect(component.isOpen()).toBe(false);
            expect(component.isProcessing()).toBe(false);
            expect(component.activeTab()).toBe('all');
            expect(component.page()).toBe(0);
            expect(component.pageSize()).toBe(50);
            expect(component.smartDefaultsApplied()).toBe(false);
            expect(component.selectedCount()).toBe(0);
        });

        it('should initialize decisions based on match types when opened', async () => {
            fixture.componentRef.setInput('matches', mockMatches);
            fixture.componentRef.setInput('isOpen', true);
            fixture.detectChanges();
            await fixture.whenStable();

            const decisions = component.decisions();
            expect(decisions[0]).toBe('match'); // fuzzy
            expect(decisions[1]).toBe('import'); // none
            expect(decisions[2]).toBe('ignore'); // exact
        });

        it('should compute tabCounts correctly', () => {
            fixture.componentRef.setInput('matches', mockMatches);
            fixture.detectChanges();

            const counts = component.tabCounts();
            expect(counts.all).toBe(3);
            expect(counts.new).toBe(1);
            expect(counts.review).toBe(1);
            expect(counts.skipped).toBe(1);
        });

        it('should compute dialog dimensions based on dataset size', () => {
            fixture.componentRef.setInput('matches', mockMatches);
            fixture.detectChanges();

            expect(component.isLargeDataset()).toBe(false);
            expect(component.dialogWidth()).toBe('60rem');
            expect(component.dialogClasses()).toContain('penny-dialog');

            const largeMatches: Array<IReconciliationMatch> = Array.from(
                { length: LARGE_DATASET_THRESHOLD },
                (_, i) => ({
                    type: 'none',
                    parsedTx: createParsedTx({
                        date: '2024-03-01',
                        amount: -100 * (i + 1),
                        payee: `Payee ${i}`
                    }),
                    confidence: 0
                })
            );
            fixture.componentRef.setInput('matches', largeMatches);
            fixture.detectChanges();

            expect(component.isLargeDataset()).toBe(true);
            expect(component.dialogWidth()).toBe('72rem');
        });
    });

    describe('Decision & Override Helpers', () => {
        beforeEach(async () => {
            fixture.componentRef.setInput('matches', mockMatches);
            fixture.componentRef.setInput('isOpen', true);
            fixture.detectChanges();
            await fixture.whenStable();
        });

        it('should update decision when setDecision is called', () => {
            // Reject fuzzy match by setting to 'ignore'
            component.setDecision(0, 'ignore');
            expect(component.decisions()[0]).toBe('ignore');

            // Accept fuzzy match by setting to 'match'
            component.setDecision(0, 'match');
            expect(component.decisions()[0]).toBe('match');

            // Set to import
            component.setDecision(0, 'import');
            expect(component.decisions()[0]).toBe('import');
        });

        it('should set payee override', () => {
            component.setPayeeOverride(1, 'Updated Netflix Inc');
            expect(component.payeeOverrides()[1]).toBe('Updated Netflix Inc');
        });

        it('should set category override', () => {
            component.setCategoryOverride(1, 'cat-1');
            expect(component.categoryOverrides()[1]).toBe('cat-1');
        });

        it('should set match override and reset editingMatchIdx', () => {
            component.editingMatchIdx.set(0);
            component.setMatchOverride(0, 'tx-2');

            expect(component.matchOverrides()[0]).toBe('tx-2');
            expect(component.editingMatchIdx()).toBeNull();
            expect(component.getEffectiveMatchId(0, 'tx-1')).toBe('tx-2');
        });

        it('should apply smart defaults and switch to review tab', () => {
            component.applySmartDefaults();

            expect(component.smartDefaultsApplied()).toBe(true);
            expect(component.decisions()[1]).toBe('import'); // none -> import
            expect(component.decisions()[2]).toBe('ignore'); // exact -> ignore
            expect(component.decisions()[0]).toBe('match'); // fuzzy remains match
            expect(component.activeTab()).toBe('review');
            expect(component.page()).toBe(0);
        });

        it('should apply smart defaults when there are no fuzzy matches without switching tab', () => {
            const noFuzzyMatches: Array<IReconciliationMatch> = [
                {
                    type: 'none',
                    parsedTx: createParsedTx({ date: '2024-03-01', amount: -100, payee: 'Store' }),
                    confidence: 0
                }
            ];
            fixture.componentRef.setInput('matches', noFuzzyMatches);
            fixture.detectChanges();

            component.setTab('all');
            component.applySmartDefaults();
            expect(component.activeTab()).toBe('all');
        });
    });

    describe('Large Dataset Mode: Tabs, Pagination & Bulk Actions', () => {
        let largeMatches: Array<IReconciliationMatch>;

        beforeEach(async () => {
            largeMatches = Array.from({ length: 60 }, (_, i): IReconciliationMatch => {
                let type: 'none' | 'fuzzy' | 'exact' = 'none';
                if (i % 3 === 1) type = 'fuzzy';
                if (i % 3 === 2) type = 'exact';
                const match: IReconciliationMatch = {
                    type,
                    parsedTx: createParsedTx({
                        date: '2024-03-01',
                        amount: -1000 * (i + 1),
                        payee: `Payee ${i}`
                    }),
                    confidence: type === 'exact' ? 1 : type === 'fuzzy' ? 0.7 : 0
                };
                if (type !== 'none') {
                    match.existingTxId = 'tx-1';
                }
                return match;
            });

            fixture.componentRef.setInput('matches', largeMatches);
            fixture.componentRef.setInput('isOpen', true);
            fixture.detectChanges();
            await fixture.whenStable();
        }, 20000);

        it('should filter matches based on active tab', () => {
            expect(component.filteredMatches().length).toBe(60);

            component.setTab('new');
            expect(component.filteredMatches().every(x => x.match.type === 'none')).toBe(true);
            expect(component.filteredMatches().length).toBe(20);

            component.setTab('review');
            expect(component.filteredMatches().every(x => x.match.type === 'fuzzy')).toBe(true);
            expect(component.filteredMatches().length).toBe(20);

            component.setTab('skipped');
            expect(component.filteredMatches().every(x => x.match.type === 'exact')).toBe(true);
            expect(component.filteredMatches().length).toBe(20);
        });

        it('should paginate correctly and navigate pages', () => {
            component.setPageSize(25);
            expect(component.pageCount()).toBe(3); // 60 / 25 = 2.4 -> 3 pages
            expect(component.pagedMatches().length).toBe(25);

            component.nextPage();
            expect(component.page()).toBe(1);
            expect(component.pagedMatches().length).toBe(25);

            component.nextPage();
            expect(component.page()).toBe(2);
            expect(component.pagedMatches().length).toBe(10); // 60 - 50 = 10

            // Should not go beyond last page
            component.nextPage();
            expect(component.page()).toBe(2);

            component.prevPage();
            expect(component.page()).toBe(1);

            component.prevPage();
            expect(component.page()).toBe(0);

            // Should not go below page 0
            component.prevPage();
            expect(component.page()).toBe(0);
        });

        it('should handle toggleSelected and toggleSelectAll', () => {
            component.setPageSize(25);
            expect(component.selectedCount()).toBe(0);
            expect(component.allVisibleSelected()).toBe(false);

            component.toggleSelected(0);
            expect(component.selectedIndices().has(0)).toBe(true);
            expect(component.selectedCount()).toBe(1);

            component.toggleSelected(0);
            expect(component.selectedIndices().has(0)).toBe(false);

            // Toggle select all visible
            component.toggleSelectAll();
            expect(component.allVisibleSelected()).toBe(true);
            expect(component.selectedCount()).toBe(25);

            // Toggle select all off
            component.toggleSelectAll();
            expect(component.allVisibleSelected()).toBe(false);
            expect(component.selectedCount()).toBe(0);
        });

        it('should apply bulkSetDecision to selected items', () => {
            component.toggleSelected(0);
            component.toggleSelected(1);
            component.toggleSelected(2);

            component.bulkSetDecision('ignore');
            expect(component.decisions()[0]).toBe('ignore');
            expect(component.decisions()[1]).toBe('ignore');
            expect(component.decisions()[2]).toBe('ignore');
            expect(component.selectedCount()).toBe(0); // cleared after bulk set
        });
    });

    describe('Formatting and Template Helpers', () => {
        it('should format currency correctly', () => {
            expect(component.formatCurrency(4500)).toBe('$45.00');
            expect(component.formatCurrency(-1200)).toBe('-$12.00');
        });

        it('should return correct decision labels and classes', () => {
            expect(component.decisionLabel('import')).toBe('Import');
            expect(component.decisionLabel('match')).toBe('Match');
            expect(component.decisionLabel('ignore')).toBe('Skip');
            expect(component.decisionLabel(undefined)).toBe('—');

            expect(component.decisionClass('import')).toContain('text-primary');
            expect(component.decisionClass('match')).toContain('text-amber-700');
            expect(component.decisionClass('ignore')).toContain('text-surface-500');
            expect(component.decisionClass(undefined)).toBe('');
        });

        it('should find existing transaction by id', () => {
            expect(component.getExistingTx('tx-1')?.payee).toBe('Chevron');
            expect(component.getExistingTx(undefined)).toBeUndefined();
            expect(component.getExistingTx('non-existent')).toBeUndefined();
        });

        it('should filter candidate transactions within 14 days', () => {
            const candidates = component.getCandidateTransactions('2024-03-01T00:00:00Z');
            const candidateIds = candidates.map(c => c.id);

            expect(candidateIds).toContain('tx-1');
            expect(candidateIds).toContain('tx-2');
            expect(candidateIds).not.toContain('tx-old'); // 2023 transaction is > 14 days away
        });

        it('should cast string to ReviewTab using asTab', () => {
            expect(component.asTab('new')).toBe('new');
            expect(component.asTab('review')).toBe('review');
        });
    });

    describe('Confirming Reconciliation & Dialog Closing', () => {
        beforeEach(async () => {
            fixture.componentRef.setInput('matches', mockMatches);
            fixture.componentRef.setInput('isOpen', true);
            fixture.detectChanges();
            await fixture.whenStable();
        });

        it('should handle apply and emit confirmed event', async () => {
            const confirmedSpy = vi.fn();
            component.confirmed.subscribe(confirmedSpy);

            component.setPayeeOverride(0, { name: 'Normalized Payee' });
            component.setPayeeOverride(1, 'Simple Payee String');
            component.setCategoryOverride(0, 'cat-1');
            component.setMatchOverride(0, 'tx-2');

            const applyPromise = component.handleApply();
            expect(component.isProcessing()).toBe(true);

            await applyPromise;

            expect(mockPosthogService.posthog.capture).toHaveBeenCalledWith(
                'reconciliation_completed',
                expect.objectContaining({
                    total_matches: 3,
                    imported_count: 1,
                    matched_count: 1,
                    ignored_count: 1,
                    is_large_dataset: false,
                    smart_defaults_used: false
                })
            );

            expect(confirmedSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    decisions: expect.any(Object),
                    payeeOverrides: {
                        0: 'Normalized Payee',
                        1: 'Simple Payee String'
                    },
                    categoryOverrides: { 0: 'cat-1' },
                    matchOverrides: { 0: 'tx-2' },
                    done: expect.any(Function)
                })
            );

            // Execute the done callback
            const emittedData = confirmedSpy.mock.calls[0]?.[0];
            expect(emittedData).toBeDefined();
            emittedData.done();

            expect(component.isProcessing()).toBe(false);
            expect(component.isOpen()).toBe(false);
        });

        it('should handle errors during apply gracefully', async () => {
            mockPosthogService.posthog.capture.mockImplementationOnce(() => {
                throw new Error('Analytics failed');
            });

            await component.handleApply();

            expect(component.isProcessing()).toBe(false);
        });

        it('should close dialog when onClose is called and not processing', () => {
            component.onClose();
            expect(component.isOpen()).toBe(false);
        });

        it('should not close dialog when onClose is called while processing', () => {
            component.isProcessing.set(true);
            component.onClose();
            expect(component.isOpen()).toBe(true);
        });
    });

    describe('DOM & UI Interaction', () => {
        it('should render dialog content in body when isOpen is true', async () => {
            fixture.componentRef.setInput('matches', mockMatches);
            fixture.componentRef.setInput('isOpen', true);
            fixture.detectChanges();
            await fixture.whenStable();

            expect(document.body.textContent).toContain('Import Review');
            expect(document.body.textContent).toContain('3 transactions from bank statement');
            expect(document.body.textContent).toContain('Gas station');
            expect(document.body.textContent).toContain('MATCH FOUND (85%)');
        });

        it('should allow clicking Abandon Import to close dialog', async () => {
            fixture.componentRef.setInput('matches', mockMatches);
            fixture.componentRef.setInput('isOpen', true);
            fixture.detectChanges();
            await fixture.whenStable();

            const buttons = Array.from(document.body.querySelectorAll('button'));
            const abandonBtn = buttons.find(b => b.textContent?.includes('Abandon Import'));
            expect(abandonBtn).toBeTruthy();

            abandonBtn?.click();
            fixture.detectChanges();

            expect(component.isOpen()).toBe(false);
        });

        it('should allow clicking Commit All Decisions to apply reconciliation', async () => {
            const confirmedSpy = vi.fn();
            component.confirmed.subscribe(confirmedSpy);

            fixture.componentRef.setInput('matches', mockMatches);
            fixture.componentRef.setInput('isOpen', true);
            fixture.detectChanges();
            await fixture.whenStable();

            const buttons = Array.from(document.body.querySelectorAll('button'));
            const commitBtn = buttons.find(b => b.textContent?.includes('Commit All Decisions'));
            expect(commitBtn).toBeTruthy();

            commitBtn?.click();
            fixture.detectChanges();

            // Wait for handleApply setTimeout
            await new Promise(resolve => setTimeout(resolve, 60));
            fixture.detectChanges();

            expect(confirmedSpy).toHaveBeenCalled();
        });

        it('should display import stats when provided', async () => {
            fixture.componentRef.setInput('matches', mockMatches);
            fixture.componentRef.setInput('importStats', {
                totalCount: 3,
                newCount: 1,
                fuzzyCount: 1,
                exactCount: 1
            });
            fixture.componentRef.setInput('isOpen', true);
            fixture.detectChanges();
            await fixture.whenStable();

            expect(document.body.textContent).toContain('1 New');
            expect(document.body.textContent).toContain('1 Review');
            expect(document.body.textContent).toContain('1 Duplicates');
        });
    });
});
