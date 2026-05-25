import { CommonModule } from '@angular/common';
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
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import type { IAccount, ISODateString } from '@core';
import { AccountType, TypeGuards } from '@core';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Step, StepList, StepPanel, StepPanels, Stepper } from 'primeng/stepper';
import { CategoryMappingDialogComponent } from '../../ledger/category-mapping-dialog/category-mapping-dialog.component';

import { ImportOrchestrationService } from '../../../services/import/import-orchestration.service';
import { PostHogService } from '../../../services/posthog/posthog.service';
import { LoanDetailsFormComponent } from '../loan-details-form/loan-details-form.component';

/**
 * Wizard step types.
 */
type WizardStep = 'select-type' | 'enter-details' | 'import-data' | 'creating';

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
 * Guides the user through type selection, configuration, and optional initial data import.
 */
@Component({
    selector: 'new-account-dialog',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        LoanDetailsFormComponent,
        Stepper,
        StepList,
        StepPanels,
        Step,
        StepPanel,
        Button,
        Dialog,
        CategoryMappingDialogComponent
    ],
    templateUrl: './new-account-dialog.component.html',
    styleUrls: ['./new-account-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class NewAccountDialogComponent {
    private readonly posthogService = inject(PostHogService);
    readonly importService = inject(ImportOrchestrationService);
    private readonly router = inject(Router);

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

    /** The newly-created account — populated after handleCreate() succeeds */
    readonly createdAccount = signal<IAccount | null>(null);

    /** Tracks drag-over state for the drop zone */
    readonly isDropZoneActive = signal<boolean>(false);
    readonly isNavigating = signal<boolean>(false);

    // Computed
    readonly stepValue = computed(() => {
        switch (this.step()) {
            case 'select-type':
                return 1;
            case 'enter-details':
                return 2;
            case 'creating':
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
            return { accentBg: 'bg-primary', iconText: 'text-primary', iconBg: 'bg-primary/10' };
        }
        return TYPE_THEMING[type];
    });

    readonly isLoan = computed(() => {
        const type = this.selectedType();
        return type ? TypeGuards.isLoanAccount(type) : false;
    });

    readonly importProgress = this.importService.progress;
    readonly importStats = this.importService.stats;
    readonly importDone = computed(() => this.importService.progress().stage === 'done');

    constructor() {
        // Reset state when closing
        effect(() => {
            if (!this.isOpen()) {
                this.step.set('select-type');
                this.selectedType.set(null);
                this.accountName.set('');
                this.institutionName.set('');
                this.initialBalance.set('');
                this.error.set(null);
                this.createdAccount.set(null);
            } else {
                this.importService.reset();
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

    async handleCreate(goToImport = false): Promise<void> {
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

            this.createdAccount.set(newAccount);
            this.accountCreated.emit(newAccount);
            this.posthogService.posthog.capture('account_created', {
                account_type: type,
                has_institution_name: !!this.institutionName().trim(),
                has_initial_balance: !!this.initialBalance(),
                will_import: goToImport
            });

            if (goToImport) {
                this.importService.reset();
                this.step.set('import-data');
            } else {
                this.closed.emit();
            }
        } catch {
            this.error.set('Failed to create account');
            this.step.set('enter-details');
        }
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
        this.closed.emit();
    }

    finishAfterImport(): void {
        this.isNavigating.set(true);
        const accountId = this.createdAccount()?.id;

        setTimeout(() => {
            if (accountId) {
                void this.router.navigate(['/accounts', accountId]).then(() => {
                    this.closed.emit();
                    this.isNavigating.set(false);
                });
            } else {
                this.closed.emit();
                this.isNavigating.set(false);
            }
        }, 50);
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
}
