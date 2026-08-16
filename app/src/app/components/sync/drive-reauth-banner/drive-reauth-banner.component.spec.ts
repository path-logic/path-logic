import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../../services/auth/auth.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { SyncService } from '../../../services/sync/sync.service';
import { DriveReauthBannerComponent } from './drive-reauth-banner.component';

describe('DriveReauthBannerComponent', () => {
    let component: DriveReauthBannerComponent;
    let fixture: ComponentFixture<DriveReauthBannerComponent>;
    let mockAuthService: {
        accessToken: ReturnType<typeof signal<string | null>>;
        signInWithGoogle: ReturnType<typeof vi.fn>;
    };
    let mockSyncService: {
        syncFromDrive: ReturnType<typeof vi.fn>;
    };
    let mockLedgerStore: {
        authError: ReturnType<typeof signal<boolean>>;
        syncStatus: ReturnType<typeof signal<string>>;
    };

    beforeEach(async () => {
        mockAuthService = {
            accessToken: signal<string | null>(null),
            signInWithGoogle: vi.fn().mockResolvedValue(undefined)
        };
        mockSyncService = {
            syncFromDrive: vi.fn().mockResolvedValue(undefined)
        };
        mockLedgerStore = {
            authError: signal<boolean>(true),
            syncStatus: signal<string>('pending-local')
        };

        await TestBed.configureTestingModule({
            imports: [DriveReauthBannerComponent],
            providers: [
                { provide: AuthService, useValue: mockAuthService },
                { provide: SyncService, useValue: mockSyncService },
                { provide: LedgerStore, useValue: mockLedgerStore }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(DriveReauthBannerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should be visible when authError is true', () => {
        mockLedgerStore.authError.set(true);
        fixture.detectChanges();
        expect(component.isVisible()).toBe(true);
    });

    it('should call signInWithGoogle and syncFromDrive when re-authenticate is clicked', async () => {
        await component.reauthenticate();
        expect(mockAuthService.signInWithGoogle).toHaveBeenCalled();
        expect(mockSyncService.syncFromDrive).toHaveBeenCalled();
    });
});
