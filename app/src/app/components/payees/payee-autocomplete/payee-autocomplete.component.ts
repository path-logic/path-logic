import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    forwardRef,
    inject,
    input,
    signal
} from '@angular/core';
import type { ControlValueAccessor } from '@angular/forms';
import { FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import type { IPayee } from '@core';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';

@Component({
    selector: 'payee-autocomplete',
    standalone: true,
    imports: [CommonModule, FormsModule, AutoCompleteModule],
    template: `
        <p-autoComplete
            [inputId]="inputId()"
            [(ngModel)]="value"
            (ngModelChange)="onValueChange($event)"
            [suggestions]="filteredPayees()"
            (completeMethod)="filterPayees($event)"
            optionLabel="name"
            [name]="name()"
            [placeholder]="placeholder()"
            [styleClass]="styleClass()"
            [inputStyleClass]="inputStyleClass()"
            [forceSelection]="false"
            [dropdown]="false"
            appendTo="body"
        >
            <ng-template let-payee pTemplate="item">
                <div class="flex items-center gap-2 px-1">
                    @if (payee.isNew) {
                        <i class="pi pi-plus-circle text-primary text-xs"></i>
                        <span class="text-sm font-bold text-primary">Add '{{ payee.name }}'</span>
                    } @else {
                        <i class="pi pi-building text-surface-400 text-xs"></i>
                        <span class="text-sm">{{ payee.name }}</span>
                    }
                </div>
            </ng-template>
        </p-autoComplete>
    `,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => PayeeAutocompleteComponent),
            multi: true
        }
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PayeeAutocompleteComponent implements ControlValueAccessor {
    private ledgerStore = inject(LedgerStore);

    readonly name = input<string>('payee');
    readonly inputId = input<string>('');
    readonly placeholder = input<string>('');
    readonly styleClass = input<string>('w-full h-full');
    readonly inputStyleClass = input<string>(
        'w-full h-full text-sm font-medium px-3 bg-surface-0/60 border border-surface-200/60 text-surface-900 rounded-sm focus:outline-none focus:ring-1 focus:ring-primary shadow backdrop-blur-sm'
    );

    readonly payees = this.ledgerStore.payees;
    readonly filteredPayees = signal<Array<IPayee | { name: string; isNew: boolean }>>([]);

    value: unknown = null;
    disabled = false;

    onChange: (val: unknown) => void = () => {
        // Placeholder for ControlValueAccessor callback
    };

    onTouched: () => void = () => {
        // Placeholder for ControlValueAccessor callback
    };

    writeValue(val: unknown): void {
        this.value = val;
    }

    registerOnChange(fn: (val: unknown) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }

    onValueChange(val: unknown): void {
        this.value = val;
        this.onChange(val);
        this.onTouched();
    }

    filterPayees(event: { query?: string; originalEvent?: Event }): void {
        const query = (event.query || '').toLowerCase();
        const matches = this.payees().filter(p => p.name.toLowerCase().includes(query));

        const exactMatch = matches.find(p => p.name.toLowerCase() === query);
        if (!exactMatch && query.length > 0 && event.query) {
            matches.unshift({ name: event.query, isNew: true } as unknown as IPayee);
        }

        this.filteredPayees.set(matches);
    }
}
