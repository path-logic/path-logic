import { describe, expect, it } from 'vitest';

import { centsToDollars, dollarsToCents, formatCurrency, parseCurrencyInput } from './Money';

describe('Money Utilities', () => {
    describe('dollarsToCents', () => {
        it('should convert dollars to cents correctly', () => {
            expect(dollarsToCents(100.5)).toBe(10050);
            expect(dollarsToCents(0.01)).toBe(1);
            expect(dollarsToCents(99.99)).toBe(9999);
        });

        it('should handle rounding for floating point quirks', () => {
            // 0.1 + 0.2 is 0.30000000000000004 in JS
            expect(dollarsToCents(0.1 + 0.2)).toBe(30);
        });
    });

    describe('centsToDollars', () => {
        it('should convert cents to dollars correctly', () => {
            expect(centsToDollars(10050)).toBe(100.5);
            expect(centsToDollars(1)).toBe(0.01);
        });
    });

    describe('formatCurrency', () => {
        it('should format cents as USD currency string', () => {
            // Note: Use regex because of non-breaking space in some environments
            expect(formatCurrency(123456)).toMatch(/^\$1,234\.56$/);
        });
    });

    describe('parseCurrencyInput', () => {
        it('should parse formatted currency strings to cents', () => {
            expect(parseCurrencyInput('$1,234.56')).toBe(123456);
            expect(parseCurrencyInput('1234.56')).toBe(123456);
            expect(parseCurrencyInput('  $ 10.00  ')).toBe(1000);
        });

        it('should throw error for invalid inputs', () => {
            expect(() => parseCurrencyInput('not-a-number')).toThrow();
        });
    });
});
