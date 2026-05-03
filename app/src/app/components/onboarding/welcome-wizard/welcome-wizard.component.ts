import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    output,
    signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import type { IAccount, ISODateString } from '@core';
import { AccountType, TypeGuards } from '@core';
import { Button } from 'primeng/button';
import { Step, StepList, StepPanel, StepPanels, Stepper } from 'primeng/stepper';

import { ImportOrchestrationService } from '../../../services/import/import-orchestration.service';
import { PostHogService } from '../../../services/posthog/posthog.service';
import { LoanDetailsFormComponent } from '../loan-details-form/loan-details-form.component';

/**
 * Wizard step types.
 */
type WizardStep = 'select-type' | 'enter-details' | 'import-data';

/**
 * Account type option for the wizard.
 */
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
        label: 'Checking Account',
        description: 'Track daily spending, bills, and income'
    },
    {
        type: AccountType.Savings,
        icon: 'pi-money-bill',
        label: 'Savings Account',
        description: 'Monitor long-term savings goals'
    },
    {
        type: AccountType.Credit,
        icon: 'pi-credit-card',
        label: 'Credit Card',
        description: 'Track credit card spending and payments'
    },
    {
        type: AccountType.Cash,
        icon: 'pi-wallet',
        label: 'Cash',
        description: 'Monitor physical cash transactions'
    }
];

const LOAN_TYPES: Array<IAccountTypeOption> = [
    {
        type: AccountType.Mortgage,
        icon: 'pi-home',
        label: 'Mortgage',
        description: 'Track home loan, escrow, and equity'
    },
    {
        type: AccountType.AutoLoan,
        icon: 'pi-car',
        label: 'Auto Loan',
        description: 'Track vehicle financing and payoff'
    },
    {
        type: AccountType.PersonalLoan,
        icon: 'pi-receipt',
        label: 'Personal Loan',
        description: 'Track unsecured debts and consolidation'
    }
];

/**
 * Styling and theming for account types.
 */
const TYPE_THEMING: Record<
    string,
    { accentBg: string; borderHover: string; iconText: string; iconBg: string; iconBorder: string }
> = {
    [AccountType.Checking]: {
        accentBg: 'bg-teal-500',
        borderHover: 'border-teal-500/30 hover:border-teal-500',
        iconText: 'text-teal-500',
        iconBg: 'bg-teal-500/10',
        iconBorder: 'border-teal-500/20'
    },
    [AccountType.Savings]: {
        accentBg: 'bg-blue-500',
        borderHover: 'border-blue-500/30 hover:border-blue-500',
        iconText: 'text-blue-500',
        iconBg: 'bg-blue-500/10',
        iconBorder: 'border-blue-500/20'
    },
    [AccountType.Credit]: {
        accentBg: 'bg-purple-500',
        borderHover: 'border-purple-500/30 hover:border-purple-500',
        iconText: 'text-purple-500',
        iconBg: 'bg-purple-500/10',
        iconBorder: 'border-purple-500/20'
    },
    [AccountType.Cash]: {
        accentBg: 'bg-green-500',
        borderHover: 'border-green-500/30 hover:border-green-500',
        iconText: 'text-green-500',
        iconBg: 'bg-green-500/10',
        iconBorder: 'border-green-500/20'
    },
    [AccountType.Mortgage]: {
        accentBg: 'bg-amber-500',
        borderHover: 'border-amber-500/30 hover:border-amber-500',
        iconText: 'text-amber-500',
        iconBg: 'bg-amber-500/10',
        iconBorder: 'border-amber-500/20'
    },
    [AccountType.AutoLoan]: {
        accentBg: 'bg-amber-500',
        borderHover: 'border-amber-500/30 hover:border-amber-500',
        iconText: 'text-amber-500',
        iconBg: 'bg-amber-500/10',
        iconBorder: 'border-amber-500/20'
    },
    [AccountType.PersonalLoan]: {
        accentBg: 'bg-amber-500',
        borderHover: 'border-amber-500/30 hover:border-amber-500',
        iconText: 'text-amber-500',
        iconBg: 'bg-amber-500/10',
        iconBorder: 'border-amber-500/20'
    }
};

