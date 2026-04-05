import {
    ChangeDetectionStrategy,
    Component,
    effect,
    input,
    model,
    output,
    signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Money } from '@path-logic/core';
import {
    AlertCircle,
    ArrowRight,
    Link as LinkIcon,
    LucideAngularModule,
    PlusCircle,
    X,
} from 'lucide-angular';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';

import type { IReconciliationMatch } from '../../../lib/sync/ReconciliationEngine';

/**
 * ReconciliationDialogComponent provides a UI for users to review and resolve
 * matches/conflicts during QIF bank statement imports.
 */
@Component({
    selector: 'app-reconciliation-dialog',
    standalone: true,
    imports: [FormsModule, LucideAngularModule, Dialog, Button],
    templateUrl: './reconciliation-dialog.component.html',
    styleUrls: ['./reconciliation-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReconciliationDialogComponent {
    // Inputs
    readonly isOpen = model<boolean>(false);
    readonly matches = input.required<Array<IReconciliationMatch>>();

    // Outputs
    readonly confirmed = output<Record<number, 'import' | 'match' | 'ignore'>>();

    // State
    readonly decisions = signal<Record<number, 'import' | 'match' | 'ignore'>>({});
    readonly isProcessing = signal<boolean>(false);

    constructor() {
        // Initialize decisions when matches change
        effect(() => {
            const currentMatches = this.matches();
            const initialDecisions: Record<number, 'import' | 'match' | 'ignore'> = {};
            currentMatches.forEach((match, idx) => {
                if (match.type === 'none') {
                    initialDecisions[idx] = 'import';
                } else if (match.type === 'fuzzy') {
                    initialDecisions[idx] = 'match';
                } else if (match.type === 'exact') {
                    initialDecisions[idx] = 'ignore';
                }
            });
            this.decisions.set(initialDecisions);
        });
    }

    setDecision(idx: number, decision: 'import' | 'match' | 'ignore'): void {
        this.decisions.update(prev => ({ ...prev, [idx]: decision }));
    }

    async handleApply(): Promise<void> {
        this.isProcessing.set(true);
        try {
            this.confirmed.emit(this.decisions());
            this.isOpen.set(false);
        } catch (error) {
            console.error('Failed to apply reconciliation decisions', error);
        } finally {
            this.isProcessing.set(false);
        }
    }

    onClose(): void {
        if (!this.isProcessing()) {
            this.isOpen.set(false);
        }
    }

    formatCurrency(amount: number): string {
        return Money.formatCurrency(amount);
    }

    // Lucide Icons
    readonly AlertCircle = AlertCircle;
    readonly ArrowRight = ArrowRight;
    readonly LinkIcon = LinkIcon;
    readonly PlusCircle = PlusCircle;
    readonly X = X;
}
