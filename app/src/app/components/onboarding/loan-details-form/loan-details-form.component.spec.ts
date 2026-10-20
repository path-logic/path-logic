import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type { IAccount, IAutoLoanMetadata, IMortgageMetadata, IPersonalLoanMetadata } from '@core';
import { AccountType } from '@core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserSettingsStore } from '../../../services/user-settings-store/user-settings.store';
import { LoanDetailsFormComponent } from './loan-details-form.component';

describe('LoanDetailsFormComponent', () => {
    let fixture: ComponentFixture<LoanDetailsFormComponent>;
    let component: LoanDetailsFormComponent;

    let mockSettingsStore: {
        getSetting: ReturnType<typeof vi.fn>;
        updateSetting: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        mockSettingsStore = {
            getSetting: vi.fn().mockReturnValue('false'),
            updateSetting: vi.fn()
        };

        await TestBed.configureTestingModule({
            imports: [LoanDetailsFormComponent],
            providers: [{ provide: UserSettingsStore, useValue: mockSettingsStore }]
        }).compileComponents();
    });

    function setupComponent(
        type: AccountType = AccountType.Mortgage,
        showFooter: boolean = true
    ): void {
        fixture = TestBed.createComponent(LoanDetailsFormComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('type', type);
        fixture.componentRef.setInput('showFooter', showFooter);
        fixture.detectChanges();
    }

    describe('Component creation and defaults', () => {
        it('should initialize Mortgage with default name, icon, and label', () => {
            setupComponent(AccountType.Mortgage);

            expect(component).toBeTruthy();
            expect(component.icon()).toBe('pi-home');
            expect(component.typeLabel()).toBe('Mortgage');
            expect(component.loanForm.get('accountName')?.value).toBe('Home Mortgage');
            expect(component.isValid()).toBe(false);
            expect(component.showFooter()).toBe(true);
        });

        it('should initialize AutoLoan with default name, icon, and label', () => {
            setupComponent(AccountType.AutoLoan);

            expect(component.icon()).toBe('pi-car');
            expect(component.typeLabel()).toBe('Auto Loan');
            expect(component.loanForm.get('accountName')?.value).toBe('Auto Loan');
        });

        it('should initialize PersonalLoan with default name, icon, and label', () => {
            setupComponent(AccountType.PersonalLoan);

            expect(component.icon()).toBe('pi-receipt');
            expect(component.typeLabel()).toBe('Personal Loan');
            expect(component.loanForm.get('accountName')?.value).toBe('Personal Loan');
        });

        it('should return fallback icon and label for unknown type', () => {
            setupComponent('unknown' as any);

            expect(component.icon()).toBe('pi-home');
            expect(component.typeLabel()).toBe('Loan');
        });
    });

    describe('Footer buttons and backClicked output', () => {
        it('should render footer when showFooter is true and emit backClicked', () => {
            setupComponent(AccountType.Mortgage, true);
            const backSpy = vi.spyOn(component.backClicked, 'emit');

            const buttons = Array.from(
                fixture.nativeElement.querySelectorAll('button')
            ) as Array<HTMLButtonElement>;
            const backBtn = buttons.find(b => b.textContent?.includes('Back'));
            expect(backBtn).toBeTruthy();

            backBtn?.click();
            expect(backSpy).toHaveBeenCalledTimes(1);
        });

        it('should hide footer when showFooter is false', () => {
            setupComponent(AccountType.Mortgage, false);

            const footerButtons = fixture.nativeElement.querySelectorAll('button[type="submit"]');
            expect(footerButtons.length).toBe(0);
        });
    });

    describe('Form guide focus and blur tracking', () => {
        it('should update focusedField on handleFocus and handleBlur', () => {
            setupComponent(AccountType.Mortgage);

            component.handleFocus('originalAmount');
            expect(component.focusedField()).toBe('originalAmount');

            component.handleBlur();
            expect(component.focusedField()).toBeNull();
        });
    });

    describe('Monthly payment auto-calculation', () => {
        it('should calculate monthly payment when principal, rate, and term are valid', () => {
            setupComponent(AccountType.Mortgage);

            component.loanForm.patchValue({
                originalAmount: '300000',
                interestRate: '6.5',
                termMonths: '360'
            });

            component.handleAutoCalculate();

            const calculatedPayment = parseFloat(
                component.loanForm.get('monthlyPayment')?.value || '0'
            );
            expect(calculatedPayment).toBeGreaterThan(1800);
            expect(calculatedPayment).toBeLessThan(2000);
        });

        it('should not compute payment if principal or term is zero or invalid', () => {
            setupComponent(AccountType.Mortgage);

            component.loanForm.patchValue({
                originalAmount: '0',
                interestRate: '5.0',
                termMonths: '0',
                monthlyPayment: ''
            });

            component.handleAutoCalculate();

            expect(component.loanForm.get('monthlyPayment')?.value).toBe('');
        });
    });

    describe('Form validation and submission', () => {
        it('should mark form controls as touched and not submit when form is invalid', async () => {
            setupComponent(AccountType.Mortgage);
            const submittedSpy = vi.spyOn(component.submitted, 'emit');

            component.loanForm.patchValue({ accountName: '' });

            await component.handleSubmit();

            expect(component.loanForm.touched).toBe(true);
            expect(submittedSpy).not.toHaveBeenCalled();
            expect(component.isSubmitting()).toBe(false);
        });

        it('should submit valid Mortgage loan with metadata and negative balance cents', async () => {
            setupComponent(AccountType.Mortgage);
            const submittedSpy = vi.spyOn(component.submitted, 'emit');

            component.loanForm.patchValue({
                accountName: 'Primary Mortgage',
                institutionName: 'Chase Home Lending',
                originalAmount: '200000',
                currentBalance: '195000',
                interestRate: '4.5',
                termMonths: '360',
                startDate: '2025-01-01',
                monthlyPayment: '1013.37',
                paymentDueDay: 1,
                propertyAddress: '123 Main St',
                propertyValue: '250000',
                escrowIncluded: true,
                escrowAmount: '350.00'
            });
            fixture.detectChanges();

            expect(component.loanForm.valid).toBe(true);

            await component.handleSubmit();

            expect(submittedSpy).toHaveBeenCalledTimes(1);
            const emittedAccount: IAccount = submittedSpy.mock.calls[0]![0];

            expect(emittedAccount.name).toBe('Primary Mortgage');
            expect(emittedAccount.type).toBe(AccountType.Mortgage);
            expect(emittedAccount.institutionName).toBe('Chase Home Lending');
            expect(emittedAccount.clearedBalance).toBe(-19500000);
            expect(emittedAccount.pendingBalance).toBe(-19500000);

            const details = emittedAccount.loanDetails;
            expect(details).toBeDefined();
            expect(details?.originalAmount).toBe(20000000);
            expect(details?.interestRate).toBe(0.045);
            expect(details?.termMonths).toBe(360);
            expect(details?.monthlyPayment).toBe(101337);
            expect(details?.paymentDueDay).toBe(1);

            const metadata = details?.metadata as IMortgageMetadata;
            expect(metadata).toBeDefined();
            expect(metadata.propertyAddress).toBe('123 Main St');
            expect(metadata.propertyValue).toBe(25000000);
            expect(metadata.escrowIncluded).toBe(true);
            expect(metadata.escrowAmount).toBe(35000);
        });

        it('should use originalAmount for balance if currentBalance is not provided', async () => {
            setupComponent(AccountType.Mortgage);
            const submittedSpy = vi.spyOn(component.submitted, 'emit');

            component.loanForm.patchValue({
                accountName: 'New Mortgage',
                institutionName: 'Bank of America',
                originalAmount: '150000',
                currentBalance: '',
                interestRate: '5.0',
                termMonths: '360',
                startDate: '2025-06-01',
                monthlyPayment: '850.00',
                paymentDueDay: 15
            });

            await component.handleSubmit();

            expect(submittedSpy).toHaveBeenCalledTimes(1);
            const emittedAccount: IAccount = submittedSpy.mock.calls[0]![0];
            expect(emittedAccount.clearedBalance).toBe(-15000000);
        });

        it('should submit valid Auto Loan with vehicle metadata', async () => {
            setupComponent(AccountType.AutoLoan);
            const submittedSpy = vi.spyOn(component.submitted, 'emit');

            component.loanForm.patchValue({
                accountName: 'Car Loan',
                institutionName: 'Toyota Financial',
                originalAmount: '35000',
                currentBalance: '30000',
                interestRate: '3.9',
                termMonths: '60',
                startDate: '2024-03-01',
                monthlyPayment: '650.00',
                paymentDueDay: 10,
                vehicleMake: 'Toyota',
                vehicleModel: 'RAV4',
                vehicleYear: '2024',
                vin: '4T1B11HK5JU123456'
            });

            await component.handleSubmit();

            expect(submittedSpy).toHaveBeenCalledTimes(1);
            const emittedAccount: IAccount = submittedSpy.mock.calls[0]![0];
            expect(emittedAccount.type).toBe(AccountType.AutoLoan);
            expect(emittedAccount.clearedBalance).toBe(-3000000);

            const metadata = emittedAccount.loanDetails?.metadata as IAutoLoanMetadata;
            expect(metadata.vehicleMake).toBe('Toyota');
            expect(metadata.vehicleModel).toBe('RAV4');
            expect(metadata.vehicleYear).toBe(2024);
            expect(metadata.vin).toBe('4T1B11HK5JU123456');
        });

        it('should submit valid Personal Loan with loan purpose metadata', async () => {
            setupComponent(AccountType.PersonalLoan);
            const submittedSpy = vi.spyOn(component.submitted, 'emit');

            component.loanForm.patchValue({
                accountName: 'Debt Consolidation',
                institutionName: 'SoFi',
                originalAmount: '15000',
                currentBalance: '12000',
                interestRate: '7.5',
                termMonths: '36',
                startDate: '2024-05-01',
                monthlyPayment: '470.00',
                paymentDueDay: 5,
                purpose: 'Consolidate high-interest debt',
                secured: true
            });

            await component.handleSubmit();

            expect(submittedSpy).toHaveBeenCalledTimes(1);
            const emittedAccount: IAccount = submittedSpy.mock.calls[0]![0];
            expect(emittedAccount.type).toBe(AccountType.PersonalLoan);
            expect(emittedAccount.clearedBalance).toBe(-1200000);

            const metadata = emittedAccount.loanDetails?.metadata as IPersonalLoanMetadata;
            expect(metadata.purpose).toBe('Consolidate high-interest debt');
            expect(metadata.secured).toBe(true);
        });

        it('should set error signal and not submit when LoanCalculations validation fails', async () => {
            setupComponent(AccountType.Mortgage);
            const submittedSpy = vi.spyOn(component.submitted, 'emit');

            // Monthly payment is too low to cover interest on $200k at 10% APR ($1666.66/month interest)
            component.loanForm.patchValue({
                accountName: 'Bad Loan',
                institutionName: 'Lender',
                originalAmount: '200000',
                currentBalance: '200000',
                interestRate: '10.0',
                termMonths: '360',
                startDate: '2025-01-01',
                monthlyPayment: '100.00',
                paymentDueDay: 1
            });

            await component.handleSubmit();

            expect(submittedSpy).not.toHaveBeenCalled();
            expect(component.error()).toContain(
                'Monthly payment must be greater than interest-only amount'
            );
            expect(component.isSubmitting()).toBe(false);
        });
    });
});
