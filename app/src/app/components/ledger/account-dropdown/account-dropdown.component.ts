import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    ElementRef,
    HostListener,
    inject,
    input,
    model,
    output,
    signal
} from '@angular/core';
import type { IAccount } from '@core';
import { AccountType, Money } from '@core';

export interface IAccountTypeStyle {
    icon: string;
    iconColor: string;
    iconBg: string;
    label: string;
}

const ACCOUNT_TYPE_STYLES: Record<AccountType, IAccountTypeStyle> = {
    [AccountType.Checking]: {
        icon: 'pi-building-columns',
        iconColor: 'text-teal-600 dark:text-teal-400',
        iconBg: 'bg-teal-500/10',
        label: 'Checking'
    },
    [AccountType.Savings]: {
        icon: 'pi-chart-line',
        iconColor: 'text-blue-600 dark:text-blue-400',
        iconBg: 'bg-blue-500/10',
        label: 'Savings'
    },
    [AccountType.Credit]: {
        icon: 'pi-credit-card',
        iconColor: 'text-purple-600 dark:text-purple-400',
        iconBg: 'bg-purple-500/10',
        label: 'Credit'
    },
    [AccountType.Cash]: {
        icon: 'pi-wallet',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        iconBg: 'bg-emerald-500/10',
        label: 'Cash'
    },
    [AccountType.Mortgage]: {
        icon: 'pi-home',
        iconColor: 'text-amber-600 dark:text-amber-400',
        iconBg: 'bg-amber-500/10',
        label: 'Mortgage'
    },
    [AccountType.AutoLoan]: {
        icon: 'pi-car',
        iconColor: 'text-amber-600 dark:text-amber-400',
        iconBg: 'bg-amber-500/10',
        label: 'Auto Loan'
    },
    [AccountType.PersonalLoan]: {
        icon: 'pi-receipt',
        iconColor: 'text-amber-600 dark:text-amber-400',
        iconBg: 'bg-amber-500/10',
        label: 'Personal Loan'
    }
};

@Component({
    selector: 'account-dropdown',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './account-dropdown.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountDropdownComponent {
    private readonly elementRef: ElementRef<HTMLElement> = inject(ElementRef);

    // Inputs & Models
    readonly accounts = input.required<Array<IAccount>>();
    readonly selectedAccountId = model<string | null>(null);
    readonly getAccountBalance = input<((id: string) => number) | undefined>(undefined);
    readonly showAddOption = input<boolean>(true);
    readonly size = input<'sm' | 'md' | 'lg'>('md');
    readonly ariaLabel = input<string>('Select Account');

    // Outputs
    readonly addAccount = output();

    // State
    readonly isOpen = signal<boolean>(false);
    readonly highlightedIndex = signal<number>(0);

    // Computed
    readonly selectedAccount = computed(() => {
        const list = this.accounts();
        const id = this.selectedAccountId();
        if (!id && list.length > 0) {
            return list[0];
        }
        return list.find(a => a.id === id) ?? null;
    });

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        if (!this.elementRef.nativeElement.contains(event.target as Node)) {
            this.close();
        }
    }

    toggleDropdown(): void {
        if (this.isOpen()) {
            this.close();
        } else {
            this.open();
        }
    }

    open(): void {
        this.isOpen.set(true);
        const idx = this.accounts().findIndex(a => a.id === this.selectedAccountId());
        this.highlightedIndex.set(idx >= 0 ? idx : 0);
    }

    close(): void {
        this.isOpen.set(false);
    }

    selectAccount(account: IAccount): void {
        this.selectedAccountId.set(account.id);
        this.close();
    }

    triggerAddAccount(): void {
        this.close();
        this.addAccount.emit();
    }

    onKeyDown(event: KeyboardEvent): void {
        const count = this.accounts().length;
        if (!this.isOpen()) {
            if (
                event.key === 'ArrowDown' ||
                event.key === 'ArrowUp' ||
                event.key === 'Enter' ||
                event.key === ' '
            ) {
                event.preventDefault();
                this.open();
            }
            return;
        }

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                this.highlightedIndex.update(idx => (idx + 1) % count);
                break;
            case 'ArrowUp':
                event.preventDefault();
                this.highlightedIndex.update(idx => (idx - 1 + count) % count);
                break;
            case 'Enter':
            case ' ':
                event.preventDefault();
                {
                    const target = this.accounts()[this.highlightedIndex()];
                    if (target) {
                        this.selectAccount(target);
                    }
                }
                break;
            case 'Escape':
                event.preventDefault();
                this.close();
                break;
            case 'Tab':
                this.close();
                break;
        }
    }

    getAccountStyle(type: AccountType | undefined): IAccountTypeStyle {
        if (!type || !ACCOUNT_TYPE_STYLES[type]) {
            return {
                icon: 'pi-building-columns',
                iconColor: 'text-teal-600 dark:text-teal-400',
                iconBg: 'bg-teal-500/10',
                label: 'Account'
            };
        }
        return ACCOUNT_TYPE_STYLES[type];
    }

    getBalance(acc: IAccount): number {
        const balanceFn = this.getAccountBalance();
        if (balanceFn) {
            return balanceFn(acc.id);
        }
        return acc.clearedBalance ?? 0;
    }

    formatCurrency(amount: number): string {
        return Money.formatCurrency(amount);
    }
}
