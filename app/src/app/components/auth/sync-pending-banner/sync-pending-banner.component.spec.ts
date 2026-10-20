import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../services/auth/auth.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { SyncPendingBannerComponent } from './sync-pending-banner.component';

describe('SyncPendingBannerComponent', () => {
    let component: SyncPendingBannerComponent;
    let fixture: ComponentFixture<SyncPendingBannerComponent>;

    let authErrorSignal: ReturnType<typeof signal<boolean>>;
    let syncStatusSignal: ReturnType<typeof signal<string>>;

    let mockAuthService: {
        signInWithGoogle: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        authErrorSignal = signal<boolean>(false);
        syncStatusSignal = signal<string>('idle');

        mockAuthService = {
            signInWithGoogle: vi.fn().mockResolvedValue(undefined)
        };

        const mockLedgerStore = {
            authError: authErrorSignal,
            syncStatus: syncStatusSignal
        };

        await TestBed.configureTestingModule({
            imports: [SyncPendingBannerComponent],
            providers: [
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: AuthService, useValue: mockAuthService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(SyncPendingBannerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should not show banner when authError is false', () => {
        authErrorSignal.set(false);
        syncStatusSignal.set('pending-local');
        fixture.detectChanges();

        expect(component.showBanner()).toBe(false);
        const banner = fixture.nativeElement.querySelector('.sync-pending-banner');
        expect(banner).toBeNull();
    });

    it('should not show banner when syncStatus is not pending-local', () => {
        authErrorSignal.set(true);
        syncStatusSignal.set('idle');
        fixture.detectChanges();

        expect(component.showBanner()).toBe(false);
    });

    it('should show banner when authError is true and syncStatus is pending-local', () => {
        authErrorSignal.set(true);
        syncStatusSignal.set('pending-local');
        fixture.detectChanges();

        expect(component.showBanner()).toBe(true);
        const banner = fixture.nativeElement.querySelector('.sync-pending-banner');
        expect(banner).toBeTruthy();
        expect(fixture.nativeElement.textContent).toContain('Cloud Sync Disconnected');
        expect(fixture.nativeElement.textContent).toContain('Reconnect to Google Drive');
    });

    it('should call signInWithGoogle and clear authError on reAuthenticate success', async () => {
        authErrorSignal.set(true);
        syncStatusSignal.set('pending-local');
        fixture.detectChanges();

        await component.reAuthenticate();

        expect(mockAuthService.signInWithGoogle).toHaveBeenCalled();
        expect(authErrorSignal()).toBe(false);
    });

    it('should handle signInWithGoogle failure gracefully and retain authError', async () => {
        authErrorSignal.set(true);
        syncStatusSignal.set('pending-local');
        fixture.detectChanges();

        mockAuthService.signInWithGoogle.mockRejectedValue(new Error('User closed popup'));
        await component.reAuthenticate();

        expect(mockAuthService.signInWithGoogle).toHaveBeenCalled();
        expect(authErrorSignal()).toBe(true);
    });

    it('should trigger reAuthenticate when clicking the reconnect button', () => {
        authErrorSignal.set(true);
        syncStatusSignal.set('pending-local');
        fixture.detectChanges();

        const btn = fixture.nativeElement.querySelector('.reauth-btn') as HTMLButtonElement | null;
        expect(btn).toBeTruthy();

        btn?.click();
        expect(mockAuthService.signInWithGoogle).toHaveBeenCalled();
    });
});
