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
import { ButtonModule } from 'primeng/button';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputTextModule } from 'primeng/inputtext';
import { PopoverModule } from 'primeng/popover';

// ─────────────────────────────────────────────────────────────────────────────
// Lightweight arithmetic expression evaluator (replaces mathjs dependency)
//
// Supports: +  -  *  /  ( )  unary minus  decimal numbers
// Grammar (standard precedence):
//   expr    ::= term (('+' | '-') term)*
//   term    ::= factor (('*' | '/') factor)*
//   factor  ::= '-' factor | '(' expr ')' | NUMBER
//
// ~55 lines. No allocations at idle. Synchronous. Zero dependencies.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tokenise a cleaned arithmetic string into numbers and operators.
 * Accepts digits, '.', and the operators +-*\/().
 * Throws on any unexpected character.
 */
function tokenize(expr: string): Array<string> {
    const tokens: Array<string> = [];
    let i = 0;
    while (i < expr.length) {
        const ch = expr.charAt(i);
        if (ch === ' ' || ch === '\t') {
            i++;
            continue;
        }
        if ('+-*/()'.includes(ch)) {
            tokens.push(ch);
            i++;
        } else if ((ch >= '0' && ch <= '9') || ch === '.') {
            let num = '';
            while (i < expr.length) {
                const c = expr.charAt(i);
                if ((c >= '0' && c <= '9') || c === '.') {
                    num += c;
                    i++;
                } else {
                    break;
                }
            }
            tokens.push(num);
        } else {
            throw new Error(`Invalid character in expression: '${ch}'`);
        }
    }
    return tokens;
}

/**
 * Evaluate a cleaned arithmetic expression string.
 * Returns a finite number or throws on invalid input.
 */
function evalArithmetic(expr: string): number {
    const tokens = tokenize(expr);
    let pos = 0;

    const peek = (): string | undefined => tokens[pos];
    const consume = (): string => tokens[pos++] ?? '';

    function parseExpr(): number {
        let lhs = parseTerm();
        while (peek() === '+' || peek() === '-') {
            const op = consume();
            const rhs = parseTerm();
            lhs = op === '+' ? lhs + rhs : lhs - rhs;
        }
        return lhs;
    }

    function parseTerm(): number {
        let lhs = parseFactor();
        while (peek() === '*' || peek() === '/') {
            const op = consume();
            const rhs = parseFactor();
            if (op === '/' && rhs === 0) throw new Error('Division by zero');
            lhs = op === '*' ? lhs * rhs : lhs / rhs;
        }
        return lhs;
    }

    function parseFactor(): number {
        const token = peek();
        if (token === undefined) throw new Error('Unexpected end of expression');
        // Unary minus
        if (token === '-') {
            consume();
            return -parseFactor();
        }
        // Parenthesised sub-expression
        if (token === '(') {
            consume();
            const val = parseExpr();
            if (peek() !== ')') throw new Error('Missing closing parenthesis');
            consume();
            return val;
        }
        // Number literal
        const num = parseFloat(consume());
        if (isNaN(num)) throw new Error(`Expected a number, got '${token}'`);
        return num;
    }

    const result = parseExpr();
    if (pos < tokens.length) {
        throw new Error(`Unexpected token '${tokens[pos]}' at position ${pos}`);
    }
    if (!isFinite(result)) throw new Error('Result is not finite');
    return result;
}

// ─────────────────────────────────────────────────────────────────────────────

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
            // Strip currency formatting before parsing
            const cleanExpr = expr
                .replace(/[$,]/g, '')
                .replace(/[a-zA-Z]/g, '')
                .trim();
            const result = evalArithmetic(cleanExpr);
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
