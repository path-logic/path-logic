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
import { formatCurrency } from '@core';
import { evaluate } from 'mathjs';
import { ButtonModule } from 'primeng/button';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputTextModule } from 'primeng/inputtext';
import { PopoverModule } from 'primeng/popover';

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
        ButtonModule
    ],
    templateUrl: './calculator-input.component.html',
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => CalculatorInputComponent),
            multi: true
        }
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalculatorInputComponent implements ControlValueAccessor {
    @Input() placeholder = '$0.00';
    @Input() disabled = false;
    @Input() readonly = false;
    @Input() prefix = '$';

    @Output() valueChange = new EventEmitter<number>();

    // Internal display value (string)
    displayValue = signal<string>('');
    history = signal<Array<string>>([]);

    // Internal parsed value (cents)
    private _valueInCents = 0;

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
        // On focus, show raw numbers or expression if possible
        if (this._valueInCents) {
            this.displayValue.set((this._valueInCents / 100).toString());
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
        }
    }

    private evaluateExpression(expr: string): void {
        if (!expr || expr.trim() === '') {
            this.updateValue(0);
            return;
        }

        try {
            // Strip formatting characters before evaluating
            const cleanExpr = expr.replace(/[$,]/g, '').replace(/[a-zA-Z]/g, '');
            // evaluate math expression safely
            const result = evaluate(cleanExpr);

            // Check if it's a valid number
            if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
                // Return result in cents (rounded)
                const cents = Math.round(result * 100);
                this.history.update(h => [...h, `${expr} = ${formatCurrency(cents)}`]);
                this.updateValue(cents);
            } else {
                // Revert to old value
                this.setDisplayValueFromCents();
            }
        } catch {
            // Revert on error
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
        // formatCurrency outputs $X.XX, so we strip the prefix if we rely on input group addon
        const formatted = this._valueInCents ? formatCurrency(this._valueInCents) : '';
        // If we use prefix, we might want to let the input group handle the $,
        // string formatting might need adjustment, but formatCurrency includes it by default.
        this.displayValue.set(formatted.replace(/^\$/, ''));
    }
}
