import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AccountType, type IAccount } from '@core';
import { beforeEach, describe, expect, it } from 'vitest';

import { AccountSparklineCardComponent } from './account-sparkline-card.component';

describe('AccountSparklineCardComponent', () => {
    let component: AccountSparklineCardComponent;
    let fixture: ComponentFixture<AccountSparklineCardComponent>;

    const mockAccount: IAccount = {
        id: 'acc-1',
        name: 'Chase Checking',
        institutionName: 'Chase',
        type: AccountType.Checking,
        clearedBalance: 1487050,
        pendingBalance: 1487050,
        isActive: true,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        deletedAt: null
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AccountSparklineCardComponent],
            providers: [provideRouter([])]
        }).compileComponents();

        fixture = TestBed.createComponent(AccountSparklineCardComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('account', mockAccount);
        fixture.componentRef.setInput('trendPercent', '+1.1%');
        fixture.detectChanges();
    });

    it('should create the account sparkline card', () => {
        expect(component).toBeTruthy();
    });

    it('should format balance in dollars correctly', () => {
        expect(component.formattedBalance()).toBe('$14,870.50');
    });

    it('should display account name, institution, and trend percentage', () => {
        const text = fixture.nativeElement.textContent;
        expect(text).toContain('Chase Checking');
        expect(text).toContain('Chase');
        expect(text).toContain('+1.1%');
    });

    it('should render the SVG sparkline curve', () => {
        const svg = fixture.nativeElement.querySelector('svg');
        const path = fixture.nativeElement.querySelector('path');
        expect(svg).toBeTruthy();
        expect(path.getAttribute('d')).toBeTruthy();
    });

    it('should emit quickEntryRequested when Quick Entry button is clicked', () => {
        let emittedId: string | null = null;
        component.quickEntryRequested.subscribe((id: string) => {
            emittedId = id;
        });

        const quickEntryBtn = fixture.nativeElement.querySelector(
            'button[aria-label="Quick Entry for Chase Checking"]'
        ) as HTMLButtonElement;
        expect(quickEntryBtn).toBeTruthy();
        quickEntryBtn.click();

        expect(emittedId).toBe('acc-1');
    });

    it('should display star icon and emit starToggled when clicked', () => {
        let emittedId: string | null = null;
        component.starToggled.subscribe((id: string) => {
            emittedId = id;
        });

        // Initially not primary
        expect(fixture.nativeElement.querySelector('.pi-star')).toBeTruthy();
        expect(fixture.nativeElement.querySelector('.pi-star-fill')).toBeNull();

        // Click star button
        const starBtn = fixture.nativeElement.querySelector(
            'button[aria-label="Set as Primary Hero Account"]'
        ) as HTMLButtonElement;
        expect(starBtn).toBeTruthy();
        starBtn.click();

        expect(emittedId).toBe('acc-1');

        // Set isPrimary to true
        fixture.componentRef.setInput('isPrimary', true);
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('.pi-star-fill')).toBeTruthy();
    });

    it('should apply full width hero styling when isFullWidth is true', () => {
        fixture.componentRef.setInput('isFullWidth', true);
        fixture.detectChanges();

        const card = fixture.nativeElement.querySelector('article');
        expect(card).toBeTruthy();
        const balanceEl = fixture.nativeElement.querySelector('.font-mono.font-black');
        expect(balanceEl.classList.contains('sm:text-4xl')).toBe(true);
        expect(fixture.nativeElement.textContent).toContain('Cleared: $14,870.50');
    });

    it('should compute pending difference correctly when pending and cleared differ', () => {
        const pendingAccount: IAccount = {
            ...mockAccount,
            clearedBalance: 100000,
            pendingBalance: 125000
        };
        fixture.componentRef.setInput('account', pendingAccount);
        fixture.componentRef.setInput('isFullWidth', true);
        fixture.detectChanges();

        expect(component.formattedClearedBalance()).toBe('$1,000.00');
        expect(component.hasPendingTransactions()).toBe(true);
        expect(component.formattedPendingDifference()).toBe('+$250.00');
        expect(fixture.nativeElement.textContent).toContain('+$250.00 pending');
    });

    it('should link to account settings via full card click target overlay in standard mode', () => {
        const settingsOverlayLink = fixture.nativeElement.querySelector(
            'a[aria-label="Configure settings for Chase Checking"]'
        ) as HTMLAnchorElement;
        expect(settingsOverlayLink).toBeTruthy();
        expect(settingsOverlayLink.tagName.toLowerCase()).toBe('a');
        expect(settingsOverlayLink.getAttribute('href')).toBe('/accounts/acc-1/info');
    });

    it('should have a working View Ledger link and a Settings overlay in full width hero mode', () => {
        fixture.componentRef.setInput('isFullWidth', true);
        fixture.detectChanges();

        const settingsOverlayLink = fixture.nativeElement.querySelector(
            'a[aria-label="Configure settings for Chase Checking"]'
        ) as HTMLAnchorElement;
        expect(settingsOverlayLink).toBeTruthy();
        expect(settingsOverlayLink.getAttribute('href')).toBe('/accounts/acc-1/info');

        const viewLedgerLink = fixture.nativeElement.querySelector(
            'a[aria-label="View ledger for Chase Checking"]'
        ) as HTMLAnchorElement;
        expect(viewLedgerLink).toBeTruthy();
        expect(viewLedgerLink.tagName.toLowerCase()).toBe('a');
        expect(viewLedgerLink.getAttribute('href')).toBe('/accounts/acc-1');
    });
});
