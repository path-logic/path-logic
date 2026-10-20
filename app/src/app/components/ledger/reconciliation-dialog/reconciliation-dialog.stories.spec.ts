import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { TransactionStatus, type ITransaction } from '../../../core';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { ReconciliationDialogComponent } from './reconciliation-dialog.component';
import { InteractiveReconciliation } from './reconciliation-dialog.component.stories';

describe('ReconciliationDialogComponent (Storybook Interaction Spec Wrapper)', () => {
    const MOCK_TRANSACTIONS: Array<ITransaction> = [
        {
            id: 'tx-1',
            accountId: 'acc-1',
            date: '2024-03-01T00:00:00Z',
            payeeId: 'p1',
            totalAmount: -4500,
            status: TransactionStatus.Pending,
            splits: [],
            createdAt: '2024-03-01T00:00:00Z',
            updatedAt: '2024-03-01T00:00:00Z'
        }
    ] as any;

    let mockLedgerStore: {
        transactions: ReturnType<typeof signal>;
        categories: ReturnType<typeof signal>;
        addTransactions: () => Promise<void>;
        updateTransactions: () => Promise<void>;
    };

    beforeEach(async () => {
        mockLedgerStore = {
            transactions: signal(MOCK_TRANSACTIONS),
            categories: signal([]),
            addTransactions: async () => {},
            updateTransactions: async () => {}
        };

        await TestBed.configureTestingModule({
            imports: [ReconciliationDialogComponent],
            providers: [{ provide: LedgerStore, useValue: mockLedgerStore }]
        }).compileComponents();
    });

    it('renders OpenWithMatches story', async () => {
        const fixture: ComponentFixture<ReconciliationDialogComponent> = TestBed.createComponent(
            ReconciliationDialogComponent
        );
        fixture.componentRef.setInput('isOpen', true);
        fixture.componentRef.setInput('matches', [
            {
                type: 'exact',
                parsedTx: { date: '2024-03-01', amount: -4500, payee: 'Chevron' },
                confidence: 1,
                existingTxId: 'tx-1'
            }
        ]);
        fixture.detectChanges();

        expect(document.body.textContent).toContain('Import Review');
    });

    it('executes InteractiveReconciliation story interaction test', async () => {
        const fixture: ComponentFixture<ReconciliationDialogComponent> = TestBed.createComponent(
            ReconciliationDialogComponent
        );
        fixture.componentRef.setInput('isOpen', true);
        fixture.componentRef.setInput('matches', [
            {
                type: 'fuzzy',
                parsedTx: { date: '2024-03-01', amount: -4500, payee: 'Chevron' },
                confidence: 0.8,
                existingTxId: 'tx-1'
            }
        ]);
        fixture.detectChanges();

        await InteractiveReconciliation.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(document.body.textContent).toContain('Commit All Decisions');
    }, 15000);
});
