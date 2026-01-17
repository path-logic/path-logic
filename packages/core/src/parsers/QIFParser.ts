import type { Cents, ISODateString } from '../domain/types';
import { generateImportHash } from '../engine/hashing';

export enum QIFAccountType {
    Bank = 'Bank',
    CCard = 'CCard',
    Cash = 'Cash',
}

export interface IParsedSplit {
    category: string | null;
    amount: Cents;
    memo: string | null;
}

export interface IParsedTransaction {
    date: ISODateString;
    amount: Cents;
    payee: string;
    memo: string;
    checkNumber: string | null;
    category: string | null;
    splits: Array<IParsedSplit>;
    importHash: string;
}

export interface IParseError {
    code: string;
    message: string;
    line?: number;
}

export interface IParseWarning {
    code: string;
    message: string;
    line?: number;
}

export interface IQIFParseResult {
    transactions: Array<IParsedTransaction>;
    accountType: QIFAccountType;
    errors: Array<IParseError>;
    warnings: Array<IParseWarning>;
}

/**
 * Defensive QIF parser implementation.
 * Handles legacy Quicken Interchange Format with robust error handling.
 */
export class QIFParser {
    private readonly DATE_PATTERNS: Array<RegExp> = [
        /^(\d{1,2})\/(\d{1,2})'(\d{2,4})$/, // M/D'YY or M/D'YYYY (Quicken: 1/15'26 or 3/7'2005)
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // M/D/YYYY (1/15/2026)
        /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/, // M/D/YY (1/15/26)
        /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // M-D-YYYY (1-15-2026)
        /^(\d{1,2})-(\d{1,2})-(\d{2})$/, // M-D-YY (1-15-26)
        /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD (ISO)
    ];

    /**
     * Parses QIF content into structured transactions.
     */
    public parse(content: string): IQIFParseResult {
        const result: IQIFParseResult = {
            transactions: new Array<IParsedTransaction>(),
            accountType: QIFAccountType.Bank,
            errors: new Array<IParseError>(),
            warnings: new Array<IParseWarning>(),
        };

        if (!content || content.trim().length === 0) {
            result.errors.push({
                code: 'EMPTY_CONTENT',
                message: 'QIF content is empty',
            });
            return result;
        }

        const lines: Array<string> = content.split('\n').map((l: string) => l.trim());
        let lineNumber: number = 0;
        let currentAccountType: QIFAccountType = QIFAccountType.Bank;

        // Parse account type header if present
        if (lines[0]?.startsWith('!Type:')) {
            const typeHeader: string = lines[0].substring(6);
            if (typeHeader === 'Bank') currentAccountType = QIFAccountType.Bank;
            else if (typeHeader === 'CCard') currentAccountType = QIFAccountType.CCard;
            else if (typeHeader === 'Cash') currentAccountType = QIFAccountType.Cash;
            else {
                result.warnings.push({
                    code: 'UNKNOWN_ACCOUNT_TYPE',
                    message: `Unknown account type: ${typeHeader}, defaulting to Bank`,
                    line: 1,
                });
            }
            result.accountType = currentAccountType;
            lineNumber = 1;
        }

        // Parse transactions
        while (lineNumber < lines.length) {
            const txResult: ITransactionParseResult = this.parseTransaction(lines, lineNumber);

            if (txResult.transaction) {
                result.transactions.push(txResult.transaction);
            }

            if (txResult.errors.length > 0) {
                result.errors.push(...txResult.errors);
            }

            if (txResult.warnings.length > 0) {
                result.warnings.push(...txResult.warnings);
            }

            lineNumber = txResult.nextLine;
        }

        return result;
    }

