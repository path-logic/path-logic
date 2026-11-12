import {
    AccountType,
    Frequency,
    PaymentMethod,
    PersonalLoanSubtype,
    PromotionalRateType,
    QifClearedStatus,
    ScheduleType,
    type Cents,
    type IAutoLoanMetadata,
    type ICreditCardDetails,
    type ILoanDetails,
    type IMortgageMetadata,
    type IParsedSplit,
    type IParsedTransaction,
    type IPersonalLoanMetadata,
    type IPromotionalRateWindow,
    type ISODateString
} from '../domain/types';
import { generateImportHash } from '../engine/hashing';
import type { IParseError, IParseWarning } from './QIFParser';

/**
 * Jet 4.0 / MSISAM column data types (`TDEF` column descriptor `+0`).
 */
export enum MnyColumnType {
    Boolean = 1,
    Byte = 2,
    Int16 = 3,
    Int32 = 4,
    Currency = 5,
    Single = 6,
    Double = 7,
    DateTime = 8,
    Binary = 9,
    Text = 10,
    LongBinary = 11,
    Memo = 12,
    Guid = 15
}

/**
 * Microsoft Money (`ACCT.at`) native account type codes.
 */
export enum MnyAccountType {
    BankOrCash = 0,
    CreditCard = 1,
    Cash = 2,
    Asset = 3,
    Liability = 4,
    Investment = 5,
    LoanOrLiability = 6,
    Savings = 7,
    LineOfCredit = 12
}

/**
 * Microsoft Money (`TRN.cs`) native transaction cleared state codes.
 */
export enum MnyClearedState {
    Uncleared = 0,
    Cleared = 1,
    Reconciled = 2
}

/**
 * MSISAM Page 0 (`0x298`) cryptographic bitflags (`myisam08.dll` `FUN_004305e7`).
 */
export enum MnyEncryptionFlag {
    CryptoApiEnabled = 0x02,
    Key128Bit = 0x04,
    VariableKeyBlockOffset = 0x08,
    IncludePasswordInFieldKey = 0x10,
    UseSha1 = 0x20
}

/**
 * Primitive value decoded from a Jet 4.0 / MSISAM table cell.
 */
export type MnyCellValue = string | number | boolean | null;

/**
 * Decrypted Page 0 header metadata and derived page-encryption key state.
 */
export interface IMnyHeader {
    signature: string;
    formatVersion: number;
    codePage: number;
    buildVersion: number;
    lcid: number;
    salt8: Uint8Array;
    salt0: number;
    cryptoFlags: number;
    encryptionMode: number;
    isSha1: boolean;
    is128Bit: boolean;
    passwordVerified: boolean;
    encryptAllPages: boolean;
    keyPrefix: Uint8Array;
    passwordBuffer: Uint8Array;
    decryptedPage0: Uint8Array;
}

/**
 * Jet 4.0 / MSISAM column definition parsed from a `TDEF` page (`02 01`).
 */
export interface IMnyColumnDef {
    name: string;
    colType: MnyColumnType;
    colId: number;
    varColNum: number;
    colFlags: number;
    isFixed: boolean;
    fixedOffset: number;
    maxLength: number;
}

/**
 * Jet 4.0 / MSISAM table definition parsed from a `TDEF` page (`02 01`).
 */
export interface IMnyTableDef {
    startPage: number;
    rowCount: number;
    maxCols: number;
    numVarCols: number;
    numCols: number;
    numIndexes: number;
    numRealIndexes: number;
    columns: Array<IMnyColumnDef>;
}

/**
 * Catalog entry from `MSysObjects` (Page 2).
 */
export interface IMnyCatalogTable {
    id: number;
    name: string;
    type: number;
}

/**
 * Deserialized account from the `ACCT` table (Page 15).
 */
export interface IMnyAccount {
    mnyAccountId: number;
    name: string;
    abbreviation: string | null;
    mnyType: number;
    mappedType: AccountType;
    openingBalance: Cents;
    accountNumber: string | null;
    isClosed: boolean;
    isFavorite: boolean;
    institutionName?: string | null;
    openingDate?: ISODateString | null;
    notes?: string | null;
    isTaxRelated?: boolean;
    linkedMnyAccountId?: number | null;
    creditCardDetails?: ICreditCardDetails;
    loanDetails?: ILoanDetails;
}

/**
 * Deserialized category from the `CAT` table (Page 88).
 */
export interface IMnyCategory {
    mnyCategoryId: number;
    parentCategoryId: number | null;
    level: number;
    name: string;
    fullName?: string;
    categoryType: number;
    isHidden?: boolean;
}

/**
 * Deserialized payee from the `PAY` table (Page 300).
 */
export interface IMnyPayee {
    mnyPayeeId: number;
    name: string;
    parentPayeeId?: number | null;
    isHidden?: boolean;
    accountIds?: Array<number>;
    accountNames?: Array<string>;
    transactionCount?: number;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
    phone?: string | null;
    notes?: string | null;
}

/**
 * Deserialized transaction from `TRN` (Page 502) and `TRN_SPLIT` (Page 1069).
 */
export interface IMnyTransaction extends IParsedTransaction {
    mnyTransactionId: number;
    mnyAccountId: number;
    accountName: string | null;
    linkedMnyAccountId?: number | null;
}

/**
 * Deserialized recurring bill or scheduled transaction from `BILL` and `TRN`.
 */
export interface IMnyRecurringSchedule {
    mnyBillHeadId: number;
    mnyBillId: number;
    mnyTransactionId: number;
    mnyAccountId: number;
    accountName: string | null;
    linkedMnyAccountId: number | null;
    payee: string;
    amount: Cents;
    isEstimatedAmount: boolean;
    type: ScheduleType;
    frequency: Frequency;
    frequencyLabel: string;
    paymentMethod: PaymentMethod;
    paymentMethodLabel: string;
    startDate: ISODateString;
    endDate: ISODateString | null;
    nextDueDate: ISODateString;
    memo: string;
    category: string | null;
    mnyCategoryId: number | null;
    splits: Array<IParsedSplit>;
}

/**
 * Complete result of deserializing a `.mny` database file.
 */
export interface IMnyParseResult {
    header: IMnyHeader | null;
    tables: Array<IMnyCatalogTable>;
    accounts: Array<IMnyAccount>;
    categories: Array<IMnyCategory>;
    payees: Array<IMnyPayee>;
    transactions: Array<IMnyTransaction>;
    recurringSchedules?: Array<IMnyRecurringSchedule>;
    errors: Array<IParseError>;
    warnings: Array<IParseWarning>;
}

const PAGE_SIZE: number = 0x1000;
const HEADER_RC4_KEY_LE: Uint8Array = new Uint8Array([0xc7, 0xda, 0x39, 0x6b]);
const UNSET_OLE_DATE_SENTINEL: number = 2958460.0;
const OLE_EPOCH_UNIX_DAYS: number = 25569;
const MS_PER_DAY: number = 86400000;

/**
 * Declarative column signatures used when `MSysObjects` (Page 2) is unavailable.
 */
const TABLE_COLUMN_SIGNATURES: ReadonlyArray<{
    name: string;
    requiredCols: ReadonlyArray<string>;
}> = [
    { name: 'ACCT', requiredCols: ['hacct', 'at'] },
    { name: 'TRN', requiredCols: ['htrn', 'cs'] },
    { name: 'TRN_SPLIT', requiredCols: ['htrnParent', 'iSplit'] },
    { name: 'TRN_XFER', requiredCols: ['htrnFrom', 'htrnLink'] },
    { name: 'TRN_INV', requiredCols: ['htrn', 'dPrice', 'qty'] },
    { name: 'TRN_OL', requiredCols: ['htrn', 'cpmtsOL'] },
    { name: 'CAT', requiredCols: ['hcat', 'hcatParent'] },
    { name: 'PAY', requiredCols: ['hpay', 'szFull'] },
    { name: 'BILL', requiredCols: ['hbill', 'frq'] },
    { name: 'BILL_FLD', requiredCols: ['hbill', 'fld', 'rgbVal'] },
    { name: 'FI', requiredCols: ['hfi', 'szFull'] },
    { name: 'SEC', requiredCols: ['hsec', 'szFull'] },
    { name: 'SEC_PRICE', requiredCols: ['hsp', 'hsec', 'dPrice'] },
    { name: 'SEC_SPLIT', requiredCols: ['hss', 'cshrPre', 'cshrPost'] },
    { name: 'LOT', requiredCols: ['hlot', 'htrnBuy', 'hsec'] },
    { name: 'AUTO', requiredCols: ['hauto', 'szMake'] },
    { name: 'LON_STEP', requiredCols: ['hstep', 'hacctLoan'] },
    { name: 'ADDR', requiredCols: ['haddr', 'addrt'] },
    { name: 'BGT', requiredCols: ['hbgt', 'dtStart'] },
    { name: 'BGT_BKT', requiredCols: ['hbgtbkt', 'hbgt'] },
    { name: 'BGT_ITM', requiredCols: ['hbgtitm', 'hbgt', 'hcat'] },
    { name: 'CRNC', requiredCols: ['hcrnc', 'szIsoCode'] },
    { name: 'CRNC_EXCH', requiredCols: ['hcrncFrom', 'hcrncTo', 'rate'] },
    { name: 'CNTRY', requiredCols: ['hcntry', 'hcrncDef'] },
    { name: 'SAV_GOAL', requiredCols: ['hsavgoal', 'amt'] },
    { name: 'STMT', requiredCols: ['hstmt', 'hacct', 'amtLastStmt'] },
    { name: 'SVC', requiredCols: ['hsvc', 'hacct', 'hprovfi'] },
    { name: 'PROV_FI', requiredCols: ['hprovfi', 'hfi'] },
    { name: 'TAX_LINE', requiredCols: ['htaxline', 'txn'] },
    { name: 'TRIP', requiredCols: ['htrip', 'hauto'] },
    { name: 'UNOTE', requiredCols: ['hunote', 'szSubject'] },
    { name: 'PREF', requiredCols: ['hpref', 'sguid', 'nValue'] },
    { name: 'PARM', requiredCols: ['hparm', 'szName', 'rgbVal'] },
    { name: 'CLI', requiredCols: ['hcli', 'szFull'] },
    { name: 'DHD', requiredCols: ['dhd', 'wMagic'] }
];

/**
 * 16x16-byte constant table extracted from `msofd.dll` at virtual address `0x2ec02698`
 * (`ev_caf9047b97988eb77d8ad22897a140c2bd1f90ff5afb40a1035dd712e4121ceb`).
 * Used by `0x2ec021e0` to derive the 16-byte MSOFD field-level encryption key from `CLI_DAT` (`idData = 0x03f2`).
 */
const MSOFD_FIELD_KEY_TABLE: ReadonlyArray<Uint8Array> = [
    new Uint8Array([
        0xf8, 0x00, 0xf5, 0x00, 0xaa, 0x00, 0xa5, 0x00, 0xa8, 0x00, 0xa4, 0x00, 0xa8, 0x00, 0xa5,
        0x00
    ]),
    new Uint8Array([
        0xa8, 0x00, 0x1e, 0x20, 0xf2, 0x00, 0xf8, 0x00, 0xf2, 0x00, 0xa5, 0x00, 0xaa, 0x00, 0xad,
        0x00
    ]),
    new Uint8Array([
        0x14, 0x20, 0xaf, 0x00, 0xb9, 0x00, 0xf9, 0x00, 0xf2, 0x00, 0xf5, 0x00, 0xf1, 0x00, 0x80,
        0x00
    ]),
    new Uint8Array([
        0xab, 0x00, 0xb1, 0x00, 0xae, 0x00, 0xaa, 0x00, 0xf1, 0x00, 0xf6, 0x00, 0xf1, 0x00, 0x60,
        0x01
    ]),
    new Uint8Array([
        0xf2, 0x00, 0xf8, 0x00, 0xf8, 0x00, 0xa5, 0x00, 0xae, 0x00, 0xa4, 0x00, 0xf1, 0x00, 0xf2,
        0x00
    ]),
    new Uint8Array([
        0xa3, 0x00, 0x1d, 0x20, 0x22, 0x20, 0xb4, 0x00, 0xf3, 0x00, 0xad, 0x00, 0xf2, 0x00, 0xf8,
        0x00
    ]),
    new Uint8Array([
        0xbb, 0x00, 0x13, 0x20, 0xa8, 0x00, 0xa4, 0x00, 0x26, 0x20, 0xb4, 0x00, 0xb3, 0x00, 0xdc,
        0x02
    ]),
    new Uint8Array([
        0xa2, 0x00, 0x13, 0x20, 0x1e, 0x20, 0xb2, 0x00, 0xa8, 0x00, 0xf0, 0x00, 0x13, 0x20, 0xaa,
        0x00
    ]),
    new Uint8Array([
        0xaa, 0x00, 0xc6, 0x02, 0xa3, 0x00, 0x60, 0x01, 0xad, 0x00, 0xa8, 0x00, 0xfc, 0x00, 0xf8,
        0x00
    ]),
    new Uint8Array([
        0xa3, 0x00, 0x1c, 0x20, 0xe5, 0x00, 0x1d, 0x20, 0xc6, 0x02, 0xa4, 0x00, 0xaa, 0x00, 0xa8,
        0x00
    ]),
    new Uint8Array([
        0xe2, 0x00, 0xa5, 0x00, 0xaa, 0x00, 0xe2, 0x00, 0xa4, 0x00, 0xb3, 0x00, 0xf2, 0x00, 0xf8,
        0x00
    ]),
    new Uint8Array([
        0x92, 0x01, 0xa7, 0x00, 0xf8, 0x00, 0xa4, 0x00, 0xe2, 0x00, 0xac, 0x00, 0xa5, 0x00, 0xf4,
        0x00
    ]),
    new Uint8Array([
        0xf3, 0x00, 0xad, 0x00, 0xf2, 0x00, 0xf8, 0x00, 0xf5, 0x00, 0xf6, 0x00, 0xa7, 0x00, 0xaa,
        0x00
    ]),
    new Uint8Array([
        0xb9, 0x00, 0xa2, 0x00, 0xf2, 0x00, 0xf5, 0x00, 0xf8, 0x00, 0x13, 0x20, 0x8d, 0x00, 0x22,
        0x21
    ]),
    new Uint8Array([
        0xf3, 0x00, 0x8d, 0x00, 0x19, 0x20, 0xb9, 0x00, 0xa5, 0x00, 0xb0, 0x00, 0xac, 0x00, 0xb5,
        0x00
    ]),
    new Uint8Array([
        0xaa, 0x00, 0xb9, 0x00, 0xaf, 0x00, 0xb9, 0x00, 0xb7, 0x00, 0xf1, 0x00, 0xf8, 0x00, 0xf5,
        0x00
    ])
];

