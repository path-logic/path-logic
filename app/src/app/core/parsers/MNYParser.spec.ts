import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AccountType, QifClearedStatus } from '../domain/types';
import {
    MNYParser,
    MnyColumnType,
    MnyEncryptionFlag,
    md5Digest,
    rc4Transform,
    sha1Digest,
    type IMnyAccount,
    type IMnyHeader,
    type IMnyParseResult,
    type IMnyTransaction
} from './MNYParser';

const SAMPLE_MNY_PATH: string = '/mnt/c/Program Files (x86)/Microsoft Money Plus/sample.mny';
const PETER_MNY_PATH: string = '/home/pete/projects/path-logic/scratch/Peter.mny';

function toHex(bytes: Uint8Array): string {
    return Array.from(bytes)
        .map((b: number) => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Helper to construct a minimal valid 3-page synthetic `.mny` buffer for unit testing
 * in environments where `sample.mny` is not mounted.
 */
function buildSyntheticMnyBuffer(): Uint8Array {
    const pageSize: number = 0x1000;
    const buf: Uint8Array = new Uint8Array(pageSize * 3);

    // Page 0: MSISAM header
    const page0: Uint8Array = new Uint8Array(pageSize);
    page0.set([0x00, 0x01, 0x00, 0x00], 0x00);
    const sig: string = 'MSISAM Database';
    for (let i: number = 0; i < sig.length; i++) {
        page0[0x04 + i] = sig.charCodeAt(i);
    }
    const p0View: DataView = new DataView(page0.buffer);
    p0View.setUint32(0x14, 1, true); // formatVersion = 1
    p0View.setUint16(0x3c, 1252, true); // codePage = 1252
    p0View.setUint32(0x6a, 3107, true); // buildVersion = 3107
    p0View.setUint32(0x6e, 1033, true); // lcid = 1033

    const salt8: Uint8Array = new Uint8Array([0x8a, 0x74, 0x7a, 0x70, 0xae, 0x24, 0xe3, 0x40]);
    page0.set(salt8, 0x72);
    const salt0: number = p0View.getUint32(0x72, true);

    // Crypto flags at 0x298: SHA1 | IncludePwd | VarOffset | 128Bit (0x3d)
    const flags: number =
        MnyEncryptionFlag.UseSha1 |
        MnyEncryptionFlag.IncludePasswordInFieldKey |
        MnyEncryptionFlag.VariableKeyBlockOffset |
        MnyEncryptionFlag.Key128Bit |
        0x01;
    page0[0x298] = flags;

    const emptyPwd: Uint8Array = new Uint8Array(40);
    const keyPrefix: Uint8Array = sha1Digest(emptyPwd).subarray(0, 16);
    const checkKey: Uint8Array = new Uint8Array(24);
    checkKey.set(keyPrefix, 0);
    checkKey.set(salt8, 16);

    const checkPlain: Uint8Array = new Uint8Array(4);
    new DataView(checkPlain.buffer).setUint32(0, salt0, true);
    const checkEnc: Uint8Array = rc4Transform(checkKey, checkPlain);
    const varOffset: number = salt8[0] ?? 0;
    page0.set(checkEnc, 0x2e9 + varOffset);
    page0[0x2ed + varOffset] = 0; // mode 0 (no password)

    // Encrypt 0x18..0x97 with 0x6b39dac7
    const hdrKey: Uint8Array = new Uint8Array([0xc7, 0xda, 0x39, 0x6b]);
    page0.set(rc4Transform(hdrKey, page0.subarray(0x18, 0x18 + 0x80)), 0x18);
    buf.set(page0, 0);

    // Page 2: MSysObjects TDEF (empty table with 3 columns: Id, Name, Type)
    const page2: Uint8Array = new Uint8Array(pageSize);
    page2[0] = 0x02;
    page2[1] = 0x01;
    const p2View: DataView = new DataView(page2.buffer);
    p2View.setInt32(0x10, 0, true); // rowCount = 0
    p2View.setUint16(0x29, 3, true); // maxCols = 3
    p2View.setUint16(0x2b, 1, true); // numVarCols = 1
    p2View.setUint16(0x2d, 3, true); // numCols = 3
    p2View.setInt32(0x2f, 0, true); // numIndexes = 0
    p2View.setInt32(0x33, 0, true); // numRealIndexes = 0

    let off: number = 0x3f;
    const colDefs: Array<{
        type: MnyColumnType;
        id: number;
        varNum: number;
        fixed: boolean;
        fixedOff: number;
        len: number;
        name: string;
    }> = [
        {
            type: MnyColumnType.Int32,
            id: 0,
            varNum: 0,
            fixed: true,
            fixedOff: 0,
            len: 4,
            name: 'Id'
        },
        {
            type: MnyColumnType.Text,
            id: 1,
            varNum: 0,
            fixed: false,
            fixedOff: 0,
            len: 256,
            name: 'Name'
        },
        {
            type: MnyColumnType.Int16,
            id: 2,
            varNum: 1,
            fixed: true,
            fixedOff: 4,
            len: 2,
            name: 'Type'
        }
    ];
    for (const c of colDefs) {
        page2[off] = c.type;
        p2View.setUint16(off + 5, c.id, true);
        p2View.setUint16(off + 7, c.varNum, true);
        page2[off + 15] = c.fixed ? 0x01 : 0x00;
        p2View.setUint16(off + 21, c.fixedOff, true);
        p2View.setUint16(off + 23, c.len, true);
        off += 25;
    }
    for (const c of colDefs) {
        const byteLen: number = c.name.length * 2;
        p2View.setUint16(off, byteLen, true);
        off += 2;
        for (let i: number = 0; i < c.name.length; i++) {
            p2View.setUint16(off + i * 2, c.name.charCodeAt(i), true);
        }
        off += byteLen;
    }

    // Encrypt Page 2 with per-page RC4 key
    const p2Key: Uint8Array = new Uint8Array(20);
    p2Key.set(keyPrefix, 0);
    new DataView(p2Key.buffer).setUint32(16, (salt0 ^ 2) >>> 0, true);
    buf.set(rc4Transform(p2Key, page2), 2 * pageSize);

    return buf;
}

/**
 * Helper to construct a synthetic .mny buffer protected by an Offline (OFL\) wrapped master key.
 */
function buildSyntheticWrappedMnyBuffer(
    offlinePassword: string,
    isSha1: boolean = true,
    is128Bit: boolean = true
): Uint8Array {
    const pageSize: number = 0x1000;
    const buf: Uint8Array = new Uint8Array(pageSize * 3);
    const page0: Uint8Array = new Uint8Array(pageSize);

    page0.set([0x00, 0x01, 0x00, 0x00], 0x00);
    const sig: string = 'MSISAM Database';
    for (let i: number = 0; i < sig.length; i++) {
        page0[0x04 + i] = sig.charCodeAt(i);
    }
    const p0View: DataView = new DataView(page0.buffer);
    p0View.setUint32(0x14, 1, true);
    p0View.setUint16(0x3c, 1252, true);
    p0View.setUint32(0x6a, 3107, true);
    p0View.setUint32(0x6e, 1033, true);

    const salt8: Uint8Array = new Uint8Array([0x5d, 0x74, 0x7a, 0x70, 0xae, 0x24, 0xe3, 0x40]);
    page0.set(salt8, 0x72);
    const salt0: number = p0View.getUint32(0x72, true);

    const flags: number =
        (isSha1 ? MnyEncryptionFlag.UseSha1 : 0) |
        (is128Bit ? MnyEncryptionFlag.Key128Bit : 0) |
        MnyEncryptionFlag.IncludePasswordInFieldKey |
        MnyEncryptionFlag.VariableKeyBlockOffset |
        0x01;
    page0[0x298] = flags;

    const varOffset: number = salt8[0] ?? 0;
    const keyLen: number = is128Bit ? 16 : 5;
    const hashFn = isSha1 ? sha1Digest : md5Digest;

    // Master password buffer (40 bytes)
    const masterBuf: Uint8Array = new Uint8Array(40);
    masterBuf.set([0x4d, 0x00, 0x41, 0x00, 0x53, 0x00, 0x54, 0x00, 0x45, 0x00, 0x52, 0x00]); // "MASTER"
    const masterPrefix: Uint8Array = hashFn(masterBuf).subarray(0, keyLen);
    const masterCheckKey: Uint8Array = new Uint8Array(keyLen + 8);
    masterCheckKey.set(masterPrefix, 0);
    masterCheckKey.set(salt8, keyLen);

    const checkPlain: Uint8Array = new Uint8Array(4);
    new DataView(checkPlain.buffer).setUint32(0, salt0, true);
    const checkEnc: Uint8Array = rc4Transform(masterCheckKey, checkPlain);
    page0.set(checkEnc, 0x2e9 + varOffset);
    page0[0x2ed + varOffset] = 6; // Mode 6 (wrapped master key)

    // Wrap masterBuf into Slot 2 using OFL\ + offlinePassword
    const oflBuf: Uint8Array = new Uint8Array(40);
    const oflStr: string = 'OFL\\' + offlinePassword.toUpperCase();
    for (let i: number = 0; i < Math.min(oflStr.length, 20); i++) {
        const code: number = oflStr.charCodeAt(i);
        oflBuf[i * 2] = code & 0xff;
        oflBuf[i * 2 + 1] = (code >>> 8) & 0xff;
    }
    const oflPrefix: Uint8Array = hashFn(oflBuf).subarray(0, keyLen);
    const oflKey: Uint8Array = new Uint8Array(keyLen + 8);
    oflKey.set(oflPrefix, 0);
    oflKey.set(salt8, keyLen);

    const slot2Enc: Uint8Array = rc4Transform(oflKey, masterBuf);
    page0.set(slot2Enc, 0x299 + varOffset + 40);

    // Encrypt 0x18..0x97 with 0x6b39dac7
    const hdrKey: Uint8Array = new Uint8Array([0xc7, 0xda, 0x39, 0x6b]);
    page0.set(rc4Transform(hdrKey, page0.subarray(0x18, 0x18 + 0x80)), 0x18);
    buf.set(page0, 0);

    return buf;
}

describe('MNYParser Cryptographic & Binary Primitives', () => {
    it('computes SHA-1 and MD5 digests matching myisam08.dll 40-byte zero password vectors', () => {
        const emptyPwd40: Uint8Array = new Uint8Array(40);
        expect(toHex(sha1Digest(emptyPwd40))).toBe('b80de5d138758541c5f05265ad144ab9fa86d1db');
        expect(toHex(md5Digest(emptyPwd40))).toBe('fd4b38e94292e00251b9f39c47ee5710');
    });

    it('performs symmetric RC4 encryption and decryption', () => {
        const key: Uint8Array = new Uint8Array([0xc7, 0xda, 0x39, 0x6b]);
        const plain: Uint8Array = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0xaa, 0xbb, 0xcc, 0xdd]);
        const cipher: Uint8Array = rc4Transform(key, plain);
        expect(toHex(cipher)).not.toBe(toHex(plain));
        const roundTrip: Uint8Array = rc4Transform(key, cipher);
        expect(toHex(roundTrip)).toBe(toHex(plain));
    });

    it('decrypts a synthetic .mny buffer header and Page 2 TDEF schema', () => {
        const parser: MNYParser = new MNYParser();
        const syntheticBuf: Uint8Array = buildSyntheticMnyBuffer();

        const header: IMnyHeader = parser.parseHeader(syntheticBuf);
        expect(header.signature).toBe('MSISAM Database');
        expect(header.formatVersion).toBe(1);
        expect(header.codePage).toBe(1252);
        expect(header.buildVersion).toBe(3107);
        expect(header.lcid).toBe(1033);
        expect(header.passwordVerified).toBe(true);

        const tdef = parser.readTableDef(syntheticBuf, 2, header);
        expect(tdef.numCols).toBe(3);
        expect(tdef.columns.map(c => c.name)).toEqual(['Id', 'Name', 'Type']);

        // Wrong password should fail verification
        const badHeader: IMnyHeader = parser.parseHeader(syntheticBuf, 'wrong-password');
        expect(badHeader.passwordVerified).toBe(false);
    });

    it('returns structured errors on truncated or non-MSISAM buffers', () => {
        const parser: MNYParser = new MNYParser();
        const shortResult: IMnyParseResult = parser.parse(new Uint8Array(128));
        expect(shortResult.errors).toHaveLength(1);
        expect(shortResult.errors[0]?.code).toBe('INVALID_MNY_HEADER');

        const badSigBuf: Uint8Array = new Uint8Array(0x1000);
        const badSigResult: IMnyParseResult = parser.parse(badSigBuf);
        expect(badSigResult.errors).toHaveLength(1);
        expect(badSigResult.errors[0]?.code).toBe('INVALID_MNY_HEADER');
    });

    it('unwraps and verifies Money 2005+ / Money Plus Mode 6 Offline (OFL\\) master key files', () => {
        const parser: MNYParser = new MNYParser();
        const wrappedBuf: Uint8Array = buildSyntheticWrappedMnyBuffer('SecretVault123');

        // Without password -> passwordVerified is false
        const unauthHeader: IMnyHeader = parser.parseHeader(wrappedBuf, '');
        expect(unauthHeader.passwordVerified).toBe(false);

        // With wrong password -> false
        const wrongHeader: IMnyHeader = parser.parseHeader(wrappedBuf, 'BadPassword');
        expect(wrongHeader.passwordVerified).toBe(false);

        // With exact offline password -> true
        const authHeader: IMnyHeader = parser.parseHeader(wrappedBuf, 'SecretVault123');
        expect(authHeader.passwordVerified).toBe(true);
        expect(authHeader.encryptionMode).toBe(6);

        // Case-insensitive password -> true
        const lowerHeader: IMnyHeader = parser.parseHeader(wrappedBuf, 'secretvault123');
        expect(lowerHeader.passwordVerified).toBe(true);

        // Password with surrounding whitespace -> trimmed -> true
        const paddedHeader: IMnyHeader = parser.parseHeader(wrappedBuf, '  SecretVault123  ');
        expect(paddedHeader.passwordVerified).toBe(true);
    });
});

