import { describe, expect, it } from 'vitest';
import { cleanExpression, evalArithmetic, tokenize, tryEvalArithmetic } from './arithmetic';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Evaluate and round to N decimal places (avoids float noise in assertions). */
function evalRounded(expr: string, decimals = 10): number {
    const factor = Math.pow(10, decimals);
    return Math.round(evalArithmetic(expr) * factor) / factor;
}

// ─────────────────────────────────────────────────────────────────────────────
// tokenize()
// ─────────────────────────────────────────────────────────────────────────────

describe('tokenize()', () => {
    describe('basic tokenisation', () => {
        it('tokenises a single integer', () => {
            expect(tokenize('42')).toEqual(['42']);
        });

        it('tokenises a single decimal number', () => {
            expect(tokenize('3.14')).toEqual(['3.14']);
        });

        it('tokenises a leading-decimal number', () => {
            expect(tokenize('.5')).toEqual(['.5']);
        });

        it('tokenises all operator characters', () => {
            expect(tokenize('+-*/()')).toEqual(['+', '-', '*', '/', '(', ')']);
        });

        it('tokenises a simple addition expression', () => {
            expect(tokenize('1+2')).toEqual(['1', '+', '2']);
        });

        it('tokenises a complex expression with decimals', () => {
            expect(tokenize('(1.5 + 2) * 3')).toEqual(['(', '1.5', '+', '2', ')', '*', '3']);
        });
    });

    describe('whitespace handling', () => {
        it('skips spaces', () => {
            expect(tokenize('1 + 2')).toEqual(['1', '+', '2']);
        });

        it('skips tabs', () => {
            expect(tokenize('1\t+\t2')).toEqual(['1', '+', '2']);
        });

        it('skips newlines', () => {
            expect(tokenize('1\n+\n2')).toEqual(['1', '+', '2']);
        });

        it('skips mixed whitespace', () => {
            expect(tokenize('  1  +  2  ')).toEqual(['1', '+', '2']);
        });

        it('handles a blank string', () => {
            expect(tokenize('')).toEqual([]);
        });

        it('handles a whitespace-only string', () => {
            expect(tokenize('   \t\n  ')).toEqual([]);
        });
    });

    describe('number literal edge cases', () => {
        it('tokenises a number with only fractional part', () => {
            expect(tokenize('.75')).toEqual(['.75']);
        });

        it('tokenises large numbers', () => {
            expect(tokenize('999999.99')).toEqual(['999999.99']);
        });

        it('tokenises zero', () => {
            expect(tokenize('0')).toEqual(['0']);
        });

        it('tokenises 0.0', () => {
            expect(tokenize('0.0')).toEqual(['0.0']);
        });
    });

    describe('error cases', () => {
        it('throws on an invalid character', () => {
            expect(() => tokenize('2 @ 3')).toThrow(SyntaxError);
            expect(() => tokenize('2 @ 3')).toThrow("Unexpected character '@'");
        });

        it('throws on a letter character', () => {
            expect(() => tokenize('2x')).toThrow(SyntaxError);
        });

        it('throws on a number with multiple decimal points', () => {
            expect(() => tokenize('1.2.3')).toThrow(SyntaxError);
            expect(() => tokenize('1.2.3')).toThrow('multiple decimal points');
        });

        it('throws on a dollar sign (callers must strip it first)', () => {
            expect(() => tokenize('$100')).toThrow(SyntaxError);
        });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// evalArithmetic()
// ─────────────────────────────────────────────────────────────────────────────

describe('evalArithmetic()', () => {
    // ── Literals ──────────────────────────────────────────────────────────────

    describe('numeric literals', () => {
        it('evaluates a single integer', () => {
            expect(evalArithmetic('42')).toBe(42);
        });

        it('evaluates zero', () => {
            expect(evalArithmetic('0')).toBe(0);
        });

        it('evaluates a decimal', () => {
            expect(evalArithmetic('3.14')).toBe(3.14);
        });

        it('evaluates a leading-dot decimal', () => {
            expect(evalArithmetic('.5')).toBe(0.5);
        });

        it('evaluates a large number', () => {
            expect(evalArithmetic('999999.99')).toBe(999999.99);
        });
    });

    // ── Addition ──────────────────────────────────────────────────────────────

    describe('addition', () => {
        it('adds two integers', () => {
            expect(evalArithmetic('2 + 3')).toBe(5);
        });

        it('adds decimals', () => {
            expect(evalRounded('1.1 + 2.2')).toBe(3.3);
        });

        it('chains addition left-to-right', () => {
            expect(evalArithmetic('1 + 2 + 3 + 4')).toBe(10);
        });

        it('adds zero', () => {
            expect(evalArithmetic('0 + 0')).toBe(0);
        });

        it('adds a negative and a positive', () => {
            expect(evalArithmetic('-50 + 100')).toBe(50);
        });
    });

    // ── Subtraction ───────────────────────────────────────────────────────────

    describe('subtraction', () => {
        it('subtracts two integers', () => {
            expect(evalArithmetic('10 - 3')).toBe(7);
        });

        it('produces a negative result', () => {
            expect(evalArithmetic('3 - 10')).toBe(-7);
        });

        it('chains subtraction left-to-right', () => {
            expect(evalArithmetic('10 - 3 - 2')).toBe(5);
        });

        it('subtracts decimals', () => {
            expect(evalRounded('5.5 - 2.2')).toBe(3.3);
        });

        it('subtracts zero', () => {
            expect(evalArithmetic('5 - 0')).toBe(5);
        });
    });

    // ── Multiplication ────────────────────────────────────────────────────────

    describe('multiplication', () => {
        it('multiplies two integers', () => {
            expect(evalArithmetic('6 * 7')).toBe(42);
        });

        it('multiplies by zero', () => {
            expect(evalArithmetic('100 * 0')).toBe(0);
        });

        it('multiplies by one', () => {
            expect(evalArithmetic('100 * 1')).toBe(100);
        });

        it('multiplies decimals', () => {
            expect(evalRounded('1.5 * 4')).toBe(6);
        });

        it('chains multiplication', () => {
            expect(evalArithmetic('2 * 3 * 4')).toBe(24);
        });

        it('multiplies negative numbers', () => {
            expect(evalArithmetic('-3 * 4')).toBe(-12);
        });
    });

    // ── Division ──────────────────────────────────────────────────────────────

    describe('division', () => {
        it('divides evenly', () => {
            expect(evalArithmetic('10 / 2')).toBe(5);
        });

        it('divides to a decimal', () => {
            expect(evalArithmetic('10 / 4')).toBe(2.5);
        });

        it('divides with a decimal divisor', () => {
            expect(evalArithmetic('1 / 0.5')).toBe(2);
        });

        it('divides one by one', () => {
            expect(evalArithmetic('1 / 1')).toBe(1);
        });

        it('chains division left-to-right', () => {
            expect(evalArithmetic('100 / 5 / 4')).toBe(5);
        });

        it('financial: monthly payment (1500 / 12)', () => {
            expect(evalArithmetic('1500 / 12')).toBe(125);
        });

        it('throws RangeError on division by zero', () => {
            expect(() => evalArithmetic('5 / 0')).toThrow(RangeError);
            expect(() => evalArithmetic('5 / 0')).toThrow('Division by zero');
        });

        it('throws RangeError on division by zero in a subexpr', () => {
            expect(() => evalArithmetic('10 / (5 - 5)')).toThrow(RangeError);
        });
    });

    // ── Operator precedence ───────────────────────────────────────────────────

    describe('operator precedence', () => {
        it('multiplication before addition', () => {
            expect(evalArithmetic('2 + 3 * 4')).toBe(14);
        });

        it('division before subtraction', () => {
            expect(evalArithmetic('10 - 6 / 2')).toBe(7);
        });

        it('multiplication before subtraction', () => {
            expect(evalArithmetic('10 - 2 * 3')).toBe(4);
        });

        it('division before addition', () => {
            expect(evalArithmetic('1 + 8 / 4')).toBe(3);
        });

        it('mixed: all four operators', () => {
            expect(evalArithmetic('2 + 3 * 4 - 6 / 2')).toBe(11);
        });

        it('left-to-right for equal-precedence operators', () => {
            // 100 / 5 * 2 should be (100/5)*2 = 40, not 100/(5*2) = 10
            expect(evalArithmetic('100 / 5 * 2')).toBe(40);
        });

        it('left-to-right for addition/subtraction', () => {
            // 5 - 3 + 2 should be (5-3)+2 = 4, not 5-(3+2) = 0
            expect(evalArithmetic('5 - 3 + 2')).toBe(4);
        });
    });

    // ── Parentheses ───────────────────────────────────────────────────────────

    describe('parentheses', () => {
        it('overrides addition-before-multiplication', () => {
            expect(evalArithmetic('(2 + 3) * 4')).toBe(20);
        });

        it('overrides subtraction before division', () => {
            expect(evalArithmetic('(10 - 4) / 2')).toBe(3);
        });

        it('handles nested parentheses', () => {
            expect(evalArithmetic('((2 + 3) * (4 - 1)) / 5')).toBe(3);
        });

        it('handles deeply nested parentheses', () => {
            expect(evalArithmetic('(((1 + 1) + 1) + 1)')).toBe(4);
        });

        it('handles a single number in parens', () => {
            expect(evalArithmetic('(42)')).toBe(42);
        });

        it('handles adjacent parenthesised groups with operator', () => {
            expect(evalArithmetic('(2 + 3) * (4 + 5)')).toBe(45);
        });
    });

    // ── Unary minus ───────────────────────────────────────────────────────────

    describe('unary minus', () => {
        it('negates a single number', () => {
            expect(evalArithmetic('-5')).toBe(-5);
        });

        it('negates a decimal', () => {
            expect(evalArithmetic('-3.14')).toBe(-3.14);
        });

        it('negates a parenthesised expression', () => {
            expect(evalArithmetic('-(2 + 3)')).toBe(-5);
        });

        it('works at the start of a complex expression', () => {
            expect(evalArithmetic('-10 + 20')).toBe(10);
        });

        it('works in multiplication context', () => {
            expect(evalArithmetic('3 * -2')).toBe(-6);
        });

        it('works in division context', () => {
            expect(evalArithmetic('10 / -2')).toBe(-5);
        });

        it('double negation', () => {
            expect(evalArithmetic('--5')).toBe(5);
        });

        it('negated subexpression subtracted', () => {
            expect(evalArithmetic('10 - -5')).toBe(15);
        });

        it('financial: negative tax split', () => {
            // e.g. gross $2000, tax deduction -$500
            expect(evalArithmetic('2000 + -500')).toBe(1500);
        });
    });

    // ── Financial use cases ───────────────────────────────────────────────────

    describe('financial use cases', () => {
        it('splits a paycheck: gross - tax - insurance', () => {
            expect(evalArithmetic('2000 - 400 - 150')).toBe(1450);
        });

        it('quarterly budget divided into months', () => {
            expect(evalArithmetic('3600 / 3 / 12')).toBe(100);
        });

        it('tip calculation: bill + 20%', () => {
            expect(evalArithmetic('85 + 85 * 0.20')).toBe(102);
        });

        it('compound: hours * rate + bonus', () => {
            expect(evalRounded('40 * 32.50 + 250')).toBe(1550);
        });

        it('calculates a 15-year mortgage balance reduction stub', () => {
            // simplified: monthly payment * 12 months
            expect(evalArithmetic('1250 * 12')).toBe(15000);
        });
    });

    // ── Whitespace handling ───────────────────────────────────────────────────

    describe('whitespace in expressions', () => {
        it('handles no spaces', () => {
            expect(evalArithmetic('1+2*3')).toBe(7);
        });

        it('handles extra spaces', () => {
            expect(evalArithmetic('  1  +  2  *  3  ')).toBe(7);
        });

        it('handles tabs between tokens', () => {
            expect(evalArithmetic('1\t+\t2')).toBe(3);
        });
    });

    // ── Error: empty / blank ──────────────────────────────────────────────────

    describe('empty / blank input', () => {
        it('throws SyntaxError on empty string', () => {
            expect(() => evalArithmetic('')).toThrow(SyntaxError);
            expect(() => evalArithmetic('')).toThrow('empty');
        });

        it('throws SyntaxError on whitespace-only string', () => {
            expect(() => evalArithmetic('   ')).toThrow(SyntaxError);
        });
    });

    // ── Error: malformed expressions ──────────────────────────────────────────

    describe('malformed expressions', () => {
        it('throws on trailing operator (2 +)', () => {
            expect(() => evalArithmetic('2 +')).toThrow(SyntaxError);
        });

        it('throws on leading * (missing left operand)', () => {
            expect(() => evalArithmetic('* 3')).toThrow(SyntaxError);
        });

        it('throws on leading / (missing left operand)', () => {
            expect(() => evalArithmetic('/ 3')).toThrow(SyntaxError);
        });

        it('throws on double operators (2 ++ 3)', () => {
            // The second '+' is parsed as unary — actually valid: 2 + (+3) = 5.
            // But '2 ** 3' (double *) should throw.
            expect(() => evalArithmetic('2 ** 3')).toThrow(SyntaxError);
        });

        it('throws on bare operator', () => {
            expect(() => evalArithmetic('+')).toThrow(SyntaxError);
        });

        it('throws on multiple decimals in one number (1.2.3)', () => {
            expect(() => evalArithmetic('1.2.3')).toThrow(SyntaxError);
        });

        it('throws on invalid character ($)', () => {
            expect(() => evalArithmetic('$100')).toThrow(SyntaxError);
        });

        it('throws on invalid character (x)', () => {
            expect(() => evalArithmetic('2x')).toThrow(SyntaxError);
        });

        it('throws on @ operator', () => {
            expect(() => evalArithmetic('2 @ 3')).toThrow(SyntaxError);
        });
    });

    // ── Error: parenthesis mismatches ─────────────────────────────────────────

    describe('parenthesis mismatches', () => {
        it('throws on unclosed left paren', () => {
            expect(() => evalArithmetic('(2 + 3')).toThrow(SyntaxError);
            expect(() => evalArithmetic('(2 + 3')).toThrow('parenthesis');
        });

        it('throws on unclosed nested paren', () => {
            expect(() => evalArithmetic('((2 + 3)')).toThrow(SyntaxError);
        });

        it('throws on stray closing paren', () => {
            // '2 + 3)' — the ')' is a trailing unexpected token
            expect(() => evalArithmetic('2 + 3)')).toThrow(SyntaxError);
        });

        it('throws on empty parentheses', () => {
            expect(() => evalArithmetic('()')).toThrow(SyntaxError);
        });

        it('throws on inverted parens', () => {
            expect(() => evalArithmetic(')2 + 3(')).toThrow(SyntaxError);
        });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// cleanExpression()
// ─────────────────────────────────────────────────────────────────────────────

describe('cleanExpression()', () => {
    it('strips dollar signs', () => {
        expect(cleanExpression('$100 + $50')).toBe('100 + 50');
    });

    it('strips commas', () => {
        expect(cleanExpression('1,000')).toBe('1000');
    });

    it('strips dollar signs and commas together', () => {
        expect(cleanExpression('$1,500.00 / 12')).toBe('1500.00 / 12');
    });

    it('strips uppercase letters', () => {
        expect(cleanExpression('100 USD + 50 GBP')).toBe('100  + 50 ');
    });

    it('strips lowercase letters', () => {
        expect(cleanExpression('100 + 50 usd')).toBe('100 + 50 ');
    });

    it('preserves operators and whitespace', () => {
        expect(cleanExpression('100 + 50 * 2')).toBe('100 + 50 * 2');
    });

    it('preserves parentheses', () => {
        expect(cleanExpression('(100 + 50) * 2')).toBe('(100 + 50) * 2');
    });

    it('preserves negative signs', () => {
        expect(cleanExpression('-500 + 2000')).toBe('-500 + 2000');
    });

    it('handles an empty string', () => {
        expect(cleanExpression('')).toBe('');
    });

    it('handles a plain number with currency', () => {
        expect(cleanExpression('$3,141.59')).toBe('3141.59');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// tryEvalArithmetic()
// ─────────────────────────────────────────────────────────────────────────────

describe('tryEvalArithmetic()', () => {
    describe('valid expressions', () => {
        it('evaluates a simple sum', () => {
            expect(tryEvalArithmetic('2 + 3')).toBe(5);
        });

        it('evaluates a currency expression after stripping', () => {
            expect(tryEvalArithmetic('$100 + $50')).toBe(150);
        });

        it('evaluates a comma-formatted number', () => {
            expect(tryEvalArithmetic('1,500 / 12')).toBe(125);
        });

        it('evaluates a complex expression', () => {
            expect(tryEvalArithmetic('(100 + 50) * 2')).toBe(300);
        });

        it('evaluates zero', () => {
            expect(tryEvalArithmetic('0')).toBe(0);
        });

        it('evaluates a negative result', () => {
            expect(tryEvalArithmetic('-$500 + $2000')).toBe(1500);
        });

        it('evaluates a plain number without operators', () => {
            expect(tryEvalArithmetic('42')).toBe(42);
        });
    });

    describe('invalid / non-math input → null', () => {
        it('returns null for an empty string', () => {
            expect(tryEvalArithmetic('')).toBeNull();
        });

        it('returns null for whitespace only', () => {
            expect(tryEvalArithmetic('   ')).toBeNull();
        });

        it('returns null for pure text', () => {
            expect(tryEvalArithmetic('hello world')).toBeNull();
        });

        it('returns null for an unclosed paren', () => {
            expect(tryEvalArithmetic('(2 + 3')).toBeNull();
        });

        it('returns null for trailing operator', () => {
            expect(tryEvalArithmetic('10 +')).toBeNull();
        });

        it('returns null for division by zero', () => {
            expect(tryEvalArithmetic('5 / 0')).toBeNull();
        });

        it('returns null for invalid currency expression', () => {
            expect(tryEvalArithmetic('$$$')).toBeNull();
        });

        it('returns null for expression with stray @', () => {
            expect(tryEvalArithmetic('10 @ 2')).toBeNull();
        });
    });

    describe('financial input patterns', () => {
        it('handles a paycheck split expression', () => {
            expect(tryEvalArithmetic('$2,000 - $400 - $150')).toBe(1450);
        });

        it('handles monthly payment calculation', () => {
            expect(tryEvalArithmetic('$1,500.00 / 12')).toBe(125);
        });

        it('handles a percentage addition', () => {
            expect(tryEvalArithmetic('85 + 85 * 0.20')).toBe(102);
        });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Round-trip: evalArithmetic(cleanExpression(x))
// ─────────────────────────────────────────────────────────────────────────────

describe('evalArithmetic(cleanExpression(x)) round-trip', () => {
    const cases: Array<[string, number]> = [
        ['$100', 100],
        ['$100 + $50', 150],
        ['$1,500 / 12', 125],
        ['$2,000 - $400 - $150', 1450],
        ['($100 + $50) * 2', 300],
        ['-$500 + $2,000', 1500]
    ];

    it.each(cases)('cleanExpression + evalArithmetic(%s) = %d', (input, expected) => {
        const cleaned = cleanExpression(input).trim();
        expect(evalArithmetic(cleaned)).toBe(expected);
    });
});
