import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import type { IPayee, IRecurringSchedule, ITransaction } from '@core';
import { Frequency, PaymentMethod, ScheduleType, TransactionStatus } from '@core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { PayeeMergeDialogComponent } from './payee-merge-dialog.component';

describe('PayeeMergeDialogComponent', () => {
    let component: PayeeMergeDialogComponent;
    let fixture: ComponentFixture<PayeeMergeDialogComponent>;

    const mockPayees = signal<Array<IPayee>>([
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
            name: 'Target',
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
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z'
        }
    ]);

    const mockTransactions = signal<Array<ITransaction>>([
        {
            id: 'tx-1',
            accountId: 'acc-1',
            date: '2026-01-02',
            payee: 'Starbucks #1234',
            payeeId: 'p-1',
            memo: 'Coffee',
            totalAmount: 550,
            status: TransactionStatus.Cleared,
            splits: [],
            checkNumber: null,
            importHash: 'hash-1',
            createdAt: '2026-01-02T00:00:00Z',
            updatedAt: '2026-01-02T00:00:00Z'
        },
        {
            id: 'tx-2',
            accountId: 'acc-1',
            date: '2026-01-03',
            payee: 'Starbucks #1234',
            payeeId: 'p-1',
            memo: 'Latte',
            totalAmount: 650,
            status: TransactionStatus.Cleared,
            splits: [],
            checkNumber: null,
            importHash: 'hash-2',
            createdAt: '2026-01-03T00:00:00Z',
            updatedAt: '2026-01-03T00:00:00Z'
        }
    ]);

    const mockRecurringSchedules = signal<Array<IRecurringSchedule>>([
        {
            id: 'sched-1',
            accountId: 'acc-1',
            payee: 'Starbucks #1234',
            amount: 550,
            type: ScheduleType.Debit,
            frequency: Frequency.Monthly,
            paymentMethod: PaymentMethod.ElectronicTransfer,
            startDate: '2026-01-01',
            endDate: null,
            nextDueDate: '2026-02-01',
            lastOccurredDate: null,
            splits: [],
            memo: '',
            autoPost: false,
            isActive: true
        }
    ]);

    const mergePayeesSpy = vi.fn().mockResolvedValue({
        affectedTransactions: 2,
        affectedSchedules: 1
    });

    beforeEach(async () => {
        mergePayeesSpy.mockClear();

        const mockStore = {
            payees: mockPayees,
            transactions: mockTransactions,
            schedules: mockRecurringSchedules,
            mergePayees: mergePayeesSpy
        };

        await TestBed.configureTestingModule({
            imports: [PayeeMergeDialogComponent, FormsModule],
            providers: [{ provide: LedgerStore, useValue: mockStore }]
        }).compileComponents();

        fixture = TestBed.createComponent(PayeeMergeDialogComponent);
        component = fixture.componentInstance;
        component.isOpen.set(true);
        fixture.detectChanges();
    });

    it('should create PayeeMergeDialogComponent', () => {
        expect(component).toBeTruthy();
    });

    it('should filter out the source payee from available targets', () => {
        component.sourcePayeeId.set('p-1');
        expect(component.availableTargets().length).toBe(2);
        expect(component.availableTargets().some(p => p.id === 'p-1')).toBe(false);
    });

    it('should dynamically calculate affected transaction and schedule count', () => {
        component.sourcePayeeId.set('p-1');
        expect(component.affectedTransactionCount()).toBe(2);
        expect(component.affectedScheduleCount()).toBe(1);

        component.sourcePayeeId.set('p-3');
        expect(component.affectedTransactionCount()).toBe(0);
        expect(component.affectedScheduleCount()).toBe(0);
    });

    it('should enable merge button only when distinct source and target are selected', () => {
        expect(component.canMerge()).toBe(false);

        component.sourcePayeeId.set('p-1');
        expect(component.canMerge()).toBe(false);

        component.targetPayeeId.set('p-2');
        expect(component.canMerge()).toBe(true);

        component.targetPayeeId.set('p-1');
        expect(component.canMerge()).toBe(false);
    });

    it('should call ledgerStore.mergePayees and emit merged event upon confirmation', async () => {
        const mergedSpy = vi.fn();
        component.merged.subscribe(mergedSpy);

        component.sourcePayeeId.set('p-1');
        component.targetPayeeId.set('p-2');

        await component.confirmMerge();

        expect(mergePayeesSpy).toHaveBeenCalledWith('p-1', 'p-2');
        expect(mergedSpy).toHaveBeenCalledWith({
            sourceId: 'p-1',
            targetId: 'p-2',
            affectedTransactions: 2,
            affectedSchedules: 1
        });
        expect(component.isOpen()).toBe(false);
    });
});
