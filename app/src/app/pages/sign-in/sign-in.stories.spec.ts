import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../services/auth/auth.service';
import { PostHogService } from '../../services/posthog/posthog.service';
import { SignInComponent } from './sign-in.component';
import {
    Default,
    InteractiveLogin,
    NetworkError,
    PopupClosedError
} from './sign-in.component.stories';

describe('SignInComponent (Storybook Interaction Spec Wrapper)', () => {
    let fixture: ComponentFixture<SignInComponent>;
    let detectChangesInterval: ReturnType<typeof setInterval>;

    const mockAuthService = {
        currentUser: signal<any>(null),
        isLoggedIn: signal<boolean>(false),
        accessToken: signal<string | null>(null),
        signInWithGoogle: vi.fn()
    };

    const mockPostHogService = {
        posthog: {
            capture: vi.fn()
        }
    };

    beforeEach(async () => {
        vi.clearAllMocks();

        await TestBed.configureTestingModule({
            imports: [SignInComponent],
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: mockAuthService },
                { provide: PostHogService, useValue: mockPostHogService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(SignInComponent);
        fixture.detectChanges();

        // Keep DOM in sync with zoneless signal updates during async story play functions
        detectChangesInterval = setInterval(() => {
            try {
                fixture.detectChanges();
            } catch {
                // Ignore errors if fixture is destroyed
            }
        }, 50);
    });

    afterEach(() => {
        clearInterval(detectChangesInterval);
    });

    it('renders Default story and verifies initial presentation', async () => {
        await Default.play?.({ canvasElement: fixture.nativeElement } as any);

        const text = fixture.nativeElement.textContent;
        expect(text).toContain('Continue with Google');
        expect(text).toContain('Personal Finance · Local-First · Encrypted');
        expect(text).toContain('End-to-End Encrypted');
    });

    it('executes InteractiveLogin story interaction test', async () => {
        mockAuthService.signInWithGoogle.mockImplementation(
            () => new Promise(resolve => setTimeout(resolve, 800))
        );

        await InteractiveLogin.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(mockAuthService.signInWithGoogle).toHaveBeenCalled();
    });

    it('executes PopupClosedError story interaction test', async () => {
        mockAuthService.signInWithGoogle.mockImplementation(
            () =>
                new Promise((_, reject) => {
                    setTimeout(() => {
                        reject(new Error('Firebase: Error (auth/popup-closed-by-user).'));
                    }, 200);
                })
        );

        await PopupClosedError.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Sign-in cancelled. Please try again.');
    });

    it('executes NetworkError story interaction test', async () => {
        mockAuthService.signInWithGoogle.mockImplementation(
            () =>
                new Promise((_, reject) => {
                    setTimeout(() => {
                        reject(new Error('Firebase: Error (auth/network-request-failed).'));
                    }, 200);
                })
        );

        await NetworkError.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain(
            'Network error. Please check your connection and try again.'
        );
    });
});
