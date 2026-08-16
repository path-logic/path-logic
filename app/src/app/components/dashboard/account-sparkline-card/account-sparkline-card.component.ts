import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { IAccount } from '@core';
import { AccountType, Money } from '@core';

/**
 * High-density account card with balance and mini SVG sparkline visual.
 */
@Component({
    selector: 'account-sparkline-card',
    standalone: true,
    imports: [RouterLink],
    templateUrl: './account-sparkline-card.component.html',
    styleUrl: './account-sparkline-card.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountSparklineCardComponent {
    readonly account = input.required<IAccount>();
    readonly trendPercent = input<string | null>(null);

    readonly formattedBalance = computed((): string => {
        return Money.formatCurrency(this.account().pendingBalance);
    });

    readonly isCredit = computed((): boolean => {
        return this.account().type === AccountType.Credit;
    });

    readonly isNegative = computed((): boolean => {
        return this.account().pendingBalance < 0;
    });

    readonly accountIcon = computed((): string => {
        switch (this.account().type) {
            case AccountType.Checking:
                return 'pi-wallet';
            case AccountType.Savings:
                return 'pi-building-columns';
            case AccountType.Credit:
                return 'pi-credit-card';
            case AccountType.Cash:
                return 'pi-money-bill';
            case AccountType.Mortgage:
                return 'pi-home';
            case AccountType.AutoLoan:
                return 'pi-car';
            case AccountType.PersonalLoan:
                return 'pi-percentage';
            default:
                return 'pi-folder';
        }
    });

    readonly typeDisplayName = computed((): string => {
        switch (this.account().type) {
            case AccountType.Checking:
                return 'Checking';
            case AccountType.Savings:
                return 'Savings';
            case AccountType.Credit:
                return 'Credit Card';
            case AccountType.Cash:
                return 'Cash';
            case AccountType.Mortgage:
                return 'Mortgage';
            case AccountType.AutoLoan:
                return 'Auto Loan';
            case AccountType.PersonalLoan:
                return 'Personal Loan';
            default:
                return 'Account';
        }
    });

    /**
     * SVG Sparkline path coordinates based on account type / balance.
     */
    readonly sparklinePath = computed((): string => {
        if (this.isCredit()) {
            // Downward dip / curve
            return 'M 0 15 Q 25 35, 50 20 T 100 38';
        } else if (this.isNegative()) {
            return 'M 0 10 Q 30 30, 60 25 T 100 40';
        } else {
            // Upward growth curve
            return 'M 0 35 Q 25 20, 50 28 T 100 8';
        }
    });

    readonly sparklineStrokeColor = computed((): string => {
        if (this.isCredit() || this.isNegative()) {
            return '#38bdf8'; // Cyan / blue accent for credit in dark mode
        }
        return '#10b981'; // Emerald
    });
}
