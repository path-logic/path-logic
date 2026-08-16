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
});
