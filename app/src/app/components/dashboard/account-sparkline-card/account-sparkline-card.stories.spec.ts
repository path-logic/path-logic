import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { AccountType, type IAccount } from '../../../core';
import { AccountSparklineCardComponent } from './account-sparkline-card.component';
import { Checking, HeroFullWidth } from './account-sparkline-card.component.stories';

describe('AccountSparklineCardComponent (Storybook Interaction Spec Wrapper)', () => {
    const mockChecking: IAccount = {
        id: 'acc-1',
        name: 'Primary Checking',
        institutionName: 'Chase',
        type: AccountType.Checking,
        clearedBalance: 1487050 as any,
        pendingBalance: 1487050 as any,
        isActive: true,
        createdAt: '2026-01-01' as any,
        updatedAt: '2026-01-01' as any,
        deletedAt: null
    };

    it('executes Checking story interaction test', async () => {
        await TestBed.configureTestingModule({
            imports: [AccountSparklineCardComponent],
            providers: [provideRouter([])]
        }).compileComponents();

        const fixture: ComponentFixture<AccountSparklineCardComponent> = TestBed.createComponent(
            AccountSparklineCardComponent
        );
        fixture.componentRef.setInput('account', mockChecking);
        fixture.componentRef.setInput('trendPercent', '+1.1%');
        fixture.detectChanges();

        await Checking.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Primary Checking');
    });

    it('executes HeroFullWidth story interaction test', async () => {
        await TestBed.configureTestingModule({
            imports: [AccountSparklineCardComponent],
            providers: [provideRouter([])]
        }).compileComponents();

        const fixture: ComponentFixture<AccountSparklineCardComponent> = TestBed.createComponent(
            AccountSparklineCardComponent
        );
        fixture.componentRef.setInput('account', mockChecking);
        fixture.componentRef.setInput('trendPercent', '+1.1%');
        fixture.componentRef.setInput('isFullWidth', true);
        fixture.componentRef.setInput('isPrimary', true);
        fixture.detectChanges();

        await HeroFullWidth.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Primary Checking');
    });
});