    /**
     * Parses a single transaction from QIF lines.
     */
    private parseTransaction(lines: Array<string>, startLine: number): ITransactionParseResult {
        const result: ITransactionParseResult = {
            transaction: null,
            errors: new Array<IParseError>(),
            warnings: new Array<IParseWarning>(),
            nextLine: startLine,
        };

        let date: ISODateString | null = null;
        let amount: Cents | null = null;
        let payee: string = '';
        let memo: string = '';
        let checkNumber: string | null = null;
        let category: string | null = null;
        const splits: Array<IParsedSplit> = new Array<IParsedSplit>();

        let lineIdx: number = startLine;
        let foundEnd: boolean = false;

        // Parse transaction fields
        while (lineIdx < lines.length) {
            const line: string = lines[lineIdx] ?? '';
            lineIdx++;

            if (line.length === 0) continue;

            const code: string = line.charAt(0);
            const value: string = line.substring(1).trim();

            switch (code) {
                case 'D': // Date
                    try {
                        date = this.normalizeDate(value);
                    } catch {
                        result.errors.push({
                            code: 'INVALID_DATE',
                            message: `Failed to parse date: ${value}`,
                            line: lineIdx,
                        });
                    }
                    break;

                case 'T': // Amount
                    try {
                        amount = this.parseAmount(value);
                    } catch {
                        result.errors.push({
                            code: 'INVALID_AMOUNT',
                            message: `Failed to parse amount: ${value}`,
                            line: lineIdx,
                        });
                    }
                    break;

                case 'P': // Payee
                    payee = value;
                    break;

                case 'M': // Memo
                    memo = value;
                    break;

                case 'N': // Check number
                    checkNumber = value;
                    break;

                case 'L': // Category
                    category = value;
                    break;

                case 'C': // Cleared status (X=cleared, *=reconciled, or empty)
                    // Parser ignores this field for now, but we handle it to avoid warnings
                    break;

                case 'S': // Split category (multi-line)
                    {
                        const split: IParsedSplit = {
                            category: value,
                            amount: 0,
                            memo: null,
                        };

                        // Parse following lines until we hit another transaction field or ^
                        // Can be: $ (amount), E (memo), or both in either order
                        let foundAmount: boolean = false;
                        let foundMemo: boolean = false;

                        while (lineIdx < lines.length && (!foundAmount || !foundMemo)) {
                            const nextLine: string = lines[lineIdx] ?? '';
                            if (nextLine.length === 0) {
                                lineIdx++;
                                continue;
                            }

                            const nextCode: string = nextLine.charAt(0);

                            if (nextCode === '$') {
                                // Split amount
                                try {
                                    split.amount = this.parseAmount(nextLine.substring(1).trim());
                                } catch {
                                    result.warnings.push({
                                        code: 'SPLIT_AMOUNT_ERROR',
                                        message: `Failed to parse split amount: ${nextLine}`,
                                        line: lineIdx + 1,
                                    });
                                }
                                lineIdx++;
                                foundAmount = true;
                            } else if (nextCode === 'E') {
                                // Split memo
                                split.memo = nextLine.substring(1).trim();
                                lineIdx++;
                                foundMemo = true;
                            } else {
                                // Not a split continuation field, break
                                break;
                            }
                        }

                        splits.push(split);
                    }
                    break;

                case '^': // End of record
                    foundEnd = true;
                    break;

                default:
                    result.warnings.push({
                        code: 'UNKNOWN_FIELD',
                        message: `Unrecognized QIF field code: ${code}`,
                        line: lineIdx,
                    });
            }

            if (foundEnd) break;
        }

        result.nextLine = lineIdx;

        // Validate required fields
        if (date === null) {
            result.errors.push({
                code: 'MISSING_DATE',
                message: 'Transaction is missing required date field',
                line: startLine,
            });
            return result;
        }

        if (amount === null) {
            result.errors.push({
                code: 'MISSING_AMOUNT',
                message: 'Transaction is missing required amount field',
                line: startLine,
            });
            return result;
        }

        if (payee.length === 0) {
            result.warnings.push({
                code: 'MISSING_PAYEE',
                message: 'Transaction is missing payee, using "Unknown"',
                line: startLine,
            });
            payee = 'Unknown';
        }

        // Generate import hash for deduplication
        const importHash: string = generateImportHash(date, amount, payee);

        result.transaction = {
            date,
            amount,
            payee,
            memo,
            checkNumber,
            category,
            splits,
            importHash,
        } satisfies IParsedTransaction;

        return result;
    }

    /**
     * Handles the complex task of normalizing various QIF date formats.
     * Supports: M/D'YY, M/D/YYYY, M/D/YY, M-D-YYYY, M-D-YY, YYYY-MM-DD
     */
    public normalizeDate(raw: string): ISODateString {
        const trimmed: string = raw.trim();

        for (const pattern of this.DATE_PATTERNS) {
            const match: RegExpMatchArray | null = trimmed.match(pattern);
            if (match) {
                return this.parseMatchToISO(match, pattern);
            }
        }

        throw new Error(`Unrecognized date format: ${raw}`);
    }

    /**
     * Converts a regex match to ISO date format.
     */
    private parseMatchToISO(match: RegExpMatchArray, pattern: RegExp): ISODateString {
        const patternStr: string = pattern.toString();

        // YYYY-MM-DD (already ISO)
        if (patternStr.includes('\\d{4})-')) {
            const year: string = match[1] ?? '1970';
            const month: string = (match[2] ?? '01').padStart(2, '0');
            const day: string = (match[3] ?? '01').padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        // M/D or M-D formats
        const month: string = (match[1] ?? '01').padStart(2, '0');
        const day: string = (match[2] ?? '01').padStart(2, '0');
        const yearPart: string = match[3] ?? '00';

        let year: number;
        if (yearPart.length === 4) {
            year = parseInt(yearPart, 10);
        } else {
            // 2-digit year: 00-49 = 2000s, 50-99 = 1900s
            const yy: number = parseInt(yearPart, 10);
            year = yy < 50 ? 2000 + yy : 1900 + yy;
        }

        return `${year}-${month}-${day}`;
    }

    /**
     * Parses a QIF amount string into cents.
     * Handles: "-500.00", "1,234.56", "$100.00"
     */
    private parseAmount(raw: string): Cents {
        // Remove currency symbols, commas, and whitespace
        const cleaned: string = raw.replace(/[$,\s]/g, '');

        const dollars: number = parseFloat(cleaned);

        if (isNaN(dollars)) {
            throw new Error(`Invalid amount: ${raw}`);
        }

        // Convert to cents (integer)
        return Math.round(dollars * 100);
    }
}

/**
 * Internal result type for transaction parsing.
 */
interface ITransactionParseResult {
    transaction: IParsedTransaction | null;
    errors: Array<IParseError>;
    warnings: Array<IParseWarning>;
    nextLine: number;
}
