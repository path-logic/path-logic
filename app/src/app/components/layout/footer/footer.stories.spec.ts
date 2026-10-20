import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../services/auth/auth.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { SyncService } from '../../../services/sync/sync.service';
import { FooterComponent } from './footer.component';
import { AuthErrorWithReconnect, Default, Syncing } from './footer.component.stories';

describe('FooterComponent (Storybook Interaction Spec Wrapper)', () => {
    let fixture: ComponentFixture<FooterComponent>;

    const mockSyncStatus = signal<string>('idle');
    const mockAuthError = signal<boolean>(false);
    const mockHasLocalFallback = signal<boolean>(true);
    const mockIsSyncing = signal<boolean>(false);
    const mockSignInWithGoogle = vi.fn().mockResolvedValue(undefined);

    const mockLedgerStore = {
        syncStatus: mockSyncStatus,
        authError: mockAuthError,
        hasLocalFallback: mockHasLocalFallback
    };

    const mockSyncService = {
        isSyncing: mockIsSyncing,
        getSyncStatus: vi.fn().mockReturnValue({ lastSyncTime: 1700000000000 })
    };

    const mockAuthService = {
        signInWithGoogle: mockSignInWithGoogle
    };

    beforeEach(async () => {
        mockSyncStatus.set('idle');
        mockAuthError.set(false);
        mockHasLocalFallback.set(true);
        mockIsSyncing.set(false);
        mockSignInWithGoogle.mockClear();

        await TestBed.configureTestingModule({
            imports: [FooterComponent],
            providers: [
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: SyncService, useValue: mockSyncService },
                { provide: AuthService, useValue: mockAuthService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(FooterComponent);
        fixture.detectChanges();
    });

    it('executes Default story interaction test', async () => {
        await Default.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Environment:');
        expect(fixture.nativeElement.textContent).toContain('Cloud Sync: Idle');
    });

    it('executes Syncing story interaction test', async () => {
        mockSyncStatus.set('synced');
        mockIsSyncing.set(true);
        fixture.detectChanges();

        await Syncing.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Active...');
    });

    it('executes AuthErrorWithReconnect story interaction test', async () => {
        mockSyncStatus.set('error');
        mockAuthError.set(true);
        fixture.detectChanges();

        await AuthErrorWithReconnect.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(mockSignInWithGoogle).toHaveBeenCalled();
    });
});