/**
 * First-run onboarding component.
 * Guides the user through creating their very first account.
 */
@Component({
    selector: 'welcome-wizard',
    standalone: true,
    imports: [
        FormsModule,
        LoanDetailsFormComponent,
        Stepper,
        StepList,
        StepPanels,
        Step,
        StepPanel,
        Button
    ],
    templateUrl: './welcome-wizard.component.html',
    styleUrls: ['./welcome-wizard.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class WelcomeWizardComponent {
    private readonly posthogService = inject(PostHogService);
    readonly importService = inject(ImportOrchestrationService);
    private readonly router = inject(Router);

    // Outputs
    readonly accountCreated = output<IAccount>();
    readonly wizardCompleted = output();

    // State
    readonly step = signal<WizardStep>('select-type');
    readonly selectedType = signal<AccountType | null>(null);
    readonly showLoans = signal<boolean>(false);
    readonly accountName = signal<string>('');
    readonly initialBalance = signal<string>('');
    readonly error = signal<string | null>(null);

    readonly createdAccount = signal<IAccount | null>(null);
    readonly isDropZoneActive = signal<boolean>(false);

    readonly importProgress = this.importService.progress;
    readonly importStats = this.importService.stats;
    readonly importDone = computed(() => this.importService.progress().stage === 'done');

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
            case 'import-data':
                return 3;
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
            return {
                accentBg: 'bg-primary',
                borderHover: 'border-primary/30',
                iconText: 'text-primary',
                iconBg: 'bg-primary/10',
                iconBorder: 'border-primary/20'
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
            [AccountType.Cash]: 'Cash'
        };
        const defaultName = defaultNames[type];
        if (defaultName) {
            this.accountName.set(defaultName);
            this.initialBalance.set('');
        }
    }

    handleStandardAccountCreate(goToImport = false): void {
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
                updatedAt: now
            };

            // Emit to parent — the parent calls ledgerStore.addAccount() which
            // updates accounts(). The wizard stays mounted because of isOnboarding flag.
            this.createdAccount.set(newAccount);
            this.accountCreated.emit(newAccount);
            this.posthogService.posthog.capture('onboarding_account_created', {
                account_type: type,
                has_initial_balance: !!this.initialBalance(),
                will_import: goToImport
            });

            if (goToImport) {
                this.importService.reset();
                this.step.set('import-data');
            } else {
                this.wizardCompleted.emit();
            }
        } catch {
            this.error.set('Failed to create account');
            this.step.set('enter-details');
        }
    }

    handleBack(): void {
        this.error.set(null);
        this.step.set('select-type');
    }

    // ── Import step helpers ───────────────────────────────────────────────────

    onDropZoneDragOver(event: DragEvent): void {
        event.preventDefault();
        this.isDropZoneActive.set(true);
    }

    onDropZoneDragLeave(): void {
        this.isDropZoneActive.set(false);
    }

    onDropZoneDrop(event: DragEvent): void {
        event.preventDefault();
        this.isDropZoneActive.set(false);
        const file = event.dataTransfer?.files[0];
        if (file) this.startImportFromFile(file);
    }

    onImportFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (file) this.startImportFromFile(file);
        input.value = '';
    }

    private startImportFromFile(file: File): void {
        const accountId = this.createdAccount()?.id ?? '';
        this.importService.startImport(file, accountId);
    }

    skipImport(): void {
        this.importService.reset();
        this.wizardCompleted.emit();
    }

    finishAfterImport(): void {
        const accountId = this.createdAccount()?.id;
        if (accountId) {
            void this.router.navigate(['/accounts', accountId]);
        }
        this.wizardCompleted.emit();
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
                iconBorder: 'border-primary/20'
            }
        );
    }

    // Lucide Icons
}
