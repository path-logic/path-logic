import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../../services/auth/auth.service';
import { LedgerStore } from '../../../../services/ledger-store/ledger.store';
import { SyncService } from '../../../../services/sync/sync.service';
import { QifTestComponent } from './qif-test.component';

describe('QifTestComponent', () => {
    let fixture: ComponentFixture<QifTestComponent>;
    let component: QifTestComponent;

    const mockCategories = signal([
        { id: 'cat-1', name: 'Groceries' },
        { id: 'cat-2', name: 'Salary' }
    ]);

    const mockLedgerStore = {
        categories: mockCategories,
        accounts: signal([]),
        transactions: signal([]),
        schedules: signal([]),
        payees: signal([]),
        isInitialized: signal(true),
        isLoading: signal(false),
        syncStatus: signal('synced'),
        authError: signal(false),
        hasLocalFallback: signal(true),
        syncConflicts: signal([]),
        mergeCount: signal(0),
        getCategoryAlias: vi.fn((alias: string) =>
            alias.toLowerCase() === 'food' ? 'cat-1' : null
        )
    };

    const mockAuth = {
        currentUser: signal({
            displayName: 'Alex Mercer',
            email: 'alex@example.com'
        }),
        accessToken: signal(null),
        isGoogleDriveConnected: signal(false)
    };

    const mockSync = {
        isSyncing: signal(false),
        getSyncStatus: () => ({ lastSyncTime: Date.now() })
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [QifTestComponent],
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: mockAuth },
                { provide: SyncService, useValue: mockSync },
                { provide: LedgerStore, useValue: mockLedgerStore }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(QifTestComponent);
        component = fixture.componentInstance;
    });

    it('should create the QifTestComponent', () => {
        expect(component).toBeTruthy();
    });

    it('should format currency correctly', () => {
        expect(component.formatCurrency(5400)).toBe('$54.00');
        expect(component.formatCurrency(-2550)).toBe('-$25.50');
    });

    it('should compute full import diagnostics for parsed QIF content', async () => {
        const sampleQif = `!Type:Bank
D1/15/2026
T-50.00
PAmazon
LGroceries
C*
^
D1/16/2026
T1000.00
PEmployer
LSalary
CX
^
D1/17/2026
T-25.00
PCoffee Shop
LFood
^`;

        // Mock File object
        const file = new File([sampleQif], 'test.qif', { type: 'application/x-qif' });
        const event = {
            target: {
                files: {
                    length: 1,
                    item: () => file
                },
                value: ''
            }
        } as unknown as Event;

        await component.onFileSelected(event);

        const diag = component.diagnostics();
        expect(diag).not.toBeNull();
        expect(diag?.totalTransactions).toBe(3);
        expect(diag?.inflowsCents).toBe(100000);
        expect(diag?.outflowsCents).toBe(-7500);
        expect(diag?.netAmountCents).toBe(92500);

        // Status distribution
        expect(diag?.statusDistribution.clearedCount).toBe(1);
        expect(diag?.statusDistribution.reconciledCount).toBe(1);
        expect(diag?.statusDistribution.unclearedCount).toBe(1);

        // Category matches
        expect(diag?.categories.exactMatches).toBe(2); // Groceries, Salary
        expect(diag?.categories.aliasMatches).toBe(1); // Food -> alias

        // Report markdown
        expect(component.reportMarkdown()).toContain('QIF Import Statistical & Diagnostic Report');
        expect(component.reportMarkdown()).toContain('**Explicit Cleared (C* / Cc):** 1');
    });

    it('should copy report to clipboard when copyReport is called', async () => {
        const writeTextSpy = vi.fn().mockResolvedValue(undefined);
        Object.assign(navigator, {
            clipboard: { writeText: writeTextSpy }
        });

        component.reportMarkdown.set('# Sample Report');
        await component.copyReport();
        expect(writeTextSpy).toHaveBeenCalledWith('# Sample Report');
    });
});
