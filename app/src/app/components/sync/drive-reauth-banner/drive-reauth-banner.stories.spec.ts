import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../services/auth/auth.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { SyncService } from '../../../services/sync/sync.service';
import { DriveReauthBannerComponent } from './drive-reauth-banner.component';
import { Default } from './drive-reauth-banner.component.stories';

describe('DriveReauthBannerComponent (Storybook Stories)', () => {
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
            authError: signal<boolean>(true)
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
        fixture.detectChanges();
    });

    it('executes Default story interaction test', async () => {
        await Default.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(mockAuthService.signInWithGoogle).toHaveBeenCalled();
        expect(mockSyncService.syncFromDrive).toHaveBeenCalled();
    });
});