// --- Concise Cell Coercion Helpers ---
function asNum(val: MnyCellValue | undefined, fallback: number = 0): number {
    return typeof val === 'number' && Number.isFinite(val) ? val : fallback;
}

function asOptNum(val: MnyCellValue | undefined): number | null {
    return typeof val === 'number' && Number.isFinite(val) ? val : null;
}

function asId(val: MnyCellValue | undefined): number | null {
    return typeof val === 'number' && val >= 0 ? val : null;
}

function asStr(val: MnyCellValue | undefined): string | null {
    return typeof val === 'string' ? val : null;
}

function asBool(val: MnyCellValue | undefined): boolean {
    return val === true || val === 1;
}

function toRateDecimal(percentValue: number): number {
    return Number((percentValue / 100).toFixed(6));
}

function isWithinOneEdit(a: string, b: string): boolean {
    if (a === b) return true;
    if (Math.abs(a.length - b.length) > 1) return false;
    let edits = 0;
    let i = 0;
    let j = 0;
    while (i < a.length && j < b.length) {
        if (a.charCodeAt(i) === b.charCodeAt(j)) {
            i++;
            j++;
        } else {
            edits++;
            if (edits > 1) return false;
            if (a.length > b.length) i++;
            else if (b.length > a.length) j++;
            else {
                i++;
                j++;
            }
        }
    }
    if (i < a.length || j < b.length) edits++;
    return edits <= 1;
}

/**
 * Pure TypeScript RC4 stream cipher (`myisam08.dll` `FUN_0040cdfc` / `FUN_0040cda6`).
 */
export function rc4Transform(key: Uint8Array, data: Uint8Array): Uint8Array {
    if (key.length === 0) {
        return new Uint8Array(data);
    }
    const sBox: Uint8Array = new Uint8Array(256);
    for (let i: number = 0; i < 256; i++) {
        sBox[i] = i;
    }
    let j: number = 0;
    for (let i: number = 0; i < 256; i++) {
        const sVal: number = sBox[i] ?? 0;
        const kVal: number = key[i % key.length] ?? 0;
        j = (j + sVal + kVal) & 0xff;
        sBox[i] = sBox[j] ?? 0;
        sBox[j] = sVal;
    }
    const out: Uint8Array = new Uint8Array(data.length);
    let x: number = 0;
    let y: number = 0;
    for (let k: number = 0; k < data.length; k++) {
        x = (x + 1) & 0xff;
        const sx: number = sBox[x] ?? 0;
        y = (y + sx) & 0xff;
        const sy: number = sBox[y] ?? 0;
        sBox[x] = sy;
        sBox[y] = sx;
        const streamByte: number = sBox[(sx + sy) & 0xff] ?? 0;
        out[k] = (data[k] ?? 0) ^ streamByte;
    }
    return out;
}

/**
 * Pure TypeScript SHA-1 digest (`CALG_SHA1 = 0x8004` in `myisam08.dll`).
 */
export function sha1Digest(message: Uint8Array): Uint8Array {
    const mlBits: number = message.length * 8;
    const padLen: number = (((message.length + 8) >> 6) + 1) << 6;
    const padded: Uint8Array = new Uint8Array(padLen);
    padded.set(message, 0);
    padded[message.length] = 0x80;
    const view: DataView = new DataView(padded.buffer, padded.byteOffset, padded.byteLength);
    view.setUint32(padLen - 4, mlBits >>> 0, false);
    view.setUint32(padLen - 8, Math.floor(mlBits / 0x100000000) >>> 0, false);

    let h0: number = 0x67452301;
    let h1: number = 0xefcdab89;
    let h2: number = 0x98badcfe;
    let h3: number = 0x10325476;
    let h4: number = 0xc3d2e1f0;
    const w: Uint32Array = new Uint32Array(80);

    for (let chunkOff: number = 0; chunkOff < padLen; chunkOff += 64) {
        for (let i: number = 0; i < 16; i++) {
            w[i] = view.getUint32(chunkOff + i * 4, false);
        }
        for (let i: number = 16; i < 80; i++) {
            const x: number =
                (w[i - 3] ?? 0) ^ (w[i - 8] ?? 0) ^ (w[i - 14] ?? 0) ^ (w[i - 16] ?? 0);
            w[i] = ((x << 1) | (x >>> 31)) >>> 0;
        }

        let a: number = h0;
        let b: number = h1;
        let c: number = h2;
        let d: number = h3;
        let e: number = h4;

        for (let i: number = 0; i < 80; i++) {
            let f: number = 0;
            let k: number = 0;
            if (i < 20) {
                f = (b & c) | (~b & d);
                k = 0x5a827999;
            } else if (i < 40) {
                f = b ^ c ^ d;
                k = 0x6ed9eba1;
            } else if (i < 60) {
                f = (b & c) | (b & d) | (c & d);
                k = 0x8f1bbcdc;
            } else {
                f = b ^ c ^ d;
                k = 0xca62c1d6;
            }
            const rotA: number = ((a << 5) | (a >>> 27)) >>> 0;
            const temp: number = (rotA + f + e + k + (w[i] ?? 0)) >>> 0;
            e = d;
            d = c;
            c = ((b << 30) | (b >>> 2)) >>> 0;
            b = a;
            a = temp;
        }

        h0 = (h0 + a) >>> 0;
        h1 = (h1 + b) >>> 0;
        h2 = (h2 + c) >>> 0;
        h3 = (h3 + d) >>> 0;
        h4 = (h4 + e) >>> 0;
    }

    const out: Uint8Array = new Uint8Array(20);
    const outView: DataView = new DataView(out.buffer);
    outView.setUint32(0, h0, false);
    outView.setUint32(4, h1, false);
    outView.setUint32(8, h2, false);
    outView.setUint32(12, h3, false);
    outView.setUint32(16, h4, false);
    return out;
}

const MD5_SHIFTS: ReadonlyArray<number> = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9,
    14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
];

