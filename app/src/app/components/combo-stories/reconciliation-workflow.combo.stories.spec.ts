import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { ITransaction } from '@core';
import { TransactionStatus } from '@core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LedgerStore } from '../../services/ledger-store/ledger.store';
import { PostHogService } from '../../services/posthog/posthog.service';
import {
    ComboReconciliationComponent,
    StackedDialogFlow
} from './reconciliation-workflow.combo.stories';

describe('ComboReconciliationComponent (Storybook Interaction Spec Wrapper)', () => {
    let fixture: ComponentFixture<ComboReconciliationComponent>;
    let detectChangesInterval: ReturnType<typeof setInterval>;

    const mockTransactions: Array<ITransaction> = new Array<ITransaction>({
        id: 'tx-1',
        accountId: 'acc-1',
        date: '2024-03-01T00:00:00Z',
        payeeId: 'p1',
        totalAmount: -15000,
        status: TransactionStatus.Pending,
        splits: new Array<any>(),
        createdAt: '2024-03-01T00:00:00Z',
        updatedAt: '2024-03-01T00:00:00Z'
    } as any);

    const mockCategories: Array<any> = new Array<any>(
        {
            id: 'cat-1',
            name: 'Groceries',
            parentId: null,
            isActive: true
        },
        {
            id: 'cat-2',
            name: 'Household',
            parentId: null,
            isActive: true
        }
    );

    const mockLedgerStore = {
        transactions: signal<Array<ITransaction>>(mockTransactions),
        categories: signal<Array<any>>(mockCategories),
        payees: signal<Array<any>>(new Array<any>()),
        accounts: signal<Array<any>>(new Array<any>()),
        addTransactions: vi.fn().mockResolvedValue(undefined),
        updateTransactions: vi.fn().mockResolvedValue(undefined)
    };

    const mockPostHogService = {
        posthog: {
            capture: vi.fn()
        }
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ComboReconciliationComponent],
            providers: [
                provideRouter(new Array<any>()),
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: PostHogService, useValue: mockPostHogService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ComboReconciliationComponent);
        fixture.detectChanges();

        detectChangesInterval = setInterval((): void => {
            try {
                fixture.detectChanges();
            } catch {
                // Ignore if fixture is destroyed
            }
        }, 50);
    });

    afterEach((): void => {
        clearInterval(detectChangesInterval);
    });

    it('executes StackedDialogFlow story interaction test', async () => {
        await StackedDialogFlow.play?.({ canvasElement: fixture.nativeElement } as any);

        const bodyText: string | null = document.body.textContent;
        expect(bodyText).toContain('2 transactions from bank statement');
        expect(bodyText).toContain('Split Transaction');
    }, 15000);
});
