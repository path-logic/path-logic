import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AccountType } from '../../../core';
import { CommandPaletteService } from '../../../services/command-palette/command-palette.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { BreadcrumbNavComponent } from './breadcrumb-nav.component';

describe('BreadcrumbNavComponent', () => {
    let fixture: ComponentFixture<BreadcrumbNavComponent>;
    let component: BreadcrumbNavComponent;
    let router: Router;

    const mockAccounts = signal([
        {
            id: 'acc-1',
            name: 'Everyday Checking',
            type: AccountType.Checking,
            institutionName: 'Chase Bank',
            currency: 'USD',
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z'
        },
        {
            id: 'acc-2',
            name: 'Savings Account',
            type: AccountType.Savings,
            institutionName: 'Ally Bank',
            currency: 'USD',
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z'
        }
    ]);

    const mockLedgerStore = {
        accounts: mockAccounts,
        transactions: signal([])
    };

    const mockCommandPaletteService = {
        open: vi.fn(),
        close: vi.fn(),
        isOpen: signal(false)
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [BreadcrumbNavComponent],
            providers: [
                provideRouter([]),
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: CommandPaletteService, useValue: mockCommandPaletteService }
            ]
        }).compileComponents();

        router = TestBed.inject(Router);
        fixture = TestBed.createComponent(BreadcrumbNavComponent);
        component = fixture.componentInstance;
    });

    it('creates the component', () => {
        expect(component).toBeTruthy();
    });

    it('renders Overview home breadcrumb when on root route', () => {
        vi.spyOn(router, 'url', 'get').mockReturnValue('/');
        fixture.detectChanges();

        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.textContent).toContain('Overview');
    });

    it('renders Accounts breadcrumb when on /accounts', () => {
        vi.spyOn(router, 'url', 'get').mockReturnValue('/accounts');
        fixture.detectChanges();

        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.textContent).toContain('Accounts');
        expect(compiled.querySelector('account-dropdown')).toBeNull();
    });

    it('embeds account-dropdown when on /accounts/:accountId route', () => {
        vi.spyOn(router, 'url', 'get').mockReturnValue('/accounts/acc-1');
        fixture.detectChanges();

        const compiled = fixture.nativeElement as HTMLElement;
        expect(component.currentAccountId()).toBe('acc-1');
        const dropdown = compiled.querySelector('account-dropdown');
        expect(dropdown).not.toBeNull();
    });

    it('renders static label instead of dropdown when only 1 account exists', () => {
        mockAccounts.set([
            {
                id: 'acc-1',
                name: 'Main Checking',
                type: AccountType.Checking,
                institutionName: 'Chase Bank',
                currency: 'USD',
                isActive: true,
                createdAt: '2026-01-01T00:00:00Z',
                updatedAt: '2026-01-01T00:00:00Z'
            }
        ]);
        vi.spyOn(router, 'url', 'get').mockReturnValue('/accounts/acc-1');
        fixture.detectChanges();

        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.querySelector('account-dropdown')).toBeNull();
        expect(compiled.textContent).toContain('Main Checking');
    });

    it('navigates to new account when switched in dropdown', () => {
        vi.spyOn(router, 'url', 'get').mockReturnValue('/accounts/acc-1');
        const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
        fixture.detectChanges();

        component.onAccountSelect('acc-2');
        expect(navigateSpy).toHaveBeenCalledWith(['/accounts', 'acc-2']);
    });

    it('preserves /info sub-route when switching accounts', () => {
        vi.spyOn(router, 'url', 'get').mockReturnValue('/accounts/acc-1/info');
        const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
        fixture.detectChanges();

        component.onAccountSelect('acc-2');
        expect(navigateSpy).toHaveBeenCalledWith(['/accounts', 'acc-2', 'info']);
    });

    it('calls commandPaletteService.open() when search button is clicked', () => {
        vi.spyOn(router, 'url', 'get').mockReturnValue('/accounts');
        fixture.detectChanges();

        const searchButton = (fixture.nativeElement as HTMLElement).querySelector(
            'button[aria-label="Open Command Palette"]'
        ) as HTMLButtonElement;
        expect(searchButton).not.toBeNull();

        searchButton.click();
        expect(mockCommandPaletteService.open).toHaveBeenCalled();
    });
});
