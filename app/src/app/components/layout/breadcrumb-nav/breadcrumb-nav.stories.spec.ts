import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AccountType } from '@core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CommandPaletteService } from '../../../services/command-palette/command-palette.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { BreadcrumbNavComponent } from './breadcrumb-nav.component';
import {
    MultipleAccountsDeepBreadcrumb,
    MultipleAccountsDropdown,
    Root,
    SearchTriggerInteraction,
    SingleAccountDeepBreadcrumb,
    SingleAccountStaticBreadcrumb,
    ZeroAccountsBreadcrumb
} from './breadcrumb-nav.component.stories';

const mockOpenCommandPalette = vi.fn();
const mockCommandPalette = {
    open: mockOpenCommandPalette,
    close: vi.fn(),
    isOpen: signal(false)
};

describe('BreadcrumbNavComponent (Storybook Interaction Spec Wrapper)', () => {
    let fixture: ComponentFixture<BreadcrumbNavComponent>;
    let router: Router;

    const singleAccount = [
        {
            id: 'acc-single',
            name: 'Single Checking',
            type: AccountType.Checking,
            institutionName: 'JPMorgan Chase',
            currency: 'USD',
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z'
        }
    ];

    const multipleAccounts = [
        {
            id: 'acc-123',
            name: 'Chase Checking',
            type: AccountType.Checking,
            institutionName: 'JPMorgan Chase',
            currency: 'USD',
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z'
        },
        {
            id: 'acc-456',
            name: 'Amex Gold',
            type: AccountType.Credit,
            institutionName: 'American Express',
            currency: 'USD',
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z'
        },
        {
            id: 'acc-789',
            name: 'High Yield Savings',
            type: AccountType.Savings,
            institutionName: 'Ally Bank',
            currency: 'USD',
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z'
        }
    ];

    const accountsSignal = signal<Array<any>>(multipleAccounts);
    const transactionsSignal = signal<Array<any>>([
        { id: 'tx-1', accountId: 'acc-single', totalAmount: 342050 },
        { id: 'tx-2', accountId: 'acc-123', totalAmount: 342050 }
    ]);

    const mockLedgerStore = {
        accounts: accountsSignal,
        transactions: transactionsSignal
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [BreadcrumbNavComponent],
            providers: [
                provideRouter([{ path: '**', component: BreadcrumbNavComponent }]),
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: CommandPaletteService, useValue: mockCommandPalette }
            ]
        }).compileComponents();

        router = TestBed.inject(Router);
        fixture = TestBed.createComponent(BreadcrumbNavComponent);
    });

    it('executes Root story interaction test', async () => {
        vi.spyOn(router, 'url', 'get').mockReturnValue('/');
        fixture.detectChanges();

        await Root.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Overview');
    });

    it('executes SingleAccountStaticBreadcrumb interaction test (1 account => no dropdown)', async () => {
        accountsSignal.set(singleAccount);
        vi.spyOn(router, 'url', 'get').mockReturnValue('/accounts/acc-single');
        fixture.detectChanges();

        await SingleAccountStaticBreadcrumb.play?.({ canvasElement: fixture.nativeElement } as any);

        // Verify dropdown does not exist and static text is present
        expect(fixture.nativeElement.querySelector('account-dropdown')).toBeNull();
        expect(fixture.nativeElement.textContent).toContain('Single Checking');
        expect(fixture.nativeElement.textContent).toContain('$3,420.50');
    });

    it('executes MultipleAccountsDropdown interaction test (2+ accounts => dropdown switcher)', async () => {
        accountsSignal.set(multipleAccounts);
        vi.spyOn(router, 'url', 'get').mockReturnValue('/accounts/acc-123');
        fixture.detectChanges();

        await MultipleAccountsDropdown.play?.({ canvasElement: fixture.nativeElement } as any);

        // Verify dropdown is present
        expect(fixture.nativeElement.querySelector('account-dropdown')).not.toBeNull();
    });

    it('executes SingleAccountDeepBreadcrumb interaction test (1 account deep nav)', async () => {
        accountsSignal.set(singleAccount);
        vi.spyOn(router, 'url', 'get').mockReturnValue('/accounts/acc-single/info');
        fixture.detectChanges();

        await SingleAccountDeepBreadcrumb.play?.({ canvasElement: fixture.nativeElement } as any);

        expect(fixture.nativeElement.querySelector('account-dropdown')).toBeNull();
        expect(fixture.nativeElement.textContent).toContain('Single Checking');
        expect(fixture.nativeElement.textContent).toContain('Account Details');
    });

    it('executes MultipleAccountsDeepBreadcrumb interaction test (2+ accounts deep nav)', async () => {
        accountsSignal.set(multipleAccounts);
        vi.spyOn(router, 'url', 'get').mockReturnValue('/accounts/acc-123/info');
        fixture.detectChanges();

        await MultipleAccountsDeepBreadcrumb.play?.({
            canvasElement: fixture.nativeElement
        } as any);

        expect(fixture.nativeElement.querySelector('account-dropdown')).not.toBeNull();
        expect(fixture.nativeElement.textContent).toContain('Account Details');
    });

    it('executes ZeroAccountsBreadcrumb interaction test (0 accounts)', async () => {
        accountsSignal.set([]);
        vi.spyOn(router, 'url', 'get').mockReturnValue('/accounts');
        fixture.detectChanges();

        await ZeroAccountsBreadcrumb.play?.({ canvasElement: fixture.nativeElement } as any);

        expect(fixture.nativeElement.querySelector('account-dropdown')).toBeNull();
        expect(fixture.nativeElement.textContent).toContain('Accounts');
    });

    it('executes SearchTriggerInteraction story interaction test', async () => {
        vi.spyOn(router, 'url', 'get').mockReturnValue('/settings');
        fixture.detectChanges();

        await SearchTriggerInteraction.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(mockOpenCommandPalette).toHaveBeenCalled();
    });
});
