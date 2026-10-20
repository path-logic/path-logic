import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../services/auth/auth.service';
import { PostHogService } from '../../services/posthog/posthog.service';
import { SignInComponent } from './sign-in.component';

describe('SignInComponent', () => {
    let fixture: ComponentFixture<SignInComponent>;
    let component: SignInComponent;

    let mockAuthService: {
        currentUser: ReturnType<typeof signal<any>>;
        isLoggedIn: ReturnType<typeof signal<boolean>>;
        accessToken: ReturnType<typeof signal<string | null>>;
        signInWithGoogle: ReturnType<typeof vi.fn>;
    };

    let mockPostHogService: {
        posthog: {
            capture: ReturnType<typeof vi.fn>;
        };
    };

    beforeEach(async () => {
        mockAuthService = {
            currentUser: signal<any>(null),
            isLoggedIn: signal<boolean>(false),
            accessToken: signal<string | null>(null),
            signInWithGoogle: vi.fn().mockResolvedValue(undefined)
        };

        mockPostHogService = {
            posthog: {
                capture: vi.fn()
            }
        };

        await TestBed.configureTestingModule({
            imports: [SignInComponent],
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: mockAuthService },
                { provide: PostHogService, useValue: mockPostHogService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(SignInComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the SignInComponent', () => {
        expect(component).toBeTruthy();
    });

    describe('Google SSO Login', () => {
        it('should trigger signInWithGoogle and record PostHog event on button click', async () => {
            const button = fixture.nativeElement.querySelector(
                'button.sign-in-button'
            ) as HTMLButtonElement;
            expect(button).toBeTruthy();

            button.click();
            expect(mockPostHogService.posthog.capture).toHaveBeenCalledWith('sign_in_attempted', {
                provider: 'google'
            });
            expect(mockAuthService.signInWithGoogle).toHaveBeenCalled();

            await fixture.whenStable();
            expect(component.isLoading()).toBe(false);
            expect(component.signInError()).toBeNull();
        });

        it('should show loading spinner and disable button while authenticating', async () => {
            component.isLoading.set(true);
            fixture.detectChanges();

            const button = fixture.nativeElement.querySelector(
                'button.sign-in-button'
            ) as HTMLButtonElement;
            expect(button.disabled).toBe(true);
            expect(fixture.nativeElement.textContent).toContain('Authenticating...');
            expect(fixture.nativeElement.querySelector('.spinner')).toBeTruthy();
        });

        it('should handle popup-closed-by-user error gracefully', async () => {
            mockAuthService.signInWithGoogle.mockRejectedValueOnce(
                new Error('Firebase: Error (auth/popup-closed-by-user).')
            );

            await component.signInWithGoogle();
            fixture.detectChanges();

            expect(component.signInError()).toBe('Sign-in cancelled. Please try again.');
            expect(component.isLoading()).toBe(false);
            expect(mockPostHogService.posthog.capture).toHaveBeenCalledWith('sign_in_failed', {
                provider: 'google',
                error_type: 'popup_closed',
                error_message: 'Firebase: Error (auth/popup-closed-by-user).'
            });

            const errorEl = fixture.nativeElement.querySelector('.error-message');
            expect(errorEl?.textContent).toContain('Sign-in cancelled. Please try again.');
        });

        it('should handle popup-blocked error gracefully', async () => {
            mockAuthService.signInWithGoogle.mockRejectedValueOnce(
                new Error('Firebase: Error (auth/popup-blocked).')
            );

            await component.signInWithGoogle();
            fixture.detectChanges();

            expect(component.signInError()).toBe(
                'Pop-up was blocked. Please allow pop-ups for this site and try again.'
            );
            expect(mockPostHogService.posthog.capture).toHaveBeenCalledWith('sign_in_failed', {
                provider: 'google',
                error_type: 'popup_blocked',
                error_message: 'Firebase: Error (auth/popup-blocked).'
            });
        });

        it('should handle network-request-failed error gracefully', async () => {
            mockAuthService.signInWithGoogle.mockRejectedValueOnce(
                new Error('Firebase: Error (auth/network-request-failed).')
            );

            await component.signInWithGoogle();
            fixture.detectChanges();

            expect(component.signInError()).toBe(
                'Network error. Please check your connection and try again.'
            );
            expect(mockPostHogService.posthog.capture).toHaveBeenCalledWith('sign_in_failed', {
                provider: 'google',
                error_type: 'network_error',
                error_message: 'Firebase: Error (auth/network-request-failed).'
            });
        });

        it('should handle generic unknown error gracefully', async () => {
            mockAuthService.signInWithGoogle.mockRejectedValueOnce(
                new Error('Unexpected system error occurred.')
            );

            await component.signInWithGoogle();
            fixture.detectChanges();

            expect(component.signInError()).toBe('Unexpected system error occurred.');
            expect(mockPostHogService.posthog.capture).toHaveBeenCalledWith('sign_in_failed', {
                provider: 'google',
                error_type: 'unknown',
                error_message: 'Unexpected system error occurred.'
            });
        });
    });

    describe('Storage Mode & Trust Descriptions', () => {
        it('should display brand tagline describing encrypted local-first mode', () => {
            const text = fixture.nativeElement.textContent;
            expect(text).toContain('Personal Finance · Local-First · Encrypted');
        });

        it('should display End-to-End Encrypted storage mode description', () => {
            const text = fixture.nativeElement.textContent;
            expect(text).toContain('End-to-End Encrypted');
            expect(text).toContain('Your data is encrypted locally before it leaves your browser.');
        });

        it('should display User-Owned Storage description', () => {
            const text = fixture.nativeElement.textContent;
            expect(text).toContain('User-Owned Storage');
            expect(text).toContain('Data is stored exclusively in your own Google Drive.');
        });

        it('should display Zero-Knowledge Architecture description', () => {
            const text = fixture.nativeElement.textContent;
            expect(text).toContain('Zero-Knowledge Architecture');
            expect(text).toContain(
                'Path Logic never sees, stores, or has access to your financial data.'
            );
        });
    });

    describe('Demo Mode & Access Gatekeeping', () => {
        it('should strictly gatekeep authentication with no unencrypted demo bypass buttons', () => {
            const demoButton = fixture.nativeElement.querySelector(
                'button[data-testid="demo-entry"], .demo-button'
            );
            expect(demoButton).toBeNull();
        });

        it('should ensure the only interactive auth action is Google SSO', () => {
            const buttons = fixture.nativeElement.querySelectorAll('button');
            expect(buttons.length).toBe(1);
            expect(buttons[0].textContent).toContain('Continue with Google');
        });
    });
});
