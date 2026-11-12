import { Injectable, inject, signal } from '@angular/core';
import { AccountType } from '../../core/domain/types';
import type { IMnyAccount, IMnyCategory, IMnyPayee } from '../../core/parsers/MNYParser';
import { GeminiService } from '../gemini/gemini.service';

export interface IAiAccountTypeClassification {
    mnyAccountId: number;
    accountType: AccountType;
    aiClassified: boolean;
    reason: string;
}

export interface IReconciledPayeeGroup {
    /** Primary representative mnyPayeeId */
    mnyPayeeId: number;
    /** Primary raw name */
    name: string;
    /** Canonical AI-cleaned & reconciled payee name */
    canonicalName: string;
    /** Populated when canonicalName differs from raw name or when multiple duplicates were merged */
    cleanedName?: string | undefined;
    /** All mnyPayeeIds merged into this canonical payee */
    mergedPayeeIds: Array<number>;
    /** Distinct raw names merged into this canonical payee */
    mergedOriginalNames: Array<string>;
    /** Number of raw payees reconciled into this single entry */
    mergedCount: number;
    /** True when 2+ duplicate or near-duplicate payees were reconciled */
    isReconciledDuplicate: boolean;
    /** Distinct originating mnyAccountIds where this payee or its merged aliases appear */
    accountIds?: Array<number> | undefined;
    /** Distinct originating account names where this payee or its merged aliases appear */
    accountNames?: Array<string> | undefined;
    /** True if at least one merged payee is an explicit MS Money primary payee (fHidden === false) */
    hasPrimaryPayee?: boolean | undefined;
    /** Total ledger transactions referencing this payee group */
    transactionCount?: number | undefined;
}

/**
 * Service providing rule-based and AI-assisted cleaning,
 * near-duplicate reconciliation, deduplication, and harmonization
 * for Microsoft Money payees and categories.
 */
@Injectable({ providedIn: 'root' })
export class AiMnyEnhancerService {
    private readonly geminiService = inject(GeminiService, { optional: true });

    readonly isEnhancing = signal<boolean>(false);
    readonly aiEnabled = signal<boolean>(true);
    readonly enhancedPayeeNames = signal<Map<number, string>>(new Map<number, string>());
    readonly enhancedPayeeByRawName = signal<Map<string, string>>(new Map<string, string>());
    readonly reconciledPayeeGroups = signal<Array<IReconciledPayeeGroup>>([]);
    readonly enhancedCategoryNames = signal<Map<number, string>>(new Map<number, string>());
    readonly accountTypeClassifications = signal<Map<number, IAiAccountTypeClassification>>(
        new Map<number, IAiAccountTypeClassification>()
    );
    private _ignoredNumericPayeeCount = 0;
    private _ignoredOrphanHiddenPayeeCount = 0;

    ignoredNumericPayeeCount(): number {
        return this._ignoredNumericPayeeCount;
    }

    ignoredOrphanHiddenPayeeCount(): number {
        return this._ignoredOrphanHiddenPayeeCount;
    }

