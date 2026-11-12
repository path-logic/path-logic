import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';

import { AccountType, type IAccount } from '../../../core';
import { AccountSparklineCardComponent } from './account-sparkline-card.component';
import {
    Checking,
    CreditWithUtilizationCeiling,
    HeroFullWidth,
    ZeroBalanceMuted
} from './account-sparkline-card.component.stories';

describe('AccountSparklineCardComponent (Storybook Interaction Spec Wrapper)', () => {
    const mockChecking: IAccount = {
        id: 'acc-1',
        name: 'Primary Checking',
        institutionName: 'Chase',
        type: AccountType.Checking,
        clearedBalance: 1487050,
        pendingBalance: 1487050,
        isActive: true,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
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
        fixture.componentRef.setInput('account', Checking.args?.account ?? mockChecking);
        fixture.componentRef.setInput('telemetry', Checking.args?.telemetry ?? null);
        fixture.detectChanges();

        await Checking.play?.({ canvasElement: fixture.nativeElement } as never);
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
        fixture.componentRef.setInput('account', HeroFullWidth.args?.account ?? mockChecking);
        fixture.componentRef.setInput('telemetry', HeroFullWidth.args?.telemetry ?? null);
        fixture.componentRef.setInput(
            'heroTelemetry90d',
            HeroFullWidth.args?.heroTelemetry90d ?? null
        );
        fixture.componentRef.setInput('isFullWidth', true);
        fixture.componentRef.setInput('isPrimary', true);
        fixture.detectChanges();

        await HeroFullWidth.play?.({ canvasElement: fixture.nativeElement } as never);
        expect(fixture.nativeElement.textContent).toContain('Primary Checking');
    });

    it('executes CreditWithUtilizationCeiling and ZeroBalanceMuted story interaction tests', async () => {
        await TestBed.configureTestingModule({
            imports: [AccountSparklineCardComponent],
            providers: [provideRouter([])]
        }).compileComponents();

        const creditFixture: ComponentFixture<AccountSparklineCardComponent> =
            TestBed.createComponent(AccountSparklineCardComponent);
        creditFixture.componentRef.setInput(
            'account',
            CreditWithUtilizationCeiling.args?.account ?? mockChecking
        );
        creditFixture.componentRef.setInput(
            'telemetry',
            CreditWithUtilizationCeiling.args?.telemetry ?? null
        );
        creditFixture.detectChanges();
        await CreditWithUtilizationCeiling.play?.({
            canvasElement: creditFixture.nativeElement
        } as never);

        const zeroFixture: ComponentFixture<AccountSparklineCardComponent> =
            TestBed.createComponent(AccountSparklineCardComponent);
        zeroFixture.componentRef.setInput(
            'account',
            ZeroBalanceMuted.args?.account ?? mockChecking
        );
        zeroFixture.componentRef.setInput('telemetry', ZeroBalanceMuted.args?.telemetry ?? null);
        zeroFixture.detectChanges();
        await ZeroBalanceMuted.play?.({ canvasElement: zeroFixture.nativeElement } as never);
    });
});
