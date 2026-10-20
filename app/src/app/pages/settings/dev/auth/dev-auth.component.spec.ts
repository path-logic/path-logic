import type { WritableSignal } from '@angular/core';
import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../../services/auth/auth.service';
import { LedgerStore } from '../../../../services/ledger-store/ledger.store';
import { SecurityManagerService } from '../../../../services/security-manager/security-manager.service';
import { SyncService } from '../../../../services/sync/sync.service';
import { DevAuthComponent } from './dev-auth.component';

describe('DevAuthComponent', () => {
    let component: DevAuthComponent;
    let fixture: ComponentFixture<DevAuthComponent>;

    let mockCurrentUser: WritableSignal<any>;
    let mockIsLoggedIn: WritableSignal<boolean>;
    let mockAccessToken: WritableSignal<string | null>;
    let mockAuthError: WritableSignal<boolean>;

    let mockAuthService: {
        currentUser: WritableSignal<any>;
        isLoggedIn: WritableSignal<boolean>;
        accessToken: WritableSignal<string | null>;
        signInWithGoogle: ReturnType<typeof vi.fn>;
        signOut: ReturnType<typeof vi.fn>;
    };

    let mockLedgerStore: {
        authError: WritableSignal<boolean>;
        accounts: WritableSignal<Array<any>>;
        transactions: WritableSignal<Array<any>>;
        schedules: WritableSignal<Array<any>>;
        payees: WritableSignal<Array<any>>;
        categories: WritableSignal<Array<any>>;
        isInitialized: WritableSignal<boolean>;
        syncStatus: WritableSignal<string>;
        hasLocalFallback: WritableSignal<boolean>;
        syncConflicts: WritableSignal<Array<any>>;
        mergeCount: WritableSignal<number>;
    };

    let mockSecurityManager: {
        isIdle: WritableSignal<boolean>;
        startMonitoring: ReturnType<typeof vi.fn>;
        resetTimers: ReturnType<typeof vi.fn>;
    };

    let mockSyncService: {
        isSyncing: WritableSignal<boolean>;
        getSyncStatus: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        mockCurrentUser = signal<any>(null);
        mockIsLoggedIn = signal<boolean>(false);
        mockAccessToken = signal<string | null>(null);
        mockAuthError = signal<boolean>(false);

        mockAuthService = {
            currentUser: mockCurrentUser,
            isLoggedIn: mockIsLoggedIn,
            accessToken: mockAccessToken,
            signInWithGoogle: vi.fn().mockResolvedValue(undefined),
            signOut: vi.fn().mockResolvedValue(undefined)
        };

        mockLedgerStore = {
            authError: mockAuthError,
            accounts: signal<Array<any>>([]),
            transactions: signal<Array<any>>([]),
            schedules: signal<Array<any>>([]),
            payees: signal<Array<any>>([]),
            categories: signal<Array<any>>([]),
            isInitialized: signal<boolean>(true),
            syncStatus: signal<string>('idle'),
            hasLocalFallback: signal<boolean>(true),
            syncConflicts: signal<Array<any>>([]),
            mergeCount: signal<number>(0)
        };

        mockSecurityManager = {
            isIdle: signal<boolean>(false),
            startMonitoring: vi.fn(),
            resetTimers: vi.fn()
        };

        mockSyncService = {
            isSyncing: signal<boolean>(false),
            getSyncStatus: vi.fn().mockReturnValue({ lastSyncTime: Date.now() })
        };

        await TestBed.configureTestingModule({
            imports: [DevAuthComponent],
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: mockAuthService },
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: SecurityManagerService, useValue: mockSecurityManager },
                { provide: SyncService, useValue: mockSyncService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(DevAuthComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the DevAuthComponent', () => {
        expect(component).toBeTruthy();
    });

    it('should display unauthenticated session state by default', () => {
        const textContent = fixture.nativeElement.textContent;
        expect(textContent).toContain('unauthenticated');
        expect(textContent).toContain('VALID');
        expect(component.sessionInfo()).toBe('No active session');

        const preElement = fixture.nativeElement.querySelector('pre');
        expect(preElement?.textContent?.trim()).toBe('No active session');
    });

    it('should display formatted session info and masked token when user is logged in', () => {
        mockCurrentUser.set({
            uid: 'dev-user-001',
            email: 'developer@pathlogic.io',
            displayName: 'Dev Engineer',
            emailVerified: true,
            isAnonymous: false,
            metadata: { creationTime: '2026-01-01' },
            providerData: [{ providerId: 'google.com' }]
        });
        mockIsLoggedIn.set(true);
        mockAccessToken.set('mock-access-token-98765432');
        fixture.detectChanges();

        expect(component.isLoggedIn()).toBe(true);
        expect(fixture.nativeElement.textContent).toContain('authenticated');

        const info = JSON.parse(component.sessionInfo());
        expect(info.uid).toBe('dev-user-001');
        expect(info.email).toBe('developer@pathlogic.io');
        expect(info.displayName).toBe('Dev Engineer');
        expect(info.accessToken).toBe('***98765432');

        const preElement = fixture.nativeElement.querySelector('pre');
        expect(preElement?.textContent).toContain('dev-user-001');
        expect(preElement?.textContent).toContain('***98765432');
    });

    it('should display MISSING for accessToken if token is null when user is logged in', () => {
        mockCurrentUser.set({
            uid: 'dev-user-002',
            email: 'dev2@pathlogic.io',
            displayName: 'Dev Two',
            emailVerified: false,
            isAnonymous: false,
            metadata: {},
            providerData: []
        });
        mockIsLoggedIn.set(true);
        mockAccessToken.set(null);
        fixture.detectChanges();

        const info = JSON.parse(component.sessionInfo());
        expect(info.accessToken).toBe('MISSING');
    });

    it('should reactively update when switching mock users', () => {
        // User A
        mockCurrentUser.set({
            uid: 'user-alpha',
            email: 'alpha@pathlogic.io',
            displayName: 'Alpha Tester',
            emailVerified: true,
            isAnonymous: false,
            metadata: {},
            providerData: []
        });
        mockIsLoggedIn.set(true);
        fixture.detectChanges();

        expect(component.sessionInfo()).toContain('user-alpha');
        expect(component.sessionInfo()).toContain('alpha@pathlogic.io');

        // Switch to User B
        mockCurrentUser.set({
            uid: 'user-beta',
            email: 'beta@pathlogic.io',
            displayName: 'Beta Tester',
            emailVerified: false,
            isAnonymous: true,
            metadata: {},
            providerData: []
        });
        fixture.detectChanges();

        expect(component.sessionInfo()).toContain('user-beta');
        expect(component.sessionInfo()).toContain('beta@pathlogic.io');

        // Switch to null (logged out)
        mockCurrentUser.set(null);
        mockIsLoggedIn.set(false);
        fixture.detectChanges();

        expect(component.sessionInfo()).toBe('No active session');
        expect(fixture.nativeElement.textContent).toContain('unauthenticated');
    });

    it('should simulate expired session and reset error state', () => {
        const simulateBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
            (b: any) => b.textContent?.includes('Simulate Expired Session')
        ) as HTMLButtonElement;
        expect(simulateBtn).toBeTruthy();

        simulateBtn.click();
        fixture.detectChanges();

        expect(mockLedgerStore.authError()).toBe(true);
        expect(component.authError()).toBe(true);
        expect(fixture.nativeElement.textContent).toContain('RECONNECT_REQUIRED');

        const resetBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
            (b: any) => b.textContent?.includes('Reset Error State')
        ) as HTMLButtonElement;
        expect(resetBtn).toBeTruthy();

        resetBtn.click();
        fixture.detectChanges();

        expect(mockLedgerStore.authError()).toBe(false);
        expect(component.authError()).toBe(false);
        expect(fixture.nativeElement.textContent).toContain('VALID');
    });

    it('should call authService.signInWithGoogle when Sign in button is clicked', async () => {
        const signInBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
            (b: any) => b.textContent?.includes('Sign in (Popup)')
        ) as HTMLButtonElement;
        expect(signInBtn).toBeTruthy();

        signInBtn.click();
        await fixture.whenStable();

        expect(mockAuthService.signInWithGoogle).toHaveBeenCalledTimes(1);
    });

    it('should call authService.signOut when End Session button is clicked', async () => {
        const signOutBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
            (b: any) => b.textContent?.includes('End Session')
        ) as HTMLButtonElement;
        expect(signOutBtn).toBeTruthy();

        signOutBtn.click();
        await fixture.whenStable();

        expect(mockAuthService.signOut).toHaveBeenCalledTimes(1);
    });

    it('should render back link pointing to /settings/dev', () => {
        const backLink = fixture.nativeElement.querySelector('a[routerLink="/settings/dev"]');
        expect(backLink).toBeTruthy();
        expect(backLink?.textContent).toContain('Back to Dev Tools');
    });
});
