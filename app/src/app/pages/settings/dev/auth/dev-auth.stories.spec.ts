import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { AuthService } from '../../../../services/auth/auth.service';
import { LedgerStore } from '../../../../services/ledger-store/ledger.store';
import { SecurityManagerService } from '../../../../services/security-manager/security-manager.service';
import { SyncService } from '../../../../services/sync/sync.service';
import { DevAuthComponent } from './dev-auth.component';
import {
    AuthenticatedSession,
    Default,
    ExpiredSession,
    InteractiveActions,
    mockAccessToken,
    mockAuthError,
    mockAuthService,
    mockCurrentUser,
    mockIsLoggedIn,
    mockLedgerStore,
    mockSecurityManager,
    mockSyncService
} from './dev-auth.component.stories';

describe('DevAuthComponent (Storybook Stories)', () => {
    beforeEach(async () => {
        mockCurrentUser.set(null);
        mockIsLoggedIn.set(false);

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
    });

    it('renders Default story and executes play function', async () => {
        mockCurrentUser.set(null);
        mockIsLoggedIn.set(false);
        mockAccessToken.set(null);
        mockAuthError.set(false);

        const fixture: ComponentFixture<DevAuthComponent> =
            TestBed.createComponent(DevAuthComponent);
        fixture.detectChanges();

        await Default.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('unauthenticated');
    });

    it('renders AuthenticatedSession story and executes play function', async () => {
        mockCurrentUser.set({
            uid: 'dev-story-user',
            email: 'story@pathlogic.io',
            displayName: 'Storybook Dev',
            emailVerified: true,
            isAnonymous: false,
            metadata: {},
            providerData: []
        });
        mockIsLoggedIn.set(true);
        mockAccessToken.set('token-abc-99887766');
        mockAuthError.set(false);

        const fixture: ComponentFixture<DevAuthComponent> =
            TestBed.createComponent(DevAuthComponent);
        fixture.detectChanges();

        await AuthenticatedSession.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('authenticated');
    });

    it('renders ExpiredSession story and executes play function', async () => {
        mockCurrentUser.set({
            uid: 'dev-story-user',
            email: 'story@pathlogic.io',
            displayName: 'Storybook Dev',
            emailVerified: true,
            isAnonymous: false,
            metadata: {},
            providerData: []
        });
        mockIsLoggedIn.set(true);
        mockAccessToken.set('token-abc-99887766');
        mockAuthError.set(true);

        const fixture: ComponentFixture<DevAuthComponent> =
            TestBed.createComponent(DevAuthComponent);
        fixture.detectChanges();

        await ExpiredSession.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('RECONNECT_REQUIRED');
    });

    it('executes InteractiveActions story play function', async () => {
        const fixture: ComponentFixture<DevAuthComponent> =
            TestBed.createComponent(DevAuthComponent);
        fixture.detectChanges();

        await InteractiveActions.play?.({
            canvasElement: fixture.nativeElement,
            step: async (_name: string, fn: () => Promise<void>) => {
                await fn();
                fixture.detectChanges();
            }
        } as any);

        expect(fixture.nativeElement.textContent).toContain('unauthenticated');
    }, 15000);
});
