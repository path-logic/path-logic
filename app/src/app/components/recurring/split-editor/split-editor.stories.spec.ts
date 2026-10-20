import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { ScheduleType } from '@core';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecurringSplitEditorComponent } from './split-editor.component';
import {
    DefaultPaycheck,
    DepositSplitMode,
    PopulatedPaycheck,
    StandardSplitMode
} from './split-editor.component.stories';

describe('RecurringSplitEditorComponent (Storybook Stories)', () => {
    let fixture: ComponentFixture<RecurringSplitEditorComponent>;
    let component: RecurringSplitEditorComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [RecurringSplitEditorComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(RecurringSplitEditorComponent);
        component = fixture.componentInstance;
    });

    it('should render DefaultPaycheck story with initial zero amounts', () => {
        component.scheduleType = DefaultPaycheck.args?.scheduleType ?? ScheduleType.Paycheck;
        component.amount = DefaultPaycheck.args?.amount ?? 0;
        component.splits = DefaultPaycheck.args?.splits ?? [];
        fixture.detectChanges();

        expect(component.activePaycheckTab).toBe('wages');
        expect(component.totalWages).toBe(0);
        expect(component.netPay).toBe(0);
    });

    it('should render PopulatedPaycheck story with parsed breakout categories and subtotal badges', () => {
        component.scheduleType = PopulatedPaycheck.args?.scheduleType ?? ScheduleType.Paycheck;
        component.amount = PopulatedPaycheck.args?.amount ?? 345000;
        component.splits = PopulatedPaycheck.args?.splits ?? [];
        component.ngOnChanges({
            splits: {
                currentValue: component.splits,
                previousValue: [],
                firstChange: true,
                isFirstChange: () => true
            }
        });
        fixture.detectChanges();

        expect(component.paycheckState.grossPay).toBe(500000);
        expect(component.paycheckState.federalTax).toBe(65000);
        expect(component.paycheckState.stateTax).toBe(25000);
        expect(component.paycheckState.medical).toBe(15000);
        expect(component.paycheckState.dental).toBe(2500);
        expect(component.paycheckState.vision).toBe(1500);
        expect(component.paycheckState.roth401k).toBe(4000);
        expect(component.paycheckState.lifeInsurance).toBe(1000);

        expect(component.totalWages).toBe(500000);
        expect(component.totalTaxes).toBe(128250);
        expect(component.totalPreTax).toBe(26750);
        expect(component.totalPostTax).toBe(5000);
        expect(component.netPay).toBe(340000);
    });

    it('should render StandardSplitMode story with debit splits', () => {
        component.scheduleType = StandardSplitMode.args?.scheduleType ?? ScheduleType.Debit;
        component.amount = StandardSplitMode.args?.amount ?? 15000;
        component.splits = StandardSplitMode.args?.splits ?? [];
        component.ngOnChanges({
            splits: {
                currentValue: component.splits,
                previousValue: [],
                firstChange: true,
                isFirstChange: () => true
            }
        });
        fixture.detectChanges();

        expect(component.editingSplits.length).toBe(2);
    });

    it('should render DepositSplitMode story with deposit splits', () => {
        component.scheduleType = DepositSplitMode.args?.scheduleType ?? ScheduleType.Deposit;
        component.amount = DepositSplitMode.args?.amount ?? 250000;
        component.splits = DepositSplitMode.args?.splits ?? [];
        component.ngOnChanges({
            splits: {
                currentValue: component.splits,
                previousValue: [],
                firstChange: true,
                isFirstChange: () => true
            }
        });
        fixture.detectChanges();

        expect(component.editingSplits.length).toBe(2);
        expect(component.editingSplits[0]?.memo).toBe('Consulting Retainer');
        expect(component.editingSplits[1]?.memo).toBe('Expense Reimbursement');
    });

    it('should handle tab switching in paycheck mode', () => {
        component.scheduleType = ScheduleType.Paycheck;
        fixture.detectChanges();

        expect(component.activePaycheckTab).toBe('wages');
        component.setTab('taxes');
        expect(component.activePaycheckTab).toBe('taxes');
        component.setTab('pre-tax');
        expect(component.activePaycheckTab).toBe('pre-tax');
        component.setTab('post-tax');
        expect(component.activePaycheckTab).toBe('post-tax');
    });

    it('should support adding and removing custom fields across tabs', () => {
        component.scheduleType = ScheduleType.Paycheck;
        fixture.detectChanges();

        component.addCustomField('wages');
        expect(component.paycheckState.customWages.length).toBe(1);
        const wageId = component.paycheckState.customWages[0]?.id;
        if (wageId) {
            component.updateCustomField('wages', wageId, 'amount', 50000);
            expect(component.totalWages).toBe(50000);
            component.removeCustomField('wages', wageId);
            expect(component.paycheckState.customWages.length).toBe(0);
        }

        component.addCustomField('pre-tax');
        expect(component.paycheckState.customPreTax.length).toBe(1);
        const preTaxId = component.paycheckState.customPreTax[0]?.id;
        if (preTaxId) {
            component.updateCustomField('pre-tax', preTaxId, 'amount', 10000);
            expect(component.totalPreTax).toBe(10000);
            component.removeCustomField('pre-tax', preTaxId);
            expect(component.paycheckState.customPreTax.length).toBe(0);
        }

        component.addCustomField('post-tax');
        expect(component.paycheckState.customPostTax.length).toBe(1);
        const postTaxId = component.paycheckState.customPostTax[0]?.id;
        if (postTaxId) {
            component.updateCustomField('post-tax', postTaxId, 'amount', 7500);
            expect(component.totalPostTax).toBe(7500);
            component.removeCustomField('post-tax', postTaxId);
            expect(component.paycheckState.customPostTax.length).toBe(0);
        }
    });
});
