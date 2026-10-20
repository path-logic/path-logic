import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type { IAccount, ISODateString } from '@core';
import { AccountType } from '@core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountEditFormComponent } from './account-edit-form.component';

describe('AccountEditFormComponent', () => {
    let component: AccountEditFormComponent;
    let fixture: ComponentFixture<AccountEditFormComponent>;

    const mockCheckingAccount: IAccount = {
        id: 'acc-1',
        name: 'Main Checking',
        type: AccountType.Checking,
        institutionName: 'Chase Bank',
        clearedBalance: 150000,
        pendingBalance: 150000,
        isActive: true,
        deletedAt: null,
        createdAt: '2024-01-01T00:00:00Z' as ISODateString,
        updatedAt: '2024-01-01T00:00:00Z' as ISODateString
    };

    const mockAutoLoanAccount: IAccount = {
        id: 'acc-2',
        name: 'Car Loan',
        type: AccountType.AutoLoan,
        institutionName: 'Honda Financial',
        clearedBalance: -1500000,
        pendingBalance: -1500000,
        isActive: true,
        deletedAt: null,
        createdAt: '2024-01-01T00:00:00Z' as ISODateString,
        updatedAt: '2024-01-01T00:00:00Z' as ISODateString,
        loanDetails: {
            originalAmount: 2500000,
            interestRate: 0.045,
            termMonths: 60,
            monthlyPayment: 46600,
            paymentDueDay: 15,
            startDate: '2024-01-01T00:00:00Z' as ISODateString,
            metadata: {
                vehicleMake: 'Honda',
                vehicleModel: 'Civic'
            }
        }
    };

    const mockMortgageAccount: IAccount = {
        id: 'acc-3',
        name: 'Home Mortgage',
        type: AccountType.Mortgage,
        institutionName: 'Wells Fargo',
        clearedBalance: -30000000,
        pendingBalance: -30000000,
        isActive: true,
        deletedAt: null,
        createdAt: '2024-01-01T00:00:00Z' as ISODateString,
        updatedAt: '2024-01-01T00:00:00Z' as ISODateString,
        loanDetails: {
            originalAmount: 35000000,
            interestRate: 0.065,
            termMonths: 360,
            monthlyPayment: 221200,
            paymentDueDay: 1,
            startDate: '2024-01-01T00:00:00Z' as ISODateString,
            metadata: {
                propertyAddress: '123 Elm Street',
                escrowIncluded: true
            }
        }
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AccountEditFormComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(AccountEditFormComponent);
        component = fixture.componentInstance;
    });

    it('should create the component', () => {
        fixture.componentRef.setInput('accountData', mockCheckingAccount);
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });

    it('should initialize the form with checking account data', () => {
        fixture.componentRef.setInput('accountData', mockCheckingAccount);
        fixture.detectChanges();

        expect(component.accountForm.get('name')?.value).toBe('Main Checking');
        expect(component.accountForm.get('institutionName')?.value).toBe('Chase Bank');
        expect(component.accountForm.get('type')?.value).toBe(AccountType.Checking);
        expect(component.accountForm.get('isActive')?.value).toBe(true);
        expect(component.isLoan()).toBe(false);
    });

    it('should initialize form with auto loan metadata and display loan fields', () => {
        fixture.componentRef.setInput('accountData', mockAutoLoanAccount);
        fixture.detectChanges();

        expect(component.isLoan()).toBe(true);
        expect(component.accountForm.get('originalAmount')?.value).toBe(25000);
        expect(component.accountForm.get('interestRate')?.value).toBe(4.5);
        expect(component.accountForm.get('termMonths')?.value).toBe(60);
        expect(component.accountForm.get('monthlyPayment')?.value).toBe(466);
        expect(component.accountForm.get('paymentDueDay')?.value).toBe(15);
        expect(component.accountForm.get('vehicleMake')?.value).toBe('Honda');
        expect(component.accountForm.get('vehicleModel')?.value).toBe('Civic');
    });

    it('should initialize form with mortgage metadata', () => {
        fixture.componentRef.setInput('accountData', mockMortgageAccount);
        fixture.detectChanges();

        expect(component.isLoan()).toBe(true);
        expect(component.accountForm.get('propertyAddress')?.value).toBe('123 Elm Street');
        expect(component.accountForm.get('escrowIncluded')?.value).toBe(true);
    });

    it('should not submit if form is invalid', async () => {
        fixture.componentRef.setInput('accountData', mockCheckingAccount);
        fixture.detectChanges();

        component.accountForm.get('name')?.setValue('');
        const submitSpy = vi.spyOn(component.submitted, 'emit');

        await component.handleSubmit();

        expect(component.accountForm.invalid).toBe(true);
        expect(component.accountForm.get('name')?.touched).toBe(true);
        expect(submitSpy).not.toHaveBeenCalled();
    });

    it('should submit successfully with updated checking account data', async () => {
        fixture.componentRef.setInput('accountData', mockCheckingAccount);
        fixture.detectChanges();

        component.accountForm.get('name')?.setValue('Updated Checking');
        component.accountForm.get('institutionName')?.setValue('Citibank');

        const submitSpy = vi.spyOn(component.submitted, 'emit');
        await component.handleSubmit();

        expect(submitSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'acc-1',
                name: 'Updated Checking',
                institutionName: 'Citibank',
                type: AccountType.Checking,
                isActive: true
            })
        );
    });

    it('should submit successfully with updated loan details for auto loan', async () => {
        fixture.componentRef.setInput('accountData', mockAutoLoanAccount);
        fixture.detectChanges();

        component.accountForm.get('monthlyPayment')?.setValue(480);
        component.accountForm.get('vehicleModel')?.setValue('Accord');

        const submitSpy = vi.spyOn(component.submitted, 'emit');
        await component.handleSubmit();

        expect(submitSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'acc-2',
                loanDetails: expect.objectContaining({
                    originalAmount: 2500000,
                    monthlyPayment: 48000,
                    metadata: expect.objectContaining({
                        vehicleMake: 'Honda',
                        vehicleModel: 'Accord'
                    })
                })
            })
        );
    });

    it('should submit successfully with updated loan details for mortgage', async () => {
        fixture.componentRef.setInput('accountData', mockMortgageAccount);
        fixture.detectChanges();

        component.accountForm.get('propertyAddress')?.setValue('456 Oak Avenue');

        const submitSpy = vi.spyOn(component.submitted, 'emit');
        await component.handleSubmit();

        expect(submitSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'acc-3',
                loanDetails: expect.objectContaining({
                    metadata: expect.objectContaining({
                        propertyAddress: '456 Oak Avenue',
                        escrowIncluded: true
                    })
                })
            })
        );
    });

    it('should show error when loan details validation fails', async () => {
        fixture.componentRef.setInput('accountData', mockAutoLoanAccount);
        fixture.detectChanges();

        // Set monthly payment far below monthly interest, which fails validation
        component.accountForm.get('monthlyPayment')?.setValue(1);

        const submitSpy = vi.spyOn(component.submitted, 'emit');
        await component.handleSubmit();

        expect(component.error()).toBeTruthy();
        expect(submitSpy).not.toHaveBeenCalled();
        expect(component.isSubmitting()).toBe(false);
    });

    it('should emit cancelled when handleCancel is called', () => {
        fixture.componentRef.setInput('accountData', mockCheckingAccount);
        fixture.detectChanges();

        const cancelSpy = vi.spyOn(component.cancelled, 'emit');
        component.handleCancel();

        expect(cancelSpy).toHaveBeenCalled();
    });

    it('should display error message in template when error signal is set', () => {
        fixture.componentRef.setInput('accountData', mockCheckingAccount);
        component.error.set('Something went wrong');
        fixture.detectChanges();

        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.textContent).toContain('Something went wrong');
    });

    it('should catch error in handleSubmit and set error signal', async () => {
        fixture.componentRef.setInput('accountData', mockCheckingAccount);
        fixture.detectChanges();

        // Break form value to throw during processing
        Object.defineProperty(component.accountForm, 'value', {
            get: () => {
                throw new Error('Simulated failure');
            }
        });

        await component.handleSubmit();

        expect(component.error()).toBe('Simulated failure');
        expect(component.isSubmitting()).toBe(false);
    });
});
