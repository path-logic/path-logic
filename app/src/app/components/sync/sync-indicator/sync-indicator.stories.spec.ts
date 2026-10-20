import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../services/auth/auth.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { SyncService } from '../../../services/sync/sync.service';
import { SyncIndicatorComponent } from './sync-indicator.component';
import {
    ActiveSyncing,
    AuthError,
    IdleSynced,
    LocalOnly
} from './sync-indicator.component.stories';

describe('SyncIndicatorComponent (Storybook Stories)', () => {
    let mockAuthService: {
        signInWithGoogle: ReturnType<typeof vi.fn>;
    };
    let mockSyncService: {
        isSyncing: ReturnType<typeof signal<boolean>>;
        getSyncStatus: ReturnType<typeof vi.fn>;
    };
    let mockLedgerStore: {
        syncStatus: ReturnType<typeof signal<string>>;
        authError: ReturnType<typeof signal<boolean>>;
        hasLocalFallback: ReturnType<typeof signal<boolean>>;
    };

    beforeEach(() => {
        mockAuthService = {
            signInWithGoogle: vi.fn().mockResolvedValue(undefined)
        };
        mockSyncService = {
            isSyncing: signal(false),
            getSyncStatus: vi.fn().mockReturnValue({ lastSyncTime: Date.now() - 120000 })
        };
        mockLedgerStore = {
            syncStatus: signal('idle'),
            authError: signal(false),
            hasLocalFallback: signal(true)
        };
    });

    const createTestingModule = async () => {
        await TestBed.configureTestingModule({
            imports: [SyncIndicatorComponent],
            providers: [
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: SyncService, useValue: mockSyncService },
                { provide: AuthService, useValue: mockAuthService }
            ]
        }).compileComponents();
    };

    it('renders IdleSynced story', async () => {
        await createTestingModule();
        const fixture: ComponentFixture<SyncIndicatorComponent> =
            TestBed.createComponent(SyncIndicatorComponent);
        fixture.detectChanges();

        expect(IdleSynced).toBeDefined();
        expect(fixture.nativeElement.textContent).toContain('Cloud Sync: Idle');
    });

    it('executes ActiveSyncing story interaction test', async () => {
        mockSyncService.isSyncing.set(true);
        await createTestingModule();

        const fixture: ComponentFixture<SyncIndicatorComponent> =
            TestBed.createComponent(SyncIndicatorComponent);
        fixture.detectChanges();

        await ActiveSyncing.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Cloud Sync: Active...');
    });

    it('executes AuthError story interaction test', async () => {
        mockLedgerStore.syncStatus.set('error');
        mockLedgerStore.authError.set(true);
        mockLedgerStore.hasLocalFallback.set(false);
        await createTestingModule();

        const fixture: ComponentFixture<SyncIndicatorComponent> =
            TestBed.createComponent(SyncIndicatorComponent);
        fixture.detectChanges();

        await AuthError.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Cloud Sync: Sync Error');
    });

    it('executes LocalOnly story interaction test', async () => {
        mockLedgerStore.syncStatus.set('pending-local');
        mockLedgerStore.authError.set(true);
        await createTestingModule();

        const fixture: ComponentFixture<SyncIndicatorComponent> =
            TestBed.createComponent(SyncIndicatorComponent);
        fixture.detectChanges();

        await LocalOnly.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Cloud Sync: Local Only');
    });
});
