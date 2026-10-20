import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { AuthService } from '../../../services/auth/auth.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { SyncPendingBannerComponent } from './sync-pending-banner.component';
import {
    Hidden,
    signInWithGoogleMock,
    VisiblePendingUpload,
    VisibleUnsyncedData
} from './sync-pending-banner.component.stories';

describe('SyncPendingBannerComponent (Storybook Stories)', () => {
    let mockLedgerStore: {
        authError: ReturnType<typeof signal<boolean>>;
        syncStatus: ReturnType<typeof signal<string>>;
    };

    beforeEach(() => {
        mockLedgerStore = {
            authError: signal(false),
            syncStatus: signal('idle')
        };
    });

    const createTestingModule = async () => {
        await TestBed.configureTestingModule({
            imports: [SyncPendingBannerComponent],
            providers: [
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: AuthService, useValue: { signInWithGoogle: signInWithGoogleMock } }
            ]
        }).compileComponents();
    };

    it('executes Hidden story interaction test', async () => {
        mockLedgerStore.authError.set(false);
        mockLedgerStore.syncStatus.set('idle');
        await createTestingModule();

        const fixture: ComponentFixture<SyncPendingBannerComponent> = TestBed.createComponent(
            SyncPendingBannerComponent
        );
        fixture.detectChanges();

        await Hidden.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent.trim()).toBe('');
    });

    it('executes VisibleUnsyncedData story interaction test', async () => {
        mockLedgerStore.authError.set(true);
        mockLedgerStore.syncStatus.set('pending-local');
        await createTestingModule();

        const fixture: ComponentFixture<SyncPendingBannerComponent> = TestBed.createComponent(
            SyncPendingBannerComponent
        );
        fixture.detectChanges();

        await VisibleUnsyncedData.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(mockLedgerStore.authError()).toBe(false);
    });

    it('executes VisiblePendingUpload story interaction test', async () => {
        mockLedgerStore.authError.set(true);
        mockLedgerStore.syncStatus.set('pending-local');
        await createTestingModule();

        const fixture: ComponentFixture<SyncPendingBannerComponent> = TestBed.createComponent(
            SyncPendingBannerComponent
        );
        fixture.detectChanges();

        await VisiblePendingUpload.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Cloud Sync Disconnected');
    });
});
