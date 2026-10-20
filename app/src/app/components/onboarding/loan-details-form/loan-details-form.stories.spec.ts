import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { AccountType } from '@core';
import { beforeEach, describe, expect, it } from 'vitest';
import { UserSettingsStore } from '../../../services/user-settings-store/user-settings.store';
import { LoanDetailsFormComponent } from './loan-details-form.component';
import {
    AutoLoan,
    InteractiveValidation,
    Mortgage,
    PersonalLoan
} from './loan-details-form.component.stories';

describe('LoanDetailsFormComponent (Storybook Interaction Spec Wrapper)', () => {
    let mockSettingsStore: {
        getSetting: (k: string) => string;
        updateSetting: () => void;
    };

    beforeEach(async () => {
        mockSettingsStore = {
            getSetting: () => 'false',
            updateSetting: () => {}
        };

        await TestBed.configureTestingModule({
            imports: [LoanDetailsFormComponent],
            providers: [{ provide: UserSettingsStore, useValue: mockSettingsStore }]
        }).compileComponents();
    });

    it('renders Mortgage story', () => {
        const fixture: ComponentFixture<LoanDetailsFormComponent> =
            TestBed.createComponent(LoanDetailsFormComponent);
        fixture.componentRef.setInput('type', Mortgage.args?.type ?? AccountType.Mortgage);
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('Create Mortgage');
        expect(fixture.nativeElement.textContent).toContain('Property Details');
        expect(componentAccountName(fixture)).toBe('Home Mortgage');
    });

    it('renders AutoLoan story', () => {
        const fixture: ComponentFixture<LoanDetailsFormComponent> =
            TestBed.createComponent(LoanDetailsFormComponent);
        fixture.componentRef.setInput('type', AutoLoan.args?.type ?? AccountType.AutoLoan);
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('Create Auto Loan');
        expect(fixture.nativeElement.textContent).toContain('Vehicle Details');
        expect(componentAccountName(fixture)).toBe('Auto Loan');
    });

    it('renders PersonalLoan story', () => {
        const fixture: ComponentFixture<LoanDetailsFormComponent> =
            TestBed.createComponent(LoanDetailsFormComponent);
        fixture.componentRef.setInput('type', PersonalLoan.args?.type ?? AccountType.PersonalLoan);
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('Create Personal Loan');
        expect(fixture.nativeElement.textContent).toContain('Loan Purpose');
        expect(componentAccountName(fixture)).toBe('Personal Loan');
    });

    it('executes InteractiveValidation story interaction test', async () => {
        const fixture: ComponentFixture<LoanDetailsFormComponent> =
            TestBed.createComponent(LoanDetailsFormComponent);
        fixture.componentRef.setInput(
            'type',
            InteractiveValidation.args?.type ?? AccountType.AutoLoan
        );
        fixture.detectChanges();

        await InteractiveValidation.play?.({
            canvasElement: fixture.nativeElement
        } as any);

        expect(componentAccountName(fixture)).toBe('Honda Civic');
    }, 15000);

    function componentAccountName(fixture: ComponentFixture<LoanDetailsFormComponent>): string {
        const input = fixture.nativeElement.querySelector('#loan-acc-name') as HTMLInputElement;
        return input?.value ?? '';
    }
});
