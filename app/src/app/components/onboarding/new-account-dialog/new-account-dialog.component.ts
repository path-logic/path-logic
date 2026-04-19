import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    input,
    output,
    signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { IAccount, ISODateString } from '@core';
import { AccountType, TypeGuards } from '@core';
import {
    Banknote,
    Car,
    ChevronDown,
    ChevronUp,
    CreditCard,
    Home,
    Landmark,
    LucideAngularModule,
    Receipt,
    Wallet,
    X
} from 'lucide-angular';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Step, StepList, StepPanel, StepPanels, Stepper } from 'primeng/stepper';

import { LoanDetailsFormComponent } from '../loan-details-form/loan-details-form.component';

/**
 * Wizard step types.
 */
type WizardStep = 'select-type' | 'enter-details' | 'creating';

/**
 * Account type option for the wizard.
 */
interface IAccountTypeOption {
    type: AccountType;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon: any;
    label: string;
    description: string;
}

const PRIMARY_TYPES: Array<IAccountTypeOption> = [
    {
        type: AccountType.Checking,
        icon: Landmark,
        label: 'Checking',
        description: 'Daily spending & income'
    },
    {
        type: AccountType.Savings,
        icon: Banknote,
        label: 'Savings',
        description: 'Long-term goals'
    },
    {
        type: AccountType.Credit,
        icon: CreditCard,
        label: 'Credit Card',
        description: 'Track spending & debt'
    },
    {
        type: AccountType.Cash,
        icon: Wallet,
        label: 'Cash',
        description: 'Physical currency'
    }
];

const LOAN_TYPES: Array<IAccountTypeOption> = [
    {
        type: AccountType.Mortgage,
        icon: Home,
        label: 'Mortgage',
        description: 'Home loan & equity'
    },
    {
        type: AccountType.AutoLoan,
        icon: Car,
        label: 'Auto Loan',
        description: 'Vehicle financing'
    },
    {
        type: AccountType.PersonalLoan,
        icon: Receipt,
        label: 'Personal Loan',
        description: 'Unsecured debt'
    }
];

/**
 * Styling and theming for account types.
 */
const TYPE_THEMING: Record<string, { accentBg: string; iconText: string; iconBg: string }> = {
    [AccountType.Checking]: {
        accentBg: 'bg-teal-500',
        iconText: 'text-teal-500',
        iconBg: 'bg-teal-500/10'
    },
    [AccountType.Savings]: {
        accentBg: 'bg-blue-500',
        iconText: 'text-blue-500',
        iconBg: 'bg-blue-500/10'
    },
    [AccountType.Credit]: {
        accentBg: 'bg-purple-500',
        iconText: 'text-purple-500',
        iconBg: 'bg-purple-500/10'
    },
    [AccountType.Cash]: {
        accentBg: 'bg-green-500',
        iconText: 'text-green-500',
        iconBg: 'bg-green-500/10'
    },
    [AccountType.Mortgage]: {
        accentBg: 'bg-amber-500',
        iconText: 'text-amber-500',
        iconBg: 'bg-amber-500/10'
    },
    [AccountType.AutoLoan]: {
        accentBg: 'bg-amber-500',
        iconText: 'text-amber-500',
        iconBg: 'bg-amber-500/10'
    },
    [AccountType.PersonalLoan]: {
        accentBg: 'bg-amber-500',
        iconText: 'text-amber-500',
        iconBg: 'bg-amber-500/10'
    }
};

/**
 * Dialog for creating a new account.
 * Guides the user through type selection and basic configuration.
 */
