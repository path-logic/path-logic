import { ChangeDetectionStrategy, Component } from '@angular/core';

import { AppShellComponent } from '../../components/layout/app-shell/app-shell.component';

/**
 * Reports page — aggregated financial analytics.
 * Currently a high-fidelity placeholder for the upcoming charts feature.
 */
@Component({
    selector: 'reports-page',
    standalone: true,
    imports: [AppShellComponent],
    templateUrl: './reports-page.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportsPageComponent {
    readonly plannedReports = [
        { title: 'Monthly Budget' },
        { title: 'Cash Flow Statement' },
        { title: 'Account Reconciliation' },
        { title: 'Payee Analysis' },
        { title: 'Tax Summary' },
        { title: 'Loan Amortization' },
        { title: 'Savings Rate' },
        { title: 'Custom Date Range' }
    ];
}
