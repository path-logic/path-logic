import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ITransactionConflict } from '../../../lib/sync/MergeEngine';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { ConflictResolutionModalComponent } from './conflict-resolution-modal.component';

describe('ConflictResolutionModalComponent', () => {
    let component: ConflictResolutionModalComponent;
    let fixture: ComponentFixture<ConflictResolutionModalComponent>;

    const sampleConflicts: Array<ITransactionConflict> = [
        {
            id: 'conflict-1',
            mine: {
                date: '2026-03-01',
                payee: 'Coffee Shop Local',
                totalAmount: -450,
                memo: 'Morning coffee',
                status: 'cleared',
                checkNumber: null,
                accountId: 'acc-1',
                payeeId: 'p-1',
                importHash: null,
                updatedAt: '2026-03-01T14:30:00.000Z'
            },
            theirs: {
                date: '2026-03-01',
                payee: 'Coffee Shop Remote',
                totalAmount: -500,
                memo: 'Remote update',
                status: 'reconciled',
                checkNumber: null,
                accountId: 'acc-1',
                payeeId: 'p-1',
                importHash: null,
                updatedAt: '2026-03-01T15:00:00.000Z'
            }
        },
        {
            id: 'conflict-2',
            mine: {
                date: '2026-03-02',
                payee: 'Grocery Store',
                totalAmount: 12500,
                memo: null,
                status: 'cleared',
                checkNumber: null,
                accountId: 'acc-1',
                payeeId: 'p-2',
                importHash: null,
                updatedAt: '2026-03-02T10:00:00.000Z'
            },
            theirs: {
                date: '2026-03-02',
                payee: 'Grocery Store',
                totalAmount: 13000,
                memo: null,
                status: 'cleared',
                checkNumber: null,
                accountId: 'acc-1',
                payeeId: 'p-2',
                importHash: null,
                updatedAt: '2026-03-02T11:00:00.000Z'
            }
        }
    ];

    let syncConflictsSignal: ReturnType<typeof signal<Array<ITransactionConflict>>>;
    let resolveConflictSpy: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        syncConflictsSignal = signal<Array<ITransactionConflict>>([]);
        resolveConflictSpy = vi.fn().mockResolvedValue(undefined);

        const mockLedgerStore = {
            syncConflicts: syncConflictsSignal,
            resolveConflict: resolveConflictSpy
        };

        await TestBed.configureTestingModule({
            imports: [ConflictResolutionModalComponent],
            providers: [{ provide: LedgerStore, useValue: mockLedgerStore }]
        }).compileComponents();

        fixture = TestBed.createComponent(ConflictResolutionModalComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should not show modal when conflicts are empty', () => {
        expect(component.conflicts()).toEqual([]);
        expect(component.showModal()).toBe(false);
    });

    it('should show modal when conflicts are present', () => {
        syncConflictsSignal.set(sampleConflicts);
        fixture.detectChanges();

        expect(component.conflicts().length).toBe(2);
        expect(component.showModal()).toBe(true);

        const title = document.querySelector('#conflict-modal-title');
        expect(title).toBeTruthy();
        expect(title?.textContent).toContain('Sync Conflicts Detected');
    });

    it('should format amounts, dates, and timestamps correctly', () => {
        expect(component.formatAmount(450)).toBe('$4.50');
        expect(component.formatAmount(-450)).toBe('-$4.50');
        expect(component.formatAmount(0)).toBe('$0.00');

        expect(component.formatDate('2026-03-01')).toContain('2026');
        expect(component.formatTimestamp('2026-03-01T14:30:00.000Z')).toContain('Mar 1');
    });

    it('should resolve conflict keeping mine', () => {
        syncConflictsSignal.set(sampleConflicts);
        fixture.detectChanges();

        component.keepMine(sampleConflicts[0]!);
        expect(resolveConflictSpy).toHaveBeenCalledWith('conflict-1', true);
    });

    it('should resolve conflict keeping theirs', () => {
        syncConflictsSignal.set(sampleConflicts);
        fixture.detectChanges();

        component.keepTheirs(sampleConflicts[0]!);
        expect(resolveConflictSpy).toHaveBeenCalledWith('conflict-1', false);
    });

    it('should resolve all conflicts keeping mine', () => {
        syncConflictsSignal.set(sampleConflicts);
        fixture.detectChanges();

        component.keepAllMine();
        expect(resolveConflictSpy).toHaveBeenCalledTimes(2);
        expect(resolveConflictSpy).toHaveBeenCalledWith('conflict-1', true);
        expect(resolveConflictSpy).toHaveBeenCalledWith('conflict-2', true);
    });

    it('should resolve all conflicts keeping theirs', () => {
        syncConflictsSignal.set(sampleConflicts);
        fixture.detectChanges();

        component.keepAllTheirs();
        expect(resolveConflictSpy).toHaveBeenCalledTimes(2);
        expect(resolveConflictSpy).toHaveBeenCalledWith('conflict-1', false);
        expect(resolveConflictSpy).toHaveBeenCalledWith('conflict-2', false);
    });
});
