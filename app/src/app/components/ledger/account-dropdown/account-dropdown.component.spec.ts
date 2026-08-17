import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type { IAccount } from '@core';
import { AccountType } from '@core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountDropdownComponent } from './account-dropdown.component';

describe('AccountDropdownComponent', () => {
    let component: AccountDropdownComponent;
    let fixture: ComponentFixture<AccountDropdownComponent>;

    const mockAccounts: Array<IAccount> = [
        {
            id: 'acc-1',
            name: 'Main Checking',
            type: AccountType.Checking,
            institutionName: 'Chase',
            clearedBalance: 250000,
            pendingBalance: 250000,
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
            deletedAt: null
        },
        {
            id: 'acc-2',
            name: 'High Yield Savings',
            type: AccountType.Savings,
            institutionName: 'Ally',
            clearedBalance: 1500000,
            pendingBalance: 1500000,
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

        fixture = TestBed.createComponent(AccountDropdownComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('accounts', mockAccounts);
        fixture.componentRef.setInput('selectedAccountId', 'acc-1');
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should display the selected account details', () => {
        const text = fixture.nativeElement.textContent;
        expect(text).toContain('Main Checking');
        expect(text).toContain('$2,500.00');
    });

    it('should toggle dropdown on button click', () => {
        const trigger = fixture.nativeElement.querySelector('button[aria-haspopup="listbox"]');
        expect(component.isOpen()).toBe(false);

        trigger.click();
        fixture.detectChanges();
        expect(component.isOpen()).toBe(true);

        trigger.click();
        fixture.detectChanges();
        expect(component.isOpen()).toBe(false);
    });

    it('should select an account when option is clicked', () => {
        component.open();
        fixture.detectChanges();

        const options = fixture.nativeElement.querySelectorAll('button[role="option"]');
        expect(options.length).toBe(2);

        options[1].click();
        fixture.detectChanges();

        expect(component.selectedAccountId()).toBe('acc-2');
        expect(component.isOpen()).toBe(false);
    });

    it('should emit addAccount output when Add New Account is clicked', () => {
        const emitSpy = vi.fn();
        component.addAccount.subscribe(emitSpy);

        component.open();
        fixture.detectChanges();

        const addBtn = fixture.nativeElement.querySelector('button i.pi-plus-circle').parentElement;
        addBtn.click();
        fixture.detectChanges();

        expect(emitSpy).toHaveBeenCalled();
        expect(component.isOpen()).toBe(false);
    });

    it('should handle keyboard navigation with ArrowDown, Enter, and Escape', () => {
        const trigger = fixture.nativeElement.querySelector('button[role="combobox"]');

        // Press ArrowDown to open
        component.onKeyDown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
        expect(component.isOpen()).toBe(true);

        // Arrow down to highlight second account
        component.onKeyDown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
        expect(component.highlightedIndex()).toBe(1);

        // Press Enter to select
        component.onKeyDown(new KeyboardEvent('keydown', { key: 'Enter' }));
        expect(component.selectedAccountId()).toBe('acc-2');
        expect(component.isOpen()).toBe(false);

        // Open and press Escape
        component.open();
        expect(component.isOpen()).toBe(true);
        component.onKeyDown(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(component.isOpen()).toBe(false);
    });
});
