import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { IAccount, ISODateString } from '@path-logic/core';
import { AccountType, TypeGuards } from '@path-logic/core';
import {
    ArrowRight,
    Banknote,
    Car,
    ChevronDown,
    ChevronUp,
    CreditCard,
    Home,
    Landmark,
    LucideAngularModule,
    Receipt,
    Sparkles,
    Wallet,
} from 'lucide-angular';

import { LoanDetailsFormComponent } from '../loan-details-form/loan-details-form.component';

type WizardStep = 'select-type' | 'enter-details' | 'creating';

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
        label: 'Checking Account',
        description: 'Track daily spending, bills, and income',
    },
    {
        type: AccountType.Savings,
        icon: Banknote,
        label: 'Savings Account',
        description: 'Monitor long-term savings goals',
    },
    {
        type: AccountType.Credit,
        icon: CreditCard,
        label: 'Credit Card',
        description: 'Track credit card spending and payments',
    },
    {
        type: AccountType.Cash,
        icon: Wallet,
        label: 'Cash',
        description: 'Monitor physical cash transactions',
    },
];

const LOAN_TYPES: Array<IAccountTypeOption> = [
    {
        type: AccountType.Mortgage,
        icon: Home,
        label: 'Mortgage',
        description: 'Track home loan, escrow, and equity',
    },
    {
        type: AccountType.AutoLoan,
        icon: Car,
        label: 'Auto Loan',
        description: 'Track vehicle financing and payoff',
    },
    {
        type: AccountType.PersonalLoan,
        icon: Receipt,
        label: 'Personal Loan',
        description: 'Track unsecured debts and consolidation',
    },
];

const TYPE_THEMING: Record<
    string,
    { accentBg: string; borderHover: string; iconText: string; iconBg: string; iconBorder: string }
> = {
    [AccountType.Checking]: {
        accentBg: 'bg-teal-500',
        borderHover: 'border-teal-500/30 hover:border-teal-500',
        iconText: 'text-teal-500',
        iconBg: 'bg-teal-500/10',
        iconBorder: 'border-teal-500/20',
    },
    [AccountType.Savings]: {
        accentBg: 'bg-blue-500',
        borderHover: 'border-blue-500/30 hover:border-blue-500',
        iconText: 'text-blue-500',
        iconBg: 'bg-blue-500/10',
        iconBorder: 'border-blue-500/20',
    },
    [AccountType.Credit]: {
        accentBg: 'bg-purple-500',
        borderHover: 'border-purple-500/30 hover:border-purple-500',
        iconText: 'text-purple-500',
        iconBg: 'bg-purple-500/10',
        iconBorder: 'border-purple-500/20',
    },
    [AccountType.Cash]: {
        accentBg: 'bg-green-500',
        borderHover: 'border-green-500/30 hover:border-green-500',
        iconText: 'text-green-500',
        iconBg: 'bg-green-500/10',
        iconBorder: 'border-green-500/20',
    },
    [AccountType.Mortgage]: {
        accentBg: 'bg-amber-500',
        borderHover: 'border-amber-500/30 hover:border-amber-500',
        iconText: 'text-amber-500',
        iconBg: 'bg-amber-500/10',
        iconBorder: 'border-amber-500/20',
    },
    [AccountType.AutoLoan]: {
        accentBg: 'bg-amber-500',
        borderHover: 'border-amber-500/30 hover:border-amber-500',
        iconText: 'text-amber-500',
        iconBg: 'bg-amber-500/10',
        iconBorder: 'border-amber-500/20',
    },
    [AccountType.PersonalLoan]: {
        accentBg: 'bg-amber-500',
        borderHover: 'border-amber-500/30 hover:border-amber-500',
        iconText: 'text-amber-500',
        iconBg: 'bg-amber-500/10',
        iconBorder: 'border-amber-500/20',
    },
};

/**
 * First-run onboarding component.
 * Guides the user through creating their very first account.
 */
@Component({
    selector: 'app-welcome-wizard',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule, LoanDetailsFormComponent],
    templateUrl: './welcome-wizard.component.html',
    styleUrls: ['./welcome-wizard.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomeWizardComponent {
    // Outputs
    readonly accountCreated = output<IAccount>();

    // State
    readonly step = signal<WizardStep>('select-type');
    readonly selectedType = signal<AccountType | null>(null);
    readonly showLoans = signal<boolean>(false);
    readonly accountName = signal<string>('');
    readonly initialBalance = signal<string>('');
    readonly error = signal<string | null>(null);

    // Computed
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
            return {
                accentBg: 'bg-primary',
                borderHover: 'border-primary/30',
                iconText: 'text-primary',
                iconBg: 'bg-primary/10',
                iconBorder: 'border-primary/20',
            };
        }
        return TYPE_THEMING[type];
    });

    readonly isLoan = computed(() => {
        const type = this.selectedType();
        return type ? TypeGuards.isLoanAccount(type) : false;
    });

    handleTypeSelect(type: AccountType): void {
        this.selectedType.set(type);
        this.step.set('enter-details');
        this.error.set(null);

        const defaultNames: Record<string, string> = {
            [AccountType.Checking]: 'Main Checking',
            [AccountType.Savings]: 'Savings',
            [AccountType.Credit]: 'Credit Card',
            [AccountType.Cash]: 'Cash',
        };
        const defaultName = defaultNames[type];
        if (defaultName) {
            this.accountName.set(defaultName);
            this.initialBalance.set('');
        }
    }

    async handleStandardAccountCreate(): Promise<void> {
        if (!this.accountName().trim()) {
            this.error.set('Account name is required');
            return;
        }

        const type = this.selectedType();
        if (!type) {
            this.error.set('Please select an account type');
            return;
        }

        this.error.set(null);
        this.step.set('creating');

        try {
            const now = new Date().toISOString() as ISODateString;
            let val = parseFloat(this.initialBalance() || '0');

            if (type === AccountType.Credit) {
                val = -Math.abs(val);
            } else {
                val = Math.abs(val);
            }

            const balanceCents = Math.round(val * 100);

            const newAccount: IAccount = {
                id: `acc-${Date.now()}`,
                name: this.accountName().trim(),
                type: type,
                institutionName: '',
                clearedBalance: balanceCents,
                pendingBalance: balanceCents,
                isActive: true,
                deletedAt: null,
                createdAt: now,
                updatedAt: now,
            };

            this.accountCreated.emit(newAccount);
        } catch {
            this.error.set('Failed to create account');
            this.step.set('enter-details');
        }
    }

    handleBack(): void {
        this.error.set(null);
        this.step.set('select-type');
    }

    getTypeTheming(type: AccountType): {
        accentBg: string;
        borderHover: string;
        iconText: string;
        iconBg: string;
        iconBorder: string;
    } {
        return (
            TYPE_THEMING[type] || {
                accentBg: 'bg-primary',
                borderHover: 'border-primary/30',
                iconText: 'text-primary',
                iconBg: 'bg-primary/10',
                iconBorder: 'border-primary/20',
            }
        );
    }

    // Lucide Icons
    readonly ArrowRight = ArrowRight;
    readonly ChevronDown = ChevronDown;
    readonly ChevronUp = ChevronUp;
    readonly Sparkles = Sparkles;
    readonly Landmark = Landmark;
}
