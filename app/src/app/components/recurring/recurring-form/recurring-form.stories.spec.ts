import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecurringPaymentFormComponent } from './recurring-form.component';
import {
    DebitModeWithSplits,
    Default,
    DepositModeWithSplits,
    EditExistingSchedule,
    PaycheckInteractiveWorkflow,
    PaycheckMode,
    PaycheckWithBreakoutAndCustomFields
} from './recurring-form.stories';

describe('RecurringPaymentFormComponent (Storybook Stories)', () => {
    let fixture: ComponentFixture<RecurringPaymentFormComponent>;
    let component: RecurringPaymentFormComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [RecurringPaymentFormComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(RecurringPaymentFormComponent);
        component = fixture.componentInstance;
    });

    it('should render Default story with account options', () => {
        component.schedule = { ...Default.args?.schedule };
        component.accounts = Default.args?.accounts ?? [];
        fixture.detectChanges();

        expect(component.schedule.payee).toBe('Internet Bill');
        expect(component.accounts.length).toBe(2);
    });

    it('should render PaycheckMode story with splits', () => {
        component.schedule = { ...PaycheckMode.args?.schedule };
        component.accounts = PaycheckMode.args?.accounts ?? [];
        fixture.detectChanges();

        expect(component.schedule.payee).toBe('Employer Inc');
        expect(component.schedule.splits?.length).toBe(4);
    });

    it('should render PaycheckWithBreakoutAndCustomFields story with breakout splits', () => {
        component.schedule = { ...PaycheckWithBreakoutAndCustomFields.args?.schedule };
        component.accounts = PaycheckWithBreakoutAndCustomFields.args?.accounts ?? [];
        fixture.detectChanges();

        expect(component.schedule.payee).toBe('Acme Corporation');
        expect(component.schedule.splits?.length).toBe(12);
    });

    it('should handle save event in PaycheckInteractiveWorkflow', () => {
        const saveSpy = vi.spyOn(component.saved, 'emit');
        component.schedule = { ...PaycheckInteractiveWorkflow.args?.schedule };
        component.accounts = PaycheckInteractiveWorkflow.args?.accounts ?? [];
        fixture.detectChanges();

        component.handleSave();
        expect(saveSpy).toHaveBeenCalled();
        const emittedSchedule = saveSpy.mock.calls[0]?.[0];
        expect(emittedSchedule?.payee).toBe('Acme Corporation');
        expect(emittedSchedule?.splits?.length).toBeGreaterThan(0);
    });

    it('should render EditExistingSchedule story with delete option', () => {
        const deleteSpy = vi.spyOn(component.deleted, 'emit');
        component.schedule = { ...EditExistingSchedule.args?.schedule };
        component.accounts = EditExistingSchedule.args?.accounts ?? [];
        fixture.detectChanges();

        expect(component.schedule.id).toBe('sched-123');
        component.handleDelete();
        expect(deleteSpy).toHaveBeenCalledWith('sched-123');
    });

    it('should render DepositModeWithSplits and emit on save', () => {
        const saveSpy = vi.spyOn(component.saved, 'emit');
        component.schedule = { ...DepositModeWithSplits.args?.schedule };
        component.accounts = DepositModeWithSplits.args?.accounts ?? [];
        fixture.detectChanges();

        expect(component.schedule.payee).toBe('Freelance Client');
        expect(component.schedule.splits?.length).toBe(2);

        component.handleSave();
        expect(saveSpy).toHaveBeenCalled();
        const emittedSchedule = saveSpy.mock.calls[0]?.[0];
        expect(emittedSchedule?.payee).toBe('Freelance Client');
        expect(emittedSchedule?.splits?.[0]?.memo).toBe('Monthly Retainer');
    });

    it('should render DebitModeWithSplits and handle split removal', () => {
        const saveSpy = vi.spyOn(component.saved, 'emit');
        component.schedule = {
            ...DebitModeWithSplits.args?.schedule,
            splits: [...(DebitModeWithSplits.args?.schedule?.splits ?? [])]
        };
        component.accounts = DebitModeWithSplits.args?.accounts ?? [];
        fixture.detectChanges();

        expect(component.schedule.payee).toBe('Property Management Co');
        expect(component.schedule.splits?.length).toBe(2);

        // Simulate removing a split
        component.schedule.splits?.splice(1, 1);
        expect(component.schedule.splits?.length).toBe(1);

        component.handleSave();
        expect(saveSpy).toHaveBeenCalled();
        const emittedSchedule = saveSpy.mock.calls[0]?.[0];
        expect(emittedSchedule?.splits?.length).toBe(1);
    });
});
