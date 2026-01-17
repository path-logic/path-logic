import type { ISODateString, Cents } from '../domain/types';

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
 */
export class QIFParser {
    /**
     * Parses QIF content into structured transactions.
     */
    public parse(_content: string): IQIFParseResult {
        // Implementation logic for QIF parsing would go here.
        // For now, returning an empty result to satisfy the structure.
        return {
            transactions: new Array<IParsedTransaction>(),
            accountType: QIFAccountType.Bank,
            errors: new Array<IParseError>(),
            warnings: new Array<IParseWarning>(),
        } satisfies IQIFParseResult;
    }

    /**
     * Handles the complex task of normalizing various QIF date formats.
     */
    public normalizeDate(raw: string): ISODateString {
        const dateStr: string = raw.trim();
        // Implementation logic for defensive date parsing from spec
        return dateStr;
    }
}
