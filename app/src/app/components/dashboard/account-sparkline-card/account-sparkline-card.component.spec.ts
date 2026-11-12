import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AccountType, type IAccount, type ITransaction, TransactionStatus } from '@core';
import { beforeEach, describe, expect, it } from 'vitest';

import {
    AccountTelemetryService,
    TelemetryWindowDays
} from '../../../services/account-telemetry/account-telemetry.service';
import { AccountSparklineCardComponent } from './account-sparkline-card.component';

describe('AccountSparklineCardComponent', () => {
    let component: AccountSparklineCardComponent;
    let fixture: ComponentFixture<AccountSparklineCardComponent>;
    let telemetryService: AccountTelemetryService;

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
            providers: [provideRouter([]), AccountTelemetryService]
        }).compileComponents();

        telemetryService = TestBed.inject(AccountTelemetryService);
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

    it('should display star icon and emit starToggled when clicked without rendering a Starred text badge', () => {
        let emittedId: string | null = null;
        component.starToggled.subscribe((id: string) => {
            emittedId = id;
        });

        expect(fixture.nativeElement.querySelector('.pi-star')).toBeTruthy();
        expect(fixture.nativeElement.querySelector('.pi-star-fill')).toBeNull();

        const starBtn = fixture.nativeElement.querySelector(
            'button[aria-label="Set as Primary Hero Account"]'
        ) as HTMLButtonElement;
        expect(starBtn).toBeTruthy();
        starBtn.click();

        expect(emittedId).toBe('acc-1');

        fixture.componentRef.setInput('isPrimary', true);
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('.pi-star-fill')).toBeTruthy();
        expect(fixture.nativeElement.textContent).not.toContain('Starred');
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

    it('renders interactive Chart.js hero telemetry, High/Low summary, and 30d/90d window toggle when telemetry is provided', () => {
        const txs: Array<ITransaction> = [
            {
                id: 'tx-1',
                accountId: 'acc-1',
                payeeId: 'p-1',
                date: '2026-11-05',
                payee: 'Payroll',
                memo: '',
                totalAmount: 350000,
                status: TransactionStatus.Cleared,
                splits: [],
                checkNumber: null,
                importHash: 'h1',
                createdAt: '2026-11-05',
                updatedAt: '2026-11-05'
            }
        ];

        const series30d = telemetryService.buildAccountTelemetry(mockAccount, txs, [], {
            windowDays: TelemetryWindowDays.ThirtyDays,
            forecastDays: 14,
            referenceDate: '2026-11-10'
        });
        const series90d = telemetryService.buildAccountTelemetry(mockAccount, txs, [], {
            windowDays: TelemetryWindowDays.NinetyDays,
            forecastDays: 14,
            referenceDate: '2026-11-10'
        });

        fixture.componentRef.setInput('trendPercent', null);
        fixture.componentRef.setInput('isFullWidth', true);
        fixture.componentRef.setInput('telemetry', series30d);
        fixture.componentRef.setInput('heroTelemetry90d', series90d);
        fixture.detectChanges();

        const summary = fixture.nativeElement.querySelector(
            '[data-testid="hero-telemetry-summary"]'
        );
        expect(summary).toBeTruthy();
        expect(summary.textContent).toContain('High:');
        expect(summary.textContent).toContain('$14,870.50');
        expect(summary.textContent).toContain('Low:');
        expect(summary.textContent).toContain('$11,370.50');

        const toggle90d = fixture.nativeElement.querySelector(
            '[data-testid="hero-window-btn-90"]'
        ) as HTMLButtonElement;
        expect(toggle90d).toBeTruthy();
        toggle90d.click();
        fixture.detectChanges();

        expect(component.activeHeroWindow()).toBe(TelemetryWindowDays.NinetyDays);
        expect(component.activeTelemetry()?.windowDays).toBe(TelemetryWindowDays.NinetyDays);
    });

    it('renders stepped SVG area fill and credit limit ceiling line for Credit Card sub-cards', () => {
        const creditAcc: IAccount = {
            id: 'acc-cc',
            name: 'Amazon Prime Visa',
            institutionName: 'Chase',
            type: AccountType.Credit,
            clearedBalance: -180000,
            pendingBalance: -180000,
            isActive: true,
            creditCardDetails: {
                creditLimit: 600000,
                interestRate: 0.1999,
                promotionalRates: []
            },
            createdAt: '2026-01-01',
            updatedAt: '2026-11-10',
            deletedAt: null
        };
        const txs: Array<ITransaction> = [
            {
                id: 'tx-c1',
                accountId: 'acc-cc',
                payeeId: 'p-amz',
                date: '2026-11-08',
                payee: 'Amazon',
                memo: '',
                totalAmount: -30000,
                status: TransactionStatus.Cleared,
                splits: [],
                checkNumber: null,
                importHash: 'hc1',
                createdAt: '2026-11-08',
                updatedAt: '2026-11-08'
            }
        ];
        const series = telemetryService.buildAccountTelemetry(creditAcc, txs, [], {
            referenceDate: '2026-11-10'
        });

        fixture.componentRef.setInput('account', creditAcc);
        fixture.componentRef.setInput('trendPercent', null);
        fixture.componentRef.setInput('telemetry', series);
        fixture.detectChanges();

        const ceilingLine = fixture.nativeElement.querySelector(
            '[data-testid="sparkline-credit-ceiling"]'
        );
        expect(ceilingLine).toBeTruthy();
        expect(fixture.nativeElement.textContent).toContain('30% of limit');
    });

    it('renders muted dashed zero-balance state with no artificial trend badge for $0.00 accounts', () => {
        const zeroAcc: IAccount = {
            ...mockAccount,
            id: 'acc-zero',
            name: '2001 Cobra',
            type: AccountType.AutoLoan,
            clearedBalance: 0,
            pendingBalance: 0
        };
        const zeroSeries = telemetryService.buildAccountTelemetry(zeroAcc, [], [], {
            referenceDate: '2026-11-10'
        });

        fixture.componentRef.setInput('account', zeroAcc);
        fixture.componentRef.setInput('trendPercent', null);
        fixture.componentRef.setInput('telemetry', zeroSeries);
        fixture.detectChanges();

        const article = fixture.nativeElement.querySelector('article');
        expect(article.getAttribute('data-zero-balance')).toBe('true');
        expect(
            fixture.nativeElement.querySelector(
                '[data-testid="sparkline-zero-balance-badge-acc-zero"]'
            )
        ).toBeTruthy();
        expect(component.effectiveTrendBadge()).toBeNull();
    });
});
