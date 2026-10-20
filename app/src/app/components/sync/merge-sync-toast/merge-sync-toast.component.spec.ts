import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ITransactionConflict } from '../../../lib/sync/MergeEngine';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { MergeSyncToastComponent } from './merge-sync-toast.component';

describe('MergeSyncToastComponent', () => {
    let component: MergeSyncToastComponent;
    let fixture: ComponentFixture<MergeSyncToastComponent>;

    let mergeCountSignal: ReturnType<typeof signal<number>>;
    let syncConflictsSignal: ReturnType<typeof signal<Array<ITransactionConflict>>>;

    beforeEach(async () => {
        vi.useFakeTimers();
        mergeCountSignal = signal<number>(0);
        syncConflictsSignal = signal<Array<ITransactionConflict>>([]);

        const mockLedgerStore = {
            mergeCount: mergeCountSignal,
            syncConflicts: syncConflictsSignal
        };

        await TestBed.configureTestingModule({
            imports: [MergeSyncToastComponent],
            providers: [{ provide: LedgerStore, useValue: mockLedgerStore }]
        }).compileComponents();

        fixture = TestBed.createComponent(MergeSyncToastComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should be hidden initially when mergeCount is 0', () => {
        expect(component.visible()).toBe(false);
        const toast = fixture.nativeElement.querySelector('.merge-toast');
        expect(toast).toBeNull();
    });

    it('should become visible when mergeCount is set to 1', () => {
        mergeCountSignal.set(1);
        fixture.detectChanges();

        expect(component.visible()).toBe(true);
        const toast = fixture.nativeElement.querySelector('.merge-toast');
        expect(toast).toBeTruthy();
        expect(fixture.nativeElement.textContent).toContain(
            '1 new transaction synced from another device'
        );
    });

    it('should display plural text when mergeCount is greater than 1', () => {
        mergeCountSignal.set(5);
        fixture.detectChanges();

        expect(component.visible()).toBe(true);
        expect(fixture.nativeElement.textContent).toContain(
            '5 transactions synced from another device'
        );
    });

    it('should show conflict notice when conflicts are present', () => {
        mergeCountSignal.set(2);
        syncConflictsSignal.set([
            {
                id: 'c1',
                mine: {
                    date: '2026-03-01',
                    payee: 'Store',
                    totalAmount: -100,
                    memo: null,
                    status: 'cleared',
                    checkNumber: null,
                    accountId: 'a1',
                    payeeId: 'p1',
                    importHash: null,
                    updatedAt: '2026-03-01T00:00:00Z'
                },
                theirs: {
                    date: '2026-03-01',
                    payee: 'Store',
                    totalAmount: -200,
                    memo: null,
                    status: 'cleared',
                    checkNumber: null,
                    accountId: 'a1',
                    payeeId: 'p1',
                    importHash: null,
                    updatedAt: '2026-03-01T00:00:00Z'
                }
            }
        ]);
        fixture.detectChanges();

        expect(component.hasConflicts()).toBe(true);
        expect(component.conflictCount()).toBe(1);
        expect(fixture.nativeElement.textContent).toContain('1 conflict need your review');
    });

    it('should dismiss when close button is clicked', () => {
        mergeCountSignal.set(3);
        fixture.detectChanges();
        expect(component.visible()).toBe(true);

        const closeBtn = fixture.nativeElement.querySelector(
            '.toast-close'
        ) as HTMLButtonElement | null;
        expect(closeBtn).toBeTruthy();
        closeBtn?.click();
        fixture.detectChanges();

        expect(component.visible()).toBe(false);
        expect(mergeCountSignal()).toBe(0);
    });

    it('should auto-dismiss after 6 seconds', () => {
        mergeCountSignal.set(2);
        fixture.detectChanges();
        expect(component.visible()).toBe(true);

        vi.advanceTimersByTime(6000);
        fixture.detectChanges();

        expect(component.visible()).toBe(false);
        expect(mergeCountSignal()).toBe(0);
    });
});
