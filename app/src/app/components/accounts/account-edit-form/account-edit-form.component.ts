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
    ISODateString
} from '@core';
import { AccountType, LoanCalculations, TypeGuards } from '@core';
import { AlertCircle, LucideAngularModule } from 'lucide-angular';

/**
 * Form for creating or editing accounts.
 * Handles validation and complex loan-specific metadata.
 */
@Component({
    selector: 'account-edit-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
    templateUrl: './account-edit-form.component.html',
    styleUrls: ['./account-edit-form.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountEditFormComponent implements OnInit {
    private readonly fb = inject(FormBuilder);

    // Inputs
    readonly accountData = input.required<IAccount>();

    // Outputs
    readonly submitted = output<IAccount>();
    readonly cancelled = output();

    // State
    readonly error = signal<string | null>(null);
    readonly isSubmitting = signal<boolean>(false);

    // Form
    accountForm!: FormGroup;

    // Computed
    readonly accountTypes = signal<Array<string>>(Object.values(AccountType));

    readonly isLoan = computed(() => {
        const type = this.accountForm?.get('type')?.value;
        return TypeGuards.isLoanAccount(type as AccountType);
    });

    ngOnInit(): void {
        const acc = this.accountData();
        const loan = acc.loanDetails;
        const mortgage = loan?.metadata as IMortgageMetadata;
        const auto = loan?.metadata as IAutoLoanMetadata;

        this.accountForm = this.fb.group({
            name: [acc.name, [Validators.required]],
            institutionName: [acc.institutionName, [Validators.required]],
            type: [acc.type, [Validators.required]],
            isActive: [acc.isActive],

            // Loan fields
            originalAmount: [loan ? loan.originalAmount / 100 : ''],
            interestRate: [loan ? loan.interestRate * 100 : ''],
            termMonths: [loan ? loan.termMonths : ''],
            monthlyPayment: [loan ? loan.monthlyPayment / 100 : ''],
            paymentDueDay: [loan?.paymentDueDay ?? 1],
            startDate: [loan?.startDate?.split('T')[0] ?? new Date().toISOString().split('T')[0]],

            // Metadata
            propertyAddress: [mortgage?.propertyAddress || ''],
            escrowIncluded: [mortgage?.escrowIncluded || false],
            vehicleMake: [auto?.vehicleMake || ''],
            vehicleModel: [auto?.vehicleModel || '']
        });
    }

    async handleSubmit(): Promise<void> {
        if (this.accountForm.invalid) {
            this.accountForm.markAllAsTouched();
            return;
        }

        this.error.set(null);
        this.isSubmitting.set(true);

        try {
            const formValues = this.accountForm.value;
            const now = new Date().toISOString() as ISODateString;
            let loanDetails: ILoanDetails | undefined;

            if (TypeGuards.isLoanAccount(formValues.type)) {
                const principalCents = Math.round(parseFloat(formValues.originalAmount) * 100);
                const rateDecimal = parseFloat(formValues.interestRate) / 100;
                const paymentCents = Math.round(parseFloat(formValues.monthlyPayment) * 100);

                loanDetails = {
                    originalAmount: principalCents,
                    interestRate: rateDecimal,
                    termMonths: parseInt(formValues.termMonths, 10),
                    monthlyPayment: paymentCents,
                    paymentDueDay: parseInt(formValues.paymentDueDay, 10),
                    startDate: new Date(formValues.startDate).toISOString() as ISODateString
                };

                if (formValues.type === AccountType.Mortgage) {
                    loanDetails.metadata = {
                        propertyAddress: formValues.propertyAddress,
                        escrowIncluded: formValues.escrowIncluded
                    } as IMortgageMetadata;
                } else if (formValues.type === AccountType.AutoLoan) {
                    loanDetails.metadata = {
                        vehicleMake: formValues.vehicleMake,
                        vehicleModel: formValues.vehicleModel
                    } as IAutoLoanMetadata;
                }

                // Add validation from Core
                const validationErrors = LoanCalculations.validateLoanDetails(
                    loanDetails,
                    this.accountData().clearedBalance
                );
                if (validationErrors.length > 0) {
                    this.error.set(validationErrors[0] ?? 'Invalid loan details');
                    this.isSubmitting.set(false);
                    return;
                }
            }

            const updatedAccount: IAccount = {
                ...this.accountData(),
                name: formValues.name.trim(),
                institutionName: formValues.institutionName.trim(),
                type: formValues.type,
                isActive: formValues.isActive,
                updatedAt: now,
                ...(loanDetails ? { loanDetails } : {})
            };

            this.submitted.emit(updatedAccount);
        } catch (err) {
            this.error.set(err instanceof Error ? err.message : 'Failed to update account');
        } finally {
            this.isSubmitting.set(false);
        }
    }

    handleCancel(): void {
        this.cancelled.emit();
    }

    // Lucide Icons
    readonly AlertCircle = AlertCircle;
}
