import { describe, expect, it } from 'vitest';

import { QIFAccountType, QIFParser } from './QIFParser';

describe('QIF Parser', () => {
    const parser: QIFParser = new QIFParser();

    describe('Date Normalization', () => {
        it("parses M/D'YY format (Quicken style)", () => {
            expect(parser.normalizeDate("1/15'26")).toBe('2026-01-15');
            expect(parser.normalizeDate("12/31'23")).toBe('2023-12-31');
        });

        it('parses M/D/YYYY format', () => {
            expect(parser.normalizeDate('1/15/2026')).toBe('2026-01-15');
            expect(parser.normalizeDate('12/31/2023')).toBe('2023-12-31');
        });

        it('parses M/D/YY format with pivot year logic', () => {
            expect(parser.normalizeDate('1/15/26')).toBe('2026-01-15'); // < 50 = 2000s
            expect(parser.normalizeDate('12/31/99')).toBe('1999-12-31'); // >= 50 = 1900s
            expect(parser.normalizeDate('6/30/50')).toBe('1950-06-30'); // Boundary
        });

        it('parses M-D-YYYY format (dash separator)', () => {
            expect(parser.normalizeDate('1-15-2026')).toBe('2026-01-15');
            expect(parser.normalizeDate('12-31-2023')).toBe('2023-12-31');
        });

        it('parses YYYY-MM-DD format (ISO)', () => {
            expect(parser.normalizeDate('2026-01-15')).toBe('2026-01-15');
            expect(parser.normalizeDate('2023-12-31')).toBe('2023-12-31');
        });

        it('pads single-digit months and days', () => {
            expect(parser.normalizeDate('1/5/2026')).toBe('2026-01-05');
            expect(parser.normalizeDate('9/9/2026')).toBe('2026-09-09');
        });

        it('throws error for invalid date formats', () => {
            expect(() => parser.normalizeDate('invalid')).toThrow('Unrecognized date format');
            expect(() => parser.normalizeDate('not-a-date')).toThrow();
        });
    });

    describe('Simple Transaction Parsing', () => {
        it('parses a basic bank transaction', () => {
            const qif: string = `!Type:Bank
D1/15/2026
T-50.00
PAmazon.com
MOffice supplies
^`;

            const result = parser.parse(qif);

            expect(result.accountType).toBe(QIFAccountType.Bank);
            expect(result.transactions).toHaveLength(1);
            expect(result.errors).toHaveLength(0);

            const tx = result.transactions[0];
            expect(tx?.date).toBe('2026-01-15');
            expect(tx?.amount).toBe(-5000); // -$50.00 in cents
            expect(tx?.payee).toBe('Amazon.com');
            expect(tx?.memo).toBe('Office supplies');
            expect(tx?.splits).toHaveLength(0);
        });

        it('parses transaction with check number', () => {
            const qif: string = `!Type:Bank
D1/15/2026
T-100.00
PElectric Company
N1234
^`;

            const result = parser.parse(qif);
            const tx = result.transactions[0];

            expect(tx?.checkNumber).toBe('1234');
        });

        it('parses transaction with category', () => {
            const qif: string = `!Type:Bank
D1/15/2026
T-50.00
PAmazon.com
LBusiness:Supplies
^`;

            const result = parser.parse(qif);
            const tx = result.transactions[0];

            expect(tx?.category).toBe('Business:Supplies');
        });

        it('parses amounts with commas', () => {
            const qif: string = `!Type:Bank
D1/15/2026
T1,234.56
PPaycheck
^`;

            const result = parser.parse(qif);
            const tx = result.transactions[0];

            expect(tx?.amount).toBe(123456); // $1,234.56 in cents
        });

        it('parses amounts with dollar signs', () => {
            const qif: string = `!Type:Bank
D1/15/2026
T$100.00
PTest
^`;

            const result = parser.parse(qif);
            const tx = result.transactions[0];

            expect(tx?.amount).toBe(10000);
        });
    });

    describe('Split Transaction Parsing', () => {
        it('parses split transactions', () => {
            const qif: string = `!Type:Bank
D1/15/2026
T2000.00
PPaycheck
SGross Pay
$2800.00
EGross wages
SFederal Tax
$-400.00
SState Tax
$-200.00
SInsurance
$-200.00
^`;

            const result = parser.parse(qif);
            const tx = result.transactions[0];

            expect(tx?.amount).toBe(200000); // $2000.00
            expect(tx?.splits).toHaveLength(4);

            expect(tx?.splits[0]?.category).toBe('Gross Pay');
            expect(tx?.splits[0]?.amount).toBe(280000);
            expect(tx?.splits[0]?.memo).toBe('Gross wages');

            expect(tx?.splits[1]?.category).toBe('Federal Tax');
            expect(tx?.splits[1]?.amount).toBe(-40000); // Negative split

            expect(tx?.splits[2]?.category).toBe('State Tax');
            expect(tx?.splits[2]?.amount).toBe(-20000);

            expect(tx?.splits[3]?.category).toBe('Insurance');
            expect(tx?.splits[3]?.amount).toBe(-20000);
        });
    });

    describe('Multiple Transactions', () => {
        it('parses multiple transactions', () => {
            const qif: string = `!Type:Bank
D1/15/2026
T-50.00
PAmazon
^
D1/16/2026
T-100.00
PStarbucks
^`;

            const result = parser.parse(qif);

            expect(result.transactions).toHaveLength(2);
            expect(result.transactions[0]?.payee).toBe('Amazon');
            expect(result.transactions[1]?.payee).toBe('Starbucks');
        });
    });

    describe('Error Handling', () => {
        it('returns error for empty content', () => {
            const result = parser.parse('');

            expect(result.transactions).toHaveLength(0);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]?.code).toBe('EMPTY_CONTENT');
        });

        it('returns error for missing date', () => {
            const qif: string = `!Type:Bank
T-50.00
PAmazon
^`;

            const result = parser.parse(qif);

            expect(result.transactions).toHaveLength(0);
            expect(result.errors.some(e => e.code === 'MISSING_DATE')).toBe(true);
        });

        it('returns error for missing amount', () => {
            const qif: string = `!Type:Bank
D1/15/2026
PAmazon
^`;

            const result = parser.parse(qif);

            expect(result.transactions).toHaveLength(0);
            expect(result.errors.some(e => e.code === 'MISSING_AMOUNT')).toBe(true);
        });

        it('warns for missing payee but uses "Unknown"', () => {
            const qif: string = `!Type:Bank
D1/15/2026
T-50.00
^`;

            const result = parser.parse(qif);

            expect(result.transactions).toHaveLength(1);
            expect(result.transactions[0]?.payee).toBe('Unknown');
            expect(result.warnings.some(w => w.code === 'MISSING_PAYEE')).toBe(true);
        });

        it('warns for invalid date but continues', () => {
            const qif: string = `!Type:Bank
Dinvalid-date
T-50.00
PAmazon
^`;

            const result = parser.parse(qif);

            expect(result.errors.some(e => e.code === 'INVALID_DATE')).toBe(true);
        });
    });

    describe('Account Types', () => {
        it('parses CCard account type', () => {
            const qif: string = `!Type:CCard
D1/15/2026
T-50.00
PAmazon
^`;

            const result = parser.parse(qif);

            expect(result.accountType).toBe(QIFAccountType.CCard);
        });

        it('parses Cash account type', () => {
            const qif: string = `!Type:Cash
D1/15/2026
T-50.00
PCoffee Shop
^`;

            const result = parser.parse(qif);

            expect(result.accountType).toBe(QIFAccountType.Cash);
        });

        it('defaults to Bank for unknown account type', () => {
            const qif: string = `!Type:Investment
D1/15/2026
T-50.00
PBroker
^`;

            const result = parser.parse(qif);

            expect(result.accountType).toBe(QIFAccountType.Bank);
            expect(result.warnings.some(w => w.code === 'UNKNOWN_ACCOUNT_TYPE')).toBe(true);
        });
    });

    describe('Import Hash Generation', () => {
        it('generates consistent import hashes', () => {
            const qif: string = `!Type:Bank
D1/15/2026
T-50.00
PAmazon.com
^`;

            const result = parser.parse(qif);
            const tx = result.transactions[0];

            expect(tx?.importHash).toBeDefined();
            expect(tx?.importHash.length).toBe(16); // SHA-256 truncated
        });

        it('generates same hash for identical transactions', () => {
            const qif1: string = `!Type:Bank
D1/15/2026
T-50.00
PAmazon.com
^`;

            const qif2: string = `!Type:Bank
D1/15/2026
T-50.00
PAMAZON.COM
^`;

            const result1 = parser.parse(qif1);
            const result2 = parser.parse(qif2);

            // Hashes should match (case-insensitive payee)
            expect(result1.transactions[0]?.importHash).toBe(result2.transactions[0]?.importHash);
        });
    });
});
