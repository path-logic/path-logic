import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../services/auth/auth.service';
import { LedgerStore } from '../../services/ledger-store/ledger.store';
import { PostHogService } from '../../services/posthog/posthog.service';
import { AuthErrorOverlayInterruption, ComboAuthFlowComponent } from './auth-flow.combo.stories';

describe('ComboAuthFlowComponent (Storybook Interaction Spec Wrapper)', () => {
    let fixture: ComponentFixture<ComboAuthFlowComponent>;

    const mockAuthService = {
        currentUser: signal<{ displayName: string; email: string } | null>(null),
        isLoggedIn: signal<boolean>(false),
        signInWithGoogle: vi
            .fn()
            .mockRejectedValue(new Error('Firebase: Error (auth/popup-closed-by-user).'))
    };

    const mockLedgerStore = {
        authError: signal<boolean>(true),
        isInitialized: signal<boolean>(false),
        hasLocalFallback: signal<boolean>(false)
    };

    const mockPostHogService = {
        posthog: {
            capture: vi.fn()
        }
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ComboAuthFlowComponent],
            providers: [
                provideRouter(new Array<any>()),
                { provide: AuthService, useValue: mockAuthService },
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: PostHogService, useValue: mockPostHogService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ComboAuthFlowComponent);
        fixture.detectChanges();
    });

    it('executes AuthErrorOverlayInterruption story interaction test', async () => {
        await AuthErrorOverlayInterruption.play?.({ canvasElement: fixture.nativeElement } as any);

        const text: string = fixture.nativeElement.textContent;
        expect(text).toContain('Authentication Flow Simulator');
        expect(text).toContain('Continue with Google');
        expect(text).toContain('Session');
        expect(text).toContain('Expired');
        expect(text).toContain('Re-authenticate Session');
    });
});