const MD5_K: Uint32Array = ((): Uint32Array => {
    const table: Uint32Array = new Uint32Array(64);
    for (let i: number = 0; i < 64; i++) {
        table[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0;
    }
    return table;
})();

/**
 * Pure TypeScript MD5 digest (`CALG_MD5 = 0x8003` in `myisam08.dll`).
 */
export function md5Digest(message: Uint8Array): Uint8Array {
    const mlBits: number = message.length * 8;
    const padLen: number = (((message.length + 8) >> 6) + 1) << 6;
    const padded: Uint8Array = new Uint8Array(padLen);
    padded.set(message, 0);
    padded[message.length] = 0x80;
    const view: DataView = new DataView(padded.buffer, padded.byteOffset, padded.byteLength);
    view.setUint32(padLen - 8, mlBits >>> 0, true);
    view.setUint32(padLen - 4, Math.floor(mlBits / 0x100000000) >>> 0, true);

    let a0: number = 0x67452301;
    let b0: number = 0xefcdab89;
    let c0: number = 0x98badcfe;
    let d0: number = 0x10325476;

    for (let chunkOff: number = 0; chunkOff < padLen; chunkOff += 64) {
        let a: number = a0;
        let b: number = b0;
        let c: number = c0;
        let d: number = d0;

        for (let i: number = 0; i < 64; i++) {
            let f: number = 0;
            let g: number = 0;
            if (i < 16) {
                f = (b & c) | (~b & d);
                g = i;
            } else if (i < 32) {
                f = (d & b) | (~d & c);
                g = (5 * i + 1) % 16;
            } else if (i < 48) {
                f = b ^ c ^ d;
                g = (3 * i + 5) % 16;
            } else {
                f = c ^ (b | ~d);
                g = (7 * i) % 16;
            }
            const word: number = view.getUint32(chunkOff + g * 4, true);
            const sum: number = (a + f + (MD5_K[i] ?? 0) + word) >>> 0;
            const s: number = MD5_SHIFTS[i] ?? 0;
            const rotated: number = ((sum << s) | (sum >>> (32 - s))) >>> 0;
            a = d;
            d = c;
            c = b;
            b = (b + rotated) >>> 0;
        }

        a0 = (a0 + a) >>> 0;
        b0 = (b0 + b) >>> 0;
        c0 = (c0 + c) >>> 0;
        d0 = (d0 + d) >>> 0;
    }

    const out: Uint8Array = new Uint8Array(16);
    const outView: DataView = new DataView(out.buffer);
    outView.setUint32(0, a0, true);
    outView.setUint32(4, b0, true);
    outView.setUint32(8, c0, true);
    outView.setUint32(12, d0, true);
    return out;
}

interface ISplitLink {
    iSplit: number;
    htrn: number;
}

/**
 * Pure TypeScript Microsoft Money binary database deserializer.
 *
 * Implements the reverse-engineered `myisam08.dll` and `msofd.dll` serialization pipeline:
 * 1. Page 0 header RC4 decryption (`0x6b39dac7`) and password/salt key derivation (`FUN_004305e7`).
 * 2. Per-page RC4 decryption (`FUN_00414ec0`) with single-pass `DATA` page indexing.
 * 3. Jet 4.0 / MSISAM `TDEF` (`02 01`), `DATA` (`01 01`), and `LVAL` record deserialization.
 * 4. MSOFD field-level column RC4 decryption (`0x2ec021e0`) for encrypted Memo fields (`ACCT.mNum`).
 * 5. Domain mapping into Path Logic accounts, categories, payees, recurring bills, and transactions.
 */
export class MNYParser {
    private readonly dataPageIndexCache = new WeakMap<Uint8Array, Map<number, Array<number>>>();

    /**
     * Parses and decrypts the 4,096-byte Page 0 header of a `.mny` file.
     */
    public parseHeader(buffer: Uint8Array, password: string = '', username?: string): IMnyHeader {
        if (buffer.byteLength < PAGE_SIZE) {
            throw new Error(
                `Invalid .mny buffer: expected at least ${PAGE_SIZE} bytes, got ${buffer.byteLength}`
            );
        }

        const page0: Uint8Array = new Uint8Array(buffer.subarray(0, PAGE_SIZE));
        let signature: string = '';
        for (let i: number = 0x04; i < 0x13; i++) {
            const ch: number = page0[i] ?? 0;
            if (ch === 0) break;
            signature += String.fromCharCode(ch);
        }
        if (signature !== 'MSISAM Database') {
            throw new Error(
                `Invalid .mny signature: expected "MSISAM Database", got "${signature}"`
            );
        }

        // Decrypt the 128-byte header block at 0x18..0x97 using 4-byte LE key 0x6b39dac7 (FUN_0040ce80)
        page0.set(rc4Transform(HEADER_RC4_KEY_LE, page0.subarray(0x18, 0x18 + 0x80)), 0x18);

        const view: DataView = new DataView(page0.buffer, page0.byteOffset, page0.byteLength);
        const formatVersion: number = view.getUint32(0x14, true);
        const codePage: number = view.getUint16(0x3c, true);
        const buildVersion: number = view.getUint32(0x6a, true);
        const lcid: number = view.getUint32(0x6e, true);
        const salt8: Uint8Array = new Uint8Array(page0.subarray(0x72, 0x7a));
        const salt0: number = view.getUint32(0x72, true);
        const saltByte0: number = salt8[0] ?? 0;

        const cryptoFlags: number = page0[0x298] ?? 0;
        const isSha1: boolean = (cryptoFlags & MnyEncryptionFlag.UseSha1) !== 0;
        const is128Bit: boolean = (cryptoFlags & MnyEncryptionFlag.Key128Bit) !== 0;
        const rawSaltByte0: number = buffer[0x72] ?? 0;
        const varOffset: number =
            (cryptoFlags & MnyEncryptionFlag.VariableKeyBlockOffset) !== 0 ? saltByte0 : 0;
        const varOffsetRaw: number =
            (cryptoFlags & MnyEncryptionFlag.VariableKeyBlockOffset) !== 0 ? rawSaltByte0 : 0;

        const modeOffset: number = 0x2ed + varOffset;
        let encryptionMode: number = modeOffset < PAGE_SIZE ? (page0[modeOffset] ?? 0) : 0;

        const authResult = this.verifyAndUnwrapCredentials(
            page0,
            varOffset,
            varOffsetRaw,
            salt8,
            salt0,
            isSha1,
            is128Bit,
            password,
            username
        );

        let passwordVerified: boolean = authResult.passwordVerified;
        const keyPrefix: Uint8Array = authResult.keyPrefix;
        const passwordBuffer: Uint8Array = authResult.passwordBuffer;
        if (authResult.detectedMode !== undefined && authResult.detectedMode !== 0) {
            encryptionMode = authResult.detectedMode;
        }

        // Pages >= 15 are encrypted only when Page 15 does not begin with plaintext TDEF signature 02 01
        let encryptAllPages: boolean = encryptionMode !== 0;
        if (buffer.byteLength >= 16 * PAGE_SIZE) {
            const p15Off: number = 15 * PAGE_SIZE;
            encryptAllPages = !(buffer[p15Off] === 0x02 && buffer[p15Off + 1] === 0x01);
        }

        if (!encryptAllPages && encryptionMode === 0 && password.length === 0) {
            passwordVerified = true;
        }

        return {
            signature,
            formatVersion,
            codePage,
            buildVersion,
            lcid,
            salt8,
            salt0,
            cryptoFlags,
            encryptionMode,
            isSha1,
            is128Bit,
            passwordVerified,
            encryptAllPages,
            keyPrefix,
            passwordBuffer,
            decryptedPage0: page0
        };
    }

    /**
     * Reads and decrypts a 4,096-byte page from the `.mny` buffer (`FUN_00414ec0`).
     */
    public getPage(buffer: Uint8Array, pageNumber: number, header: IMnyHeader): Uint8Array {
        if (pageNumber === 0) {
            return header.decryptedPage0;
        }
        const byteStart: number = pageNumber * PAGE_SIZE;
        const byteEnd: number = byteStart + PAGE_SIZE;
        if (byteStart < 0 || byteEnd > buffer.byteLength) {
            throw new Error(`Page ${pageNumber} out of bounds (file length ${buffer.byteLength})`);
        }
        const rawPage: Uint8Array = buffer.subarray(byteStart, byteEnd);
        if (pageNumber < 0x0f || header.encryptAllPages) {
            const pageKey: Uint8Array = new Uint8Array(header.keyPrefix.length + 4);
            pageKey.set(header.keyPrefix, 0);
            new DataView(pageKey.buffer, pageKey.byteOffset, pageKey.byteLength).setUint32(
                header.keyPrefix.length,
                (header.salt0 ^ pageNumber) >>> 0,
                true
            );
            return rc4Transform(pageKey, rawPage);
        }
        return rawPage;
    }

    /**
     * Parses a Jet 4.0 / MSISAM Table Definition (`TDEF`) starting at `startPage`.
     */
    public readTableDef(buffer: Uint8Array, startPage: number, header: IMnyHeader): IMnyTableDef {
        const firstPage: Uint8Array = this.getPage(buffer, startPage, header);
        if (firstPage[0] !== 0x02 || firstPage[1] !== 0x01) {
            throw new Error(
                `Page ${startPage} is not a valid TDEF page (got 0x${(firstPage[0] ?? 0).toString(16)} 0x${(firstPage[1] ?? 0).toString(16)})`
            );
        }

        const chunks: Array<Uint8Array> = [firstPage];
        const firstView: DataView = new DataView(
            firstPage.buffer,
            firstPage.byteOffset,
            firstPage.byteLength
        );
        let nextPage: number = firstView.getUint32(0x04, true);
        let guard: number = 0;

        while (nextPage !== 0 && guard < 64) {
            const np: Uint8Array = this.getPage(buffer, nextPage, header);
            chunks.push(np.subarray(0x08));
            const npView: DataView = new DataView(np.buffer, np.byteOffset, np.byteLength);
            nextPage = npView.getUint32(0x04, true);
            guard++;
        }

        const totalLen: number = chunks.reduce(
            (acc: number, c: Uint8Array) => acc + c.byteLength,
            0
        );
        const full: Uint8Array = new Uint8Array(totalLen);
        let copyOff: number = 0;
        for (const chunk of chunks) {
            full.set(chunk, copyOff);
            copyOff += chunk.byteLength;
        }

        const view: DataView = new DataView(full.buffer, full.byteOffset, full.byteLength);
        const rowCount: number = view.getInt32(0x10, true);
        const maxCols: number = view.getUint16(0x29, true);
        const numVarCols: number = view.getUint16(0x2b, true);
        const numCols: number = view.getUint16(0x2d, true);
        const numIndexes: number = view.getInt32(0x2f, true);
        const numRealIndexes: number = view.getInt32(0x33, true);

        let off: number = 0x3f + numRealIndexes * 12;
        const columns: Array<IMnyColumnDef> = [];

        for (let i: number = 0; i < numCols; i++) {
            if (off + 25 > full.byteLength) break;
            const colType: MnyColumnType = (full[off] ?? 0) as MnyColumnType;
            const colId: number = view.getUint16(off + 5, true);
            const varColNum: number = view.getUint16(off + 7, true);
            const colFlags: number = full[off + 15] ?? 0;
            const isFixed: boolean = (colFlags & 0x01) !== 0;
            const fixedOffset: number = view.getUint16(off + 21, true);
            const maxLength: number = view.getUint16(off + 23, true);
            columns.push({
                name: '',
                colType,
                colId,
                varColNum,
                colFlags,
                isFixed,
                fixedOffset,
                maxLength
            });
            off += 25;
        }

        for (const col of columns) {
            if (off + 2 > full.byteLength) break;
            const nameByteLen: number = view.getUint16(off, true);
            off += 2;
            if (off + nameByteLen <= full.byteLength) {
                col.name = this.decodeUtf16LE(full.subarray(off, off + nameByteLen));
            }
            off += nameByteLen;
        }

        return {
            startPage,
            rowCount,
            maxCols,
            numVarCols,
            numCols,
            numIndexes,
            numRealIndexes,
            columns
        };
    }

    /**
     * Reads all active rows belonging to `tdef` using the cached single-pass `DATA` (`01 01`) page index.
     */
    public readTableRows(
        buffer: Uint8Array,
        tdef: IMnyTableDef,
        header: IMnyHeader,
        fieldKey16: Uint8Array | null = null,
        tableName: string = ''
    ): Array<Record<string, MnyCellValue>> {
        const pageNumbers: Array<number> = this.getDataPagesForTdef(buffer, tdef.startPage, header);
        const rows: Array<Record<string, MnyCellValue>> = [];

        for (const pIdx of pageNumbers) {
            const page: Uint8Array = this.getPage(buffer, pIdx, header);
            for (const rowBuf of this.extractActiveRowSlices(page)) {
                rows.push(this.parseRow(buffer, tdef, rowBuf, header, fieldKey16, tableName));
            }
        }

        return rows;
    }

    /**
     * Deserializes a complete `.mny` file into catalog metadata, accounts, categories, payees,
     * recurring schedules, and transactions.
     */
    public parse(
        buffer: Uint8Array,
        password: string = '',
        onProgress?: (stage: string, pct: number, table?: string) => void,
        username?: string
    ): IMnyParseResult {
        onProgress?.('decrypting_header', 5);
        const result: IMnyParseResult = {
            header: null,
            tables: [],
            accounts: [],
            categories: [],
            payees: [],
            transactions: [],
            recurringSchedules: [],
            errors: [],
            warnings: []
        };

        let header: IMnyHeader;
        try {
            header = this.parseHeader(buffer, password, username);
            result.header = header;
        } catch (err: unknown) {
            result.errors.push({
                code: 'INVALID_MNY_HEADER',
                message: err instanceof Error ? err.message : 'Failed to parse .mny header'
            });
            return result;
        }

        if (!header.passwordVerified && header.encryptAllPages) {
            result.errors.push({
                code: 'INVALID_PASSWORD',
                message: 'Password verification failed against Page 0 key check block'
            });
            return result;
        }

        // 1. Read MSysObjects (Page 2) or fallback to signature scan
        const tableMap: Map<string, number> = this.readCatalogTables(
            buffer,
            header,
            result,
            onProgress
        );
        if (tableMap.size === 0) {
            result.errors.push({
                code: 'CATALOG_READ_ERROR',
                message: 'Failed to read MSysObjects catalog or discover database tables'
            });
            return result;
        }

        // 2. Derive MSOFD field-level encryption key from CLI_DAT (if present)
        const fieldKey16: Uint8Array | null = this.deriveFieldKey16(
            buffer,
            header,
            tableMap.get('CLI_DAT') ?? null
        );

        // 3. Extract Categories (CAT)
        onProgress?.('extracting_categories', 30, 'CAT');
        const { categories, categoryNameById, categoryFullNameById } = this.extractCategories(
            buffer,
            header,
            tableMap.get('CAT')
        );
        result.categories = categories;

        // 4. Extract Lookup Tables (FI, AUTO, LON_STEP, ADDR) and Accounts (ACCT)
        onProgress?.('extracting_accounts', 50, 'ACCT');
        const { fiNameById, autoRows, lonStepsByAcctId, addrById } = this.extractLookupTables(
            buffer,
            header,
            tableMap
        );
        const { accounts, accountNameById } = this.extractAccounts(
            buffer,
            header,
            tableMap.get('ACCT'),
            fieldKey16,
            categoryNameById,
            categoryFullNameById,
            fiNameById,
            autoRows,
            lonStepsByAcctId
        );
        result.accounts = accounts;

        // 5. Extract Payees (PAY + ADDR)
        onProgress?.('extracting_payees', 65, 'PAY');
        const payeeCtx = this.extractPayees(buffer, header, tableMap.get('PAY'), addrById);
        result.payees = payeeCtx.payees;

        // 6. Extract Transactions (TRN / TRN_SPLIT / TRN_XFER) and Recurring Bills (BILL)
        onProgress?.('extracting_transactions', 80, 'TRN');
        const { transactions, recurringSchedules } = this.extractTransactionsAndSchedules(
            buffer,
            header,
            tableMap,
            accountNameById,
            categoryNameById,
            payeeCtx
        );
        result.transactions = transactions;
        result.recurringSchedules = recurringSchedules;

        // 7. Finalize originating account metadata on payees
        payeeCtx.finalizePayeeUsage(accountNameById);

        onProgress?.('complete', 100);
        return result;
    }

    // --- Single-Pass Page Indexing & Row Extraction ---

    private getDataPagesForTdef(
        buffer: Uint8Array,
        tdefPage: number,
        header: IMnyHeader
    ): Array<number> {
        let indexMap = this.dataPageIndexCache.get(buffer);
        if (!indexMap) {
            indexMap = new Map<number, Array<number>>();
            const numPages: number = Math.floor(buffer.byteLength / PAGE_SIZE);
            for (let pIdx: number = 1; pIdx < numPages; pIdx++) {
                const page: Uint8Array = this.getPage(buffer, pIdx, header);
                if (page[0] !== 0x01 || page[1] !== 0x01) continue;
                const ownerTdef: number = new DataView(
                    page.buffer,
                    page.byteOffset,
                    page.byteLength
                ).getUint32(0x04, true);
                const list = indexMap.get(ownerTdef);
                if (list) {
                    list.push(pIdx);
                } else {
                    indexMap.set(ownerTdef, [pIdx]);
                }
            }
            this.dataPageIndexCache.set(buffer, indexMap);
        }
        return indexMap.get(tdefPage) ?? [];
    }

    private extractActiveRowSlices(page: Uint8Array): Array<Uint8Array> {
        const slices: Array<Uint8Array> = [];
        const pageView: DataView = new DataView(page.buffer, page.byteOffset, page.byteLength);
        const nRows: number = pageView.getUint16(0x0c, true);

        for (let r: number = 0; r < nRows; r++) {
            const descOff: number = 0x0e + r * 2;
            if (descOff + 2 > page.byteLength) break;
            const desc: number = pageView.getUint16(descOff, true);
            // Skip deleted or moved-out row flag (0x4000)
            if ((desc & 0x4000) !== 0) continue;

            const rStart: number = desc & 0x1fff;
            const rEnd: number =
                r === 0 ? PAGE_SIZE : pageView.getUint16(0x0e + (r - 1) * 2, true) & 0x1fff;
            if (rStart < rEnd && rEnd <= page.byteLength) {
                slices.push(page.subarray(rStart, rEnd));
            }
        }
        return slices;
    }

    private readOptionalTableRows(
        buffer: Uint8Array,
        header: IMnyHeader,
        tdefPage: number | undefined,
        fieldKey16: Uint8Array | null = null,
        tableName: string = ''
    ): Array<Record<string, MnyCellValue>> {
        if (tdefPage === undefined) return [];
        try {
            const tdef: IMnyTableDef = this.readTableDef(buffer, tdefPage, header);
            return this.readTableRows(buffer, tdef, header, fieldKey16, tableName);
        } catch {
            return [];
        }
    }

    // --- Modular Domain Extractors ---

    private readCatalogTables(
        buffer: Uint8Array,
        header: IMnyHeader,
        result: IMnyParseResult,
        onProgress?: (stage: string, pct: number, table?: string) => void
    ): Map<string, number> {
        const tableMap = new Map<string, number>();
        try {
            const sysTdef: IMnyTableDef = this.readTableDef(buffer, 2, header);
            const sysRows = this.readTableRows(buffer, sysTdef, header);
            for (const row of sysRows) {
                const id = asOptNum(row['Id']);
                const name = asStr(row['Name']);
                const type = asOptNum(row['Type']);
                if (id !== null && name !== null && type !== null) {
                    result.tables.push({ id, name, type });
                    if (type === 1 && id > 0) {
                        tableMap.set(name, id);
                    }
                }
            }
            onProgress?.('reading_catalog', 15, 'MSysObjects');
        } catch {
            return this.scanCatalogTables(buffer, header, result);
        }

        return tableMap.size > 0 ? tableMap : this.scanCatalogTables(buffer, header, result);
    }

    private extractCategories(
        buffer: Uint8Array,
        header: IMnyHeader,
        catPage: number | undefined
    ): {
        categories: Array<IMnyCategory>;
        categoryNameById: Map<number, string>;
        categoryFullNameById: Map<number, string>;
    } {
        const categories: Array<IMnyCategory> = [];
        const categoryNameById = new Map<number, string>();
        const categoryFullNameById = new Map<number, string>();
        const catRows = this.readOptionalTableRows(buffer, header, catPage);
        if (catRows.length === 0) {
            return { categories, categoryNameById, categoryFullNameById };
        }

        const catRowById = new Map<number, Record<string, MnyCellValue>>();
        for (const row of catRows) {
            const hcat = asOptNum(row['hcat']);
            const szFull = asStr(row['szFull']);
            if (hcat !== null && szFull !== null) {
                catRowById.set(hcat, row);
                categoryNameById.set(hcat, szFull);
            }
        }

        const isRootContainerRow = (row: Record<string, MnyCellValue>): boolean => {
            const hcat = asOptNum(row['hcat']);
            const sz = (asStr(row['szFull']) ?? '').toUpperCase();
            return (
                asId(row['hcatParent']) === null &&
                (hcat === 130 || hcat === 131 || sz === 'INCOME' || sz === 'EXPENSE')
            );
        };

        const resolveCategoryType = (hcat: number): number => {
            let curr = catRowById.get(hcat);
            const seen = new Set<number>();
            while (curr) {
                const id = asNum(curr['hcat'], -1);
                if (seen.has(id)) break;
                seen.add(id);
                const sz = (asStr(curr['szFull']) ?? '').toUpperCase();
                if (id === 130 || sz === 'INCOME' || curr['ct'] === 1) return 1;
                if (id === 131 || sz === 'EXPENSE' || curr['ct'] === 2) return 2;
                const parentId = asId(curr['hcatParent']);
                curr = parentId !== null ? catRowById.get(parentId) : undefined;
            }
            return 0;
        };

        const resolveFullCategoryPath = (hcat: number): string => {
            const parts: Array<string> = [];
            let curr = catRowById.get(hcat);
            const seen = new Set<number>();
            while (curr && !isRootContainerRow(curr)) {
                const id = asNum(curr['hcat'], -1);
                if (seen.has(id)) break;
                seen.add(id);
                const sz = asStr(curr['szFull']);
                if (sz) parts.unshift(sz);
                const parentId = asId(curr['hcatParent']);
                curr = parentId !== null ? catRowById.get(parentId) : undefined;
            }
            return parts.length > 0 ? parts.join(' : ') : (categoryNameById.get(hcat) ?? '');
        };

        for (const row of catRows) {
            const hcat = asOptNum(row['hcat']);
            const name = asStr(row['szFull']);
            if (hcat === null || name === null) continue;

            const fullName = resolveFullCategoryPath(hcat);
            categoryFullNameById.set(hcat, fullName);
            categories.push({
                mnyCategoryId: hcat,
                parentCategoryId: asId(row['hcatParent']),
                level: asNum(row['nLevel'], 0),
                name,
                fullName,
                categoryType: resolveCategoryType(hcat),
                isHidden: asBool(row['fHidden'])
            });
        }

        return { categories, categoryNameById, categoryFullNameById };
    }

    private extractLookupTables(
        buffer: Uint8Array,
        header: IMnyHeader,
        tableMap: Map<string, number>
    ): {
        fiNameById: Map<number, string>;
        autoRows: Array<Record<string, MnyCellValue>>;
        lonStepsByAcctId: Map<number, Array<Record<string, MnyCellValue>>>;
        addrById: Map<number, Record<string, MnyCellValue>>;
    } {
        const fiNameById = new Map<number, string>();
        for (const row of this.readOptionalTableRows(buffer, header, tableMap.get('FI'))) {
            const hfi = asOptNum(row['hfi']);
            const szFull = asStr(row['szFull'])?.trim();
            if (hfi !== null && szFull) {
                fiNameById.set(hfi, szFull);
            }
        }
        const autoRows = this.readOptionalTableRows(buffer, header, tableMap.get('AUTO'));

        const lonStepsByAcctId = new Map<number, Array<Record<string, MnyCellValue>>>();
        for (const row of this.readOptionalTableRows(buffer, header, tableMap.get('LON_STEP'))) {
            const hacctLoan = asId(row['hacctLoan']);
            if (hacctLoan !== null) {
                const list = lonStepsByAcctId.get(hacctLoan) ?? [];
                list.push(row);
                lonStepsByAcctId.set(hacctLoan, list);
            }
        }

        const addrById = new Map<number, Record<string, MnyCellValue>>();
        for (const row of this.readOptionalTableRows(buffer, header, tableMap.get('ADDR'))) {
            const haddr = asOptNum(row['haddr']);
            if (haddr !== null) {
                addrById.set(haddr, row);
            }
        }

        return { fiNameById, autoRows, lonStepsByAcctId, addrById };
    }

    private extractAccounts(
        buffer: Uint8Array,
        header: IMnyHeader,
        acctPage: number | undefined,
        fieldKey16: Uint8Array | null,
        categoryNameById: Map<number, string>,
        categoryFullNameById: Map<number, string>,
        fiNameById: Map<number, string>,
        autoRows: Array<Record<string, MnyCellValue>>,
        lonStepsByAcctId = new Map<number, Array<Record<string, MnyCellValue>>>()
    ): {
        accounts: Array<IMnyAccount>;
        accountNameById: Map<number, string>;
    } {
        const accounts: Array<IMnyAccount> = [];
        const accountNameById = new Map<number, string>();
        const acctRows = this.readOptionalTableRows(buffer, header, acctPage, fieldKey16, 'ACCT');
        if (acctRows.length === 0) {
            return { accounts, accountNameById };
        }

        const acctRowById = new Map<number, Record<string, MnyCellValue>>();
        for (const row of acctRows) {
            const hacct = asOptNum(row['hacct']);
            if (hacct !== null) {
                acctRowById.set(hacct, row);
            }
        }

        for (const row of acctRows) {
            const hacct = asOptNum(row['hacct']);
            const name = asStr(row['szFull']);
            if (hacct === null || name === null) continue;

            const mnyType = asNum(row['at'], MnyAccountType.BankOrCash);
            const hfi = asId(row['hfi']);
            const mappedType = this.mapAccountType(
                mnyType,
                name,
                row,
                categoryFullNameById,
                acctRowById,
                autoRows
            );

            const creditCardDetails =
                mappedType === AccountType.Credit
                    ? this.extractCreditCardDetails(hacct, row)
                    : undefined;

            const loanDetails =
                mappedType === AccountType.Mortgage ||
                mappedType === AccountType.AutoLoan ||
                mappedType === AccountType.PersonalLoan
                    ? this.extractLoanDetails(
                          name,
                          mappedType,
                          row,
                          categoryNameById,
                          acctRowById,
                          autoRows,
                          lonStepsByAcctId.get(hacct)
                      )
                    : undefined;

            accountNameById.set(hacct, name);
            accounts.push({
                mnyAccountId: hacct,
                name,
                abbreviation: asStr(row['szAbbrev']) ?? asStr(row['szAls']),
                mnyType,
                mappedType,
                openingBalance: asNum(row['amtOpen'], 0),
                accountNumber: asStr(row['mNum']),
                isClosed: asBool(row['fClosed']),
                isFavorite: asBool(row['fFavorite']),
                institutionName: hfi !== null ? (fiNameById.get(hfi) ?? null) : null,
                openingDate: asStr(row['dtOpen']) as ISODateString | null,
                notes: asStr(row['mComment']),
                isTaxRelated: asBool(row['fTaxRel']),
                linkedMnyAccountId: asId(row['hacctRel']),
                ...(creditCardDetails ? { creditCardDetails } : {}),
                ...(loanDetails ? { loanDetails } : {})
            });
        }

        return { accounts, accountNameById };
    }

    private extractPayees(
        buffer: Uint8Array,
        header: IMnyHeader,
        payPage: number | undefined,
        addrById = new Map<number, Record<string, MnyCellValue>>()
    ): {
        payees: Array<IMnyPayee>;
        payeeNameById: Map<number, string>;
        resolveCanonicalPayeeId: (hpay: number) => number;
        recordPayeeAccountUsage: (hpay: number, hacct: number) => void;
        finalizePayeeUsage: (accountNameById: Map<number, string>) => void;
    } {
        const payees: Array<IMnyPayee> = [];
        const payeeNameById = new Map<number, string>();
        const payeeParentById = new Map<number, number>();
        const payeeHiddenById = new Map<number, boolean>();
        const accountIdsByPayeeId = new Map<number, Set<number>>();
        const txCountByPayeeId = new Map<number, number>();

        for (const row of this.readOptionalTableRows(buffer, header, payPage)) {
            const hpay = asOptNum(row['hpay']);
            const name = asStr(row['szFull']);
            if (hpay === null || name === null) continue;

            const rawParent = asId(row['hpayParent']);
            const parentPayeeId = rawParent !== hpay ? rawParent : null;
            const isHidden = asBool(row['fHidden']);
            const haddr = asId(row['haddr']);
            const addrRow = haddr !== null ? addrById.get(haddr) : undefined;
            const address = asStr(addrRow?.['szStreet'])?.trim() || null;
            const city = asStr(addrRow?.['szCity'])?.trim() || null;
            const state = asStr(addrRow?.['szState'])?.trim() || null;
            const zipCode = asStr(addrRow?.['szZip'])?.trim() || null;
            const phone = asStr(addrRow?.['szPhone'])?.trim() || null;
            const notes = asStr(row['mComment'])?.trim() || null;

            payeeNameById.set(hpay, name);
            if (parentPayeeId !== null) {
                payeeParentById.set(hpay, parentPayeeId);
            }
            payeeHiddenById.set(hpay, isHidden);
            payees.push({
                mnyPayeeId: hpay,
                name,
                parentPayeeId,
                isHidden,
                accountIds: [],
                accountNames: [],
                transactionCount: 0,
                ...(address ? { address } : {}),
                ...(city ? { city } : {}),
                ...(state ? { state } : {}),
                ...(zipCode ? { zipCode } : {}),
                ...(phone ? { phone } : {}),
                ...(notes ? { notes } : {})
            });
        }

        const resolveCanonicalPayeeId = (hpay: number): number => {
            let curr = hpay;
            const seen = new Set<number>();
            while (
                payeeHiddenById.get(curr) === true &&
                payeeParentById.has(curr) &&
                !seen.has(curr)
            ) {
                seen.add(curr);
                const parent = payeeParentById.get(curr);
                if (parent !== undefined && payeeNameById.has(parent)) {
                    curr = parent;
                } else {
                    break;
                }
            }
            return curr;
        };

        const recordPayeeAccountUsage = (hpay: number, hacct: number): void => {
            if (hacct < 0) return;
            const resolved = resolveCanonicalPayeeId(hpay);
            for (const pid of new Set<number>([hpay, resolved])) {
                let accts = accountIdsByPayeeId.get(pid);
                if (!accts) {
                    accts = new Set<number>();
                    accountIdsByPayeeId.set(pid, accts);
                }
                accts.add(hacct);
                txCountByPayeeId.set(pid, (txCountByPayeeId.get(pid) ?? 0) + 1);
            }
        };

        const finalizePayeeUsage = (accountNameById: Map<number, string>): void => {
            for (const p of payees) {
                const accts = accountIdsByPayeeId.get(p.mnyPayeeId);
                if (accts && accts.size > 0) {
                    const sortedAcctIds = Array.from(accts).sort((a, b) => a - b);
                    p.accountIds = sortedAcctIds;
                    p.accountNames = sortedAcctIds
                        .map(id => accountNameById.get(id))
                        .filter((n): n is string => Boolean(n));
                }
                p.transactionCount = txCountByPayeeId.get(p.mnyPayeeId) ?? 0;
            }
        };

        return {
            payees,
            payeeNameById,
            resolveCanonicalPayeeId,
            recordPayeeAccountUsage,
            finalizePayeeUsage
        };
    }

    private extractTransactionsAndSchedules(
        buffer: Uint8Array,
        header: IMnyHeader,
        tableMap: Map<string, number>,
        accountNameById: Map<number, string>,
        categoryNameById: Map<number, string>,
        payeeCtx: {
            payeeNameById: Map<number, string>;
            resolveCanonicalPayeeId: (hpay: number) => number;
            recordPayeeAccountUsage: (hpay: number, hacct: number) => void;
        }
    ): {
        transactions: Array<IMnyTransaction>;
        recurringSchedules: Array<IMnyRecurringSchedule>;
    } {
        const transactions: Array<IMnyTransaction> = [];
        const trnRows = this.readOptionalTableRows(buffer, header, tableMap.get('TRN'));
        if (trnRows.length === 0) {
            return { transactions, recurringSchedules: [] };
        }

        const splitRows = this.readOptionalTableRows(buffer, header, tableMap.get('TRN_SPLIT'));
        const xferRows = this.readOptionalTableRows(buffer, header, tableMap.get('TRN_XFER'));

        const trnById = new Map<number, Record<string, MnyCellValue>>();
        for (const row of trnRows) {
            const htrn = asOptNum(row['htrn']);
            if (htrn !== null) {
                trnById.set(htrn, row);
            }
        }

        const xferTargetAccountByTrnId = new Map<number, number>();
        for (const xRow of xferRows) {
            const htrnFrom = asOptNum(xRow['htrnFrom']);
            if (htrnFrom === null) continue;
            const hacctLink = asId(xRow['hacctLink']);
            if (hacctLink !== null) {
                xferTargetAccountByTrnId.set(htrnFrom, hacctLink);
            } else {
                const htrnLink = asOptNum(xRow['htrnLink']);
                const linkedHacct =
                    htrnLink !== null ? asId(trnById.get(htrnLink)?.['hacct']) : null;
                if (linkedHacct !== null) {
                    xferTargetAccountByTrnId.set(htrnFrom, linkedHacct);
                }
            }
        }

        const splitChildIds = new Set<number>();
        const splitsByParent = new Map<number, Array<ISplitLink>>();
        for (const sRow of splitRows) {
            const htrnParent = asOptNum(sRow['htrnParent']);
            const htrnChild = asOptNum(sRow['htrn']);
            if (htrnParent !== null && htrnChild !== null) {
                splitChildIds.add(htrnChild);
                const list = splitsByParent.get(htrnParent) ?? [];
                list.push({ iSplit: asNum(sRow['iSplit'], 0), htrn: htrnChild });
                splitsByParent.set(htrnParent, list);
            }
        }

        for (const row of trnRows) {
            const htrn = asOptNum(row['htrn']);
            const hacct = asOptNum(row['hacct']);
            const dt = asStr(row['dt']);
            const amt = asOptNum(row['amt']);

            if (htrn === null || hacct === null || dt === null || amt === null) continue;
            // Skip child split rows and unposted recurring bill template stems (instt === 0)
            if (splitChildIds.has(htrn) || row['instt'] === 0) continue;

            const lHpay = asId(row['lHpay']);
            if (lHpay !== null) {
                payeeCtx.recordPayeeAccountUsage(lHpay, hacct);
            }
            const resolvedPayeeId = lHpay !== null ? payeeCtx.resolveCanonicalPayeeId(lHpay) : null;
            const rawPayee =
                resolvedPayeeId !== null
                    ? (payeeCtx.payeeNameById.get(resolvedPayeeId) ??
                      (lHpay !== null ? payeeCtx.payeeNameById.get(lHpay) : undefined))
                    : undefined;

            const hcat = asOptNum(row['hcat']);
            const mnyCategoryId = hcat !== null && categoryNameById.has(hcat) ? hcat : null;
            const category =
                mnyCategoryId !== null ? (categoryNameById.get(mnyCategoryId) ?? null) : null;
            const memo = asStr(row['mMemo']) ?? '';

            const { splits, linkedMnyAccountId } = this.resolveSplitsAndTransferLink(
                htrn,
                hacct,
                amt,
                mnyCategoryId,
                category,
                memo,
                row,
                trnById,
                splitsByParent,
                xferTargetAccountByTrnId,
                categoryNameById
            );

            const linkedAcctName =
                linkedMnyAccountId !== null
                    ? (accountNameById.get(linkedMnyAccountId) ?? null)
                    : null;
            const payee = rawPayee ?? (linkedAcctName ? `Transfer: ${linkedAcctName}` : 'Unknown');

            transactions.push({
                mnyTransactionId: htrn,
                mnyAccountId: hacct,
                accountName: accountNameById.get(hacct) ?? null,
                linkedMnyAccountId,
                date: dt,
                amount: amt,
                payee,
                memo,
                checkNumber: asStr(row['szNum']),
                category,
                mnyCategoryId,
                splits,
                importHash: generateImportHash(dt, amt, payee),
                clearedStatus: this.mapClearedState(asNum(row['cs'], MnyClearedState.Uncleared))
            });
        }

        const billRows = this.readOptionalTableRows(buffer, header, tableMap.get('BILL'));
        const recurringSchedules =
            billRows.length > 0
                ? this.extractRecurringSchedules(
                      billRows,
                      trnById,
                      splitsByParent,
                      xferTargetAccountByTrnId,
                      accountNameById,
                      categoryNameById,
                      payeeCtx
                  )
                : [];

        return { transactions, recurringSchedules };
    }

    /**
     * Shared split and transfer-account resolver used by both ledger transactions (`TRN`)
     * and recurring bill templates (`BILL`), enforcing `Sum(splits) === amt`.
     */
    private resolveSplitsAndTransferLink(
        htrn: number,
        hacct: number,
        amt: Cents,
        mnyCategoryId: number | null,
        category: string | null,
        memo: string,
        row: Record<string, MnyCellValue>,
        trnById: Map<number, Record<string, MnyCellValue>>,
        splitsByParent: Map<number, Array<ISplitLink>>,
        xferTargetAccountByTrnId: Map<number, number>,
        categoryNameById: Map<number, string>
    ): {
        splits: Array<IParsedSplit>;
        linkedMnyAccountId: number | null;
    } {
        const readRowLinkAcct = (
            r: Record<string, MnyCellValue>,
            rowTrnId: number
        ): number | null => {
            const direct = asId(r['hacctLink']);
            if (direct !== null && direct !== hacct) return direct;
            return xferTargetAccountByTrnId.get(rowTrnId) ?? null;
        };

        let linkedMnyAccountId: number | null = readRowLinkAcct(row, htrn);
        const childLinks = [...(splitsByParent.get(htrn) ?? [])].sort(
            (a, b) => a.iSplit - b.iSplit
        );
        const splits: Array<IParsedSplit> = [];

        if (childLinks.length > 0) {
            for (const link of childLinks) {
                const childTrn = trnById.get(link.htrn);
                if (!childTrn) continue;
                if (linkedMnyAccountId === null) {
                    linkedMnyAccountId = readRowLinkAcct(childTrn, link.htrn);
                }
                const childHcat = asOptNum(childTrn['hcat']);
                const childCatId =
                    childHcat !== null && categoryNameById.has(childHcat) ? childHcat : null;
                splits.push({
                    category:
                        childCatId !== null ? (categoryNameById.get(childCatId) ?? null) : null,
                    mnyCategoryId: childCatId,
                    amount: asNum(childTrn['amt'], 0),
                    memo: asStr(childTrn['mMemo'])
                });
            }
            const sumSplits = splits.reduce((acc, s) => acc + s.amount, 0);
            if (sumSplits !== amt) {
                splits.push({
                    category: null,
                    mnyCategoryId: null,
                    amount: amt - sumSplits,
                    memo: 'Auto-balancing adjustment'
                });
            }
        } else {
            splits.push({
                category,
                mnyCategoryId,
                amount: amt,
                memo: memo.length > 0 ? memo : null
            });
        }

        return { splits, linkedMnyAccountId };
    }

    /**
     * Extracts active recurring scheduled bills, deposits, and transfers from `BILL` and `TRN`.
     */
    private extractRecurringSchedules(
        billRows: Array<Record<string, MnyCellValue>>,
        trnById: Map<number, Record<string, MnyCellValue>>,
        splitsByParent: Map<number, Array<ISplitLink>>,
        xferTargetAccountByTrnId: Map<number, number>,
        accountNameById: Map<number, string>,
        categoryNameById: Map<number, string>,
        payeeCtx: {
            payeeNameById: Map<number, string>;
            resolveCanonicalPayeeId: (hpay: number) => number;
            recordPayeeAccountUsage: (hpay: number, hacct: number) => void;
        }
    ): Array<IMnyRecurringSchedule> {
        const billsByHead = new Map<number, Array<Record<string, MnyCellValue>>>();
        for (const row of billRows) {
            const headId = asId(row['hbillHead']);
            if (headId === null) continue;
            const list = billsByHead.get(headId);
            if (list) list.push(row);
            else billsByHead.set(headId, [row]);
        }

        const schedules: Array<IMnyRecurringSchedule> = [];

        for (const [headId, group] of billsByHead.entries()) {
            group.sort((a, b) => {
                const instDiff = asNum(a['iinst'], 0) - asNum(b['iinst'], 0);
                return instDiff !== 0 ? instDiff : asNum(a['hbill'], 0) - asNum(b['hbill'], 0);
            });

            const headRow = group.find(r => r['hbill'] === headId) ?? group[0];
            const activeRow = group[group.length - 1];
            if (!headRow || !activeRow) continue;

            const cInstMax = asNum(headRow['cInstMax'], -1);
            const nextUnpaid = asNum(headRow['iinstNextUnpaid'], 0);
            if (cInstMax !== -1 && nextUnpaid >= cInstMax) continue;

            const lHtrn = asOptNum(activeRow['lHtrn']) ?? asOptNum(headRow['lHtrn']) ?? -1;
            const trn = trnById.get(lHtrn);
            const hacct = asId(trn?.['hacct']);
            if (!trn || hacct === null) continue;

            const amt: Cents = asNum(trn['amt'], 0);
            const lHpay = asId(trn['lHpay']);
            if (lHpay !== null) {
                payeeCtx.recordPayeeAccountUsage(lHpay, hacct);
            }
            const resolvedPayeeId = lHpay !== null ? payeeCtx.resolveCanonicalPayeeId(lHpay) : null;

            const hcat = asOptNum(trn['hcat']);
            const mnyCategoryId = hcat !== null && categoryNameById.has(hcat) ? hcat : null;
            const category =
                mnyCategoryId !== null ? (categoryNameById.get(mnyCategoryId) ?? null) : null;
            const memo = asStr(trn['mMemo']) ?? '';

            const { splits, linkedMnyAccountId } = this.resolveSplitsAndTransferLink(
                lHtrn,
                hacct,
                amt,
                mnyCategoryId,
                category,
                memo,
                trn,
                trnById,
                splitsByParent,
                xferTargetAccountByTrnId,
                categoryNameById
            );

            const linkedAcctName =
                linkedMnyAccountId !== null
                    ? (accountNameById.get(linkedMnyAccountId) ?? null)
                    : null;
            const rawPayee =
                resolvedPayeeId !== null
                    ? (payeeCtx.payeeNameById.get(resolvedPayeeId) ??
                      (lHpay !== null ? payeeCtx.payeeNameById.get(lHpay) : undefined))
                    : undefined;
            const payee =
                rawPayee ??
                (linkedAcctName
                    ? `<Transfer ${amt < 0 ? 'To' : 'From'} : ${linkedAcctName}>`
                    : 'Scheduled Transaction');

            const frq = asOptNum(activeRow['frq']) ?? asNum(headRow['frq'], 3);
            const cFrqInst = asOptNum(activeRow['cFrqInst']) ?? asNum(headRow['cFrqInst'], 1);
            const { frequency, frequencyLabel } = this.mapBillFrequency(frq, cFrqInst);

            const grfstem = asNum(trn['grfstem'], 2052);
            const isEstimatedAmount = (grfstem & 2048) === 0;
            const { paymentMethod, paymentMethodLabel } = this.mapBillPaymentMethod(grfstem, amt);

            const startDate = (asStr(headRow['dt']) ??
                asStr(activeRow['dt']) ??
                '2026-01-01') as ISODateString;
            const activeDt = (asStr(activeRow['dt']) ?? startDate) as ISODateString;
            const stepsToAdvance = Math.max(0, nextUnpaid - asNum(activeRow['iinst'], 0));
            const nextDueDate = this.advanceBillDate(activeDt, frq, cFrqInst, stepsToAdvance);

            const rawDtMax = asStr(activeRow['dtMax']) ?? asStr(headRow['dtMax']);
            const endDate =
                rawDtMax && rawDtMax !== '2200-12-31' ? (rawDtMax as ISODateString) : null;

            schedules.push({
                mnyBillHeadId: headId,
                mnyBillId: asNum(activeRow['hbill'], headId),
                mnyTransactionId: lHtrn,
                mnyAccountId: hacct,
                accountName: accountNameById.get(hacct) ?? null,
                linkedMnyAccountId,
                payee,
                amount: amt,
                isEstimatedAmount,
                type: amt > 0 ? ScheduleType.Deposit : ScheduleType.Debit,
                frequency,
                frequencyLabel,
                paymentMethod,
                paymentMethodLabel,
                startDate,
                endDate,
                nextDueDate,
                memo,
                category,
                mnyCategoryId,
                splits
            });
        }

        schedules.sort((a, b) => {
            const dtCmp = a.nextDueDate.localeCompare(b.nextDueDate);
            return dtCmp !== 0
                ? dtCmp
                : a.payee.localeCompare(b.payee, undefined, { sensitivity: 'base' });
        });

        return schedules;
    }

    private mapBillFrequency(
        frq: number,
        cFrqInst: number
    ): { frequency: Frequency; frequencyLabel: string } {
        if (frq === 1) return { frequency: Frequency.Daily, frequencyLabel: 'Daily' };
        if (frq === 2) {
            if (cFrqInst <= 0.26)
                return { frequency: Frequency.EveryFourWeeks, frequencyLabel: 'Every four weeks' };
            if (cFrqInst <= 0.55)
                return { frequency: Frequency.Biweekly, frequencyLabel: 'Every other week' };
            return { frequency: Frequency.Weekly, frequencyLabel: 'Weekly' };
        }
        if (frq === 3) {
            if (cFrqInst >= 1.9)
                return { frequency: Frequency.TwiceAMonth, frequencyLabel: 'Twice a month' };
            if (cFrqInst <= 0.26)
                return { frequency: Frequency.Quarterly, frequencyLabel: 'Quarterly' };
            if (cFrqInst <= 0.55)
                return { frequency: Frequency.Bimonthly, frequencyLabel: 'Every other month' };
            return { frequency: Frequency.Monthly, frequencyLabel: 'Monthly' };
        }
        if (frq === 4) return { frequency: Frequency.Quarterly, frequencyLabel: 'Quarterly' };
        if (frq === 5) return { frequency: Frequency.Yearly, frequencyLabel: 'Yearly' };
        return { frequency: Frequency.Monthly, frequencyLabel: 'Monthly' };
    }

    private mapBillPaymentMethod(
        grfstem: number,
        amt: number
    ): { paymentMethod: PaymentMethod; paymentMethodLabel: string } {
        const lowByte = grfstem & 0xff;
        if (lowByte === 0x80) {
            return { paymentMethod: PaymentMethod.Other, paymentMethodLabel: 'Other' };
        }
        if ((lowByte & 0x07) === 2) {
            return { paymentMethod: PaymentMethod.WriteCheck, paymentMethodLabel: 'Write Check' };
        }
        return amt > 0
            ? { paymentMethod: PaymentMethod.DirectDeposit, paymentMethodLabel: 'Direct Deposit' }
            : { paymentMethod: PaymentMethod.DirectDebit, paymentMethodLabel: 'Direct Debit' };
    }

    private advanceBillDate(
        isoDate: ISODateString,
        frq: number,
        cFrqInst: number,
        steps: number
    ): ISODateString {
        if (steps <= 0) return isoDate;
        const parts = isoDate.split('-').map(Number);
        const y0 = parts[0] ?? 2026;
        const m0 = (parts[1] ?? 1) - 1;
        const d0 = parts[2] ?? 1;

        if (frq === 1) {
            return new Date(Date.UTC(y0, m0, d0 + steps))
                .toISOString()
                .slice(0, 10) as ISODateString;
        }
        if (frq === 2) {
            const daysPerStep = cFrqInst <= 0.26 ? 28 : cFrqInst <= 0.55 ? 14 : 7;
            return new Date(Date.UTC(y0, m0, d0 + steps * daysPerStep))
                .toISOString()
                .slice(0, 10) as ISODateString;
        }
        if (frq === 3 && cFrqInst >= 1.9) {
            let year = y0;
            let month = m0;
            let isMidMonth = d0 <= 16;
            for (let i = 0; i < steps; i++) {
                if (isMidMonth) {
                    isMidMonth = false;
                } else {
                    isMidMonth = true;
                    month++;
                    if (month >= 12) {
                        month = 0;
                        year++;
                    }
                }
            }
            const day = isMidMonth ? 15 : new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
            return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10) as ISODateString;
        }

        const monthsPerStep =
            frq === 3
                ? cFrqInst <= 0.26
                    ? 3
                    : cFrqInst <= 0.55
                      ? 2
                      : 1
                : frq === 4
                  ? 3
                  : frq === 5
                    ? 12
                    : 1;

        const totalMonths = m0 + steps * monthsPerStep;
        const targetYear = y0 + Math.floor(totalMonths / 12);
        const targetMonth = ((totalMonths % 12) + 12) % 12;
        const maxDayInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
        const isOrigEndOfMonth = d0 >= new Date(Date.UTC(y0, m0 + 1, 0)).getUTCDate();
        const targetDay = isOrigEndOfMonth
            ? maxDayInTargetMonth
            : Math.min(d0, maxDayInTargetMonth);
        return new Date(Date.UTC(targetYear, targetMonth, targetDay))
            .toISOString()
            .slice(0, 10) as ISODateString;
    }

    /**
     * Derives the 16-byte MSOFD field-level encryption key from `CLI_DAT` (`idData === 0x03f2`)
     * using schema-driven column definitions (`msofd.dll` at `0x2ec021e0`).
     */
    private deriveFieldKey16(
        buffer: Uint8Array,
        header: IMnyHeader,
        cliDatPage: number | null
    ): Uint8Array | null {
        if (cliDatPage === null) return null;

        try {
            const cliTdef: IMnyTableDef = this.readTableDef(buffer, cliDatPage, header);
            const idCol = cliTdef.columns.find(c => c.name === 'idData');
            const valCol = cliTdef.columns.find(c => c.name === 'rgbVal');
            if (!idCol || !valCol) return null;

            for (const pIdx of this.getDataPagesForTdef(buffer, cliTdef.startPage, header)) {
                const page: Uint8Array = this.getPage(buffer, pIdx, header);
                for (const rowBuf of this.extractActiveRowSlices(page)) {
                    const idSlice = this.extractRawColumnSlice(rowBuf, cliTdef, idCol);
                    if (!idSlice || idSlice.byteLength < 4) continue;
                    const idData = new DataView(
                        idSlice.buffer,
                        idSlice.byteOffset,
                        idSlice.byteLength
                    ).getInt32(0, true);
                    if (idData !== 0x03f2) continue;

                    const valSlice = this.extractRawColumnSlice(rowBuf, cliTdef, valCol);
                    if (!valSlice) continue;
                    const cli3f2 = this.readRawMemoBytes(buffer, valSlice, header);
                    if (!cli3f2 || cli3f2.byteLength < 10) return null;

                    const cliView = new DataView(
                        cli3f2.buffer,
                        cli3f2.byteOffset,
                        cli3f2.byteLength
                    );
                    const tableEntry16 = MSOFD_FIELD_KEY_TABLE[cliView.getUint32(0, true) & 0x0f];
                    if (!tableEntry16) return null;

                    let strEnd = 8;
                    while (
                        strEnd + 1 < cli3f2.byteLength &&
                        cliView.getUint16(strEnd, true) !== 0
                    ) {
                        strEnd += 2;
                    }
                    const wlen = (strEnd - 8) >> 1;
                    const includePwd =
                        (header.cryptoFlags & MnyEncryptionFlag.IncludePasswordInFieldKey) !== 0;
                    const hashInput = new Uint8Array(wlen + 16 + (includePwd ? 40 : 0));
                    hashInput.set(tableEntry16, 0);
                    hashInput.set(cli3f2.subarray(8, 8 + wlen), 15);
                    if (includePwd) {
                        hashInput.set(header.passwordBuffer, 15 + wlen);
                    }

                    const fieldDigest = header.isSha1
                        ? sha1Digest(hashInput)
                        : md5Digest(hashInput);
                    return fieldDigest.subarray(0, 16);
                }
            }
        } catch {
            return null;
        }
        return null;
    }

    /**
     * Extracts the raw byte slice of a fixed or variable column from a row buffer.
     */
    private extractRawColumnSlice(
        rowBuf: Uint8Array,
        tdef: IMnyTableDef,
        col: IMnyColumnDef
    ): Uint8Array | null {
        if (rowBuf.byteLength < 2) return null;
        const view = new DataView(rowBuf.buffer, rowBuf.byteOffset, rowBuf.byteLength);
        const numColsInRow = view.getUint16(0, true) & 0x7fff;
        const nullBitmapLen = Math.ceil(numColsInRow / 8);
        if (nullBitmapLen > rowBuf.byteLength) return null;

        const nullBitmap = rowBuf.subarray(rowBuf.byteLength - nullBitmapLen);
        const byteIdx = col.colId >> 3;
        const bitSet =
            byteIdx < nullBitmap.byteLength
                ? ((nullBitmap[byteIdx] ?? 0) & (1 << (col.colId & 7))) !== 0
                : false;
        if (!bitSet) return null;

        if (col.isFixed) {
            const start = 2 + col.fixedOffset;
            const end = start + col.maxLength;
            return end <= rowBuf.byteLength ? rowBuf.subarray(start, end) : null;
        }

        if (tdef.numVarCols > 0 && rowBuf.byteLength >= nullBitmapLen + 2) {
            const varCountOffset = rowBuf.byteLength - nullBitmapLen - 2;
            const numVarColsInRow = view.getUint16(varCountOffset, true);
            if (col.varColNum < numVarColsInRow && varCountOffset >= (col.varColNum + 2) * 2) {
                const startOff = varCountOffset - (col.varColNum + 1) * 2;
                const endOff = varCountOffset - (col.varColNum + 2) * 2;
                const start = view.getUint16(startOff, true) & 0x1fff;
                const end = view.getUint16(endOff, true) & 0x1fff;
                if (start <= end && end <= rowBuf.byteLength) {
                    return rowBuf.subarray(start, end);
                }
            }
        }
        return null;
    }

    /**
     * Parses a single row record from a `DATA` or overflow page.
     */
    private parseRow(
        buffer: Uint8Array,
        tdef: IMnyTableDef,
        rowBuf: Uint8Array,
        header: IMnyHeader,
        fieldKey16: Uint8Array | null,
        tableName: string
    ): Record<string, MnyCellValue> {
        const obj: Record<string, MnyCellValue> = {};
        if (rowBuf.byteLength < 2) return obj;

        const view = new DataView(rowBuf.buffer, rowBuf.byteOffset, rowBuf.byteLength);
        const numColsInRow = view.getUint16(0, true) & 0x7fff;
        const nullBitmapLen = Math.ceil(numColsInRow / 8);
        if (nullBitmapLen > rowBuf.byteLength) return obj;
        const nullBitmap = rowBuf.subarray(rowBuf.byteLength - nullBitmapLen);

        for (const col of tdef.columns) {
            if (col.colType === MnyColumnType.Boolean) {
                const byteIdx = col.colId >> 3;
                obj[col.name] =
                    byteIdx < nullBitmap.byteLength
                        ? ((nullBitmap[byteIdx] ?? 0) & (1 << (col.colId & 7))) !== 0
                        : false;
                continue;
            }
            const slice = this.extractRawColumnSlice(rowBuf, tdef, col);
            obj[col.name] = slice
                ? this.decodeColumnValue(buffer, col, slice, header, fieldKey16, tableName)
                : null;
        }

        return obj;
    }

    /**
     * Decodes a single cell's byte slice according to its `MnyColumnType`.
     */
    private decodeColumnValue(
        buffer: Uint8Array,
        col: IMnyColumnDef,
        valBuf: Uint8Array,
        header: IMnyHeader,
        fieldKey16: Uint8Array | null,
        tableName: string
    ): MnyCellValue {
        if (valBuf.byteLength === 0) return null;
        const view: DataView = new DataView(valBuf.buffer, valBuf.byteOffset, valBuf.byteLength);

        switch (col.colType) {
            case MnyColumnType.Byte:
                return valBuf[0] ?? 0;
            case MnyColumnType.Int16:
                return valBuf.byteLength >= 2 ? view.getInt16(0, true) : null;
            case MnyColumnType.Int32:
                return valBuf.byteLength >= 4 ? view.getInt32(0, true) : null;
            case MnyColumnType.Currency: {
                if (valBuf.byteLength < 8) return null;
                return Number(view.getBigInt64(0, true) / 100n);
            }
            case MnyColumnType.Single:
                return valBuf.byteLength >= 4 ? view.getFloat32(0, true) : null;
            case MnyColumnType.Double:
                return valBuf.byteLength >= 8 ? view.getFloat64(0, true) : null;
            case MnyColumnType.DateTime: {
                if (valBuf.byteLength < 8) return null;
                const days: number = view.getFloat64(0, true);
                if (!Number.isFinite(days) || days <= 0 || days >= UNSET_OLE_DATE_SENTINEL) {
                    return null;
                }
                const unixMs: number = Math.round((days - OLE_EPOCH_UNIX_DAYS) * MS_PER_DAY);
                return new Date(unixMs).toISOString().slice(0, 10);
            }
            case MnyColumnType.Text:
                return this.decodeText(valBuf);
            case MnyColumnType.Memo: {
                const rawMemo: Uint8Array | null = this.readRawMemoBytes(buffer, valBuf, header);
                if (!rawMemo) return null;

                const colSalt: number | null = this.getEncryptedColumnSalt(tableName, col.colId);
                if (colSalt !== null && fieldKey16 !== null) {
                    const colKey20: Uint8Array = new Uint8Array(20);
                    colKey20.set(fieldKey16, 0);
                    new DataView(colKey20.buffer).setUint32(16, colSalt, true);
                    const candidate: string = this.decodeUtf16LE(rc4Transform(colKey20, rawMemo))
                        .replace(/\0+$/, '')
                        .trim();
                    if (candidate.length > 0 && /^[\x20-\x7E]+$/.test(candidate)) {
                        return candidate;
                    }
                }
                const plainText: string = this.decodeText(rawMemo).trim();
                if (colSalt !== null && !/^[\x20-\x7E]*$/.test(plainText)) {
                    return null;
                }
                return plainText;
            }
            case MnyColumnType.Guid:
                return Array.from(valBuf)
                    .map((b: number) => b.toString(16).padStart(2, '0'))
                    .join('');
            default:
                return null;
        }
    }

    /**
     * Resolves an inline or LVAL-referenced Memo descriptor into raw payload bytes.
     */
    private readRawMemoBytes(
        buffer: Uint8Array,
        valBuf: Uint8Array,
        header: IMnyHeader
    ): Uint8Array | null {
        if (valBuf.byteLength < 12) return null;
        const view: DataView = new DataView(valBuf.buffer, valBuf.byteOffset, valBuf.byteLength);
        const lenAndFlags: number = view.getUint32(0, true);
        const memoLen: number = lenAndFlags & 0x3fffffff;
        const memoFlags: number = lenAndFlags >>> 30;

        if (memoFlags === 0x02) {
            return valBuf.subarray(12, Math.min(12 + memoLen, valBuf.byteLength));
        }
        if (memoFlags === 0x01) {
            const lvalPtr: number = view.getUint32(4, true);
            const lvalPageIdx: number = lvalPtr >>> 8;
            const lvalRow: number = lvalPtr & 0xff;
            const numPages: number = Math.floor(buffer.byteLength / PAGE_SIZE);
            if (lvalPageIdx <= 0 || lvalPageIdx >= numPages) return null;

            const lvalPage: Uint8Array = this.getPage(buffer, lvalPageIdx, header);
            const lpView: DataView = new DataView(
                lvalPage.buffer,
                lvalPage.byteOffset,
                lvalPage.byteLength
            );
            if (0x0e + (lvalRow + 1) * 2 > lvalPage.byteLength) return null;
            const rStart: number = lpView.getUint16(0x0e + lvalRow * 2, true) & 0x1fff;
            const rEnd: number =
                lvalRow === 0
                    ? PAGE_SIZE
                    : lpView.getUint16(0x0e + (lvalRow - 1) * 2, true) & 0x1fff;
            return rStart < rEnd && rEnd <= lvalPage.byteLength
                ? lvalPage.subarray(rStart, rEnd)
                : null;
        }
        return null;
    }

    private getEncryptedColumnSalt(tableName: string, colId: number): number | null {
        return tableName === 'ACCT' && colId === 28 ? 0x0a : null;
    }

    private decodeText(buf: Uint8Array): string {
        if (buf.byteLength === 0) return '';
        if (buf.byteLength >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
            let out: string = '';
            let compressed: boolean = true;
            let i: number = 2;
            while (i < buf.byteLength) {
                const byteVal: number = buf[i] ?? 0;
                if (byteVal === 0x00) {
                    compressed = !compressed;
                    i++;
                    continue;
                }
                if (compressed) {
                    out += String.fromCharCode(byteVal);
                    i++;
                } else {
                    if (i + 1 < buf.byteLength) {
                        out += String.fromCharCode((buf[i] ?? 0) | ((buf[i + 1] ?? 0) << 8));
                    }
                    i += 2;
                }
            }
            return out.replace(/\0+$/, '');
        }
        return this.decodeUtf16LE(buf).replace(/\0+$/, '');
    }

    private decodeUtf16LE(buf: Uint8Array): string {
        let out: string = '';
        for (let i: number = 0; i + 1 < buf.byteLength; i += 2) {
            out += String.fromCharCode((buf[i] ?? 0) | ((buf[i + 1] ?? 0) << 8));
        }
        return out;
    }

    /**
     * Unwraps and verifies the master key and password buffer using all authentication schemes
     * supported by Microsoft Money (`myisam08.dll` `FUN_0041bf22` and `FUN_0041be67`).
     */
    private verifyAndUnwrapCredentials(
        page0: Uint8Array,
        varOffsetPrimary: number,
        varOffsetRaw: number,
        salt8: Uint8Array,
        salt0: number,
        isSha1: boolean,
        is128Bit: boolean,
        password: string = '',
        username?: string
    ): {
        passwordVerified: boolean;
        keyPrefix: Uint8Array;
        passwordBuffer: Uint8Array;
        detectedMode?: number;
    } {
        const primaryHash = isSha1 ? sha1Digest : md5Digest;
        const hashFns = [primaryHash, isSha1 ? md5Digest : sha1Digest];
        const primaryKeyLen = is128Bit ? 16 : 5;
        const keyLens = [primaryKeyLen, is128Bit ? 5 : 16];

        const defaultBuf = this.encodePasswordBuffer(password, true);
        const defaultKeyPrefix = primaryHash(defaultBuf).subarray(0, primaryKeyLen);

        const candidateOffsets = Array.from(new Set([varOffsetPrimary, varOffsetRaw, 0]));
        const trimmedPwd = password.trim();
        const pwdCandidates: Array<{ str: string; toUpper: boolean }> =
            password.length > 0
                ? [
                      { str: password, toUpper: true },
                      { str: password, toUpper: false },
                      ...(trimmedPwd !== password
                          ? [
                                { str: trimmedPwd, toUpper: true },
                                { str: trimmedPwd, toUpper: false }
                            ]
                          : [])
                  ]
                : [{ str: '', toUpper: false }];

        for (const vOff of candidateOffsets) {
            const checkOffset = 0x2e9 + vOff;
            if (checkOffset + 4 > PAGE_SIZE) continue;
            const checkBytes = page0.subarray(checkOffset, checkOffset + 4);
            const modeByte = 0x2ed + vOff < PAGE_SIZE ? (page0[0x2ed + vOff] ?? 0) : 0;

            const testMasterKey = (candidateKeyPrefix: Uint8Array): boolean => {
                const checkKey = new Uint8Array(candidateKeyPrefix.length + salt8.length);
                checkKey.set(candidateKeyPrefix, 0);
                checkKey.set(salt8, candidateKeyPrefix.length);
                const decryptedCheck = rc4Transform(checkKey, checkBytes);
                return (
                    new DataView(
                        decryptedCheck.buffer,
                        decryptedCheck.byteOffset,
                        decryptedCheck.byteLength
                    ).getUint32(0, true) === salt0
                );
            };

            // Strategy 1: Direct Password Verification (FUN_0041be67)
            for (const cand of pwdCandidates) {
                const candBuf = this.encodePasswordBuffer(cand.str, cand.toUpper);
                for (const hFn of hashFns) {
                    for (const kLen of keyLens) {
                        const candPrefix = hFn(candBuf).subarray(0, kLen);
                        if (testMasterKey(candPrefix)) {
                            return {
                                passwordVerified: true,
                                keyPrefix: candPrefix,
                                passwordBuffer: candBuf,
                                detectedMode: modeByte
                            };
                        }
                    }
                }
            }

            // Strategy 2: Wrapped Key Slots at 0x299 + vOff
            const keyBlockOffset = 0x299 + vOff;
            if (keyBlockOffset + 80 <= PAGE_SIZE) {
                const slot1 = page0.subarray(keyBlockOffset, keyBlockOffset + 40);
                const slot2 = page0.subarray(keyBlockOffset + 40, keyBlockOffset + 80);

                if (slot2.some((b: number) => b !== 0)) {
                    const oflCandidates = [
                        ...pwdCandidates.flatMap(c => [
                            { str: 'OFL\\' + c.str, toUpper: c.toUpper },
                            { str: c.str, toUpper: c.toUpper }
                        ]),
                        ...(password.length === 0 ? [{ str: 'OFL\\', toUpper: false }] : [])
                    ];
                    const unwrapped = this.tryUnwrapKeySlot(
                        slot2,
                        oflCandidates,
                        hashFns,
                        keyLens,
                        salt8,
                        modeByte,
                        testMasterKey
                    );
                    if (unwrapped) return unwrapped;
                }

                if (slot1.some((b: number) => b !== 0)) {
                    const trimmedUser = username?.trim() ?? '';
                    const onlCandidates = [
                        ...pwdCandidates.flatMap(c => [
                            { str: 'ONL\\' + c.str, toUpper: c.toUpper },
                            { str: c.str, toUpper: c.toUpper }
                        ]),
                        ...(trimmedUser.length > 0
                            ? [
                                  { str: 'ONL\\' + trimmedUser, toUpper: true },
                                  { str: 'ONL\\' + trimmedUser, toUpper: false },
                                  { str: 'ONL\\' + trimmedUser + ':' + password, toUpper: true },
                                  { str: 'ONL\\' + trimmedUser + ':' + password, toUpper: false },
                                  { str: trimmedUser, toUpper: true },
                                  { str: trimmedUser, toUpper: false }
                              ]
                            : []),
                        ...(password.length === 0 ? [{ str: 'ONL\\', toUpper: false }] : [])
                    ];
                    const unwrapped = this.tryUnwrapKeySlot(
                        slot1,
                        onlCandidates,
                        hashFns,
                        keyLens,
                        salt8,
                        modeByte,
                        testMasterKey
                    );
                    if (unwrapped) return unwrapped;
                }
            }
        }

        return {
            passwordVerified: false,
            keyPrefix: defaultKeyPrefix,
            passwordBuffer: defaultBuf
        };
    }

    private tryUnwrapKeySlot(
        slotBytes: Uint8Array,
        candidates: Array<{ str: string; toUpper: boolean }>,
        hashFns: Array<(msg: Uint8Array) => Uint8Array>,
        keyLens: Array<number>,
        salt8: Uint8Array,
        modeByte: number,
        testMasterKey: (prefix: Uint8Array) => boolean
    ): {
        passwordVerified: boolean;
        keyPrefix: Uint8Array;
        passwordBuffer: Uint8Array;
        detectedMode: number;
    } | null {
        for (const cand of candidates) {
            const candBuf = this.encodePasswordBuffer(cand.str, cand.toUpper);
            for (const outerHash of hashFns) {
                for (const kLen of keyLens) {
                    const slotPrefix = outerHash(candBuf).subarray(0, kLen);
                    const slotKey = new Uint8Array(slotPrefix.length + salt8.length);
                    slotKey.set(slotPrefix, 0);
                    slotKey.set(salt8, slotPrefix.length);
                    const unwrappedSlot = rc4Transform(slotKey, slotBytes);

                    for (const innerHash of hashFns) {
                        for (const innerKLen of keyLens) {
                            const masterPrefix = innerHash(unwrappedSlot).subarray(0, innerKLen);
                            if (testMasterKey(masterPrefix)) {
                                return {
                                    passwordVerified: true,
                                    keyPrefix: masterPrefix,
                                    passwordBuffer: unwrappedSlot,
                                    detectedMode: modeByte !== 0 ? modeByte : 6
                                };
                            }
                        }
                    }
                }
            }
        }
        return null;
    }

    private encodePasswordBuffer(password: string, toUpper: boolean = true): Uint8Array {
        const buf: Uint8Array = new Uint8Array(40);
        if (password.length === 0) return buf;
        const str: string = toUpper ? password.toUpperCase() : password;
        const maxChars: number = Math.min(str.length, 20);
        for (let i: number = 0; i < maxChars; i++) {
            const code: number = str.charCodeAt(i);
            buf[i * 2] = code & 0xff;
            buf[i * 2 + 1] = (code >>> 8) & 0xff;
        }
        return buf;
    }

    /**
     * Maps `ACCT.at`, interest category path (`hcatInterest`), linked asset account (`hacctRel`),
     * `AUTO` table matches, and loan term/escrow structure to Path Logic's `AccountType`.
     */
    private mapAccountType(
        mnyType: number,
        name: string,
        row?: Record<string, MnyCellValue>,
        categoryFullNameById?: Map<number, string>,
        acctRowById?: Map<number, Record<string, MnyCellValue>>,
        autoRows?: Array<Record<string, MnyCellValue>>
    ): AccountType {
        const lowerName = name.toLowerCase().trim();
        if (mnyType === MnyAccountType.CreditCard) {
            return AccountType.Credit;
        }
        if (mnyType === MnyAccountType.Cash) {
            return AccountType.Cash;
        }
        if (mnyType === MnyAccountType.Savings) {
            return AccountType.Savings;
        }

        if (mnyType === MnyAccountType.LoanOrLiability || mnyType === MnyAccountType.LineOfCredit) {
            // 1. Check interest category path (hcatInterest -> full category path)
            const hcatInterest = asId(row?.['hcatInterest']);
            const interestCatPath =
                hcatInterest !== null
                    ? (categoryFullNameById?.get(hcatInterest) ?? '').toLowerCase()
                    : '';

            if (interestCatPath.includes('mortgage')) {
                return AccountType.Mortgage;
            }
            if (/\b(auto|automobile|car|vehicle)\b/.test(interestCatPath)) {
                return AccountType.AutoLoan;
            }
            if (interestCatPath.includes('student')) {
                return AccountType.PersonalLoan;
            }

            // 2. Check linked asset account (hacctRel -> ACCT)
            const hacctRel = asId(row?.['hacctRel']);
            const linkedAcct = hacctRel !== null ? acctRowById?.get(hacctRel) : undefined;
            if (linkedAcct) {
                const linkedName = (asStr(linkedAcct['szFull']) ?? '').toLowerCase();
                const linkedTaat = asNum(linkedAcct['taat'], -1);
                if (
                    linkedTaat === 1 ||
                    linkedTaat === 2 ||
                    /\b(home|residence|condo|house|property)\b/.test(linkedName)
                ) {
                    return AccountType.Mortgage;
                }
            }

            // 3. Check AUTO table vehicle match
            if (autoRows && this.matchAutoLoanMetadata(name, row, autoRows) !== null) {
                return AccountType.AutoLoan;
            }

            // 4. Structural Mortgage vs Auto Loan classification
            if (/\b(mortgage|home|condo|townhouse|residence|heloc)\b/.test(lowerName)) {
                return AccountType.Mortgage;
            }

            const termMonths = asNum(row?.['iPmtMax'], 0);
            const isTaxRel = asBool(row?.['fTaxRel']);
            const isArm = asBool(row?.['fARM']);
            const amtOpenAbs = Math.abs(asNum(row?.['amtOpen'], 0));
            const amtPIAbs = Math.abs(asNum(row?.['amtPI'], 0));
            const amtPmtAbs = Math.abs(asNum(row?.['amtPayment'], 0));

            if (
                !lowerName.includes('student') &&
                ((isTaxRel && termMonths >= 180 && amtOpenAbs >= 5000000) ||
                    isArm ||
                    (amtPmtAbs > amtPIAbs && amtPIAbs > 0 && amtOpenAbs >= 5000000))
            ) {
                return AccountType.Mortgage;
            }

            // Vehicle loans either contain generic vehicle keywords or start with a 4-digit model year (e.g. "2005 G35")
            const startsWithModelYear = /^(19\d{2}|20\d{2})\s+[a-z0-9]/i.test(name.trim());
            if (
                /\b(auto|car|truck|vehicle)\b/.test(lowerName) ||
                (startsWithModelYear && (termMonths === 0 || termMonths <= 96))
            ) {
                return AccountType.AutoLoan;
            }

            return AccountType.PersonalLoan;
        }

        if (lowerName.includes('saving')) {
            return AccountType.Savings;
        }
        if (/\bcash\b/.test(lowerName) && !/\b(card|visa|mastercard|amex)\b/.test(lowerName)) {
            return AccountType.Cash;
        }
        return AccountType.Checking;
    }

    /**
     * Extracts credit card terms and promotional rate windows from an `ACCT` row (`at === 1`).
     */
    private extractCreditCardDetails(
        hacct: number,
        row: Record<string, MnyCellValue>
    ): ICreditCardDetails {
        const rawRate = asOptNum(row['dIntRate']);
        const rateChgDate = asStr(row['dtIntRateChg']) as ISODateString | null;
        const postPromoRawRate = asOptNum(row['dIntRateChg']);

        const promotionalRates: Array<IPromotionalRateWindow> = [];
        let standardApr = rawRate !== null ? toRateDecimal(rawRate) : 0;

        if (rateChgDate !== null && rawRate !== null) {
            const promoApr = toRateDecimal(rawRate);
            const postApr = postPromoRawRate !== null ? toRateDecimal(postPromoRawRate) : undefined;
            if (postApr !== undefined && postApr > 0) {
                standardApr = postApr;
            }
            promotionalRates.push({
                id: `promo-mny-${hacct}-1`,
                name:
                    rawRate === 0
                        ? '0% Introductory / Promotional APR'
                        : `${rawRate}% Promotional APR`,
                promoType: PromotionalRateType.General,
                apr: promoApr,
                startDate: asStr(row['dtOpen']) as ISODateString | null,
                endDate: rateChgDate,
                ...(postApr !== undefined ? { postPromoApr: postApr } : {})
            });
        }

        const rawLimit = asNum(row['amtLimit'], 0);
        const creditLimit = rawLimit !== 0 ? Math.abs(rawLimit) : undefined;
        const rawMinPay = asNum(row['amtPayMin'], 0);
        const minimumPayment = rawMinPay > 0 ? rawMinPay : undefined;
        const rawMinRate = asNum(row['dPayRateMin'], 0);
        const minimumPaymentPercentage = rawMinRate > 0 ? toRateDecimal(rawMinRate) : undefined;
        const paymentDueDay = this.parseDayOfMonth(asStr(row['dtNextDebtPay']));

        return {
            interestRate: standardApr,
            promotionalRates,
            ...(creditLimit !== undefined ? { creditLimit } : {}),
            ...(paymentDueDay !== undefined ? { paymentDueDay } : {}),
            ...(minimumPayment !== undefined ? { minimumPayment } : {}),
            ...(minimumPaymentPercentage !== undefined ? { minimumPaymentPercentage } : {})
        };
    }

    /**
     * Extracts comprehensive loan details (`ILoanDetails`) and type-specific metadata
     * (`IMortgageMetadata`, `IAutoLoanMetadata`, `IPersonalLoanMetadata`) from an `ACCT` row.
     */
    private extractLoanDetails(
        name: string,
        mappedType: AccountType,
        row: Record<string, MnyCellValue>,
        categoryNameById: Map<number, string>,
        acctRowById: Map<number, Record<string, MnyCellValue>>,
        autoRows: Array<Record<string, MnyCellValue>>,
        lonSteps?: Array<Record<string, MnyCellValue>>
    ): ILoanDetails {
        const latestStep =
            lonSteps && lonSteps.length > 0 ? lonSteps[lonSteps.length - 1] : undefined;
        const stepRate =
            asOptNum(latestStep?.['dRateCalc']) ?? asOptNum(latestStep?.['dRateUser']) ?? 0;

        const rawAmtOpen = Math.abs(asNum(row['amtOpen'], 0));
        const rawRate = asOptNum(row['dIntRate']) ?? asOptNum(row['rateUser']) ?? stepRate;
        const interestRate = toRateDecimal(rawRate);
        const rawTerm = asNum(row['iPmtMax'], 0);
        const termMonths = rawTerm > 0 ? rawTerm : mappedType === AccountType.Mortgage ? 360 : 60;

        const rawPI = asNum(row['amtPI'], 0) || asNum(latestStep?.['amtPI'], 0);
        const piPayment = rawPI !== 0 ? Math.abs(rawPI) : undefined;
        const rawPmt = asNum(row['amtPayment'], 0) || asNum(latestStep?.['amtPayment'], 0);
        const totalPayment = rawPmt !== 0 ? Math.abs(rawPmt) : (piPayment ?? 0);
        const originalAmount =
            rawAmtOpen > 0 ? rawAmtOpen : totalPayment > 0 ? totalPayment * termMonths : 0;

        const rawBalloon = asNum(row['amtBalloon'], 0) || asNum(latestStep?.['amtBalloon'], 0);
        const balloonAmount = rawBalloon !== 0 ? Math.abs(rawBalloon) : undefined;
        const dtOpen = asStr(row['dtOpen']);
        const startDate = (dtOpen ?? '2000-01-01') as ISODateString;
        const paymentDueDay = this.parseDayOfMonth(dtOpen) ?? 1;

        const isAdjustableRate = asBool(row['fARM']);
        const nextRateAdjustmentDate = asStr(row['dtNextAdj']) as ISODateString | null;
        const rawNextRate = asOptNum(row['dIntRateChg']);
        const nextAdjustmentRate = rawNextRate !== null ? toRateDecimal(rawNextRate) : undefined;

        let metadata: IMortgageMetadata | IAutoLoanMetadata | IPersonalLoanMetadata | undefined;

        if (mappedType === AccountType.Mortgage) {
            const escrowAmount =
                piPayment !== undefined && totalPayment > piPayment
                    ? totalPayment - piPayment
                    : undefined;
            const hacctRel = asId(row['hacctRel']);
            const linkedAcct = hacctRel !== null ? acctRowById.get(hacctRel) : undefined;
            const rawPropVal = asNum(linkedAcct?.['amtOpen'], 0);
            const propertyValue = rawPropVal > 0 ? rawPropVal : undefined;

            metadata = {
                propertyAddress: name,
                escrowIncluded: escrowAmount !== undefined && escrowAmount > 0,
                ...(escrowAmount !== undefined ? { escrowAmount } : {}),
                ...(propertyValue !== undefined ? { propertyValue } : {})
            };
        } else if (mappedType === AccountType.AutoLoan) {
            metadata =
                this.matchAutoLoanMetadata(name, row, autoRows) ??
                this.parseVehicleFromAccountName(name);
        } else if (mappedType === AccountType.PersonalLoan) {
            const hcatInterest = asId(row['hcatInterest']);
            const interestCatName =
                hcatInterest !== null
                    ? (categoryNameById.get(hcatInterest) ?? '').toLowerCase()
                    : '';
            const isStudentLoan =
                name.toLowerCase().includes('student') || interestCatName.includes('student');
            metadata = {
                purpose: isStudentLoan ? 'Student Loan' : name,
                secured: false,
                subtype: isStudentLoan ? PersonalLoanSubtype.Student : PersonalLoanSubtype.Personal
            };
        }

        return {
            originalAmount,
            interestRate,
            termMonths,
            monthlyPayment: totalPayment,
            paymentDueDay,
            startDate,
            ...(piPayment !== undefined ? { principalAndInterestPayment: piPayment } : {}),
            ...(balloonAmount !== undefined ? { balloonAmount } : {}),
            ...(isAdjustableRate ? { isAdjustableRate: true } : {}),
            ...(nextRateAdjustmentDate ? { nextRateAdjustmentDate } : {}),
            ...(nextAdjustmentRate !== undefined ? { nextAdjustmentRate } : {}),
            ...(metadata ? { metadata } : {})
        };
    }

    /**
     * Matches a loan account against MS Money's `AUTO` table using foreign key (`lHacct`),
     * model token intersection, and 1-edit typo tolerance on vehicle make/model tokens.
     */
    private matchAutoLoanMetadata(
        accountName: string,
        acctRow: Record<string, MnyCellValue> | undefined,
        autoRows: Array<Record<string, MnyCellValue>>
    ): IAutoLoanMetadata | null {
        const hacct = asOptNum(acctRow?.['hacct']);
        const lowerAcctName = accountName.toLowerCase().trim();
        const acctTokens = lowerAcctName.split(/[^a-z0-9]+/).filter(Boolean);
        const yearMatch = accountName.match(/\b(19\d{2}|20\d{2})\b/);
        const acctYear = yearMatch?.[1] ? parseInt(yearMatch[1], 10) : null;

        for (const auto of autoRows) {
            const autoHacct = asId(auto['lHacct']);
            const rawYear = asNum(auto['nYear'], 0);
            const autoYear = rawYear > 1900 ? rawYear : null;
            const make = (asStr(auto['szMake']) ?? '').trim();
            const model = (asStr(auto['szModel']) ?? '').trim();
            const vin = asStr(auto['mVIN'])?.trim() || undefined;
            const rawMiles = asNum(auto['nMiles'], 0);
            const mileage = rawMiles > 0 ? rawMiles : undefined;
            const rawPrice = asNum(auto['amtPrice'], 0);
            const purchasePrice = rawPrice > 0 ? rawPrice : undefined;

            const modelTokens = model
                .toLowerCase()
                .split(/\s+/)
                .filter(w => w.length >= 3);
            const modelMatched = modelTokens.some(mw =>
                acctTokens.some(
                    at =>
                        at === mw ||
                        lowerAcctName.includes(mw) ||
                        (mw.length >= 5 && isWithinOneEdit(at, mw))
                )
            );
            const makeLower = make.toLowerCase();
            const makeMatched =
                makeLower.length >= 3 &&
                acctTokens.some(
                    at =>
                        at === makeLower ||
                        (makeLower.length >= 4 && isWithinOneEdit(at, makeLower))
                );
            const yearCompatible = acctYear === null || autoYear === null || acctYear === autoYear;

            if (
                (hacct !== null && autoHacct === hacct) ||
                (modelMatched && yearCompatible && (acctYear !== null || makeMatched))
            ) {
                return {
                    ...(autoYear !== null ? { vehicleYear: autoYear } : {}),
                    ...(make ? { vehicleMake: make } : {}),
                    ...(model ? { vehicleModel: model } : {}),
                    ...(vin ? { vin } : {}),
                    ...(mileage !== undefined ? { mileage } : {}),
                    ...(purchasePrice !== undefined ? { purchasePrice } : {})
                };
            }
        }

        return null;
    }

    private parseVehicleFromAccountName(accountName: string): IAutoLoanMetadata {
        const yearMatch = accountName.match(/\b(19\d{2}|20\d{2})\b/);
        const vehicleYear = yearMatch?.[1] ? parseInt(yearMatch[1], 10) : undefined;
        const remainder =
            vehicleYear !== undefined
                ? accountName.replace(String(vehicleYear), '').trim()
                : accountName.trim();
        return {
            ...(vehicleYear !== undefined ? { vehicleYear } : {}),
            ...(remainder ? { vehicleModel: remainder } : {})
        };
    }

    private parseDayOfMonth(isoDate: string | null): number | undefined {
        if (!isoDate || isoDate.length < 10) return undefined;
        const day = parseInt(isoDate.slice(8, 10), 10);
        return !Number.isNaN(day) && day >= 1 && day <= 31 ? day : undefined;
    }

    private mapClearedState(cs: number): QifClearedStatus {
        if (cs === MnyClearedState.Reconciled) return QifClearedStatus.Reconciled;
        if (cs === MnyClearedState.Cleared) return QifClearedStatus.Cleared;
        return QifClearedStatus.Uncleared;
    }

    /**
     * Fallback table scanner using declarative column signatures when `MSysObjects` (Page 2) is unavailable.
     */
    private scanCatalogTables(
        buffer: Uint8Array,
        header: IMnyHeader,
        result: IMnyParseResult
    ): Map<string, number> {
        const tableMap = new Map<string, number>();
        const numPages = Math.floor(buffer.byteLength / PAGE_SIZE);

        for (let p = 15; p < numPages; p++) {
            const off = p * PAGE_SIZE;
            if (buffer[off] !== 0x02 || buffer[off + 1] !== 0x01) continue;
            try {
                const tdef = this.readTableDef(buffer, p, header);
                const colSet = new Set(tdef.columns.map(c => c.name));

                let matchedName: string | null = null;
                for (const sig of TABLE_COLUMN_SIGNATURES) {
                    if (sig.requiredCols.every(col => colSet.has(col))) {
                        matchedName = sig.name;
                        break;
                    }
                }
                if (
                    !matchedName &&
                    colSet.has('hcli') &&
                    (colSet.has('rgbVal') || colSet.has('rgbKey'))
                ) {
                    matchedName = 'CLI_DAT';
                }

                if (matchedName && !tableMap.has(matchedName)) {
                    tableMap.set(matchedName, p);
                    result.tables.push({ id: p, name: matchedName, type: 1 });
                }
            } catch {
                // Skip unreadable candidate page
            }
        }
        return tableMap;
    }
}
