import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { AuthService } from '../../../services/auth/auth.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { AuthOverlayComponent } from './auth-overlay.component';
import {
    Hidden,
    signInWithGoogleMock,
    VisibleSessionExpired
} from './auth-overlay.component.stories';

describe('AuthOverlayComponent (Storybook Stories)', () => {
    let mockLedgerStore: {
        authError: ReturnType<typeof signal<boolean>>;
        isInitialized: ReturnType<typeof signal<boolean>>;
        hasLocalFallback: ReturnType<typeof signal<boolean>>;
    };

    beforeEach(() => {
        mockLedgerStore = {
            authError: signal(false),
            isInitialized: signal(true),
            hasLocalFallback: signal(true)
        };
    });

    const createTestingModule = async () => {
        await TestBed.configureTestingModule({
            imports: [AuthOverlayComponent],
            providers: [
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: AuthService, useValue: { signInWithGoogle: signInWithGoogleMock } }
            ]
        }).compileComponents();
    };

    it('executes Hidden story interaction test', async () => {
        mockLedgerStore.authError.set(false);
        mockLedgerStore.isInitialized.set(true);
        mockLedgerStore.hasLocalFallback.set(true);
        await createTestingModule();

        const fixture: ComponentFixture<AuthOverlayComponent> =
            TestBed.createComponent(AuthOverlayComponent);
        fixture.detectChanges();

        await Hidden.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent.trim()).toBe('');
    });

    it('executes VisibleSessionExpired story interaction test', async () => {
        mockLedgerStore.authError.set(true);
        mockLedgerStore.isInitialized.set(false);
        mockLedgerStore.hasLocalFallback.set(false);
        await createTestingModule();

        const fixture: ComponentFixture<AuthOverlayComponent> =
            TestBed.createComponent(AuthOverlayComponent);
        fixture.detectChanges();

        await VisibleSessionExpired.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Session Expired');
    });
});
