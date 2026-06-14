import { CommonModule } from '@angular/common';
import type { OnInit } from '@angular/core';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    input,
    output,
    signal
} from '@angular/core';
import type { FormGroup } from '@angular/forms';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type {
    IAccount,
    IAutoLoanMetadata,
    ILoanDetails,
    IMortgageMetadata,
    IPersonalLoanMetadata,
    ISODateString
} from '@core';
import { AccountType, LoanCalculations } from '@core';

import { FormGuideComponent } from '../../ui/form-guide/form-guide.component';

/**
 * Complex form for entering loan-specific details.
 * Supports Mortgages, Auto Loans, and Personal Loans with their respective metadata.
 */
@Component({
    selector: 'loan-details-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormGuideComponent],
    templateUrl: './loan-details-form.component.html',
    styleUrls: ['./loan-details-form.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoanDetailsFormComponent implements OnInit {
    private readonly fb = inject(FormBuilder);

    // Inputs
    readonly type = input.required<AccountType>();
    /** When false, hides the built-in Back/Submit footer (used when dialog provides its own footer). */
    readonly showFooter = input(true);

    // Outputs
    readonly backClicked = output();
    readonly submitted = output<IAccount>();

    // State
    readonly error = signal<string | null>(null);
    readonly isSubmitting = signal<boolean>(false);
    readonly focusedField = signal<string | null>(null);

    // Form
    loanForm!: FormGroup;

    // Computed
    readonly icon = computed(() => {
        switch (this.type()) {
            case AccountType.Mortgage:
                return 'pi-home';
            case AccountType.AutoLoan:
                return 'pi-car';
            case AccountType.PersonalLoan:
                return 'pi-receipt';
            default:
                return 'pi-home';
        }
    });

    readonly typeLabel = computed(() => {
        switch (this.type()) {
            case AccountType.Mortgage:
                return 'Mortgage';
            case AccountType.AutoLoan:
                return 'Auto Loan';
            case AccountType.PersonalLoan:
                return 'Personal Loan';
            default:
                return 'Loan';
        }
    });

    readonly GUIDE_CONTENT = {
        originalAmount: {
            title: 'Initial Principal',
            description: 'The total amount you borrowed at the start of the loan.',
            tips: [
                'Check your opening statement or disclosure.',
                'Excludes future interest payments.'
            ]
        },
        interestRate: {
            title: 'Interest Rate (APR)',
            description: 'The annual cost of borrowing, expressed as a percentage.',
            tips: [
                'Enter exactly as seen on your bill (e.g. 5.25 for 5.25%).',
                'Fixed rates stay the same; variable rates change.'
            ]
        },
        termMonths: {
            title: 'Loan Duration',
            description: 'The total length of time given to repay the loan in full.',
            tips: [
                'Standard mortgages are 360 months (30 years).',
                'Auto loans are often 60 or 72 months.'
            ]
        },
        monthlyPayment: {
            title: 'Recurring Payment',
            description: 'The amount you are required to pay each month.',
            tips: [
                'Use the Calculate button to estimate based on principal and rate.',
                'Does not include potential late fees.'
            ]
        },
        escrow: {
            title: 'Escrow Account',
            description: 'Funds held by the lender for property taxes and insurance.',
            tips: [
                'Most mortgages include property tax and insurance in the payment.',
                'Select this if your monthly payment includes these costs.'
            ]
        }
    };

    ngOnInit(): void {
        const defaultName = this.getDefaultName(this.type());

        this.loanForm = this.fb.group({
            accountName: [defaultName, [Validators.required]],
            institutionName: [''],
            originalAmount: ['', [Validators.required, Validators.min(0.01)]],
            currentBalance: [''],
            interestRate: ['', [Validators.required]],
            termMonths: ['', [Validators.required, Validators.min(1)]],
            startDate: [new Date().toISOString().split('T')[0], [Validators.required]],
            monthlyPayment: ['', [Validators.required, Validators.min(0.01)]],
            paymentDueDay: [1, [Validators.required, Validators.min(1), Validators.max(31)]],

            // Metadata
            propertyAddress: [''],
            propertyValue: [''],
            escrowIncluded: [false],
            escrowAmount: [''],
            vehicleMake: [''],
            vehicleModel: [''],
            vehicleYear: [''],
            vin: [''],
            purpose: [''],
            secured: [false]
        });
    }

    private getDefaultName(accountType: AccountType): string {
        const defaultNames: Record<string, string> = {
            [AccountType.Mortgage]: 'Home Mortgage',
            [AccountType.AutoLoan]: 'Auto Loan',
            [AccountType.PersonalLoan]: 'Personal Loan'
        };
        return defaultNames[accountType] || '';
    }

    handleAutoCalculate(): void {
        const principalCents = Math.round(
            parseFloat(this.loanForm.get('originalAmount')?.value || '0') * 100
        );
        const rateDecimal = parseFloat(this.loanForm.get('interestRate')?.value || '0') / 100;
        const term = parseInt(this.loanForm.get('termMonths')?.value || '0', 10);

        if (principalCents > 0 && term > 0) {
            const paymentCents = LoanCalculations.calculateMonthlyPayment(
                principalCents,
                rateDecimal,
                term
            );
            this.loanForm.get('monthlyPayment')?.setValue((paymentCents / 100).toFixed(2));
        }
    }

    async handleSubmit(): Promise<void> {
        if (this.loanForm.invalid) {
            this.loanForm.markAllAsTouched();
            return;
        }

        this.error.set(null);
        this.isSubmitting.set(true);

        try {
            const vals = this.loanForm.value;
            const principalCents = Math.round(parseFloat(vals.originalAmount) * 100);

            // Debt is negative in ledger
            const curBalanceInput = vals.currentBalance
                ? parseFloat(vals.currentBalance)
                : parseFloat(vals.originalAmount);
            const curBalanceCents = Math.round(curBalanceInput * 100) * -1;

            const loanDetails: ILoanDetails = {
                originalAmount: principalCents,
                interestRate: parseFloat(vals.interestRate) / 100,
                termMonths: parseInt(vals.termMonths, 10),
                monthlyPayment: Math.round(parseFloat(vals.monthlyPayment) * 100),
                paymentDueDay: parseInt(vals.paymentDueDay, 10),
                startDate: new Date(vals.startDate).toISOString() as ISODateString
            };

            // Metadata
            if (this.type() === AccountType.Mortgage) {
                loanDetails.metadata = {
                    propertyAddress: vals.propertyAddress,
                    propertyValue: vals.propertyValue
                        ? Math.round(parseFloat(vals.propertyValue) * 100)
                        : undefined,
                    escrowIncluded: vals.escrowIncluded,
                    escrowAmount: vals.escrowAmount
                        ? Math.round(parseFloat(vals.escrowAmount) * 100)
                        : undefined
                } as IMortgageMetadata;
            } else if (this.type() === AccountType.AutoLoan) {
                loanDetails.metadata = {
                    vehicleMake: vals.vehicleMake,
                    vehicleModel: vals.vehicleModel,
                    vehicleYear: vals.vehicleYear ? parseInt(vals.vehicleYear, 10) : undefined,
                    vin: vals.vin
                } as IAutoLoanMetadata;
            } else if (this.type() === AccountType.PersonalLoan) {
                loanDetails.metadata = {
                    purpose: vals.purpose,
                    secured: vals.secured
                } as IPersonalLoanMetadata;
            }

            // Validation from Core
            const validationErrors = LoanCalculations.validateLoanDetails(
                loanDetails,
                curBalanceCents
            );
            if (validationErrors.length > 0) {
                this.error.set(validationErrors[0] ?? 'Invalid details');
                this.isSubmitting.set(false);
                return;
            }

            const now = new Date().toISOString() as ISODateString;
            const newAccount: IAccount = {
                id: `acc-${Date.now()}`,
                name: vals.accountName.trim(),
                type: this.type(),
                institutionName: vals.institutionName.trim(),
                clearedBalance: curBalanceCents,
                pendingBalance: curBalanceCents,
                isActive: true,
                deletedAt: null,
                createdAt: now,
                updatedAt: now,
                loanDetails: loanDetails
            };

            this.submitted.emit(newAccount);
        } catch {
            this.error.set('Failed to create account. Please check your inputs.');
        } finally {
            this.isSubmitting.set(false);
        }
    }

    handleFocus(field: string): void {
        this.focusedField.set(field);
    }

    handleBlur(): void {
        this.focusedField.set(null);
    }

    // Lucide Icons
}