@Component({
    selector: 'new-account-dialog',
    standalone: true,
    imports: [
        FormsModule,
        LucideAngularModule,
        LoanDetailsFormComponent,
        Stepper,
        StepList,
        StepPanels,
        Step,
        StepPanel,
        Button,
        Dialog
    ],
    templateUrl: './new-account-dialog.component.html',
    styleUrls: ['./new-account-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class NewAccountDialogComponent {
    // Inputs
    readonly isOpen = input.required<boolean>();

    // Outputs
    readonly closed = output();
    readonly accountCreated = output<IAccount>();

    // State
    readonly step = signal<WizardStep>('select-type');
    readonly selectedType = signal<AccountType | null>(null);
    readonly showLoans = signal<boolean>(false);
    readonly accountName = signal<string>('');
    readonly institutionName = signal<string>('');
    readonly initialBalance = signal<string>('');
    readonly error = signal<string | null>(null);

    // Computed
    /**
     * Stepper value based on current step name.
     */
    readonly stepValue = computed(() => {
        switch (this.step()) {
            case 'select-type':
                return 1;
            case 'enter-details':
                return 2;
            case 'creating':
                return 2;
            default:
                return 1;
        }
    });

    readonly primaryTypes = signal(PRIMARY_TYPES);
    readonly loanTypes = signal(LOAN_TYPES);

    readonly selectedOption = computed(() => {
        const type = this.selectedType();
        if (!type) return null;
        return [...PRIMARY_TYPES, ...LOAN_TYPES].find(opt => opt.type === type) || null;
    });

    readonly theming = computed(() => {
        const type = this.selectedType();
        if (!type || !TYPE_THEMING[type]) {
            return { accentBg: 'bg-primary', iconText: 'text-primary', iconBg: 'bg-primary/10' };
        }
        return TYPE_THEMING[type];
    });

    readonly isLoan = computed(() => {
        const type = this.selectedType();
        return type ? TypeGuards.isLoanAccount(type) : false;
    });

    constructor() {
        // Reset state when opening/closing
        effect(() => {
            if (!this.isOpen()) {
                this.step.set('select-type');
                this.selectedType.set(null);
                this.accountName.set('');
                this.institutionName.set('');
                this.initialBalance.set('');
                this.error.set(null);
            }
        });
    }

    handleTypeSelect(type: AccountType): void {
        this.selectedType.set(type);
        this.step.set('enter-details');
        this.error.set(null);

        const defaultNames: Record<string, string> = {
            [AccountType.Checking]: 'Main Checking',
            [AccountType.Savings]: 'Savings',
            [AccountType.Credit]: 'Credit Card',
            [AccountType.Cash]: 'Cash'
        };
        const defaultName = defaultNames[type];
        if (defaultName) {
            this.accountName.set(defaultName);
        }
    }

    async handleCreate(): Promise<void> {
        if (!this.accountName().trim()) {
            this.error.set('Account name is required');
            return;
        }

        this.error.set(null);
        this.step.set('creating');

        try {
            const type = this.selectedType();
            if (!type) {
                this.error.set('Account type is required');
                this.step.set('select-type');
                return;
            }
            const now = new Date().toISOString() as ISODateString;
            let val = parseFloat(this.initialBalance() || '0');

            if (this.selectedType() === AccountType.Credit) {
                val = -Math.abs(val);
            } else {
                val = Math.abs(val);
            }

            const balanceCents = Math.round(val * 100);

            const newAccount: IAccount = {
                id: `acc-${Date.now()}`,
                name: this.accountName().trim(),
                type: type,
                institutionName: this.institutionName().trim(),
                clearedBalance: balanceCents,
                pendingBalance: balanceCents,
                isActive: true,
                deletedAt: null,
                createdAt: now,
                updatedAt: now
            };

            this.accountCreated.emit(newAccount);
            this.closed.emit();
        } catch {
            this.error.set('Failed to create account');
            this.step.set('enter-details');
        }
    }

    handleCancel(): void {
        this.closed.emit();
    }

    getTypeTheming(type: AccountType): { accentBg: string; iconText: string; iconBg: string } {
        return (
            TYPE_THEMING[type] || {
                accentBg: 'bg-primary',
                iconText: 'text-primary',
                iconBg: 'bg-primary/10'
            }
        );
    }

    // Lucide Icons
    readonly X = X;
    readonly Landmark = Landmark;
    readonly Banknote = Banknote;
    readonly CreditCard = CreditCard;
    readonly Wallet = Wallet;
    readonly Home = Home;
    readonly Car = Car;
    readonly Receipt = Receipt;
    readonly ChevronDown = ChevronDown;
    readonly ChevronUp = ChevronUp;
}
