import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import type { ITransactionConflict } from '../../../lib/sync/MergeEngine';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { MergeSyncToastComponent } from './merge-sync-toast.component';
import {
    InteractiveDismiss,
    MultipleWithConflicts,
    SingleTransaction
} from './merge-sync-toast.component.stories';

describe('MergeSyncToastComponent (Storybook Stories)', () => {
    const sampleConflicts: Array<ITransactionConflict> = [
        {
            id: 'c1',
            mine: {
                date: '2026-03-01',
                payee: 'Target Store',
                totalAmount: -3450,
                memo: 'Household items',
                status: 'cleared',
                checkNumber: null,
                accountId: 'acc-1',
                payeeId: 'p-1',
                importHash: null,
                updatedAt: '2026-03-01T12:00:00Z'
            },
            theirs: {
                date: '2026-03-01',
                payee: 'Target Store',
                totalAmount: -3800,
                memo: 'Household items with detergent',
                status: 'cleared',
                checkNumber: null,
                accountId: 'acc-1',
                payeeId: 'p-1',
                importHash: null,
                updatedAt: '2026-03-01T12:05:00Z'
            }
        }
    ];

    let mockMergeCount: ReturnType<typeof signal<number>>;
    let mockSyncConflicts: ReturnType<typeof signal<Array<ITransactionConflict>>>;

    beforeEach(() => {
        mockMergeCount = signal(1);
        mockSyncConflicts = signal<Array<ITransactionConflict>>([]);
    });

    it('executes SingleTransaction story interaction test', async () => {
        await TestBed.configureTestingModule({
            imports: [MergeSyncToastComponent],
            providers: [
                {
                    provide: LedgerStore,
                    useValue: {
                        mergeCount: mockMergeCount,
                        syncConflicts: mockSyncConflicts
                    }
                }
            ]
        }).compileComponents();

        const fixture: ComponentFixture<MergeSyncToastComponent> =
            TestBed.createComponent(MergeSyncToastComponent);
        fixture.detectChanges();

        await SingleTransaction.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Ledger Synced');
        expect(fixture.nativeElement.textContent).toContain(
            '1 new transaction synced from another device'
        );
    });

    it('executes MultipleWithConflicts story interaction test', async () => {
        mockMergeCount.set(4);
        mockSyncConflicts.set(sampleConflicts);

        await TestBed.configureTestingModule({
            imports: [MergeSyncToastComponent],
            providers: [
                {
                    provide: LedgerStore,
                    useValue: {
                        mergeCount: mockMergeCount,
                        syncConflicts: mockSyncConflicts
                    }
                }
            ]
        }).compileComponents();

        const fixture: ComponentFixture<MergeSyncToastComponent> =
            TestBed.createComponent(MergeSyncToastComponent);
        fixture.detectChanges();

        await MultipleWithConflicts.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain(
            '4 transactions synced from another device'
        );
        expect(fixture.nativeElement.textContent).toContain('1 conflict need your review');
    });

    it('executes InteractiveDismiss story interaction test', async () => {
        mockMergeCount.set(3);

        await TestBed.configureTestingModule({
            imports: [MergeSyncToastComponent],
            providers: [
                {
                    provide: LedgerStore,
                    useValue: {
                        mergeCount: mockMergeCount,
                        syncConflicts: mockSyncConflicts
                    }
                }
            ]
        }).compileComponents();

        const fixture: ComponentFixture<MergeSyncToastComponent> =
            TestBed.createComponent(MergeSyncToastComponent);
        fixture.detectChanges();

        await InteractiveDismiss.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.componentInstance.visible()).toBe(false);
    });
});
