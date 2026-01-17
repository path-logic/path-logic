import { Cents } from '../domain/types';

/**
 * Converts decimal dollar amount to integer cents.
 * @param dollars - The dollar amount to convert (e.g., 100.50)
 * @returns The equivalent amount in cents (e.g., 10050)
 */
export function dollarsToCents(dollars: number): Cents {
    return Math.round(dollars * 100);
}

/**
 * Converts integer cents to decimal dollar amount.
 * @param cents - The amount in cents (e.g., 10050)
 * @returns The equivalent amount in dollars (e.g., 100.50)
 */
export function centsToDollars(cents: Cents): number {
    return cents / 100;
}

/**
 * Formats a cent amount as a currency string.
 * @param cents - The amount in cents
 * @param locale - BCP 47 language tag (default: 'en-US')
 * @returns Formatted currency string (e.g., "$100.50")
 */
export function formatCurrency(cents: Cents, locale: string = 'en-US'): string {
    const formatter: Intl.NumberFormat = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'USD',
    });
    return formatter.format(cents / 100);
}

/**
 * Parses a currency input string (e.g., "$1,234.56") into integer cents.
 * Handles currency symbols, commas, and whitespace.
 * @param input - The string to parse
 * @returns Integer cents
 * @throws Error if the input cannot be parsed as a number
 */
export function parseCurrencyInput(input: string): Cents {
    // Remove currency symbols, commas, whitespace
    const cleaned: string = input.replace(/[$,\s]/g, '');
    const dollars: number = parseFloat(cleaned);

    if (isNaN(dollars)) {
        throw new Error(`Invalid currency input: ${input}`);
    }

    return dollarsToCents(dollars);
}