    // Common merchant and financial institution normalization lookup
    // Ordered from most specific sub-brand to general parent brand
    private readonly KNOWN_MERCHANT_PATTERNS: Array<{ pattern: RegExp; canonical: string }> = [
        // Amazon sub-brands BEFORE generic Amazon
        { pattern: /\bamazon\s*prime\s*visa\b/i, canonical: 'Amazon Prime Visa' },
        { pattern: /\bamazon\s*fresh/i, canonical: 'Amazon Fresh' },
        { pattern: /\bamazon\s*kids/i, canonical: 'Amazon Kids+' },
        {
            pattern: /\bamazon\s*web\s*services|\baws\.amazon/i,
            canonical: 'Amazon Web Services'
        },
        {
            pattern:
                /\b(?:amazon|amzn|amz)\b|^(?:amazon|amzn|amz\*)|amazoncom|amzncombill|amzn\.com|amazon\.com|amazon\s*mktp|amazon\s*marke?tplace/i,
            canonical: 'Amazon'
        },

        // Google sub-brands BEFORE generic Google
        {
            pattern: /\bgoogle\s*one\s*\(\s*meds\.com\s*\)/i,
            canonical: 'Google One (Meds.com)'
        },
        { pattern: /\bgoogle\s*\*?\s*one\b/i, canonical: 'Google One' },
        { pattern: /\bgoogle\s*(?:google\s*)?fi\b/i, canonical: 'Google Fi' },
        { pattern: /\bgoogle\s*cloud|\bgooglecloud/i, canonical: 'Google Cloud' },
        {
            pattern: /\byoutube\s*premi|\bgoogle\s*\*?\s*youtube/i,
            canonical: 'YouTube Premium'
        },
        {
            pattern: /\b(?:google\s*\*|google\s*play)\b|^google$/i,
            canonical: 'Google'
        },

        // Apple sub-brands BEFORE generic Apple
        { pattern: /\bapple\s*tv\b/i, canonical: 'Apple TV' },
        {
            pattern: /\b(?:apple\.com|itunes|apple\s*store)\b|^apple$/i,
            canonical: 'Apple'
        },

        // Financial & Credit Cards
        {
            pattern: /\b(american\s*express|amex(?:\s*epayment|\s*travel)?)\b/i,
            canonical: 'American Express'
        },
        {
            pattern: /\b(hsbc\s*retail\s*services)\b/i,
            canonical: 'HSBC Retail Services'
        },
        {
            pattern: /\b(hsbc\s*bank|hsbc\s*card)\b/i,
            canonical: 'HSBC'
        },

        // Retail, Grocery, Dining & Services
        { pattern: /\b1[\s-]*800[\s-]*contacts/i, canonical: '1-800 Contacts' },
        { pattern: /\b7[\s-]*eleven\b/i, canonical: '7-Eleven' },
        { pattern: /\b(wal-?mart|wm\s*supercenter|walmart\.com)\b/i, canonical: 'Walmart' },
        {
            pattern: /\b(target|tgt|target\.com)\b(?!\s+balance)/i,
            canonical: 'Target'
        },
        {
            pattern: /\b(trader\s*joe(?:'?s|\s+s)?)\b/i,
            canonical: "Trader Joe's"
        },
        { pattern: /\b(whole\s*foods|wholefds)/i, canonical: 'Whole Foods Market' },
        { pattern: /\b(costco|costco\s*whse)/i, canonical: 'Costco' },
        { pattern: /\b(starbucks|sbux)/i, canonical: 'Starbucks' },
        { pattern: /\b(dunkin|dunkin\s*donuts)/i, canonical: "Dunkin'" },
        { pattern: /\b(mcdonald(?:'?s|\s+s)?|\bmcd\b)/i, canonical: "McDonald's" },
        { pattern: /\bjimmy\s*john(?:['`]?s|\s+s)?/i, canonical: "Jimmy John's" },
        { pattern: /\b(chipotle)/i, canonical: 'Chipotle' },
        { pattern: /\b(panera|panera\s*bread)/i, canonical: 'Panera Bread' },
        { pattern: /\bportillo(?:'?s|\s+s)?\b/i, canonical: "Portillo's" },
        { pattern: /\bpotbelly\b/i, canonical: 'Potbelly' },
        { pattern: /\bculver(?:'?s|\s+s)?\b/i, canonical: "Culver's" },
        { pattern: /\b(uber|uber\s*trip|uber\s*eats)\b/i, canonical: 'Uber' },
        { pattern: /\b(lyft|lyft\s*ride)\b/i, canonical: 'Lyft' },
        { pattern: /\b(shell|shell\s*oil|shell\s*station)\b/i, canonical: 'Shell' },
        { pattern: /\b(bp|bp\s*connect)\b|^bp\d+/i, canonical: 'BP' },
        { pattern: /\b(chevron)\b/i, canonical: 'Chevron' },
        { pattern: /\b(exxon|mobil|exxonmobil)\b/i, canonical: 'ExxonMobil' },
        { pattern: /\bspeedway\b/i, canonical: 'Speedway' },
        { pattern: /\b(walgreen'?s?)\b/i, canonical: 'Walgreens' },
        { pattern: /\b(cvs|cvs\s*pharmacy|cvs\s*store)\b/i, canonical: 'CVS Pharmacy' },
        { pattern: /\b(home\s*depot|the\s*home\s*depot)/i, canonical: 'The Home Depot' },
        { pattern: /\b(lowe(?:'?s|\s+s))\b/i, canonical: "Lowe's" },
        { pattern: /\b(menard'?s?)\b/i, canonical: 'Menards' },
        { pattern: /\bace\s*hardware\b/i, canonical: 'Ace Hardware' },
        { pattern: /\b(best\s*buy|\bbby\b)/i, canonical: 'Best Buy' },
        {
            pattern: /\bjewel(?!er)(?:\s*[-\s]\s*osco|\s+foods?|\b)/i,
            canonical: 'Jewel-Osco'
        },
        {
            pattern: /\bdominick(?:'?s|\s+s)?\b|\bdominicks\s*(?:stor|fine)/i,
            canonical: "Dominick's"
        },
        { pattern: /\bmariano(?:'?s|\s+s)?\b/i, canonical: "Mariano's" },
        { pattern: /\b(meijer)\b/i, canonical: 'Meijer' },
        { pattern: /\baldi\b/i, canonical: 'Aldi' },
        { pattern: /\bnordstrom(?!\s+bank)/i, canonical: 'Nordstrom' },
        { pattern: /\bmacy(?:'?s|\s+s)?\b/i, canonical: "Macy's" },
        {
            pattern: /\bmarshall\s*(?:field(?:'?s|\s+s)?|flds)/i,
            canonical: "Marshall Field's"
        },
        { pattern: /\bkohl(?:'?s|\s+s)?\b/i, canonical: "Kohl's" },
        { pattern: /\bjc\s*penney/i, canonical: 'JCPenney' },
        { pattern: /\baveda\b/i, canonical: 'Aveda' },
        {
            pattern: /\bamc\s*(?:theat|river\s*east|south\s*barr|online|kansas\s*city|\d{4,})/i,
            canonical: 'AMC Theaters'
        },
        { pattern: /\bsports\s*auth/i, canonical: 'Sports Authority' },
        { pattern: /\bventra\b/i, canonical: 'Ventra' },
        { pattern: /\bsignmeup\.com/i, canonical: 'SignMeUp.com' },
        { pattern: /\b(netflix|netflix\.com)\b/i, canonical: 'Netflix' },
        { pattern: /\b(spotify|spotify\.com)\b/i, canonical: 'Spotify' },
        { pattern: /\b(microsoft|msft)\b/i, canonical: 'Microsoft' },
        { pattern: /\b(at&t|att\b|att\s*wireless)/i, canonical: 'AT&T' },
        { pattern: /\b(verizon|vzw)\b/i, canonical: 'Verizon' },
        { pattern: /\b(t-mobile|tmobile)\b/i, canonical: 'T-Mobile' },
        { pattern: /\b(comcast|xfinity)\b/i, canonical: 'Xfinity / Comcast' },
        { pattern: /\bcommonwealth\s*ed|\bcomed\b/i, canonical: 'Commonwealth Edison' },
        { pattern: /\bnicor\b/i, canonical: 'Nicor' },
        { pattern: /\ballstate\b/i, canonical: 'Allstate' },
        { pattern: /\b(chase\s*atm|atm\s*withdrawal\s*chase)\b/i, canonical: 'Chase ATM' },
        { pattern: /\b(usps|post\s*office|postal\s*service)\b/i, canonical: 'USPS' },
        { pattern: /\b(fedex)\b/i, canonical: 'FedEx' },
        { pattern: /\b(ups|the\s*ups\s*store)\b/i, canonical: 'The UPS Store' },
        {
            pattern: /^insufficient\s+funds\s+fee/i,
            canonical: 'Insufficient Funds Fee'
        },
        {
            pattern: /^balance\s+transfer(?:\s*-\s*tra|\s+fee|\s+trans)/i,
            canonical: 'Balance Transfer Fee'
        }
    ];

    // Preserved uppercase acronyms during Title Case normalization
    private readonly UPPERCASE_ACRONYMS = new Set<string>([
        'HSBC',
        'ATM',
        'ACH',
        'POS',
        'USPS',
        'UPS',
        'CVS',
        'BP',
        'BMO',
        'USAA',
        'IRS',
        'LLC',
        'INC',
        'USA',
        'IKEA',
        'IBM',
        'HOA',
        'IRA',
        'ADT',
        'AMC',
        'HRET',
        'TV',
        'LG'
    ]);

    // Common POS abbreviation expansions used for near-duplicate reconciliation
    private readonly ABBREVIATION_MAP: Record<string, string> = {
        bk: 'bank',
        tr: 'trust',
        svc: 'service',
        svcs: 'services',
        srv: 'service',
        srvs: 'services',
        mkt: 'market',
        mrkt: 'market',
        rest: 'restaurant',
        restr: 'restaurant',
        assoc: 'associates',
        assn: 'association',
        dept: 'department',
        intl: 'international',
        hosp: 'hospital',
        med: 'medical',
        ctr: 'center',
        cntr: 'center',
        ins: 'insurance',
        fin: 'financial',
        fncl: 'financial',
        mgmt: 'management',
        mgt: 'management',
        pharm: 'pharmacy',
        whse: 'warehouse',
        co: 'company',
        corp: 'corporation',
        ft: 'fort',
        mt: 'mount',
        st: 'saint'
    };

    /**
     * Detects purely numeric, check/reference number, or date-range noise payees
     * that originate from raw statement uploads and should be ignored.
     */
    isNumericOrJunkPayee(raw: string): boolean {
        if (!raw) return true;
        const trimmed = raw.trim();
        if (trimmed.length === 0) return true;

        // Pure numbers, dates, or punctuation (e.g., "0000001009", "11/15/97 - 11/21/97", "#1042")
        if (/^[\d\s.,;:/\\~'"`+#*$()-]+$/.test(trimmed)) {
            return true;
        }

        // Zero-padded reference / check numbers (e.g., "0000001012A")
        if (/^0{3,}\d+[A-Z0-9]*$/i.test(trimmed)) {
            return true;
        }

        // Check / deposit / reference ID strings without real merchant names
        if (
            /^(?:check|chk|deposit\s*id(?:\s*number)?|ref|reference|seq|sequence|trace)\s*#?\s*[\d-]+$/i.test(
                trimmed
            )
        ) {
            return true;
        }

        return false;
    }

    /**
     * Cleans a raw payee string by stripping leading/trailing punctuation,
     * transaction metadata, POS prefixes, store IDs, telephone numbers,
     * and truncated or full location codes.
     */
    cleanPayeeName(raw: string): string {
        if (!raw || raw.trim().length === 0) return '';
        let cleaned = raw.trim();

        // Preserve transfer markers (e.g. "<Transfer To : Capital One 360>", "Transfer: Chase Checking")
        if (/^<transfer\s+/i.test(cleaned) || /^transfer:/i.test(cleaned)) {
            return cleaned;
        }

        // 0. Strip leading noise punctuation (e.g., ".American Express", ".Balance Transfer Fee")
        cleaned = cleaned.replace(/^[.,;:/\\~'"`+#*-]+\s*/, '');

        // 0b. Preserve explicit composite processor/merchant payees BEFORE generic merchant matching
        // (e.g. "Affirm/Amazon", "Affirm/LG Electronics", "Synchrony/Google", "AccessOne/Loyola", "Chase Pay in 4 - Target")
        if (/^(?:affirm|synchrony|accessone)\s*\/\s*\S+/i.test(cleaned)) {
            return cleaned.replace(/\s*\/\s*/, '/');
        }
        if (/^chase\s+pay\s+in\s+4\s*-\s*\S+/i.test(cleaned)) {
            return cleaned.replace(/\s*-\s*/, ' - ');
        }

        // 1. Strip mobile wallet, P2P, and POS / Bank transaction prefixes
        cleaned = cleaned.replace(
            /^(?:GGLPAY\s+|APLPAY\s+|GOOGLE\s+PAY\s+|APPLE\s+PAY\s+|ZELLE\s+PAYMENT\s+(?:TO|FROM)\s+|VENMO\s*\*?\s*|CASH\s+APP\s*\*?\s*|SQ\s*\*|TST\s*\*\s*|TST\s+|PAYPAL\s*\*|CHECKCRD\s*\d*|CHECKCARD\s*\d*|PURCHASE\s*|POS\s*DEBIT\s*|POS\s*PURCHASE\s*|POS\s*|DEBIT\s*CARD\s*|DEBIT\s*|CREDIT\s*|CARD\s*|ACH\s*(?:DEBIT|CREDIT|PMT|PAYMENT)?\s*|ATM\s*WITHDRAWAL\s*|ATM\s*|DIRECT\s*DEP\s*|ONLINE\s*PMT\s*|WEB\s*PMT\s*|WD\s*|DEPOSIT\s*)/i,
            ''
        );

        // Strip leading punctuation again in case it followed a prefix
        cleaned = cleaned.replace(/^[.,;:/\\~'"`+#*-]+\s*/, '');

        // 2. Match against canonical merchant patterns (sub-brands checked before parent brands)
        for (const item of this.KNOWN_MERCHANT_PATTERNS) {
            if (item.pattern.test(cleaned)) {
                return item.canonical;
            }
        }

        // 3. Strip concatenated store/register codes glued to city names (e.g. "022558CHICAGO", "QCHICAGO", "0000CHICAGO")
        cleaned = cleaned.replace(
            /\s+(?:#?\d+[A-Z0-9]*|[Q0]+)(?:CHICAGO|ORLAND\s*PARK|JOLIET|MOKENA|FRANKFORT|NILES|EVANSTON|SCHAUMBURG|OAK\s*PARK|RIVERSIDE|LA\s*GRANGE|BERWYN|BROOKFIELD|TINLEY\s*PARK|NEW\s*LENOX|LOCKPORT|WOOD\s*DALE|DOWNERS\s*GROVE|OAK\s*BROOK|ARLINGTON|BUFFALO\s*GROVE|LAKE\s*FOREST|DEKALB|KENOSHA|SEATTLE|DALLAS|ATLANTA|BOSTON|DENVER|WILMINGTON)\b.*$/i,
            ''
        );

        // 4. Strip trailing store / terminal numbers (e.g., #104, #0412, *2X1Y4, EC#807)
        cleaned = cleaned.replace(/\s*(?:EC)?#\s*[A-Z0-9-]+/gi, '');
        cleaned = cleaned.replace(/\s*\*\s*[A-Z0-9]+/gi, '');

        // 5. Strip phone numbers (e.g., 402-935-7733, 800-555-0199, (800) 644 483)
        cleaned = cleaned.replace(/\s*(?:\(\d{3}\)|\b\d{3})[-.\s]*\d{3}[-.\s]*\d{3,4}\b/g, '');

        // 6. Strip known POS-truncated or full multi-word city/location suffixes BEFORE state code stripping
        cleaned = cleaned.replace(
            /\s+\b(?:CITY\s+OF\s+INDUSTRY|CITY\s+OF\s+IN(?:D)?|CITY\s+OF|FT\.?\s+LAUDERD[A-Z]*|FORT\s+LAUDERD[A-Z]*|SALT\s+LAKE\s+CIT[A-Z]*|SAN\s+FRANCISC[A-Z]*|LOS\s+ANGELES|NEW\s+YORK|LAS\s+VEGAS|DES\s+MOINES|SIOUX\s+FALLS|CAROL\s+STREAM|THE\s+LAKES|ARLINGTON\s+HTS|ARLINGTON\s+HEIGHTS|ARLINGTON\s+HG|ELK\s+GROVE\s+VLG|ELK\s+GROVE\s+VI(?:LLAGE)?|DOWNERS\s+GROVE?|BUFFALO\s+GRO(?:VE)?|OAK\s+BROOK|OAK\s+PARK|OAK\s+FOREST|ORLAND\s+PARK|ORLAND\s+PK|TINLEY\s+PARK|FOREST\s+PARK|WOOD\s+DALE?|NEW\s+LENOX|LA\s+GRANGE(?:\s+PA)?|NORTH\s+RIVER(?:SIDE)?|HARWOOD\s+HTS|GLEN\s+ELLYN|LAKE\s+FOREST|LAKE\s+GENEVA|SOUTH\s+BARRI(?:NGTON|N)?|ST\.?\s+CHARLES|ST\.?\s+LOUIS|KANSAS\s+CITY|N\s+CANTON|W\s+CHICAGO|WEST\s+CHICAGO)(?:\s+[A-Z]{1,2})?(?:\s+\d{5}(?:-\d{4})?)?$/i,
            ''
        );

        // 7. Strip trailing 2-letter state abbreviations with or without zip code
        cleaned = cleaned.replace(
            /\s+\b(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)(?:\s+\d{5}(?:-\d{4})?)?\b$/i,
            ''
        );

        // 8. Strip trailing single-word city names common in bank feeds
        cleaned = cleaned.replace(
            /\s+\b(?:SEATTLE|CHICAGO|DALLAS|ATLANTA|BOSTON|DENVER|WILMINGTON|CHARLOTTE|COLUMBUS|OMAHA|NEWARK|PALATINE|NAPERVILLE|SCHAUMBURG|SCHAUMBERG|EVANSTON|SKOKIE|LINCOLNWOOD|NILES|MOKENA|FRANKFORT|JOLIET|LOCKPORT|LEMONT|RIVERSIDE|BERWYN|BROOKFIELD|MAYWOOD|WESTCHESTER|HODGKINS|HINSDALE|WOODRIDGE|LOMBARD|WHEATON|ADDISON|ITASCA|CRAGIN|NORTHBROOK|DEKALB|BRADLEY|CARTERVILLE|KENOSHA|RICHFIELD|FARMINGDALE?|BETHLEHEM|MIDDLETOWN|OAKLAND|PHOENIX|MINNEAPOLIS|CINCINNATI|PITTSBURGH|PHILADELPHIA|HOUSTON|AUSTIN|MIAMI|ORLANDO|TAMPA)$/i,
            ''
        );

        // 9. Remove trailing transaction reference codes (e.g. 57441412, 0004924A, 0237)
        cleaned = cleaned.replace(/\s+\d{3,}[A-Z0-9]*\b/gi, '');

        // 10. Rejoin separated possessive "'s" (e.g., "Houlihan S" -> "Houlihan's", "Zwick S" -> "Zwick's")
        cleaned = cleaned.replace(/\b([A-Za-z]{3,})\s+[Ss]\b/g, "$1's");

        // 11. Strip dangling trailing prepositions/articles left behind by POS truncation
        cleaned = cleaned.replace(/\s+\b(?:OF|IN|AT|TO|FOR|FROM|BY|AND|OR|THE|FT|ST|MT)$/i, '');

        // 12. Clean up extra punctuation and whitespace
        cleaned = cleaned
            .replace(/^[.,;:/\\~'"`+#*-]+\s*/, '')
            .replace(/\s*[.,;:/\\~'"`+#*-]+$/, '')
            .replace(/[*#_]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (cleaned.length === 0) return raw.trim();

        // 13. Convert to clean Title Case with acronym preservation
        if (
            cleaned === cleaned.toUpperCase() ||
            cleaned === cleaned.toLowerCase() ||
            this.hasIrregularCasing(cleaned)
        ) {
            cleaned = this.toTitleCase(cleaned);
        } else {
            cleaned = this.normalizeAcronymsInString(cleaned);
        }

        return cleaned;
    }

    /**
     * Reconciles and deduplicates a list of MS Money payees:
     * 1. Honors MS Money's native `parentPayeeId` (`hpayParent`) alias links.
     * 2. Filters out unreferenced hidden orphan aliases and numeric/junk statement strings.
     * 3. Groups exact and near-duplicate variants into canonical payee records,
     *    preserving originating `accountIds` and `accountNames`.
     */
    reconcilePayees(payees: Array<IMnyPayee>): Array<IReconciledPayeeGroup> {
        if (!payees || payees.length === 0) {
            this._ignoredNumericPayeeCount = 0;
            this._ignoredOrphanHiddenPayeeCount = 0;
            return [];
        }

        const payeeById = new Map<number, IMnyPayee>();
        const parentIdsReferenced = new Set<number>();
        for (const p of payees) {
            payeeById.set(p.mnyPayeeId, p);
            if (p.parentPayeeId !== null && p.parentPayeeId !== undefined && p.parentPayeeId >= 0) {
                parentIdsReferenced.add(p.parentPayeeId);
            }
        }

        const resolveRootParent = (p: IMnyPayee): IMnyPayee => {
            let curr = p;
            const seen = new Set<number>();
            while (
                curr.isHidden === true &&
                curr.parentPayeeId !== null &&
                curr.parentPayeeId !== undefined &&
                !seen.has(curr.mnyPayeeId)
            ) {
                seen.add(curr.mnyPayeeId);
                const parent = payeeById.get(curr.parentPayeeId);
                if (parent) {
                    curr = parent;
                } else {
                    break;
                }
            }
            return curr;
        };

        interface IPayeeBucket {
            canonicalName: string;
            fingerprint: string;
            expandedFingerprint: string;
            firstToken: string;
            items: Array<{ payee: IMnyPayee; initialCleaned: string; isPrimary: boolean }>;
            nameFrequency: Map<string, number>;
            primaryNames: Set<string>;
        }

        const bucketByFingerprint = new Map<string, IPayeeBucket>();
        let numericIgnored = 0;
        let orphanHiddenIgnored = 0;

        for (const p of payees) {
            const rootTarget = resolveRootParent(p);

            // If this is a hidden payee with no parent, no transactions, and not referenced as a parent,
            // it is an unreferenced orphan alias in MS Money's PAY table.
            const hasRichMetadata = p.isHidden !== undefined || p.transactionCount !== undefined;
            if (
                hasRichMetadata &&
                p.isHidden === true &&
                rootTarget.mnyPayeeId === p.mnyPayeeId &&
                (p.transactionCount ?? 0) === 0 &&
                (p.accountIds?.length ?? 0) === 0 &&
                !parentIdsReferenced.has(p.mnyPayeeId)
            ) {
                orphanHiddenIgnored++;
                continue;
            }

            // Ignore numeric or junk payees unless they explicitly point to a valid non-numeric parent payee
            const targetName = rootTarget.name;
            if (this.isNumericOrJunkPayee(targetName)) {
                numericIgnored++;
                continue;
            }

            const isPrimary = rootTarget.isHidden === false;
            const initialCleaned = isPrimary
                ? this.cleanPayeeName(targetName) || targetName.trim()
                : this.cleanPayeeName(targetName) || targetName.trim();
            if (this.isNumericOrJunkPayee(initialCleaned)) {
                numericIgnored++;
                continue;
            }

            const fp = this.getPayeeFingerprint(initialCleaned);
            const key = fp || initialCleaned.toLowerCase();

            let bucket = bucketByFingerprint.get(key);
            if (!bucket) {
                const expFp = this.expandAbbreviations(fp);
                const firstToken = (expFp.split(' ')[0] ?? '').trim();
                bucket = {
                    canonicalName: isPrimary ? targetName.trim() : initialCleaned,
                    fingerprint: fp,
                    expandedFingerprint: expFp,
                    firstToken,
                    items: [],
                    nameFrequency: new Map<string, number>(),
                    primaryNames: new Set<string>()
                };
                bucketByFingerprint.set(key, bucket);
            }

            const candidateDisplayName = isPrimary ? targetName.trim() : initialCleaned;
            if (isPrimary) {
                bucket.primaryNames.add(targetName.trim());
            }
            bucket.items.push({ payee: p, initialCleaned: candidateDisplayName, isPrimary });
            bucket.nameFrequency.set(
                candidateDisplayName,
                (bucket.nameFrequency.get(candidateDisplayName) ?? 0) + (isPrimary ? 100 : 1)
            );
        }

        this._ignoredNumericPayeeCount = numericIgnored;
        this._ignoredOrphanHiddenPayeeCount = orphanHiddenIgnored;

        // Select the best canonical display name within each initial bucket
        for (const bucket of bucketByFingerprint.values()) {
            bucket.canonicalName = this.pickBestCanonicalName(
                bucket.nameFrequency,
                bucket.primaryNames
            );
        }

        // Pass 2: Near-duplicate ("almost duplicate") clustering within shared leading token groups
        const allBuckets = Array.from(bucketByFingerprint.values()).sort((a, b) =>
            a.fingerprint.localeCompare(b.fingerprint)
        );

        const bucketsByFirstToken = new Map<string, Array<IPayeeBucket>>();
        const ungroupedBuckets: Array<IPayeeBucket> = [];

        for (const b of allBuckets) {
            if (b.firstToken.length >= 3) {
                const list = bucketsByFirstToken.get(b.firstToken);
                if (list) {
                    list.push(b);
                } else {
                    bucketsByFirstToken.set(b.firstToken, [b]);
                }
            } else {
                ungroupedBuckets.push(b);
            }
        }

        const mergedBuckets: Array<IPayeeBucket> = [...ungroupedBuckets];

        for (const group of bucketsByFirstToken.values()) {
            if (group.length === 1) {
                const single = group[0];
                if (single) {
                    mergedBuckets.push(single);
                }
                continue;
            }

            const clusters: Array<IPayeeBucket> = [];
            for (const candidate of group) {
                let matchedCluster: IPayeeBucket | null = null;
                for (const cluster of clusters) {
                    // Never merge two distinct MS Money primary payees (fHidden === false) with different names
                    // e.g. "Affirm/Amazon" vs "Affirm/LG Electronics", "Blerd's Underground" vs "Blerds Underground Comicbooks"
                    if (
                        cluster.primaryNames.size > 0 &&
                        candidate.primaryNames.size > 0 &&
                        cluster.canonicalName.toLowerCase() !==
                            candidate.canonicalName.toLowerCase()
                    ) {
                        const fpA = cluster.expandedFingerprint;
                        const fpB = candidate.expandedFingerprint;
                        if (fpA !== fpB) {
                            continue;
                        }
                    }

                    const mergeResolution = this.resolveNearDuplicateBuckets(cluster, candidate);
                    if (mergeResolution) {
                        matchedCluster = cluster;
                        for (const pName of candidate.primaryNames) {
                            cluster.primaryNames.add(pName);
                        }
                        cluster.items.push(...candidate.items);
                        for (const [k, count] of candidate.nameFrequency.entries()) {
                            cluster.nameFrequency.set(
                                k,
                                (cluster.nameFrequency.get(k) ?? 0) + count
                            );
                        }
                        cluster.canonicalName =
                            cluster.primaryNames.size > 0
                                ? this.pickBestCanonicalName(
                                      cluster.nameFrequency,
                                      cluster.primaryNames
                                  )
                                : mergeResolution.canonicalName;
                        cluster.fingerprint = mergeResolution.fingerprint;
                        cluster.expandedFingerprint = mergeResolution.expandedFingerprint;
                        break;
                    }
                }
                if (!matchedCluster) {
                    clusters.push(candidate);
                }
            }
            mergedBuckets.push(...clusters);
        }

        // Build final sorted IReconciledPayeeGroup list
        const resultGroups: Array<IReconciledPayeeGroup> = [];
        for (const bucket of mergedBuckets) {
            const sortedItems = [...bucket.items].sort((a, b) => {
                if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
                return a.payee.mnyPayeeId - b.payee.mnyPayeeId;
            });
            const firstItem = sortedItems[0];
            if (!firstItem) continue;
            const primary = firstItem.payee;
            const mergedPayeeIds = sortedItems.map(i => i.payee.mnyPayeeId);
            const distinctOriginals = Array.from(
                new Set(sortedItems.map(i => i.payee.name.trim()))
            ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

            const acctIdSet = new Set<number>();
            const acctNameSet = new Set<string>();
            let totalTxCount = 0;
            let hasPrimaryPayee = false;

            for (const item of sortedItems) {
                if (item.payee.isHidden === false) {
                    hasPrimaryPayee = true;
                }
                for (const aid of item.payee.accountIds ?? []) {
                    acctIdSet.add(aid);
                }
                for (const aname of item.payee.accountNames ?? []) {
                    acctNameSet.add(aname);
                }
                totalTxCount += item.payee.transactionCount ?? 0;
            }

            const canonicalName = bucket.canonicalName;
            const isReconciledDuplicate = sortedItems.length > 1;
            const hasNameChange =
                isReconciledDuplicate ||
                sortedItems.some(i => i.payee.name.trim() !== canonicalName);

            resultGroups.push({
                mnyPayeeId: primary.mnyPayeeId,
                name: primary.name,
                canonicalName,
                cleanedName: hasNameChange ? canonicalName : undefined,
                mergedPayeeIds,
                mergedOriginalNames: distinctOriginals,
                mergedCount: sortedItems.length,
                isReconciledDuplicate,
                accountIds: Array.from(acctIdSet).sort((a, b) => a - b),
                accountNames: Array.from(acctNameSet).sort((a, b) =>
                    a.localeCompare(b, undefined, { sensitivity: 'base' })
                ),
                hasPrimaryPayee,
                transactionCount: totalTxCount
            });
        }

        resultGroups.sort((a, b) =>
            a.canonicalName.localeCompare(b.canonicalName, undefined, { sensitivity: 'base' })
        );

        return resultGroups;
    }

    /**
     * Cleans a category name by normalizing capitalization and separators.
     */
    cleanCategoryName(raw: string): string {
        if (!raw || raw.trim().length === 0) return '';
        let cleaned = raw.trim();

        // Convert ALL-CAPS root or category to Title Case (e.g. EXPENSE -> Expense, AUTO:FUEL -> Auto: Fuel)
        if (cleaned === cleaned.toUpperCase() || cleaned === cleaned.toLowerCase()) {
            cleaned = this.toTitleCase(cleaned);
        }

        // Standardize subcategory separators to " : "
        cleaned = cleaned
            .replace(/\s*:\s*/g, ': ')
            .replace(/\s*\/\s*/g, ' / ')
            .trim();

        return cleaned;
    }

    /**
     * Retrieves the enhanced payee name by ID or by raw name string.
     */
    getEnhancedPayeeName(idOrName: number | string): string {
        if (typeof idOrName === 'number') {
            return this.enhancedPayeeNames().get(idOrName) ?? '';
        }
        const normalizedRaw = idOrName.trim().toLowerCase();
        const fromReconciledMap = this.enhancedPayeeByRawName().get(normalizedRaw);
        if (fromReconciledMap) {
            return fromReconciledMap;
        }
        return this.cleanPayeeName(idOrName);
    }

    /**
     * Retrieves the enhanced category name by ID or by raw name string.
     */
    getEnhancedCategoryName(idOrName: number | string): string {
        if (typeof idOrName === 'number') {
            return this.enhancedCategoryNames().get(idOrName) ?? '';
        }
        return this.cleanCategoryName(idOrName);
    }

    /**
     * Classifies an MS Money account into Path Logic's `AccountType` using AI semantic heuristics
     * across account name, institution name, loan/credit-card metadata, and MS Money `mnyType`.
     */
    classifyAccountType(acct: IMnyAccount): IAiAccountTypeClassification {
        const cached = this.accountTypeClassifications().get(acct.mnyAccountId);
        if (cached) return cached;

        const combined =
            `${acct.name} ${acct.institutionName ?? ''} ${acct.notes ?? ''}`.toLowerCase();

        // 1. Explicit Loan / Mortgage / Auto Loan metadata or subtype
        if (acct.loanDetails) {
            const meta = acct.loanDetails.metadata;
            if (
                meta &&
                ('vehicleMake' in meta || 'vehicleModel' in meta || 'vehicleYear' in meta)
            ) {
                return {
                    mnyAccountId: acct.mnyAccountId,
                    accountType: AccountType.AutoLoan,
                    aiClassified: true,
                    reason: 'AI classified as Auto Loan from vehicle metadata'
                };
            }
            if (
                acct.mappedType === AccountType.Mortgage ||
                /\b(mortgage|condo|home\s*equity|heloc|residence|house|townhouse)\b/.test(combined)
            ) {
                return {
                    mnyAccountId: acct.mnyAccountId,
                    accountType: AccountType.Mortgage,
                    aiClassified:
                        acct.mnyType !== 5 || !acct.name.toLowerCase().includes('mortgage'),
                    reason: 'AI classified as Mortgage from property & amortization structure'
                };
            }
            if (
                acct.mappedType === AccountType.AutoLoan ||
                /\b(auto|vehicle|car|honda|toyota|infiniti|ford|nissan|subaru|g35|civic|accord)\b/.test(
                    combined
                )
            ) {
                return {
                    mnyAccountId: acct.mnyAccountId,
                    accountType: AccountType.AutoLoan,
                    aiClassified: true,
                    reason: 'AI classified as Auto Loan from vehicle model & loan terms'
                };
            }
            return {
                mnyAccountId: acct.mnyAccountId,
                accountType: AccountType.PersonalLoan,
                aiClassified: true,
                reason: 'AI classified as Personal / Student Loan from loan terms'
            };
        }

        // 2. Credit Cards & Retail Charge Accounts
        if (
            acct.mappedType === AccountType.Credit ||
            acct.creditCardDetails ||
            /\b(visa|mastercard|amex|american\s*express|discover|credit\s*card|card\s*services|retail\s*services|synchrony|citicards|chase\s*freedom|sapphire)\b/.test(
                combined
            )
        ) {
            return {
                mnyAccountId: acct.mnyAccountId,
                accountType: AccountType.Credit,
                aiClassified: acct.mnyType !== 1,
                reason: 'Classified as Credit Card from APR & card issuer metadata'
            };
        }

        // 3. Savings, Money Market, CD, & Retirement/Reserve Accounts
        if (
            acct.mappedType === AccountType.Savings ||
            /\b(savings|save|money\s*market|mma|high\s*yield|cd\b|certificate\s*of\s*deposit|401\s*\(?k\)?|ira\b|roth|hsa\b|reserve|emergency\s*fund|escrow)\b/.test(
                combined
            )
        ) {
            return {
                mnyAccountId: acct.mnyAccountId,
                accountType: AccountType.Savings,
                aiClassified: acct.mappedType !== AccountType.Savings || acct.mnyType !== 12,
                reason: 'AI classified as Savings from account & institution semantics'
            };
        }

        // 4. Cash & Petty Cash
        if (
            acct.mappedType === AccountType.Cash ||
            (/\b(cash|petty\s*cash|wallet)\b/.test(combined) &&
                !/\b(checking|rewards|back|card)\b/.test(combined))
        ) {
            return {
                mnyAccountId: acct.mnyAccountId,
                accountType: AccountType.Cash,
                aiClassified: acct.mnyType !== 2,
                reason: 'Classified as Cash account'
            };
        }

        return {
            mnyAccountId: acct.mnyAccountId,
            accountType: acct.mappedType || AccountType.Checking,
            aiClassified: false,
            reason: 'Classified as Checking account'
        };
    }

    classifyAccounts(accounts: Array<IMnyAccount>): Map<number, IAiAccountTypeClassification> {
        const map = new Map<number, IAiAccountTypeClassification>();
        for (const acct of accounts) {
            map.set(acct.mnyAccountId, this.classifyAccountType(acct));
        }
        this.accountTypeClassifications.set(map);
        return map;
    }

    /**
     * Processes all payees and categories (and optional accounts) to build enhanced & reconciled mappings.
     */
    async enhanceAll(
        payees: Array<IMnyPayee>,
        categories: Array<IMnyCategory>,
        accounts?: Array<IMnyAccount>
    ): Promise<{
        payeeMap: Map<number, string>;
        categoryMap: Map<number, string>;
        reconciledGroups: Array<IReconciledPayeeGroup>;
    }> {
        this.isEnhancing.set(true);
        try {
            if (accounts && accounts.length > 0) {
                this.classifyAccounts(accounts);
            }
            const reconciledGroups = this.reconcilePayees(payees);
            const payeeMap = new Map<number, string>();
            const rawNameMap = new Map<string, string>();

            for (const group of reconciledGroups) {
                for (const id of group.mergedPayeeIds) {
                    if (group.cleanedName) {
                        payeeMap.set(id, group.canonicalName);
                    }
                }
                for (const origName of group.mergedOriginalNames) {
                    rawNameMap.set(origName.toLowerCase(), group.canonicalName);
                }
            }

            const categoryMap = new Map<number, string>();
            for (const c of categories) {
                const cleaned = this.cleanCategoryName(c.name);
                if (cleaned !== c.name) {
                    categoryMap.set(c.mnyCategoryId, cleaned);
                }
            }

            this.reconciledPayeeGroups.set(reconciledGroups);
            this.enhancedPayeeNames.set(payeeMap);
            this.enhancedPayeeByRawName.set(rawNameMap);
            this.enhancedCategoryNames.set(categoryMap);
            return { payeeMap, categoryMap, reconciledGroups };
        } finally {
            this.isEnhancing.set(false);
        }
    }

    /**
     * Helper to convert strings to standard English Title Case while preserving known acronyms.
     */
    toTitleCase(str: string): string {
        const minorWords = new Set([
            'and',
            'or',
            'the',
            'of',
            'in',
            'on',
            'at',
            'to',
            'for',
            'a',
            'an'
        ]);
        return str
            .toLowerCase()
            .split(' ')
            .map((word, idx) => {
                if (word.length === 0) return '';
                const cleanAlpha = word.replace(/[^a-z0-9]/gi, '').toUpperCase();
                if (this.UPPERCASE_ACRONYMS.has(cleanAlpha)) {
                    return word.toUpperCase();
                }
                if (idx > 0 && minorWords.has(word)) return word;
                return word.charAt(0).toUpperCase() + word.slice(1);
            })
            .join(' ');
    }

    // --- Private Reconciliation Helpers ---

    private hasIrregularCasing(str: string): boolean {
        const words = str.split(/\s+/);
        for (const w of words) {
            const cleanAlpha = w.replace(/[^a-zA-Z]/g, '').toUpperCase();
            if (this.UPPERCASE_ACRONYMS.has(cleanAlpha) && w !== w.toUpperCase()) {
                return true;
            }
        }
        return false;
    }

    private normalizeAcronymsInString(str: string): string {
        return str
            .split(' ')
            .map(w => {
                const cleanAlpha = w.replace(/[^a-zA-Z]/g, '').toUpperCase();
                if (this.UPPERCASE_ACRONYMS.has(cleanAlpha)) {
                    return w.toUpperCase();
                }
                return w;
            })
            .join(' ');
    }

    private getPayeeFingerprint(name: string): string {
        return name
            .toLowerCase()
            .replace(/&/g, ' and ')
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\b(?:inc|llc|corp|corporation|co|company|ltd|plc)\b/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    private expandAbbreviations(fingerprint: string): string {
        if (!fingerprint) return '';
        return fingerprint
            .split(' ')
            .map(token => this.ABBREVIATION_MAP[token] ?? token)
            .join(' ');
    }

    private pickBestCanonicalName(
        freqMap: Map<string, number>,
        primaryNames?: Set<string>
    ): string {
        let bestName = '';
        let bestScore = -1;

        for (const [name, count] of freqMap.entries()) {
            const isPrimary = primaryNames?.has(name) ?? false;
            const score = (isPrimary ? 100000 : 0) + count * 10 + Math.min(name.length, 28);
            if (score > bestScore) {
                bestScore = score;
                bestName = name;
            }
        }
        return bestName;
    }

    private resolveNearDuplicateBuckets(
        a: {
            canonicalName: string;
            fingerprint: string;
            expandedFingerprint: string;
        },
        b: {
            canonicalName: string;
            fingerprint: string;
            expandedFingerprint: string;
        }
    ): {
        canonicalName: string;
        fingerprint: string;
        expandedFingerprint: string;
    } | null {
        // Do not collapse composite slash payees with different right-hand sides (e.g. "Affirm/Amazon" vs "Affirm/Warby Parker")
        if (a.canonicalName.includes('/') || b.canonicalName.includes('/')) {
            if (a.canonicalName.toLowerCase() !== b.canonicalName.toLowerCase()) {
                return null;
            }
        }

        // 1. Exact match after abbreviation expansion (e.g. "Suburban Bank & Tr" vs "Suburban Bank & Trust")
        if (a.expandedFingerprint.length >= 6 && a.expandedFingerprint === b.expandedFingerprint) {
            const preferB = b.canonicalName.length >= a.canonicalName.length;
            return preferB ? b : a;
        }

        // Prevent merging if both end in distinct numbers (e.g., "Loan 1" vs "Loan 2")
        const numA = a.fingerprint.match(/\d+$/)?.[0];
        const numB = b.fingerprint.match(/\d+$/)?.[0];
        if (numA && numB && numA !== numB) {
            return null;
        }

        const shortItem = a.fingerprint.length <= b.fingerprint.length ? a : b;
        const longItem = a.fingerprint.length <= b.fingerprint.length ? b : a;
        const shortFp = shortItem.fingerprint;
        const longFp = longItem.fingerprint;

        // 2. POS Prefix Truncation Match:
        // e.g., "american express ft lauderda" vs "american express ft lauderdale"
        // or "suburban bank and tr" vs "suburban bank and trust"
        if (shortFp.length >= 8 && longFp.startsWith(shortFp)) {
            const remainder = longFp.slice(shortFp.length);
            // Mid-word truncation (remainder does not start with a space)
            if (remainder.length > 0 && !remainder.startsWith(' ') && remainder.length <= 8) {
                return longItem;
            }
            // Trailing partial word or 1-word location/descriptor suffix after a >= 2-word merchant stem
            const shortWords = shortFp.split(' ');
            const remainderWords = remainder.trim().split(/\s+/).filter(Boolean);
            if (shortWords.length >= 2 && shortFp.length >= 10 && remainderWords.length === 1) {
                const tailWord = remainderWords[0] ?? '';
                const distinctAccountQualifiers = new Set([
                    'checking',
                    'savings',
                    'mortgage',
                    'loan',
                    'visa',
                    'mastercard',
                    'contributions',
                    'rollover',
                    'roth',
                    'traditional',
                    'fresh',
                    'kids',
                    'cloud',
                    'fi',
                    'one'
                ]);
                if (!distinctAccountQualifiers.has(tailWord)) {
                    return shortItem;
                }
            }
        }

        // 3. High Levenshtein similarity (>= 0.86) on strings of length >= 8 sharing the same first token
        if (shortFp.length >= 8 && Math.abs(longFp.length - shortFp.length) <= 4) {
            const similarity = this.computeNormalizedSimilarity(
                a.expandedFingerprint,
                b.expandedFingerprint
            );
            if (similarity >= 0.86) {
                return longItem;
            }
        }

        return null;
    }

    private computeNormalizedSimilarity(s1: string, s2: string): number {
        if (s1 === s2) return 1;
        const maxLen = Math.max(s1.length, s2.length);
        if (maxLen === 0) return 1;
        const dist = this.levenshteinDistance(s1, s2);
        return (maxLen - dist) / maxLen;
    }

    private levenshteinDistance(a: string, b: string): number {
        const m = a.length;
        const n = b.length;
        const dp: Array<number> = Array.from({ length: n + 1 }, (_, j) => j);

        for (let i = 1; i <= m; i++) {
            let prev = dp[0] ?? 0;
            dp[0] = i;
            for (let j = 1; j <= n; j++) {
                const temp = dp[j] ?? 0;
                if (a.charCodeAt(i - 1) === b.charCodeAt(j - 1)) {
                    dp[j] = prev;
                } else {
                    dp[j] = 1 + Math.min(prev, dp[j] ?? 0, dp[j - 1] ?? 0);
                }
                prev = temp;
            }
        }
        return dp[n] ?? 0;
    }
}
