import { CommonModule } from '@angular/common';
import type { OnInit } from '@angular/core';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    signal,
    viewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import type { IAccount, ISODateString } from '@core';
import { AccountType, TypeGuards } from '@core';

import { AppShellComponent } from '../../../components/layout/app-shell/app-shell.component';
import { LoanDetailsFormComponent } from '../../../components/onboarding/loan-details-form/loan-details-form.component';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { PostHogService } from '../../../services/posthog/posthog.service';

type WizardStep = 'select-type' | 'enter-details' | 'creating';

interface IAccountTypeOption {
    type: AccountType;
    icon: string;
    label: string;
    description: string;
}

const PRIMARY_TYPES: Array<IAccountTypeOption> = [
    {
        type: AccountType.Checking,
        icon: 'pi-building-columns',
        label: 'Checking',
        description: 'Daily spending & income'
    },
    {
        type: AccountType.Savings,
        icon: 'pi-money-bill',
        label: 'Savings',
        description: 'Long-term goals'
    },
    {
        type: AccountType.Credit,
        icon: 'pi-credit-card',
        label: 'Credit Card',
        description: 'Track spending & debt'
    },
    {
        type: AccountType.Cash,
        icon: 'pi-wallet',
        label: 'Cash',
        description: 'Physical currency'
    }
];

const LOAN_TYPES: Array<IAccountTypeOption> = [
    {
        type: AccountType.Mortgage,
        icon: 'pi-home',
        label: 'Mortgage',
        description: 'Home loan & equity'
    },
    {
        type: AccountType.AutoLoan,
        icon: 'pi-car',
        label: 'Auto Loan',
        description: 'Vehicle financing'
    },
    {
        type: AccountType.PersonalLoan,
        icon: 'pi-receipt',
        label: 'Personal Loan',
        description: 'Unsecured debt'
    }
];

@Component({
    selector: 'account-form',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, AppShellComponent, LoanDetailsFormComponent],
    templateUrl: './account-form.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountFormComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly ledgerStore = inject(LedgerStore);
    private readonly posthogService = inject(PostHogService);

    readonly loanFormRef = viewChild(LoanDetailsFormComponent);

    // Form signals
    readonly step = signal<WizardStep>('select-type');
    readonly selectedType = signal<AccountType | null>(null);
    readonly showLoans = signal<boolean>(false);
    readonly accountName = signal<string>('');
    readonly institutionName = signal<string>('');
    readonly initialBalance = signal<string>('');
    readonly isSubmitting = signal<boolean>(false);
    readonly error = signal<string | null>(null);

    readonly primaryTypes = signal(PRIMARY_TYPES);
    readonly loanTypes = signal(LOAN_TYPES);

    readonly isLoan = computed(() => {
        const type = this.selectedType();
        return type ? TypeGuards.isLoanAccount(type) : false;
    });

    readonly selectedOption = computed(() => {
        const type = this.selectedType();
        if (!type) return null;
        return [...PRIMARY_TYPES, ...LOAN_TYPES].find(opt => opt.type === type) || null;
    });

    ngOnInit(): void {
        this.route.queryParams.subscribe(params => {
            if (params['type'] && Object.values(AccountType).includes(params['type'])) {
                this.handleTypeSelect(params['type'] as AccountType);
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

    handleBack(): void {
        if (this.step() === 'enter-details') {
            this.step.set('select-type');
            this.error.set(null);
        } else {
            this.handleCancel();
        }
    }

    handleCancel(): void {
        void this.router.navigate(['/accounts']);
    }

    async handleCreate(): Promise<void> {
        if (this.isLoan()) {
            void this.loanFormRef()?.handleSubmit();
            return;
        }

        const trimmedName = this.accountName().trim();
        if (!trimmedName) {
            this.error.set('Account name is required');
            return;
        }

        const type = this.selectedType();
        if (!type) {
            this.error.set('Account type is required');
            this.step.set('select-type');
            return;
        }

        this.isSubmitting.set(true);
        this.error.set(null);

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
                name: trimmedName,
                type: type,
                institutionName: this.institutionName().trim(),
                clearedBalance: balanceCents,
                pendingBalance: balanceCents,
                isActive: true,
                deletedAt: null,
                createdAt: now,
                updatedAt: now
            };

            await this.ledgerStore.addAccount(newAccount);

            this.posthogService.posthog?.capture('account_created', {
                account_type: type,
                has_institution_name: !!this.institutionName().trim(),
                has_initial_balance: !!this.initialBalance()
            });

            void this.router.navigate(['/accounts']);
        } catch (err: unknown) {
            console.error('Failed to create account:', err);
            this.error.set('Failed to create account. Please try again.');
        } finally {
            this.isSubmitting.set(false);
        }
    }

    async handleLoanSubmitted(newAccount: IAccount): Promise<void> {
        this.isSubmitting.set(true);
        try {
            await this.ledgerStore.addAccount(newAccount);
            this.posthogService.posthog?.capture('account_created', {
                account_type: newAccount.type,
                has_institution_name: !!newAccount.institutionName?.trim(),
                has_initial_balance: true
            });
            void this.router.navigate(['/accounts']);
        } catch (err: unknown) {
            console.error('Failed to create loan account:', err);
            this.error.set('Failed to create loan account. Please try again.');
        } finally {
            this.isSubmitting.set(false);
        }
    }
}
