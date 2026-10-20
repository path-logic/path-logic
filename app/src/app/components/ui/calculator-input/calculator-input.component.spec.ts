import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CalculatorInputComponent } from './calculator-input.component';

describe('CalculatorInputComponent', () => {
    let component: CalculatorInputComponent;
    let fixture: ComponentFixture<CalculatorInputComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CalculatorInputComponent, FormsModule]
        }).compileComponents();

        fixture = TestBed.createComponent(CalculatorInputComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the calculator input component', () => {
        expect(component).toBeTruthy();
        expect(component.placeholder).toBe('$0.00');
        expect(component.disabled).toBe(false);
        expect(component.readonly).toBe(false);
        expect(component.prefix).toBe('$');
        expect(component.borderless).toBe(false);
        expect(component.displayValue()).toBe('');
    });

    describe('ControlValueAccessor and Formatting', () => {
        it('should format cents into dollars without prefix via writeValue', () => {
            component.writeValue(123456);
            expect(component.displayValue()).toBe('1,234.56');
        });

        it('should set empty string for 0 cents via writeValue', () => {
            component.writeValue(0);
            expect(component.displayValue()).toBe('');
        });

        it('should register onChange and onTouched callbacks', () => {
            const onChangeFn = vi.fn();
            const onTouchedFn = vi.fn();

            component.registerOnChange(onChangeFn);
            component.registerOnTouched(onTouchedFn);

            component.onChange(500);
            component.onTouched();

            expect(onChangeFn).toHaveBeenCalledWith(500);
            expect(onTouchedFn).toHaveBeenCalled();
        });

        it('should update disabled state via setDisabledState', () => {
            expect(component.disabled).toBe(false);
            component.setDisabledState(true);
            expect(component.disabled).toBe(true);
            component.setDisabledState(false);
            expect(component.disabled).toBe(false);
        });
    });

    describe('Focus and Blur handling', () => {
        it('should convert displayValue to raw decimal string on focus', () => {
            component.writeValue(123450); // $1,234.50 -> 1234.5
            component.handleFocus();
            expect(component.displayValue()).toBe('1234.5');
        });

        it('should not change displayValue on focus if readonly or disabled', () => {
            component.writeValue(123450);
            component.readonly = true;
            component.handleFocus();
            expect(component.displayValue()).toBe('1,234.50');

            component.readonly = false;
            component.disabled = true;
            component.handleFocus();
            expect(component.displayValue()).toBe('1,234.50');
        });

        it('should evaluate expression and call onTouched on blur', () => {
            const onTouchedSpy = vi.fn();
            component.registerOnTouched(onTouchedSpy);

            component.displayValue.set('25.50');
            component.handleBlur();

            expect(component.displayValue()).toBe('25.50');
            expect(onTouchedSpy).toHaveBeenCalled();
        });
    });

    describe('Mathematical Expression Evaluation', () => {
        it('should evaluate addition and emit cents on blur or enter', () => {
            const valueChangeSpy = vi.fn();
            const onChangeSpy = vi.fn();
            component.valueChange.subscribe(valueChangeSpy);
            component.registerOnChange(onChangeSpy);

            component.displayValue.set('100 + 50');
            component.handleBlur();

            expect(component.displayValue()).toBe('150.00');
            expect(valueChangeSpy).toHaveBeenCalledWith(15000);
            expect(onChangeSpy).toHaveBeenCalledWith(15000);
            expect(component.history().length).toBe(1);
            expect(component.history()[0]).toContain('100 + 50 = $150.00');
        });

        it('should evaluate subtraction (+, -, *, /)', () => {
            component.displayValue.set('200 - 45.50');
            component.handleBlur();

            expect(component.displayValue()).toBe('154.50');
        });

        it('should evaluate multiplication', () => {
            component.displayValue.set('2000 * 0.85');
            component.handleBlur();

            expect(component.displayValue()).toBe('1,700.00');
        });

        it('should evaluate division', () => {
            component.displayValue.set('150 / 2');
            component.handleBlur();

            expect(component.displayValue()).toBe('75.00');
        });

        it('should evaluate expressions with parentheses and mixed operations', () => {
            component.displayValue.set('(10 + 20) * 3');
            component.handleBlur();

            expect(component.displayValue()).toBe('90.00');
        });

        it('should handle currency symbols and commas inside expression', () => {
            component.displayValue.set('$1,200.00 + $300.50');
            component.handleBlur();

            expect(component.displayValue()).toBe('1,500.50');
        });

        it('should update to 0 cents when expression is empty or whitespace', () => {
            component.writeValue(5000);
            expect(component.displayValue()).toBe('50.00');

            component.displayValue.set('   ');
            component.handleBlur();

            expect(component.displayValue()).toBe('');
        });
    });

    describe('Enter and Escape Key Handling', () => {
        it('should evaluate expression and preventDefault on Enter key', () => {
            component.displayValue.set('50 * 4');
            const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
            const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

            component.handleKeydown(event);

            expect(preventDefaultSpy).toHaveBeenCalled();
            expect(component.displayValue()).toBe('200.00');
        });

        it('should revert displayValue to last committed value and preventDefault on Escape key', () => {
            component.writeValue(2500); // committed value: 25.00
            expect(component.displayValue()).toBe('25.00');

            // User types an unfinished or unwanted expression
            component.displayValue.set('9999 + 888');

            const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
            const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

            component.handleKeydown(event);

            expect(preventDefaultSpy).toHaveBeenCalled();
            expect(component.displayValue()).toBe('25.00');
        });
    });

    describe('Error and Invalid Expression Fallback', () => {
        it('should revert to last committed value when expression is syntactically invalid', () => {
            component.writeValue(4200); // committed: 42.00
            expect(component.displayValue()).toBe('42.00');

            component.displayValue.set('42 + / 5');
            component.handleBlur();

            // Should revert back to 42.00
            expect(component.displayValue()).toBe('42.00');
        });

        it('should revert to last committed value on division by zero', () => {
            component.writeValue(1000);
            component.displayValue.set('10 / 0');
            component.handleBlur();

            expect(component.displayValue()).toBe('10.00');
        });
    });

    describe('Keydown Filtering', () => {
        it('should allow control keys without preventing default', () => {
            const event = new KeyboardEvent('keydown', { key: 'Backspace', cancelable: true });
            const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

            component.handleKeydown(event);
            expect(preventDefaultSpy).not.toHaveBeenCalled();
        });

        it('should allow shortcut keys (Ctrl/Meta)', () => {
            const event = new KeyboardEvent('keydown', {
                key: 'a',
                ctrlKey: true,
                cancelable: true
            });
            const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

            component.handleKeydown(event);
            expect(preventDefaultSpy).not.toHaveBeenCalled();
        });

        it('should prevent invalid characters like letters or symbols', () => {
            const event = new KeyboardEvent('keydown', { key: 'x', cancelable: true });
            const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

            component.handleKeydown(event);
            expect(preventDefaultSpy).toHaveBeenCalled();
        });

        it('should allow mathematical operators (+, -, *, /, parens, space)', () => {
            const operators = ['+', '-', '*', '/', '(', ')', ' '];
            for (const op of operators) {
                const event = new KeyboardEvent('keydown', { key: op, cancelable: true });
                const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

                component.handleKeydown(event);
                expect(preventDefaultSpy).not.toHaveBeenCalled();
            }
        });

        it('should prevent multiple dots in plain number entry', () => {
            const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
            input.value = '12.3';

            const event = new KeyboardEvent('keydown', { key: '.', cancelable: true });
            Object.defineProperty(event, 'target', { value: input });
            const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

            component.handleKeydown(event);
            expect(preventDefaultSpy).toHaveBeenCalled();
        });

        it('should prevent more than 2 decimal places in plain number entry', () => {
            const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
            input.value = '12.34';
            input.selectionStart = 5;
            input.selectionEnd = 5;

            const event = new KeyboardEvent('keydown', { key: '5', cancelable: true });
            Object.defineProperty(event, 'target', { value: input });
            const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

            component.handleKeydown(event);
            expect(preventDefaultSpy).toHaveBeenCalled();
        });
    });

    describe('DOM bindings and styles', () => {
        it('should render prefix when present and hide when empty', () => {
            fixture.componentRef.setInput('prefix', '$');
            fixture.detectChanges();
            let addon = fixture.nativeElement.querySelector('p-inputgroupaddon');
            expect(addon.textContent).toContain('$');

            fixture.componentRef.setInput('prefix', '');
            fixture.detectChanges();
            addon = fixture.nativeElement.querySelector('p-inputgroupaddon');
            // When prefix is empty, first addon is the calculator icon addon
            expect(addon.textContent).not.toContain('$');
        });

        it('should apply borderless classes correctly', () => {
            component.borderless = false;
            expect(component.wrapperClass).toContain('border border-surface-300');

            component.borderless = true;
            expect(component.wrapperClass).toContain('border-none bg-transparent');
        });

        it('should update overflowTitle when text overflows', () => {
            const mockInput = {
                scrollWidth: 200,
                clientWidth: 100
            };
            component.displayValue.set('1,000,000.00');
            component.checkOverflow({ target: mockInput } as any);

            expect(component.overflowTitle).toBe('$1,000,000.00');

            // Not overflowing
            const notOverflowing = {
                scrollWidth: 100,
                clientWidth: 200
            };
            component.checkOverflow({ target: notOverflowing } as any);
            expect(component.overflowTitle).toBe('');
        });
    });
});
