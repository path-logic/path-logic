import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type { IParsedTransaction, IReconciliationMatch } from '@core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IImportStats } from '../../../services/import/import.types';
import { PostHogService } from '../../../services/posthog/posthog.service';
import { ExpressImportDialogComponent } from './express-import-dialog.component';

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

describe('ExpressImportDialogComponent', () => {
    let component: ExpressImportDialogComponent;
    let fixture: ComponentFixture<ExpressImportDialogComponent>;

    const mockMatches: Array<IReconciliationMatch> = [
        {
            type: 'none',
            parsedTx: createParsedTx({
                date: '2024-03-01',
                amount: -2500,
                payee: 'Amazon'
            }),
            confidence: 0
        },
        {
            type: 'none',
            parsedTx: createParsedTx({
                date: '2024-03-02',
                amount: -1500,
                payee: 'Spotify'
            }),
            confidence: 0
        },
        {
            type: 'exact',
            parsedTx: createParsedTx({
                date: '2024-03-03',
                amount: 50000,
                payee: 'Salary Employer'
            }),
            confidence: 1.0,
            existingTxId: 'tx-existing-1'
        }
    ];

    const mockStats: IImportStats = {
        totalCount: 3,
        newCount: 2,
        fuzzyCount: 0,
        exactCount: 1
    };

    let mockPosthogService: {
        posthog: {
            capture: ReturnType<typeof vi.fn>;
        };
    };

    beforeEach(async () => {
        vi.clearAllMocks();

        mockPosthogService = {
            posthog: {
                capture: vi.fn()
            }
        };

        await TestBed.configureTestingModule({
            imports: [ExpressImportDialogComponent],
            providers: [{ provide: PostHogService, useValue: mockPosthogService }]
        }).compileComponents();

        fixture = TestBed.createComponent(ExpressImportDialogComponent);
        component = fixture.componentInstance;
    });

    afterEach(() => {
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
        });

        it('should accept inputs via componentRef.setInput', () => {
            fixture.componentRef.setInput('isOpen', true);
            fixture.componentRef.setInput('matches', mockMatches);
            fixture.componentRef.setInput('importStats', mockStats);
            fixture.detectChanges();

            expect(component.isOpen()).toBe(true);
            expect(component.matches().length).toBe(3);
            expect(component.importStats()?.newCount).toBe(2);
            expect(component.importStats()?.exactCount).toBe(1);
        }, 15000);
    });

    describe('DOM & Template Bindings', () => {
        beforeEach(async () => {
            fixture.componentRef.setInput('isOpen', true);
            fixture.componentRef.setInput('matches', mockMatches);
            fixture.componentRef.setInput('importStats', mockStats);
            fixture.detectChanges();
            await fixture.whenStable();
        });

        it('should render dialog header with transaction count', () => {
            expect(document.body.textContent).toContain('Import Review');
            expect(document.body.textContent).toContain('3 transactions from bank statement');
        });

        it('should render ready description and stats', () => {
            expect(document.body.textContent).toContain('Express Import Ready');
            expect(document.body.textContent).toContain('No ambiguous matches found.');
            expect(document.body.textContent).toContain('2 new transactions will be imported');
            expect(document.body.textContent).toContain(
                '1 duplicates will be skipped automatically'
            );
        });

        it('should render action buttons', () => {
            const buttons = Array.from(document.body.querySelectorAll('button'));
            const expressBtn = buttons.find(b => b.textContent?.includes('Express Import'));
            const reviewBtn = buttons.find(b => b.textContent?.includes('Review First'));
            const abandonBtn = buttons.find(b => b.textContent?.includes('Abandon Import'));

            expect(expressBtn).toBeTruthy();
            expect(reviewBtn).toBeTruthy();
            expect(abandonBtn).toBeTruthy();
        });
    });

    describe('Outputs & Actions', () => {
        beforeEach(async () => {
            fixture.componentRef.setInput('isOpen', true);
            fixture.componentRef.setInput('matches', mockMatches);
            fixture.componentRef.setInput('importStats', mockStats);
            fixture.detectChanges();
            await fixture.whenStable();
        });

        it('should emit reviewFirst when Review First button is clicked', () => {
            const reviewSpy = vi.fn();
            component.reviewFirst.subscribe(reviewSpy);

            component.onReviewFirst();
            expect(reviewSpy).toHaveBeenCalledTimes(1);
        });

        it('should close dialog when onClose is called', () => {
            component.onClose();
            expect(component.isOpen()).toBe(false);
        });

        it('should trigger onClose when Abandon Import button is clicked in DOM', () => {
            const buttons = Array.from(document.body.querySelectorAll('button'));
            const abandonBtn = buttons.find(b => b.textContent?.includes('Abandon Import'));
            expect(abandonBtn).toBeTruthy();

            abandonBtn?.click();
            fixture.detectChanges();

            expect(component.isOpen()).toBe(false);
        });

        it('should execute handleExpressImport and emit confirmed with decisions and done callback', async () => {
            const confirmedSpy = vi.fn();
            component.confirmed.subscribe(confirmedSpy);

            const importPromise = component.handleExpressImport();
            expect(component.isProcessing()).toBe(true);

            await importPromise;

            expect(mockPosthogService.posthog.capture).toHaveBeenCalledWith(
                'reconciliation_completed',
                {
                    total_matches: 3,
                    imported_count: 2,
                    matched_count: 0,
                    ignored_count: 1,
                    is_large_dataset: true,
                    smart_defaults_used: true
                }
            );

            expect(confirmedSpy).toHaveBeenCalledWith({
                decisions: {
                    0: 'import',
                    1: 'import',
                    2: 'ignore'
                },
                done: expect.any(Function)
            });

            // Invoking the done callback resets state and closes dialog
            const emittedData = confirmedSpy.mock.calls[0]?.[0];
            expect(emittedData).toBeDefined();
            emittedData.done();

            expect(component.isProcessing()).toBe(false);
            expect(component.isOpen()).toBe(false);
        });

        it('should trigger handleExpressImport when Express Import button is clicked in DOM', async () => {
            const confirmedSpy = vi.fn();
            component.confirmed.subscribe(confirmedSpy);

            const buttons = Array.from(document.body.querySelectorAll('button'));
            const expressBtn = buttons.find(b => b.textContent?.includes('Express Import'));
            expect(expressBtn).toBeTruthy();

            expressBtn?.click();
            fixture.detectChanges();

            await new Promise(resolve => setTimeout(resolve, 60));
            fixture.detectChanges();

            expect(confirmedSpy).toHaveBeenCalled();
        });

        it('should handle errors in handleExpressImport gracefully', async () => {
            mockPosthogService.posthog.capture.mockImplementationOnce(() => {
                throw new Error('Analytics failed');
            });

            await component.handleExpressImport();

            expect(component.isProcessing()).toBe(false);
        });
    });
});
