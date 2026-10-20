import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IParsedTransaction, IReconciliationMatch } from '../../../core';
import type { IImportStats } from '../../../services/import/import.types';
import { PostHogService } from '../../../services/posthog/posthog.service';
import { ExpressImportDialogComponent } from './express-import-dialog.component';
import {
    InteractiveAbandon,
    InteractiveExpressImport,
    InteractiveReviewFirst,
    OpenReady
} from './express-import-dialog.component.stories';

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

describe('ExpressImportDialogComponent (Storybook Interaction Spec Wrapper)', () => {
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
    });

    afterEach(() => {
        const dialogMasks = document.querySelectorAll('.p-dialog-mask');
        dialogMasks.forEach(mask => mask.remove());
    });

    it('executes OpenReady story interaction test', async () => {
        const fixture: ComponentFixture<ExpressImportDialogComponent> = TestBed.createComponent(
            ExpressImportDialogComponent
        );
        fixture.componentRef.setInput('isOpen', true);
        fixture.componentRef.setInput('matches', mockMatches);
        fixture.componentRef.setInput('importStats', mockStats);
        fixture.detectChanges();

        await OpenReady.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(document.body.textContent).toContain('Express Import Ready');
    }, 15000);

    it('executes InteractiveExpressImport story interaction test', async () => {
        const fixture: ComponentFixture<ExpressImportDialogComponent> = TestBed.createComponent(
            ExpressImportDialogComponent
        );
        fixture.componentRef.setInput('isOpen', true);
        fixture.componentRef.setInput('matches', mockMatches);
        fixture.componentRef.setInput('importStats', mockStats);
        fixture.detectChanges();

        await InteractiveExpressImport.play?.({
            canvasElement: fixture.nativeElement,
            step: async (_name: string, fnToRun: () => Promise<void>) => {
                await fnToRun();
            }
        } as any);

        expect(document.body.textContent).toContain('Import Review');
    }, 15000);

    it('executes InteractiveReviewFirst story interaction test', async () => {
        const fixture: ComponentFixture<ExpressImportDialogComponent> = TestBed.createComponent(
            ExpressImportDialogComponent
        );
        fixture.componentRef.setInput('isOpen', true);
        fixture.componentRef.setInput('matches', mockMatches);
        fixture.componentRef.setInput('importStats', mockStats);
        fixture.detectChanges();

        let reviewEmitted = false;
        fixture.componentInstance.reviewFirst.subscribe(() => {
            reviewEmitted = true;
        });

        await InteractiveReviewFirst.play?.({
            canvasElement: fixture.nativeElement,
            step: async (_name: string, fnToRun: () => Promise<void>) => {
                await fnToRun();
            }
        } as any);

        expect(reviewEmitted).toBe(true);
    }, 15000);

    it('executes InteractiveAbandon story interaction test', async () => {
        const fixture: ComponentFixture<ExpressImportDialogComponent> = TestBed.createComponent(
            ExpressImportDialogComponent
        );
        fixture.componentRef.setInput('isOpen', true);
        fixture.componentRef.setInput('matches', mockMatches);
        fixture.componentRef.setInput('importStats', mockStats);
        fixture.detectChanges();

        await InteractiveAbandon.play?.({
            canvasElement: fixture.nativeElement,
            step: async (_name: string, fnToRun: () => Promise<void>) => {
                await fnToRun();
            }
        } as any);

        expect(fixture.componentInstance.isOpen()).toBe(false);
    }, 15000);
});
