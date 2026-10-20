import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Frequency, PaymentMethod, ScheduleType } from '@core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecurringPaymentFormComponent } from './recurring-form.component';

describe('RecurringPaymentFormComponent', () => {
    let fixture: ComponentFixture<RecurringPaymentFormComponent>;
    let component: RecurringPaymentFormComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [RecurringPaymentFormComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(RecurringPaymentFormComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the recurring payment form component', () => {
        expect(component).toBeTruthy();
    });

    it('should emit saved event with schedule when handleSave() is called', () => {
        const savedSpy = vi.spyOn(component.saved, 'emit');
        component.schedule = {
            id: 'sched-1',
            payee: 'Internet Provider',
            amount: 7500,
            type: ScheduleType.Debit,
            frequency: Frequency.Monthly,
            startDate: '2026-09-01',
            nextDueDate: '2026-09-15'
        };

        component.handleSave();
        expect(savedSpy).toHaveBeenCalledWith(component.schedule);
    });

    it('should convert Date objects to ISO date strings on handleSave()', () => {
        const savedSpy = vi.spyOn(component.saved, 'emit');
        const testDate = new Date('2026-09-20T12:00:00Z');
        component.schedule = {
            id: 'sched-1',
            payee: 'Internet Provider',
            amount: 7500,
            type: ScheduleType.Debit,
            frequency: Frequency.Monthly,
            startDate: testDate as any,
            nextDueDate: testDate as any
        };

        component.handleSave();
        expect(component.schedule.startDate).toBe('2026-09-20');
        expect(component.schedule.nextDueDate).toBe('2026-09-20');
        expect(savedSpy).toHaveBeenCalled();
    });

    it('should emit cancelled event when handleCancel() is called', () => {
        const cancelSpy = vi.spyOn(component.cancelled, 'emit');
        component.handleCancel();
        expect(cancelSpy).toHaveBeenCalled();
    });

    it('should emit deleted event with schedule id when handleDelete() is called', () => {
        const deleteSpy = vi.spyOn(component.deleted, 'emit');
        component.schedule = { id: 'sched-99' };
        component.handleDelete();
        expect(deleteSpy).toHaveBeenCalledWith('sched-99');
    });

    it('should update payment method when onTypeChange is called for Paycheck', () => {
        component.onTypeChange(ScheduleType.Paycheck);
        expect(component.schedule.type).toBe(ScheduleType.Paycheck);
        expect(component.schedule.paymentMethod).toBe(PaymentMethod.DirectDeposit);
    });
});
