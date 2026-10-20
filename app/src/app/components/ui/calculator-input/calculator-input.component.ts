import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    forwardRef,
    Input,
    Output,
    signal
} from '@angular/core';
import type { ControlValueAccessor } from '@angular/forms';
import { FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { cleanExpression, evalArithmetic, formatCurrency } from '@core';
import { ButtonModule } from 'primeng/button';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputTextModule } from 'primeng/inputtext';
import { PopoverModule } from 'primeng/popover';
import { TooltipModule } from 'primeng/tooltip';

@Component({
    selector: 'calculator-input',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        InputTextModule,
        InputGroupModule,
        InputGroupAddonModule,
        PopoverModule,
        ButtonModule,
        TooltipModule
    ],
    templateUrl: './calculator-input.component.html',
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => CalculatorInputComponent),
            multi: true
        }
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'block w-full'
    }
})
export class CalculatorInputComponent implements ControlValueAccessor {
    @Input() placeholder = '$0.00';
    @Input() disabled = false;
    @Input() readonly = false;
    @Input() prefix = '$';
    @Input() inputClass = '';
    @Input() styleClass = '';
    @Input() inputId = '';
    @Input() borderless = false;
    @Input() set value(cents: number) {
        this.writeValue(cents);
    }
    get value(): number {
        return this._valueInCents;
    }

    get wrapperClass(): string {
        const borderStyles = this.borderless
            ? 'border-none bg-transparent hover:bg-surface-100/40 dark:hover:bg-surface-800/40'
            : 'border border-surface-300 dark:border-surface-600 rounded-md bg-surface-0 dark:bg-surface-900 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary';
        const base = `w-full flex items-center ${borderStyles} overflow-hidden transition-all`;
        if (!this.styleClass) {
            return `${base} h-10`;
        }
        return `${base} ${this.styleClass}`;
    }

    @Output() valueChange = new EventEmitter<number>();

    // Internal display value (string)
    displayValue = signal<string>('');
    history = signal<Array<string>>([]);

    // Internal parsed value (cents)
    private _valueInCents = 0;
    overflowTitle = '';

    // ControlValueAccessor functions
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onChange: (value: number) => void = () => {};
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onTouched: () => void = () => {};

    writeValue(cents: number): void {
        this._valueInCents = cents || 0;
        this.setDisplayValueFromCents();
    }

    registerOnChange(fn: (value: number) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }

    handleFocus(): void {
        if (this.readonly || this.disabled) return;
        if (this._valueInCents) {
            this.displayValue.set((this._valueInCents / 100).toString());
        }
    }

    checkOverflow(event: MouseEvent): void {
        const input = event.target as HTMLInputElement;
        if (input.scrollWidth > input.clientWidth) {
            this.overflowTitle = (this.prefix || '') + this.displayValue();
        } else {
            this.overflowTitle = '';
        }
    }

    handleBlur(): void {
        this.evaluateExpression(this.displayValue());
        this.onTouched();
    }

    handleKeydown(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.evaluateExpression(this.displayValue());
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            this.setDisplayValueFromCents();
            return;
        }

        // Allow control keys
        const isControlKey = [
            'Backspace',
            'Delete',
            'Tab',
            'ArrowLeft',
            'ArrowRight',
            'ArrowUp',
            'ArrowDown',
            'Home',
            'End'
        ].includes(event.key);

        if (isControlKey || event.ctrlKey || event.metaKey) {
            return;
        }

        // Allow only numbers, dot, comma, and mathematical operators
        if (!/^[0-9.,+\-*/() ]$/.test(event.key)) {
            event.preventDefault();
            return;
        }

        const input = event.target as HTMLInputElement | null;
        const currentVal = input?.value ?? this.displayValue();
        const selStart = input?.selectionStart ?? 0;
        const selEnd = input?.selectionEnd ?? 0;

        // If replacing text, allow it
        if (selEnd > selStart) return;

        // If typing or in an arithmetic expression, allow freely
        if (/[+\-*/()]/.test(currentVal) || /[+\-*/()]/.test(event.key)) {
            return;
        }

        // Prevent multiple dots for plain number entry
        if (event.key === '.' && currentVal.includes('.')) {
            event.preventDefault();
            return;
        }

        // Limit to 2 digits after the dot for plain number entry
        const dotIndex = currentVal.indexOf('.');
        if (dotIndex !== -1 && /^[0-9]$/.test(event.key)) {
            if (selStart > dotIndex) {
                const decimalPart = currentVal.substring(dotIndex + 1);
                if (decimalPart.length >= 2) {
                    event.preventDefault();
                }
            }
        }
    }

    private evaluateExpression(expr: string): void {
        if (!expr || expr.trim() === '') {
            this.updateValue(0);
            return;
        }

        try {
            const result = evalArithmetic(cleanExpression(expr).trim());
            const cents = Math.round(result * 100);
            this.history.update(h => [...h, `${expr} = ${formatCurrency(cents)}`]);
            this.updateValue(cents);
        } catch {
            // Invalid expression — revert to last committed value
            this.setDisplayValueFromCents();
        }
    }

    private updateValue(cents: number): void {
        this._valueInCents = cents;
        this.setDisplayValueFromCents();
        this.onChange(cents);
        this.valueChange.emit(cents);
    }

    private setDisplayValueFromCents(): void {
        const formatted = this._valueInCents ? formatCurrency(this._valueInCents) : '';
        this.displayValue.set(formatted.replace(/^\$/, ''));
    }
}
