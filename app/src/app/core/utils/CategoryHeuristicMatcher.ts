import { KnownCategory } from '../domain/CategoryDefaults';
import type { ICategory } from '../domain/types';

const PATTERNS: Array<{
    regex: RegExp;
    categoryId: string;
}> = [
    // --- Food & Groceries ---
    {
        regex: /\b(costco|trader joe|whole foods|aldi|kroger|safeway|publix|target|walmart|jewel|meijer|sprouts|h-e-b|grocery|market|supermarket)\b/i,
        categoryId: KnownCategory.Groceries
    },
    {
        regex: /\b(dunkin|starbucks|peet'?s|caribou|coffee|espresso|cafe|bakery)\b/i,
        categoryId: KnownCategory.CoffeeShops
    },
    {
        regex: /\b(mcdonald'?s|burger king|wendy'?s|chipotle|panera|taco bell|subway|domino'?s|pizza|chick-fil-a|shake shack|restaurant|diner|grill|bistro)\b/i,
        categoryId: KnownCategory.Restaurants
    },

    // --- Transportation & Fuel ---
    {
        regex: /\b(shell|chevron|exxon|mobil|bp|speedway|7-eleven|marathon|circle k|citgo|sunoco|wawa|gas|fuel|petroleum)\b/i,
        categoryId: KnownCategory.Fuel
    },
    {
        regex: /\b(uber|lyft|cta|metra|mta|transit|subway|bus|taxis?|cab|parking|parkmobile|spothero)\b/i,
        categoryId: KnownCategory.PublicTransit
    },
    {
        regex: /\b(auto zone|o'reilly|advance auto|jiffy lube|pep boys|discount tire|midas|car wash|auto repair|mechanic)\b/i,
        categoryId: KnownCategory.AutoMaintenance
    },

    // --- Utilities & Telecom ---
    {
        regex: /\b(comcast|xfinity|spectrum|att|at&t|verizon|t-mobile|mint mobile|charter|cox|internet|broadband)\b/i,
        categoryId: KnownCategory.Internet
    },
    {
        regex: /\b(comed|coned|duke energy|pge|pg&e|florida power|national grid|electric|power|energy)\b/i,
        categoryId: KnownCategory.Electricity
    },

    // --- Health & Fitness ---
    {
        regex: /\b(cvs|walgreens|rite aid|pharmacy|prescriptions?|rx)\b/i,
        categoryId: KnownCategory.Pharmacy
    },
    {
        regex: /\b(planet fitness|la fitness|equinox|anytime fitness|crossfit|gym|fitness|health club|yacht club)\b/i,
        categoryId: KnownCategory.Fitness
    },
    {
        regex: /\b(hospital|clinic|doctor|pediatric|dentist|dental|optometry|vision|dermatology|orthopedic|labcorp|quest diag)\b/i,
        categoryId: KnownCategory.Medical
    },

    // --- Taxes & Financial ---
    {
        regex: /\b(irs|state tax|treasury|tax refund|usrtdep|tax payment|dept of revenue)\b/i,
        categoryId: KnownCategory.FederalTax
    }
];

/**
 * Clean and sanitize merchant string (e.g. "SQ *PATREON SUBSCRIPTION SAN FRANCISCO CA" -> "Patreon Subscription").
 */
export function sanitizeName(raw: string): string {
    return raw
        .replace(/^Payee:\s*/i, '')
        .replace(/^(sq|tst|pyp|tst\*|sq\*)\s*/i, '')
        .replace(/#\d+/g, '')
        .replace(/\b[A-Z]{2}\s+\d{5}(-\d{4})?\b/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Pre-matches a list of unknown strings against categories using regex and name heuristics.
 * Returns a Record of unknownString -> categoryId for high confidence matches.
 */
export function matchUnknowns(
    unknowns: Array<string>,
    categories: Array<ICategory>
): Record<string, string> {
    const matches: Record<string, string> = {};

    // Category index maps
    const catNameMap = new Map<string, string>();
    for (const c of categories) {
        if (c.id !== KnownCategory.Uncategorized) {
            catNameMap.set(c.name.toLowerCase(), c.id);
        }
    }

    for (const unknownStr of unknowns) {
        const clean = sanitizeName(unknownStr);
        const lowerClean = clean.toLowerCase();

        // 1. Direct name match against category names
        const directCatId = catNameMap.get(lowerClean);
        if (directCatId) {
            matches[unknownStr] = directCatId;
            continue;
        }

        // 2. Pattern matching
        for (const item of PATTERNS) {
            if (item.regex.test(clean)) {
                // Check if this category exists in the user's category list
                const exists = categories.some(c => c.id === item.categoryId);
                if (exists && item.categoryId !== KnownCategory.Uncategorized) {
                    matches[unknownStr] = item.categoryId;
                    break;
                }
            }
        }
    }

    return matches;
}
