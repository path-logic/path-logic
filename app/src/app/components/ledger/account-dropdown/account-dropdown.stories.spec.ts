import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { AccountType, type Cents, type IAccount } from '@core';
import { beforeEach, describe, expect, it } from 'vitest';

import { AccountDropdownComponent } from './account-dropdown.component';
import { Default, OpenMenu, SelectNewOption } from './account-dropdown.component.stories';

describe('AccountDropdownComponent (Storybook Interaction Spec Wrapper)', () => {
    let fixture: ComponentFixture<AccountDropdownComponent>;

    const mockAccounts: Array<IAccount> = [
        {
            id: 'acc-1',
            name: 'Main Checking',
            type: AccountType.Checking,
            institutionName: 'Chase Bank',
            clearedBalance: -242102 as Cents,
            pendingBalance: -242102 as Cents,
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
            deletedAt: null
        },
        {
            id: 'acc-2',
            name: 'High Yield Savings',
            type: AccountType.Savings,
            institutionName: 'Ally Financial',
            clearedBalance: 1545000 as Cents,
            pendingBalance: 1545000 as Cents,
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
            deletedAt: null
        },
        {
            id: 'acc-3',
            name: 'Primary Credit Card',
            type: AccountType.Credit,
            institutionName: 'Amex',
            clearedBalance: -85000 as Cents,
            pendingBalance: -85000 as Cents,
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
            deletedAt: null
        },
        {
            id: 'acc-4',
            name: 'Home Mortgage',
            type: AccountType.Mortgage,
            institutionName: 'Rocket Mortgage',
            clearedBalance: -32000000 as Cents,
            pendingBalance: -32000000 as Cents,
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
            deletedAt: null
        }
    ];

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AccountDropdownComponent]
        }).compileComponents();
    });

    it('executes Default story interaction test', async () => {
        fixture = TestBed.createComponent(AccountDropdownComponent);
        fixture.componentRef.setInput('accounts', mockAccounts);
        fixture.componentRef.setInput('selectedAccountId', 'acc-1');
        fixture.detectChanges();

        await Default.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Main Checking');
    });

    it('executes OpenMenu story interaction test', async () => {
        fixture = TestBed.createComponent(AccountDropdownComponent);
        fixture.componentRef.setInput('accounts', mockAccounts);
        fixture.componentRef.setInput('selectedAccountId', 'acc-1');
        fixture.detectChanges();

        await OpenMenu.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.componentInstance.isOpen()).toBe(true);
    });

    it('executes SelectNewOption story interaction test', async () => {
        fixture = TestBed.createComponent(AccountDropdownComponent);
        fixture.componentRef.setInput('accounts', mockAccounts);
        fixture.componentRef.setInput('selectedAccountId', 'acc-1');
        fixture.detectChanges();

        await SelectNewOption.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.componentInstance.selectedAccountId()).toBe('acc-2');
    });
});
