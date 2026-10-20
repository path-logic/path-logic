import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../services/auth/auth.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { SecurityManagerService } from '../../../services/security-manager/security-manager.service';
import { SyncService } from '../../../services/sync/sync.service';
import { DevIndexComponent } from './dev-index.component';

describe('DevIndexComponent', () => {
    let component: DevIndexComponent;
    let fixture: ComponentFixture<DevIndexComponent>;

    const mockAuthService = {
        currentUser: signal<any>({ uid: 'dev-admin', email: 'admin@pathlogic.io' }),
        accessToken: signal<string | null>('dev-token'),
        isLoggedIn: signal<boolean>(true)
    };

    const mockLedgerStore = {
        isInitialized: signal<boolean>(true),
        accounts: signal<Array<any>>([]),
        transactions: signal<Array<any>>([]),
        schedules: signal<Array<any>>([]),
        payees: signal<Array<any>>([]),
        categories: signal<Array<any>>([]),
        syncStatus: signal<string>('idle'),
        authError: signal<boolean>(false),
        hasLocalFallback: signal<boolean>(true),
        syncConflicts: signal<Array<any>>([]),
        mergeCount: signal<number>(0)
    };

    const mockSecurityManager = {
        isIdle: signal<boolean>(false),
        startMonitoring: vi.fn(),
        resetTimers: vi.fn()
    };

    const mockSyncService = {
        isSyncing: signal<boolean>(false),
        getSyncStatus: vi.fn().mockReturnValue({ lastSyncTime: Date.now() })
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [DevIndexComponent],
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: mockAuthService },
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: SecurityManagerService, useValue: mockSecurityManager },
                { provide: SyncService, useValue: mockSyncService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(DevIndexComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the DevIndexComponent', () => {
        expect(component).toBeTruthy();
    });

    it('should render the page header and description', () => {
        const h1 = fixture.nativeElement.querySelector('h1');
        expect(h1).toBeTruthy();
        expect(h1?.textContent).toContain('Developer');
        expect(h1?.textContent).toContain('Tools');

        expect(fixture.nativeElement.textContent).toContain(
            'Internal system diagnostics and architectural validation'
        );
    });

    it('should render 4 developer tool navigation links with appropriate routerLink targets', () => {
        const syncLink = fixture.nativeElement.querySelector(
            'a[routerLink="/settings/dev/sync-test"]'
        );
        const authLink = fixture.nativeElement.querySelector('a[routerLink="/settings/dev/auth"]');
        const maintLink = fixture.nativeElement.querySelector(
            'a[routerLink="/settings/dev/maintenance"]'
        );
        const qifLink = fixture.nativeElement.querySelector(
            'a[routerLink="/settings/dev/qif-test"]'
        );

        expect(syncLink).toBeTruthy();
        expect(authLink).toBeTruthy();
        expect(maintLink).toBeTruthy();
        expect(qifLink).toBeTruthy();
    });

    it('should render the Sync Test Suite card with tags', () => {
        const syncCard = fixture.nativeElement.querySelector(
            'a[routerLink="/settings/dev/sync-test"]'
        );
        expect(syncCard).toBeTruthy();
        expect(syncCard?.textContent).toContain('Sync Test Suite');
        expect(syncCard?.textContent).toContain('Full-cycle validation of the Path Logic');
        expect(syncCard?.textContent).toContain('SQLite');
        expect(syncCard?.textContent).toContain('AES-GCM');
        expect(syncCard?.textContent).toContain('Cloud Sync');
    });

    it('should render the Auth Diagnostics card with tags', () => {
        const authCard = fixture.nativeElement.querySelector('a[routerLink="/settings/dev/auth"]');
        expect(authCard).toBeTruthy();
        expect(authCard?.textContent).toContain('Auth Diagnostics');
        expect(authCard?.textContent).toContain('OAuth2 session validation');
        expect(authCard?.textContent).toContain('Google OAuth');
        expect(authCard?.textContent).toContain('Firebase Auth');
        expect(authCard?.textContent).toContain('Session Simulation');
    });

    it('should render the System Maintenance card with tags', () => {
        const maintCard = fixture.nativeElement.querySelector(
            'a[routerLink="/settings/dev/maintenance"]'
        );
        expect(maintCard).toBeTruthy();
        expect(maintCard?.textContent).toContain('System Maintenance');
        expect(maintCard?.textContent).toContain('Environment-level data destruction');
        expect(maintCard?.textContent).toContain('Factory Reset');
        expect(maintCard?.textContent).toContain('DB Explorer');
        expect(maintCard?.textContent).toContain('High-Risk');
    });

    it('should render the QIF Import Diagnostics card with tags', () => {
        const qifCard = fixture.nativeElement.querySelector(
            'a[routerLink="/settings/dev/qif-test"]'
        );
        expect(qifCard).toBeTruthy();
        expect(qifCard?.textContent).toContain('QIF Import Diagnostics');
        expect(qifCard?.textContent).toContain('Test QIF parsing and category mapping');
        expect(qifCard?.textContent).toContain('Parser');
        expect(qifCard?.textContent).toContain('Auto-Mapping');
    });

    it('should render the Security Requirement warning banner', () => {
        const textContent = fixture.nativeElement.textContent;
        expect(textContent).toContain('Security Requirement');
        expect(textContent).toContain('These tools access the encrypted domain layer');
    });
});
