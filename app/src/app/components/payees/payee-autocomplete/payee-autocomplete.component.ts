import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    forwardRef,
    inject,
    input,
    signal
} from '@angular/core';
import type { ControlValueAccessor } from '@angular/forms';
import { FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import type { IPayee } from '@core';

import { LedgerStore } from '../../../services/ledger-store/ledger.store';

export interface IPayeeSuggestion {
    id?: string;
    name: string;
    isNew?: boolean;
}

let nextId = 0;

/**
 * Reusable accessible in-DOM Payee Autocomplete Combobox component.
 * Provides touch-friendly 44px targets, WAI-ARIA 1.2 Combobox keyboard navigation,
 * and seamless in-DOM floating dropdown matching the app design system.
 */
@Component({
    selector: 'payee-autocomplete',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
        <div class="relative w-full" [class]="styleClass()">
            <div class="relative">
                <input
                    [id]="resolvedInputId"
                    type="text"
                    role="combobox"
                    aria-autocomplete="list"
                    [attr.aria-expanded]="isDropdownOpen()"
                    [attr.aria-controls]="listboxId"
                    [attr.aria-activedescendant]="
                        highlightedIndex() >= 0 ? listboxId + '-opt-' + highlightedIndex() : null
                    "
                    [attr.aria-label]="ariaLabel()"
                    [name]="name()"
                    [disabled]="disabled"
                    [placeholder]="placeholder() || 'e.g. Netflix, Trader Joe\\'s'"
                    [ngModel]="displayValue()"
                    (ngModelChange)="handleInputChange($event)"
                    (focus)="handleInputFocus()"
                    (blur)="handleInputBlur()"
                    (keydown)="handleKeyDown($event)"
                    autocomplete="off"
                    [class]="
                        inputStyleClass() ||
                        'w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-xs font-semibold text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all min-h-[42px]'
                    "
                />
            </div>

            <!-- In-DOM Accessible Dropdown Listbox -->
            @if (isDropdownOpen() && suggestions().length > 0) {
                <ul
                    [id]="listboxId"
                    role="listbox"
                    [attr.aria-label]="ariaLabel() + ' Suggestions'"
                    class="absolute top-full left-0 right-0 mt-1.5 z-50 max-h-60 sm:max-h-48 overflow-y-auto rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200/90 dark:border-surface-700 shadow-xl py-1.5 divide-y divide-surface-100 dark:divide-surface-800"
                >
                    @for (p of suggestions(); track p.id ?? p.name; let i = $index) {
                        <li
                            [id]="listboxId + '-opt-' + i"
                            role="option"
                            [attr.aria-selected]="highlightedIndex() === i"
                            (mousedown)="selectPayee(p)"
                            class="min-h-[44px] px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-between cursor-pointer transition-colors"
                            [class]="
                                highlightedIndex() === i
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-surface-800 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800'
                            "
                        >
                            <div class="flex items-center gap-3 truncate">
                                @if (p.isNew) {
                                    <div
                                        class="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20"
                                    >
                                        <i class="pi pi-plus-circle text-xs"></i>
                                    </div>
                                    <span
                                        class="truncate text-xs sm:text-sm font-bold text-primary"
                                    >
                                        Add '{{ p.name }}'
                                    </span>
                                } @else {
                                    <div
                                        class="w-7 h-7 rounded-lg bg-surface-100 dark:bg-surface-800 flex items-center justify-center shrink-0 border border-surface-200/60 dark:border-surface-700/60"
                                    >
                                        <i
                                            class="pi pi-building text-surface-400 text-xs shrink-0"
                                        ></i>
                                    </div>
                                    <span
                                        class="truncate text-xs sm:text-sm font-bold sm:font-semibold"
                                    >
                                        {{ p.name }}
                                    </span>
                                }
                            </div>
                            <i
                                class="pi pi-arrow-up-left text-xs text-surface-400 shrink-0 opacity-60"
                            ></i>
                        </li>
                    }
                </ul>
            }
        </div>
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
    private readonly ledgerStore = inject(LedgerStore);
    private readonly instanceId = ++nextId;

    readonly listboxId = `payee-listbox-${this.instanceId}`;
    readonly ariaLabel = input<string>('Payee');
    readonly name = input<string>('payee');
    readonly inputId = input<string>('');
    readonly placeholder = input<string>('');
    readonly styleClass = input<string>('w-full');
    readonly inputStyleClass = input<string>('');

    get resolvedInputId(): string {
        return this.inputId() || `payee-input-${this.instanceId}`;
    }

    readonly payees = this.ledgerStore.payees;
    readonly isDropdownOpen = signal<boolean>(false);
    readonly highlightedIndex = signal<number>(-1);
    readonly inputValue = signal<string>('');

    private innerValue: unknown = null;
    disabled = false;

    readonly displayValue = computed<string>(() => {
        return this.inputValue();
    });

    readonly suggestions = computed<Array<IPayeeSuggestion>>(() => {
        const query = this.inputValue().trim().toLowerCase();
        const list = this.payees();

        if (!query) {
            return list.slice(0, 8);
        }

        const matches: Array<IPayeeSuggestion> = list.filter(p =>
            p.name.toLowerCase().includes(query)
        );

        const exactMatch = matches.find(p => p.name.toLowerCase() === query);
        if (!exactMatch) {
            return [{ name: this.inputValue().trim(), isNew: true }, ...matches.slice(0, 7)];
        }

        return matches.slice(0, 8);
    });

    onChange: (val: unknown) => void = () => {
        // Placeholder for ControlValueAccessor callback
    };
    onTouched: () => void = () => {
        // Placeholder for ControlValueAccessor callback
    };

    writeValue(val: unknown): void {
        this.innerValue = val;
        if (val) {
            if (typeof val === 'string') {
                this.inputValue.set(val);
            } else if (typeof val === 'object' && 'name' in (val as Record<string, unknown>)) {
                this.inputValue.set((val as IPayee).name);
            } else {
                this.inputValue.set('');
            }
        } else {
            this.inputValue.set('');
        }
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

    handleInputChange(val: string): void {
        this.inputValue.set(val);
        this.isDropdownOpen.set(true);
        this.highlightedIndex.set(-1);

        const match = this.payees().find(p => p.name.toLowerCase() === val.trim().toLowerCase());
        const emitVal = match ?? (val.trim() ? val.trim() : null);
        this.innerValue = emitVal;
        this.onChange(emitVal);
        this.onTouched();
    }

    handleInputFocus(): void {
        if (!this.disabled && this.payees().length > 0) {
            this.isDropdownOpen.set(true);
        }
    }

    handleInputBlur(): void {
        setTimeout(() => {
            this.isDropdownOpen.set(false);
            this.highlightedIndex.set(-1);
            this.onTouched();
        }, 200);
    }

    selectPayee(suggestion: IPayeeSuggestion): void {
        const name = suggestion.name;
        this.inputValue.set(name);
        this.isDropdownOpen.set(false);
        this.highlightedIndex.set(-1);

        const match = this.payees().find(p => p.name.toLowerCase() === name.toLowerCase());
        const emitVal = match ?? (suggestion.id ? suggestion : name);
        this.innerValue = emitVal;
        this.onChange(emitVal);
        this.onTouched();
    }

    handleKeyDown(event: KeyboardEvent): void {
        const options = this.suggestions();
        if (!this.isDropdownOpen() || options.length === 0) {
            if (event.key === 'ArrowDown') {
                this.isDropdownOpen.set(true);
                event.preventDefault();
            }
            return;
        }

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                this.highlightedIndex.update(i => (i + 1 < options.length ? i + 1 : 0));
                break;
            case 'ArrowUp':
                event.preventDefault();
                this.highlightedIndex.update(i => (i - 1 >= 0 ? i - 1 : options.length - 1));
                break;
            case 'Enter': {
                const selected = options[this.highlightedIndex()];
                if (selected) {
                    event.preventDefault();
                    event.stopPropagation();
                    this.selectPayee(selected);
                }
                break;
            }
            case 'Escape':
                event.preventDefault();
                event.stopPropagation();
                this.isDropdownOpen.set(false);
                this.highlightedIndex.set(-1);
                break;
            case 'Tab': {
                const selected = options[this.highlightedIndex()];
                if (selected) {
                    this.selectPayee(selected);
                } else {
                    this.isDropdownOpen.set(false);
                }
                break;
            }
        }
    }
}