describe.runIf(fs.existsSync(SAMPLE_MNY_PATH))(
    'MNYParser Integration with Microsoft Money sample.mny',
    () => {
        const rawBuffer: Buffer = fs.existsSync(SAMPLE_MNY_PATH)
            ? fs.readFileSync(SAMPLE_MNY_PATH)
            : Buffer.alloc(0);
        const mnyBytes: Uint8Array = new Uint8Array(
            rawBuffer.buffer,
            rawBuffer.byteOffset,
            rawBuffer.byteLength
        );
        const parser: MNYParser = new MNYParser();
        const parseResult: IMnyParseResult = fs.existsSync(SAMPLE_MNY_PATH)
            ? parser.parse(mnyBytes)
            : {
                  header: null,
                  tables: [],
                  accounts: [],
                  categories: [],
                  payees: [],
                  transactions: [],
                  errors: [],
                  warnings: []
              };

        it('decrypts Page 0 header and verifies empty password check block', () => {
            expect(parseResult.errors).toHaveLength(0);
            expect(parseResult.header).not.toBeNull();
            expect(parseResult.header?.signature).toBe('MSISAM Database');
            expect(parseResult.header?.codePage).toBe(1252);
            expect(parseResult.header?.buildVersion).toBe(3107);
            expect(parseResult.header?.lcid).toBe(1033);
            expect(parseResult.header?.salt0).toBe(0x707a748a);
            expect(parseResult.header?.passwordVerified).toBe(true);
            expect(parseResult.header?.encryptAllPages).toBe(false);
        });

        it('deserializes all 88 tables from MSysObjects (Page 2)', () => {
            const userTables = parseResult.tables.filter(t => t.type === 1);
            expect(userTables).toHaveLength(88);
            const names = new Set(userTables.map(t => t.name));
            expect(names.has('ACCT')).toBe(true);
            expect(names.has('CAT')).toBe(true);
            expect(names.has('PAY')).toBe(true);
            expect(names.has('TRN')).toBe(true);
            expect(names.has('TRN_SPLIT')).toBe(true);
            expect(names.has('TRN_XFER')).toBe(true);
            expect(names.has('CLI_DAT')).toBe(true);
        });

        it('deserializes all 23 accounts in ACCT and decrypts MSOFD field-level encrypted account numbers (mNum)', () => {
            expect(parseResult.accounts).toHaveLength(23);

            const investments: IMnyAccount | undefined = parseResult.accounts.find(
                a => a.name === 'Woodgrove Investments'
            );
            expect(investments).toBeDefined();
            expect(investments?.accountNumber).toBe('40219634');

            const previousCard: IMnyAccount | undefined = parseResult.accounts.find(
                a => a.name === 'Previous card (No longer used)'
            );
            expect(previousCard).toBeDefined();
            expect(previousCard?.mappedType).toBe(AccountType.Credit);
            expect(previousCard?.accountNumber).toBe('1234566789');

            const checking: IMnyAccount | undefined = parseResult.accounts.find(
                a => a.name === 'Woodgrove Bank Checking'
            );
            expect(checking).toBeDefined();
            expect(checking?.mappedType).toBe(AccountType.Checking);
            expect(checking?.openingBalance).toBe(-7600000); // -$76,000.00 in integer cents

            const savings: IMnyAccount | undefined = parseResult.accounts.find(
                a => a.name === 'Woodgrove Bank Savings'
            );
            expect(savings).toBeDefined();
            expect(savings?.mappedType).toBe(AccountType.Savings);
            expect(savings?.openingBalance).toBe(400000); // $4,000.00 in integer cents

            const creditCard: IMnyAccount | undefined = parseResult.accounts.find(
                a => a.name === 'Woodgrove Bank Credit Card'
            );
            expect(creditCard).toBeDefined();
            expect(creditCard?.mappedType).toBe(AccountType.Credit);
            expect(creditCard?.openingBalance).toBe(-1000000); // -$10,000.00 in integer cents
        });

        it('deserializes all 141 categories in CAT and all 165 payees in PAY (including overflow rows)', () => {
            expect(parseResult.categories).toHaveLength(141);
            expect(parseResult.payees).toHaveLength(165);

            const groceries = parseResult.categories.find(c => c.name === 'Groceries');
            expect(groceries).toBeDefined();

            const forthCoffee = parseResult.payees.find(p => p.name === 'Forth Coffee');
            expect(forthCoffee).toBeDefined();

            const wideWorld = parseResult.payees.find(p => p.name === 'Wide World Importers');
            expect(wideWorld).toBeDefined();
        });

        it('deserializes ledger transactions and enforces penny-perfect Sum(Splits) === TotalAmount invariant', () => {
            expect(parseResult.transactions.length).toBeGreaterThan(1500);

            // Inspect split mortgage transaction htrn = 2749 (-$1,928.11 payment with 3 splits: Principal, Interest, Escrow)
            const mortgage2749: IMnyTransaction | undefined = parseResult.transactions.find(
                t => t.mnyTransactionId === 2749
            );
            expect(mortgage2749).toBeDefined();
            expect(mortgage2749?.accountName).toBe('Woodgrove Bank Checking');
            expect(mortgage2749?.date).toBe('2003-05-30');
            expect(mortgage2749?.amount).toBe(-192811);
            expect(mortgage2749?.clearedStatus).toBe(QifClearedStatus.Uncleared);
            expect(mortgage2749?.splits).toHaveLength(3);
            expect(mortgage2749?.splits.map(s => s.amount)).toEqual([-39360, -128451, -25000]);

            // Every single deserialized transaction must satisfy Sum(splits) === amount
            for (const tx of parseResult.transactions) {
                const splitSum: number = tx.splits.reduce((acc: number, s) => acc + s.amount, 0);
                expect(splitSum).toBe(tx.amount);
            }
        });
    }
);

