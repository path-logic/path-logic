import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import type { IPayee, IRecurringSchedule, ITransaction } from '@core';
import { TransactionStatus } from '@core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { PayeeMergeDialogComponent } from './payee-merge-dialog.component';
import { DarkMode, Default } from './payee-merge-dialog.component.stories';

describe('PayeeMergeDialogComponent (Storybook Stories)', () => {
    let fixture: ComponentFixture<PayeeMergeDialogComponent>;

    const samplePayees: Array<IPayee> = [
        {
            id: 'p-1',
            name: 'Starbucks #1234',
            address: null,
            city: 'Austin',
            state: 'TX',
            zipCode: null,
            latitude: null,
            longitude: null,
            website: null,
            phone: null,
            notes: null,
            defaultCategoryId: null,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z'
        },
        {
            id: 'p-2',
            name: 'Starbucks',
            address: null,
            city: 'Austin',
            state: 'TX',
            zipCode: null,
            latitude: null,
            longitude: null,
            website: null,
            phone: null,
            notes: null,
            defaultCategoryId: null,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z'
        },
        {
            id: 'p-3',
            name: 'Whole Foods Market',
            address: null,
            city: 'Austin',
            state: 'TX',
            zipCode: null,
            latitude: null,
            longitude: null,
            website: null,
            phone: null,
            notes: null,
            defaultCategoryId: null,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z'
        }
    ];

    const sampleTransactions: Array<ITransaction> = [
        {
            id: 'tx-1',
            accountId: 'acc-1',
            date: '2026-01-02',
            payee: 'Starbucks #1234',
            payeeId: 'p-1',
            memo: 'Morning Coffee',
            totalAmount: 550,
            status: TransactionStatus.Cleared,
            splits: [],
            checkNumber: null,
            importHash: 'h1',
            createdAt: '2026-01-02T00:00:00Z',
            updatedAt: '2026-01-02T00:00:00Z'
        }
    ];

    const sampleSchedules: Array<IRecurringSchedule> = [];

    let mockLedgerStore: {
        payees: ReturnType<typeof signal<Array<IPayee>>>;
        transactions: ReturnType<typeof signal<Array<ITransaction>>>;
        schedules: ReturnType<typeof signal<Array<IRecurringSchedule>>>;
        recurringSchedules: ReturnType<typeof signal<Array<IRecurringSchedule>>>;
        mergePayees: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        mockLedgerStore = {
            payees: signal<Array<IPayee>>(samplePayees),
            transactions: signal<Array<ITransaction>>(sampleTransactions),
            schedules: signal<Array<IRecurringSchedule>>(sampleSchedules),
            recurringSchedules: signal<Array<IRecurringSchedule>>(sampleSchedules),
            mergePayees: vi
                .fn()
                .mockResolvedValue({ affectedTransactions: 1, affectedSchedules: 0 })
        };

        await TestBed.configureTestingModule({
            imports: [PayeeMergeDialogComponent, FormsModule],
            providers: [{ provide: LedgerStore, useValue: mockLedgerStore }]
        }).compileComponents();
    });

    it('executes Default story interaction test', async () => {
        fixture = TestBed.createComponent(PayeeMergeDialogComponent);
        fixture.componentRef.setInput('isOpen', Default.args?.isOpen ?? true);
        fixture.componentRef.setInput(
            'initialSourcePayeeId',
            Default.args?.initialSourcePayeeId ?? 'p-1'
        );
        fixture.detectChanges();

        await Default.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(document.body.textContent).toContain('Merge Payees');
        expect(document.body.textContent).toContain('Merge Flow');
    });

    it('renders DarkMode story', () => {
        fixture = TestBed.createComponent(PayeeMergeDialogComponent);
        fixture.componentRef.setInput('isOpen', DarkMode.args?.isOpen ?? true);
        fixture.componentRef.setInput(
            'initialSourcePayeeId',
            DarkMode.args?.initialSourcePayeeId ?? 'p-1'
        );
        fixture.detectChanges();

        expect(DarkMode).toBeDefined();
        expect(document.body.textContent).toContain('Merge Payees');
    });
});
