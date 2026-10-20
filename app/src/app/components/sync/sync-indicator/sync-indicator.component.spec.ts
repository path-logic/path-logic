import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../services/auth/auth.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { SyncService } from '../../../services/sync/sync.service';
import { SyncIndicatorComponent } from './sync-indicator.component';

describe('SyncIndicatorComponent', () => {
    let component: SyncIndicatorComponent;
    let fixture: ComponentFixture<SyncIndicatorComponent>;

    let syncStatusSignal: ReturnType<typeof signal<string>>;
    let authErrorSignal: ReturnType<typeof signal<boolean>>;
    let hasLocalFallbackSignal: ReturnType<typeof signal<boolean>>;
    let isSyncingSignal: ReturnType<typeof signal<boolean>>;

    let mockAuthService: {
        signInWithGoogle: ReturnType<typeof vi.fn>;
    };
    let mockSyncService: {
        isSyncing: ReturnType<typeof signal<boolean>>;
        getSyncStatus: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        vi.useFakeTimers();

        syncStatusSignal = signal<string>('idle');
        authErrorSignal = signal<boolean>(false);
        hasLocalFallbackSignal = signal<boolean>(true);
        isSyncingSignal = signal<boolean>(false);

        mockAuthService = {
            signInWithGoogle: vi.fn().mockResolvedValue(undefined)
        };

        mockSyncService = {
            isSyncing: isSyncingSignal,
            getSyncStatus: vi.fn().mockReturnValue({ lastSyncTime: 1710000000000 })
        };

        const mockLedgerStore = {
            syncStatus: syncStatusSignal,
            authError: authErrorSignal,
            hasLocalFallback: hasLocalFallbackSignal
        };

        await TestBed.configureTestingModule({
            imports: [SyncIndicatorComponent],
            providers: [
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: SyncService, useValue: mockSyncService },
                { provide: AuthService, useValue: mockAuthService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(SyncIndicatorComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should show Idle when syncStatus is idle and not syncing', () => {
        expect(component.statusLabel()).toBe('Idle');
        expect(fixture.nativeElement.textContent).toContain('Cloud Sync: Idle');
    });

    it('should show Active... when isSyncing is true', () => {
        isSyncingSignal.set(true);
        fixture.detectChanges();

        expect(component.statusLabel()).toBe('Active...');
        expect(fixture.nativeElement.textContent).toContain('Cloud Sync: Active...');
    });

    it('should show Local Only when syncStatus is pending-local', () => {
        syncStatusSignal.set('pending-local');
        fixture.detectChanges();

        expect(component.statusLabel()).toBe('Local Only');
        expect(fixture.nativeElement.textContent).toContain('Cloud Sync: Local Only');
    });

    it('should show Sync Error when syncStatus is error', () => {
        syncStatusSignal.set('error');
        fixture.detectChanges();

        expect(component.statusLabel()).toBe('Sync Error');
        expect(fixture.nativeElement.textContent).toContain('Cloud Sync: Sync Error');
    });

    it('should poll sync status periodically', () => {
        vi.advanceTimersByTime(1000);
        expect(mockSyncService.getSyncStatus).toHaveBeenCalled();
        expect(component.lastSyncTime()).toBe(1710000000000);
        expect(component.lastSyncFormatted()).toBeTruthy();
    });

    it('should display reconnect button when authError is true and call signInWithGoogle on click', () => {
        authErrorSignal.set(true);
        fixture.detectChanges();

        const btn = fixture.nativeElement.querySelector('button');
        expect(btn).toBeTruthy();
        expect(btn?.textContent).toContain('Reconnect Drive');

        btn?.click();
        expect(mockAuthService.signInWithGoogle).toHaveBeenCalled();
    });

    it('should clean up polling interval on destroy', () => {
        const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
        component.ngOnDestroy();
        expect(clearIntervalSpy).toHaveBeenCalled();
    });
});
