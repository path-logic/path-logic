import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../services/auth/auth.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { SyncService } from '../../../services/sync/sync.service';
import { FooterComponent } from './footer.component';

describe('FooterComponent', () => {
    let fixture: ComponentFixture<FooterComponent>;
    let component: FooterComponent;

    const mockSyncStatus = signal<string>('idle');
    const mockAuthError = signal<boolean>(false);
    const mockHasLocalFallback = signal<boolean>(true);
    const mockIsSyncing = signal<boolean>(false);

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
        signInWithGoogle: vi.fn().mockResolvedValue(undefined)
    };

    beforeEach(async () => {
        mockSyncStatus.set('idle');
        mockAuthError.set(false);
        mockHasLocalFallback.set(true);
        mockIsSyncing.set(false);

        await TestBed.configureTestingModule({
            imports: [FooterComponent],
            providers: [
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: SyncService, useValue: mockSyncService },
                { provide: AuthService, useValue: mockAuthService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(FooterComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('creates the footer component', () => {
        expect(component).toBeTruthy();
    });

    it('renders the application environment and version info', () => {
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.textContent).toContain('Environment:');
        expect(compiled.textContent).toContain(component.appEnv);
        expect(compiled.textContent).toContain('v4.2-Alpha');
    });

    it('renders the embedded sync indicator', () => {
        const syncIndicator = fixture.nativeElement.querySelector('sync-indicator');
        expect(syncIndicator).not.toBeNull();
        expect(syncIndicator.textContent).toContain('Cloud Sync: Idle');
    });

    it('displays syncing status when sync service is syncing', () => {
        mockIsSyncing.set(true);
        fixture.detectChanges();

        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.textContent).toContain('Cloud Sync: Active...');
    });

    it('displays reconnect button when auth error occurs', () => {
        mockSyncStatus.set('error');
        mockAuthError.set(true);
        fixture.detectChanges();

        const reconnectBtn = fixture.nativeElement.querySelector('button');
        expect(reconnectBtn).not.toBeNull();
        expect(reconnectBtn.textContent).toContain('Reconnect Drive');

        reconnectBtn.click();
        expect(mockAuthService.signInWithGoogle).toHaveBeenCalled();
    });
});
