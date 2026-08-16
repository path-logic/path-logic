import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IAccount } from '@core';
import { AccountType } from '@core';
import { AuthService } from '../../../services/auth/auth.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { PostHogService } from '../../../services/posthog/posthog.service';
import { AccountFormComponent } from './account-form.component';

describe('AccountFormComponent', () => {
    let component: AccountFormComponent;
    let fixture: ComponentFixture<AccountFormComponent>;
    let router: Router;
    let mockLedgerStore: any;

    beforeEach(async () => {
        mockLedgerStore = {
            isInitialized: signal(true),
            syncStatus: signal('idle'),
            authError: signal(false),
            hasLocalFallback: signal(true),
            mergeCount: signal(0),
            syncConflicts: signal([]),
            totalClearedBalance: signal(0),
            totalPendingBalance: signal(0),
            transactions: signal([]),
            accounts: signal<Array<IAccount>>([]),
            payees: signal([]),
            categories: signal([]),
            addAccount: vi.fn().mockResolvedValue(undefined)
        };

        const mockAuthService = {
            accessToken: signal<string | null>(null),
            currentUser: signal(null),
            isLoggedIn: signal(true),
            isInitializing: signal(false),
            signInWithGoogle: vi.fn()
        };

        const mockPostHogService = {
            posthog: {
                capture: vi.fn()
            }
        };

        await TestBed.configureTestingModule({
            imports: [AccountFormComponent],
            providers: [
                provideNoopAnimations(),
                provideRouter([]),
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: AuthService, useValue: mockAuthService },
                { provide: PostHogService, useValue: mockPostHogService },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of(convertToParamMap({})),
                        queryParams: of({})
                    }
                }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(AccountFormComponent);
        component = fixture.componentInstance;
        router = TestBed.inject(Router);
        vi.spyOn(router, 'navigate').mockResolvedValue(true);
        fixture.detectChanges();
    });

    it('should create the account form component', () => {
        expect(component).toBeTruthy();
    });

    it('should start on step 1 (select-type)', () => {
        expect(component.step()).toBe('select-type');
        expect(component.selectedType()).toBeNull();
    });

    it('should transition to step 2 (enter-details) when an account type is selected', () => {
        component.handleTypeSelect(AccountType.Checking);
        expect(component.selectedType()).toBe(AccountType.Checking);
        expect(component.step()).toBe('enter-details');
        expect(component.accountName()).toBe('Main Checking');
    });

    it('should validate account name before creating', async () => {
        component.handleTypeSelect(AccountType.Savings);
        component.accountName.set('');
        await component.handleCreate();
        expect(component.error()).toContain('Account name is required');
        expect(mockLedgerStore.addAccount).not.toHaveBeenCalled();
    });

    it('should create an account and navigate to /accounts', async () => {
        component.handleTypeSelect(AccountType.Checking);
        component.accountName.set('Daily Checking');
        component.institutionName.set('Chase Bank');
        component.initialBalance.set('500.00');

        await component.handleCreate();

        expect(mockLedgerStore.addAccount).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'Daily Checking',
                type: AccountType.Checking,
                institutionName: 'Chase Bank',
                clearedBalance: 50000,
                pendingBalance: 50000
            })
        );
        expect(router.navigate).toHaveBeenCalledWith(['/accounts']);
    });

    it('should allow navigating back from step 2 to step 1', () => {
        component.handleTypeSelect(AccountType.Credit);
        expect(component.step()).toBe('enter-details');

        component.handleBack();
        expect(component.step()).toBe('select-type');
    });

    it('should cancel and navigate to /accounts when on step 1', () => {
        component.handleCancel();
        expect(router.navigate).toHaveBeenCalledWith(['/accounts']);
    });
});
