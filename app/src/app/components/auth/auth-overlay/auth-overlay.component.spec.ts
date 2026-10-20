import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../services/auth/auth.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { AuthOverlayComponent } from './auth-overlay.component';

describe('AuthOverlayComponent', () => {
    let component: AuthOverlayComponent;
    let fixture: ComponentFixture<AuthOverlayComponent>;

    let authErrorSignal: ReturnType<typeof signal<boolean>>;
    let isInitializedSignal: ReturnType<typeof signal<boolean>>;
    let hasLocalFallbackSignal: ReturnType<typeof signal<boolean>>;

    let mockAuthService: {
        signInWithGoogle: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        authErrorSignal = signal<boolean>(false);
        isInitializedSignal = signal<boolean>(true);
        hasLocalFallbackSignal = signal<boolean>(true);

        mockAuthService = {
            signInWithGoogle: vi.fn().mockResolvedValue(undefined)
        };

        const mockLedgerStore = {
            authError: authErrorSignal,
            isInitialized: isInitializedSignal,
            hasLocalFallback: hasLocalFallbackSignal
        };

        await TestBed.configureTestingModule({
            imports: [AuthOverlayComponent],
            providers: [
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: AuthService, useValue: mockAuthService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(AuthOverlayComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should not show overlay when there is no auth error', () => {
        authErrorSignal.set(false);
        isInitializedSignal.set(true);
        hasLocalFallbackSignal.set(true);
        fixture.detectChanges();

        expect(component.showOverlay()).toBe(false);
        expect(fixture.nativeElement.textContent.trim()).toBe('');
    });

    it('should not show overlay when initialized even if auth error occurs', () => {
        authErrorSignal.set(true);
        isInitializedSignal.set(true);
        hasLocalFallbackSignal.set(false);
        fixture.detectChanges();

        expect(component.showOverlay()).toBe(false);
    });

    it('should not show overlay when local fallback is available even if not initialized', () => {
        authErrorSignal.set(true);
        isInitializedSignal.set(false);
        hasLocalFallbackSignal.set(true);
        fixture.detectChanges();

        expect(component.showOverlay()).toBe(false);
    });

    it('should show overlay when auth error, not initialized, and no local fallback', () => {
        authErrorSignal.set(true);
        isInitializedSignal.set(false);
        hasLocalFallbackSignal.set(false);
        fixture.detectChanges();

        expect(component.showOverlay()).toBe(true);
        expect(fixture.nativeElement.textContent).toContain('Session Expired');
        expect(fixture.nativeElement.textContent).toContain(
            'Authentication with Google Drive is required to continue'
        );
    });

    it('should call authService.signInWithGoogle when clicking re-authenticate button', () => {
        authErrorSignal.set(true);
        isInitializedSignal.set(false);
        hasLocalFallbackSignal.set(false);
        fixture.detectChanges();

        const btn = fixture.nativeElement.querySelector('button');
        expect(btn).toBeTruthy();
        btn?.click();

        expect(mockAuthService.signInWithGoogle).toHaveBeenCalled();
    });
});
