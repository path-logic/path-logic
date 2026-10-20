import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { AccountEditFormComponent } from './account-edit-form.component';
import {
    AutoLoanEdit,
    CheckingAccountEdit,
    InteractiveValidation
} from './account-edit-form.component.stories';

describe('AccountEditFormComponent (Storybook Stories)', () => {
    let fixture: ComponentFixture<AccountEditFormComponent>;
    let component: AccountEditFormComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AccountEditFormComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(AccountEditFormComponent);
        component = fixture.componentInstance;
    });

    it('renders CheckingAccountEdit story', () => {
        fixture.componentRef.setInput('accountData', CheckingAccountEdit.args?.accountData);
        fixture.detectChanges();

        const input = fixture.nativeElement.querySelector('#acc-name') as HTMLInputElement;
        expect(input.value).toBe('Main Checking');
        expect(component.isLoan()).toBe(false);
    });

    it('renders AutoLoanEdit story with loan details', () => {
        fixture.componentRef.setInput('accountData', AutoLoanEdit.args?.accountData);
        fixture.detectChanges();

        expect(component.isLoan()).toBe(true);
        const nameInput = fixture.nativeElement.querySelector('#acc-name') as HTMLInputElement;
        expect(nameInput.value).toBe('Car Loan');
        const makeInput = fixture.nativeElement.querySelector('#loan-make') as HTMLInputElement;
        expect(makeInput.value).toBe('Honda');
    });

    it('executes InteractiveValidation story interaction test', async () => {
        fixture.componentRef.setInput('accountData', InteractiveValidation.args?.accountData);
        fixture.detectChanges();

        await InteractiveValidation.play?.({ canvasElement: fixture.nativeElement } as any);

        const nameInput = fixture.nativeElement.querySelector('#acc-name') as HTMLInputElement;
        expect(nameInput.classList.contains('ng-invalid')).toBe(true);
    });
});
