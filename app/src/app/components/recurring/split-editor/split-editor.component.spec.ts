import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { KnownCategory, ScheduleType } from '@core';

import { RecurringSplitEditorComponent } from './split-editor.component';

describe('RecurringSplitEditorComponent', () => {
    let component: RecurringSplitEditorComponent;
    let fixture: ComponentFixture<RecurringSplitEditorComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [RecurringSplitEditorComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(RecurringSplitEditorComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the split editor', () => {
        expect(component).toBeTruthy();
    });

    it('should default to debit mode and allow adding/removing splits', () => {
        component.scheduleType = ScheduleType.Debit;
        fixture.detectChanges();

        expect(component.editingSplits.length).toBe(0);

        component.addSplit();
        expect(component.editingSplits.length).toBe(1);

        const splitId = component.editingSplits[0]!.id;
        component.updateSplit(0, 'memo', 'Test Memo');
        expect(component.editingSplits[0]!.memo).toBe('Test Memo');

        component.removeSplit(splitId);
        expect(component.editingSplits.length).toBe(0);
    });

    describe('Paycheck Mode', () => {
        beforeEach(() => {
            component.scheduleType = ScheduleType.Paycheck;
            fixture.detectChanges();
        });

        it('should switch tabs between wages, taxes, pre-tax, and post-tax', () => {
            expect(component.activePaycheckTab).toBe('wages');

            component.setTab('taxes');
            expect(component.activePaycheckTab).toBe('taxes');

            component.setTab('pre-tax');
            expect(component.activePaycheckTab).toBe('pre-tax');

            component.setTab('post-tax');
            expect(component.activePaycheckTab).toBe('post-tax');
        });

        it('should calculate total wages and emit positive gross pay split', () => {
            let emittedSplits: any = [];
            component.splitsChange.subscribe(s => (emittedSplits = s));

            component.updatePaycheckField('grossPay', 500000);
            expect(component.totalWages).toBe(500000);

            const grossSplit = emittedSplits.find(
                (s: any) => s.categoryId === KnownCategory.GrossPay
            );
            expect(grossSplit).toBeTruthy();
            expect(grossSplit.amount).toBe(500000);
        });

        it('should handle pre-tax deductions breakout (Medical, Dental, Vision, 401k, HSA)', () => {
            let emittedSplits: any = [];
            component.splitsChange.subscribe(s => (emittedSplits = s));

            component.updatePaycheckField('grossPay', 600000);
            component.updatePaycheckField('fourOhOneK', 50000);
            component.updatePaycheckField('medical', 30000);
            component.updatePaycheckField('dental', 5000);
            component.updatePaycheckField('vision', 3000);
            component.updatePaycheckField('hsa', 10000);

            expect(component.totalPreTax).toBe(98000);

            const medicalSplit = emittedSplits.find(
                (s: any) => s.categoryId === KnownCategory.HealthInsurance
            );
            expect(medicalSplit).toBeTruthy();
            expect(medicalSplit.amount).toBe(-30000);

            const visionSplit = emittedSplits.find(
                (s: any) => s.categoryId === KnownCategory.VisionInsurance
            );
            expect(visionSplit).toBeTruthy();
            expect(visionSplit.amount).toBe(-3000);

            const dentalSplit = emittedSplits.find(
                (s: any) => s.categoryId === KnownCategory.DentalInsurance
            );
            expect(dentalSplit).toBeTruthy();
            expect(dentalSplit.amount).toBe(-5000);
        });

        it('should handle post-tax deductions (Roth 401k, Life Insurance, Disability)', () => {
            let emittedSplits: any = [];
            component.splitsChange.subscribe(s => (emittedSplits = s));

            component.updatePaycheckField('roth401k', 25000);
            component.updatePaycheckField('lifeInsurance', 8000);
            component.updatePaycheckField('disabilityInsurance', 4000);

            expect(component.totalPostTax).toBe(37000);

            const rothSplit = emittedSplits.find(
                (s: any) => s.categoryId === KnownCategory.Roth401k
            );
            expect(rothSplit).toBeTruthy();
            expect(rothSplit.amount).toBe(-25000);

            const lifeSplit = emittedSplits.find(
                (s: any) => s.categoryId === KnownCategory.LifeInsurance
            );
            expect(lifeSplit).toBeTruthy();
            expect(lifeSplit.amount).toBe(-8000);
        });

        it('should support adding, updating, and removing custom fields across all tabs', () => {
            let emittedSplits: any = [];
            component.splitsChange.subscribe(s => (emittedSplits = s));

            // Custom Wage
            component.addCustomField('wages');
            expect(component.paycheckState.customWages.length).toBe(1);
            const wageItem = component.paycheckState.customWages[0]!;
            component.updateCustomField('wages', wageItem.id, 'memo', 'Performance Bonus');
            component.updateCustomField('wages', wageItem.id, 'amount', 100000);

            expect(component.totalWages).toBe(100000);

            // Custom Tax
            component.addCustomField('taxes');
            const taxItem = component.paycheckState.customTaxes[0]!;
            component.updateCustomField('taxes', taxItem.id, 'memo', 'State Disability');
            component.updateCustomField('taxes', taxItem.id, 'amount', 12000);

            expect(component.totalTaxes).toBe(12000);

            // Custom Pre-tax
            component.addCustomField('pre-tax');
            const preTaxItem = component.paycheckState.customPreTax[0]!;
            component.updateCustomField('pre-tax', preTaxItem.id, 'memo', 'Transit Pass');
            component.updateCustomField('pre-tax', preTaxItem.id, 'amount', 15000);

            expect(component.totalPreTax).toBe(15000);

            // Custom Post-tax
            component.addCustomField('post-tax');
            const postTaxItem = component.paycheckState.customPostTax[0]!;
            component.updateCustomField('post-tax', postTaxItem.id, 'memo', 'Union Dues');
            component.updateCustomField('post-tax', postTaxItem.id, 'amount', 5000);

            expect(component.totalPostTax).toBe(5000);
            expect(component.netPay).toBe(100000 - 12000 - 15000 - 5000);

            // Verify removals
            component.removeCustomField('wages', wageItem.id);
            expect(component.paycheckState.customWages.length).toBe(0);
            expect(component.totalWages).toBe(0);
        });

        it('should parse incoming splits into structured paycheck state including breakout categories', () => {
            component.splits = [
                {
                    id: 's1',
                    categoryId: KnownCategory.GrossPay,
                    memo: 'Gross Pay',
                    amount: 450000
                },
                {
                    id: 's2',
                    categoryId: KnownCategory.FederalTax,
                    memo: 'Fed Tax',
                    amount: -60000
                },
                {
                    id: 's3',
                    categoryId: KnownCategory.HealthInsurance,
                    memo: 'Medical',
                    amount: -25000
                },
                {
                    id: 's4',
                    categoryId: KnownCategory.VisionInsurance,
                    memo: 'Vision',
                    amount: -3000
                },
                {
                    id: 's5',
                    categoryId: KnownCategory.DentalInsurance,
                    memo: 'Dental',
                    amount: -4500
                },
                {
                    id: 's6',
                    categoryId: KnownCategory.Roth401k,
                    memo: 'Roth 401k',
                    amount: -20000
                }
            ];

            component.ngOnChanges({
                splits: {
                    currentValue: component.splits,
                    previousValue: [],
                    firstChange: true,
                    isFirstChange: () => true
                }
            });

            expect(component.paycheckState.grossPay).toBe(450000);
            expect(component.paycheckState.federalTax).toBe(60000);
            expect(component.paycheckState.medical).toBe(25000);
            expect(component.paycheckState.vision).toBe(3000);
            expect(component.paycheckState.dental).toBe(4500);
            expect(component.paycheckState.roth401k).toBe(20000);
        });
    });
});