describe.runIf(fs.existsSync(PETER_MNY_PATH))(
    'MNYParser Integration with scratch/Peter.mny',
    () => {
        const rawBuffer: Buffer = fs.existsSync(PETER_MNY_PATH)
            ? fs.readFileSync(PETER_MNY_PATH)
            : Buffer.alloc(0);
        const mnyBytes: Uint8Array = new Uint8Array(
            rawBuffer.buffer,
            rawBuffer.byteOffset,
            rawBuffer.byteLength
        );
        const parser: MNYParser = new MNYParser();

        it('inspects header of Peter.mny confirming unencrypted database data pages', () => {
            const hEmpty = parser.parseHeader(mnyBytes, '', undefined);
            expect(hEmpty.signature).toBe('MSISAM Database');
            expect(hEmpty.formatVersion).toBe(1);
            expect(hEmpty.encryptAllPages).toBe(false);
            expect(hEmpty.passwordVerified).toBe(true);
        });

        it('deserializes accounts, categories, payees, and transactions with penny-perfect split balance from Peter.mny', () => {
            const res = parser.parse(mnyBytes);
            expect(res.errors).toHaveLength(0);
            expect(res.accounts).toHaveLength(32);
            expect(res.categories).toHaveLength(336);
            expect(res.payees).toHaveLength(8343);
            expect(res.transactions.length).toBeGreaterThanOrEqual(24000);

            // Verify penny-perfect split balance on sample transactions with splits
            const splitTxs = res.transactions.filter(t => t.splits.length > 0);
            expect(splitTxs.length).toBeGreaterThan(0);
            for (const tx of splitTxs.slice(0, 50)) {
                const splitSum: number = tx.splits.reduce((acc: number, s) => acc + s.amount, 0);
                expect(splitSum).toBe(tx.amount);
            }

            // Verify Auto Loans ("2001 Cobra", "2005 G35", "Homda Prologue") are classified as AutoLoan with metadata
            const cobra = res.accounts.find(a => a.name === '2001 Cobra');
            expect(cobra?.mappedType).toBe(AccountType.AutoLoan);
            expect(cobra?.loanDetails?.originalAmount).toBe(3516439);
            expect(cobra?.loanDetails?.termMonths).toBe(60);
            expect(cobra?.loanDetails?.monthlyPayment).toBe(58607);
            expect(cobra?.loanDetails?.metadata).toMatchObject({
                vehicleYear: 2001,
                vehicleMake: 'Ford',
                vehicleModel: 'Mustang Cobra',
                vin: '1FAFP47V11F247305'
            });

            const g35 = res.accounts.find(a => a.name === '2005 G35');
            expect(g35?.mappedType).toBe(AccountType.AutoLoan);
            expect(g35?.loanDetails?.interestRate).toBeCloseTo(0.0699, 4);

            const prologue = res.accounts.find(a => a.name === 'Homda Prologue');
            expect(prologue?.mappedType).toBe(AccountType.AutoLoan);
            expect(prologue?.loanDetails?.interestRate).toBeCloseTo(0.0579, 4);
            expect(prologue?.loanDetails?.metadata).toMatchObject({
                vehicleYear: 2025,
                vehicleMake: 'Honda',
                vin: '3GPKHXRJ9SS519127'
            });

            // Verify Mortgages ("Condo", "304 Blackhawk") are classified as Mortgage with P&I and Escrow
            const condo = res.accounts.find(a => a.name === 'Condo');
            expect(condo?.mappedType).toBe(AccountType.Mortgage);
            expect(condo?.loanDetails?.originalAmount).toBe(21612483);
            expect(condo?.loanDetails?.interestRate).toBeCloseTo(0.03625, 5);
            expect(condo?.loanDetails?.principalAndInterestPayment).toBe(100694);
            expect(condo?.loanDetails?.monthlyPayment).toBe(135711);
            expect(condo?.loanDetails?.isAdjustableRate).toBe(true);
            expect(condo?.loanDetails?.metadata).toMatchObject({
                escrowIncluded: true,
                escrowAmount: 35017
            });

            const blackhawk = res.accounts.find(a => a.name === '304 Blackhawk');
            expect(blackhawk?.mappedType).toBe(AccountType.Mortgage);
            expect(blackhawk?.loanDetails?.originalAmount).toBe(32290000);
            expect(blackhawk?.loanDetails?.interestRate).toBeCloseTo(0.04, 4);
            expect(blackhawk?.loanDetails?.principalAndInterestPayment).toBe(154157);
            expect(blackhawk?.loanDetails?.monthlyPayment).toBe(290985);
            expect(blackhawk?.loanDetails?.metadata).toMatchObject({
                escrowIncluded: true,
                escrowAmount: 136828,
                propertyValue: 32290000
            });

            // Verify Credit Cards ("Amazon Prime Visa", "Citi Double Cash Card") include APR, limits, and promo windows
            const amazonVisa = res.accounts.find(a => a.name === 'Amazon Prime Visa');
            expect(amazonVisa?.mappedType).toBe(AccountType.Credit);
            expect(amazonVisa?.institutionName).toBe('Chase');
            expect(amazonVisa?.creditCardDetails?.creditLimit).toBe(50000);
            expect(amazonVisa?.creditCardDetails?.interestRate).toBeCloseTo(0.2924, 4);

            const citiDoubleCash = res.accounts.find(a => a.name === 'Citi Double Cash Card');
            expect(citiDoubleCash?.mappedType).toBe(AccountType.Credit);
            expect(citiDoubleCash?.creditCardDetails?.creditLimit).toBe(1010000);
            expect(citiDoubleCash?.creditCardDetails?.interestRate).toBeCloseTo(0.2698, 4);
            expect(citiDoubleCash?.creditCardDetails?.promotionalRates).toHaveLength(1);
            expect(citiDoubleCash?.creditCardDetails?.promotionalRates[0]).toMatchObject({
                apr: 0,
                endDate: '2027-03-19',
                postPromoApr: 0.2698
            });

            // Verify Categories include fullName and isHidden metadata (294 visible non-root categories)
            const visibleNonRootCats = res.categories.filter(
                c => !c.isHidden && c.mnyCategoryId !== 130 && c.mnyCategoryId !== 131
            );
            expect(visibleNonRootCats).toHaveLength(294);
            const autoInsurance = res.categories.find(c => c.fullName === 'Automobile : Insurance');
            expect(autoInsurance).toBeDefined();

            // Verify Payees include primary (fHidden === false, 399 payees) and originating account metadata
            const primaryPayees = res.payees.filter(p => p.isHidden === false);
            expect(primaryPayees).toHaveLength(399);
            const contactsPayee = primaryPayees.find(p => p.name === '1-800 Contacts');
            expect(contactsPayee).toBeDefined();

            // Verify Recurring Schedules extracted from BILL table (45 active recurring series)
            expect(res.recurringSchedules).toBeDefined();
            expect(res.recurringSchedules).toHaveLength(45);
            const paramountBill = res.recurringSchedules?.find(s => s.payee === 'Paramount+');
            expect(paramountBill).toBeDefined();
            expect(paramountBill?.amount).toBe(-13999);
            expect(paramountBill?.accountName).toBe('Chase Checking');

            const disneyBill = res.recurringSchedules?.find(s => s.payee === 'Disney+');
            expect(disneyBill).toBeDefined();
            expect(disneyBill?.amount).toBe(-18999);
            expect(disneyBill?.accountName).toBe('Chase Checking');
        });
    }
);
