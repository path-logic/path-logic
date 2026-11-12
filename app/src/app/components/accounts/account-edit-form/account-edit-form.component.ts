import { CommonModule } from '@angular/common';
import type { OnInit } from '@angular/core';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    input,
    output,
    signal
} from '@angular/core';
import type { FormGroup } from '@angular/forms';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import type {
    IAccount,
    IAutoLoanMetadata,
    ICreditCardDetails,
    ILoanDetails,
    IMortgageMetadata,
    IPersonalLoanMetadata,
    IPromotionalRateWindow,
    ISODateString
} from '@core';
import {
    AccountType,
    LoanCalculations,
    PersonalLoanSubtype,
    PromotionalRateType,
    TypeGuards
} from '@core';

export interface IPromoRateFormItem {
    id: string;
    name: string;
    promoType: PromotionalRateType;
    aprPercent: number;
    startDate: string;
    endDate: string;
    postPromoAprPercent: string;
    promoBalanceDollars: string;
    notes: string;
}

/**
 * Form for creating or editing accounts.
 * Handles validation, credit card terms & promotional rate windows, and loan-specific metadata.
 */
@Component({
    selector: 'account-edit-form',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
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
    readonly selectedType = signal<AccountType>(AccountType.Checking);
    readonly promoWindows = signal<Array<IPromoRateFormItem>>([]);

    // Form
    accountForm!: FormGroup;

    // Options
    readonly accountTypes = signal<Array<string>>(Object.values(AccountType));
    readonly promoRateTypes = signal<Array<PromotionalRateType>>(
        Object.values(PromotionalRateType)
    );
    readonly personalLoanSubtypes = signal<Array<PersonalLoanSubtype>>(
        Object.values(PersonalLoanSubtype)
    );

    readonly isLoan = computed((): boolean => {
        return TypeGuards.isLoanAccount(this.selectedType());
    });

    readonly isCreditCard = computed((): boolean => {
        return TypeGuards.isCreditCardAccount(this.selectedType());
    });

    constructor() {
        effect(() => {
            const acc = this.accountData();
            if (acc && this.accountForm) {
                this.populateForm(acc);
            }
        });
    }

    ngOnInit(): void {
        this.initForm(this.accountData());
    }

    private initForm(acc: IAccount): void {
        const loan = acc.loanDetails;
        const cc = acc.creditCardDetails;
        const mortgage = loan?.metadata as IMortgageMetadata | undefined;
        const auto = loan?.metadata as IAutoLoanMetadata | undefined;
        const personal = loan?.metadata as IPersonalLoanMetadata | undefined;

        this.selectedType.set(acc.type);
        this.promoWindows.set(this.mapPromoWindowsToForm(cc?.promotionalRates ?? []));

        this.accountForm = this.fb.group({
            name: [acc.name, [Validators.required]],
            institutionName: [acc.institutionName, [Validators.required]],
            type: [acc.type, [Validators.required]],
            accountNumber: [acc.accountNumber ?? ''],
            notes: [acc.notes ?? ''],
            isActive: [acc.isActive],

            // Credit Card fields
            creditLimit: [cc?.creditLimit !== undefined ? cc.creditLimit / 100 : ''],
            ccInterestRate: [
                cc?.interestRate !== undefined ? Number((cc.interestRate * 100).toFixed(4)) : ''
            ],
            ccPaymentDueDay: [cc?.paymentDueDay ?? ''],
            minimumPayment: [cc?.minimumPayment !== undefined ? cc.minimumPayment / 100 : ''],
            minimumPaymentPercentage: [
                cc?.minimumPaymentPercentage !== undefined
                    ? Number((cc.minimumPaymentPercentage * 100).toFixed(2))
                    : ''
            ],

            // Loan fields
            originalAmount: [loan ? loan.originalAmount / 100 : ''],
            interestRate: [loan ? Number((loan.interestRate * 100).toFixed(4)) : ''],
            termMonths: [loan ? loan.termMonths : ''],
            monthlyPayment: [loan ? loan.monthlyPayment / 100 : ''],
            principalAndInterestPayment: [
                loan?.principalAndInterestPayment !== undefined
                    ? loan.principalAndInterestPayment / 100
                    : ''
            ],
            paymentDueDay: [loan?.paymentDueDay ?? 1],
            startDate: [loan?.startDate?.split('T')[0] ?? new Date().toISOString().split('T')[0]],
            isAdjustableRate: [loan?.isAdjustableRate ?? false],
            nextRateAdjustmentDate: [loan?.nextRateAdjustmentDate?.split('T')[0] ?? ''],

            // Mortgage metadata
            propertyAddress: [mortgage?.propertyAddress || ''],
            propertyValue: [
                mortgage?.propertyValue !== undefined ? mortgage.propertyValue / 100 : ''
            ],
            escrowIncluded: [mortgage?.escrowIncluded || false],
            escrowAmount: [mortgage?.escrowAmount !== undefined ? mortgage.escrowAmount / 100 : ''],

            // Auto metadata
            vehicleYear: [auto?.vehicleYear ?? ''],
            vehicleMake: [auto?.vehicleMake || ''],
            vehicleModel: [auto?.vehicleModel || ''],
            vin: [auto?.vin || ''],

            // Personal / Student loan metadata
            loanSubtype: [personal?.subtype ?? PersonalLoanSubtype.Personal],
            purpose: [personal?.purpose || ''],
            secured: [personal?.secured || false]
        });

        this.accountForm.get('type')?.valueChanges.subscribe((newType: AccountType) => {
            if (newType) {
                this.selectedType.set(newType);
            }
        });
    }

    private populateForm(acc: IAccount): void {
        const loan = acc.loanDetails;
        const cc = acc.creditCardDetails;
        const mortgage = loan?.metadata as IMortgageMetadata | undefined;
        const auto = loan?.metadata as IAutoLoanMetadata | undefined;
        const personal = loan?.metadata as IPersonalLoanMetadata | undefined;

        this.selectedType.set(acc.type);
        this.promoWindows.set(this.mapPromoWindowsToForm(cc?.promotionalRates ?? []));

        this.accountForm.patchValue(
            {
                name: acc.name,
                institutionName: acc.institutionName,
                type: acc.type,
                accountNumber: acc.accountNumber ?? '',
                notes: acc.notes ?? '',
                isActive: acc.isActive,

                creditLimit: cc?.creditLimit !== undefined ? cc.creditLimit / 100 : '',
                ccInterestRate:
                    cc?.interestRate !== undefined
                        ? Number((cc.interestRate * 100).toFixed(4))
                        : '',
                ccPaymentDueDay: cc?.paymentDueDay ?? '',
                minimumPayment: cc?.minimumPayment !== undefined ? cc.minimumPayment / 100 : '',
                minimumPaymentPercentage:
                    cc?.minimumPaymentPercentage !== undefined
                        ? Number((cc.minimumPaymentPercentage * 100).toFixed(2))
                        : '',

                originalAmount: loan ? loan.originalAmount / 100 : '',
                interestRate: loan ? Number((loan.interestRate * 100).toFixed(4)) : '',
                termMonths: loan ? loan.termMonths : '',
                monthlyPayment: loan ? loan.monthlyPayment / 100 : '',
                principalAndInterestPayment:
                    loan?.principalAndInterestPayment !== undefined
                        ? loan.principalAndInterestPayment / 100
                        : '',
                paymentDueDay: loan?.paymentDueDay ?? 1,
                startDate: loan?.startDate?.split('T')[0] ?? new Date().toISOString().split('T')[0],
                isAdjustableRate: loan?.isAdjustableRate ?? false,
                nextRateAdjustmentDate: loan?.nextRateAdjustmentDate?.split('T')[0] ?? '',

                propertyAddress: mortgage?.propertyAddress || '',
                propertyValue:
                    mortgage?.propertyValue !== undefined ? mortgage.propertyValue / 100 : '',
                escrowIncluded: mortgage?.escrowIncluded || false,
                escrowAmount:
                    mortgage?.escrowAmount !== undefined ? mortgage.escrowAmount / 100 : '',

                vehicleYear: auto?.vehicleYear ?? '',
                vehicleMake: auto?.vehicleMake || '',
                vehicleModel: auto?.vehicleModel || '',
                vin: auto?.vin || '',

                loanSubtype: personal?.subtype ?? PersonalLoanSubtype.Personal,
                purpose: personal?.purpose || '',
                secured: personal?.secured || false
            },
            { emitEvent: false }
        );
    }

    private mapPromoWindowsToForm(
        windows: Array<IPromotionalRateWindow>
    ): Array<IPromoRateFormItem> {
        return windows.map(
            (w: IPromotionalRateWindow): IPromoRateFormItem => ({
                id: w.id,
                name: w.name,
                promoType: w.promoType ?? PromotionalRateType.General,
                aprPercent: Number((w.apr * 100).toFixed(4)),
                startDate: w.startDate?.split('T')[0] ?? '',
                endDate: w.endDate?.split('T')[0] ?? '',
                postPromoAprPercent:
                    w.postPromoApr !== undefined
                        ? String(Number((w.postPromoApr * 100).toFixed(4)))
                        : '',
                promoBalanceDollars:
                    w.promoBalance !== undefined ? String(w.promoBalance / 100) : '',
                notes: w.notes ?? ''
            })
        );
    }

    addPromotionalWindow(): void {
        const defaultEnd = new Date();
        defaultEnd.setFullYear(defaultEnd.getFullYear() + 1);
        const endDateStr = defaultEnd.toISOString().split('T')[0] ?? '2027-01-01';
        const stdApr = this.accountForm?.get('ccInterestRate')?.value;

        this.promoWindows.update(list => [
            ...list,
            {
                id: `promo-${Date.now()}-${list.length + 1}`,
                name: '0% Promotional APR',
                promoType: PromotionalRateType.BalanceTransfer,
                aprPercent: 0,
                startDate: new Date().toISOString().split('T')[0] ?? '',
                endDate: endDateStr,
                postPromoAprPercent:
                    stdApr !== '' && stdApr !== null && stdApr !== undefined ? String(stdApr) : '',
                promoBalanceDollars: '',
                notes: ''
            }
        ]);
    }

    removePromotionalWindow(id: string): void {
        this.promoWindows.update(list => list.filter(w => w.id !== id));
    }

    isPromoWindowActive(endDate: string): boolean {
        if (!endDate) return false;
        const today = new Date().toISOString().split('T')[0] ?? '';
        return endDate >= today;
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
            let creditCardDetails: ICreditCardDetails | undefined;

            if (TypeGuards.isCreditCardAccount(formValues.type)) {
                const stdRatePercent = parseFloat(String(formValues.ccInterestRate ?? '0'));
                const creditLimitDollars = parseFloat(String(formValues.creditLimit ?? ''));
                const minPaymentDollars = parseFloat(String(formValues.minimumPayment ?? ''));
                const minPayPct = parseFloat(String(formValues.minimumPaymentPercentage ?? ''));
                const dueDay = parseInt(String(formValues.ccPaymentDueDay ?? ''), 10);

                const promotionalRates: Array<IPromotionalRateWindow> = this.promoWindows()
                    .filter(w => w.name.trim() !== '' && w.endDate.trim() !== '')
                    .map((w: IPromoRateFormItem): IPromotionalRateWindow => {
                        const postAprNum = parseFloat(String(w.postPromoAprPercent));
                        const balNum = parseFloat(String(w.promoBalanceDollars));
                        return {
                            id: w.id,
                            name: w.name.trim(),
                            promoType: w.promoType,
                            apr: Number(((Number(w.aprPercent) || 0) / 100).toFixed(6)),
                            startDate: w.startDate ? (w.startDate as ISODateString) : null,
                            endDate: w.endDate as ISODateString,
                            ...(!Number.isNaN(postAprNum)
                                ? { postPromoApr: Number((postAprNum / 100).toFixed(6)) }
                                : {}),
                            ...(!Number.isNaN(balNum) && balNum > 0
                                ? { promoBalance: Math.round(balNum * 100) }
                                : {}),
                            ...(w.notes.trim() ? { notes: w.notes.trim() } : {})
                        };
                    });

                creditCardDetails = {
                    interestRate: !Number.isNaN(stdRatePercent)
                        ? Number((stdRatePercent / 100).toFixed(6))
                        : 0,
                    promotionalRates,
                    ...(!Number.isNaN(creditLimitDollars) && creditLimitDollars > 0
                        ? { creditLimit: Math.round(creditLimitDollars * 100) }
                        : {}),
                    ...(!Number.isNaN(dueDay) && dueDay >= 1 && dueDay <= 31
                        ? { paymentDueDay: dueDay }
                        : {}),
                    ...(!Number.isNaN(minPaymentDollars) && minPaymentDollars > 0
                        ? { minimumPayment: Math.round(minPaymentDollars * 100) }
                        : {}),
                    ...(!Number.isNaN(minPayPct) && minPayPct > 0
                        ? { minimumPaymentPercentage: Number((minPayPct / 100).toFixed(6)) }
                        : {})
                };
            }

            if (TypeGuards.isLoanAccount(formValues.type)) {
                const principalCents = Math.round(parseFloat(formValues.originalAmount) * 100);
                const rateDecimal = parseFloat(formValues.interestRate) / 100;
                const paymentCents = Math.round(parseFloat(formValues.monthlyPayment) * 100);
                const piDollars = parseFloat(String(formValues.principalAndInterestPayment ?? ''));

                loanDetails = {
                    originalAmount: principalCents,
                    interestRate: rateDecimal,
                    termMonths: parseInt(formValues.termMonths, 10),
                    monthlyPayment: paymentCents,
                    paymentDueDay: parseInt(formValues.paymentDueDay, 10) || 1,
                    startDate: new Date(formValues.startDate).toISOString() as ISODateString,
                    ...(!Number.isNaN(piDollars) && piDollars > 0
                        ? { principalAndInterestPayment: Math.round(piDollars * 100) }
                        : {}),
                    ...(formValues.isAdjustableRate ? { isAdjustableRate: true } : {}),
                    ...(formValues.nextRateAdjustmentDate
                        ? {
                              nextRateAdjustmentDate:
                                  formValues.nextRateAdjustmentDate as ISODateString
                          }
                        : {})
                };

                if (formValues.type === AccountType.Mortgage) {
                    const propValDollars = parseFloat(String(formValues.propertyValue ?? ''));
                    const escrowDollars = parseFloat(String(formValues.escrowAmount ?? ''));
                    loanDetails.metadata = {
                        propertyAddress: formValues.propertyAddress,
                        escrowIncluded: Boolean(formValues.escrowIncluded),
                        ...(!Number.isNaN(propValDollars) && propValDollars > 0
                            ? { propertyValue: Math.round(propValDollars * 100) }
                            : {}),
                        ...(!Number.isNaN(escrowDollars) && escrowDollars > 0
                            ? { escrowAmount: Math.round(escrowDollars * 100) }
                            : {})
                    } as IMortgageMetadata;
                } else if (formValues.type === AccountType.AutoLoan) {
                    const yearNum = parseInt(String(formValues.vehicleYear ?? ''), 10);
                    loanDetails.metadata = {
                        vehicleMake: formValues.vehicleMake,
                        vehicleModel: formValues.vehicleModel,
                        ...(!Number.isNaN(yearNum) && yearNum > 1900
                            ? { vehicleYear: yearNum }
                            : {}),
                        ...(formValues.vin?.trim() ? { vin: formValues.vin.trim() } : {})
                    } as IAutoLoanMetadata;
                } else if (formValues.type === AccountType.PersonalLoan) {
                    loanDetails.metadata = {
                        purpose: formValues.purpose || '',
                        secured: Boolean(formValues.secured),
                        subtype: formValues.loanSubtype || PersonalLoanSubtype.Personal
                    } as IPersonalLoanMetadata;
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
                accountNumber: formValues.accountNumber?.trim() || null,
                notes: formValues.notes?.trim() || null,
                updatedAt: now,
                ...(creditCardDetails ? { creditCardDetails } : {}),
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
}
