import type { EntityId } from './types';

/**
 * Standard IDs for foundational categories.
 * Prevents "magic strings" in the codebase.
 */
export const KnownCategory = {
    Housing: 'cat-housing',
    RentMortgage: 'cat-rent-mortgage',
    PropertyTax: 'cat-property-tax',
    HomeInsurance: 'cat-home-insurance',
    Maintenance: 'cat-maintenance',
    Utilities: 'cat-utilities',
    Electricity: 'cat-electricity',
    Water: 'cat-water',
    NaturalGas: 'cat-natural-gas',
    Internet: 'cat-internet',
    Phone: 'cat-phone',
    Transportation: 'cat-transportation',
    AutoPayment: 'cat-auto-payment',
    AutoInsurance: 'cat-auto-insurance',
    Fuel: 'cat-fuel',
    AutoMaintenance: 'cat-auto-maintenance',
    PublicTransit: 'cat-public-transit',
    FoodDining: 'cat-food-dining',
    Groceries: 'cat-groceries',
    Restaurants: 'cat-restaurants',
    CoffeeShops: 'cat-coffee-shops',
    Health: 'cat-health',
    Medical: 'cat-medical',
    Pharmacy: 'cat-pharmacy',
    Fitness: 'cat-fitness',
    Income: 'cat-income',
    Paycheck: 'cat-paycheck',
    Interest: 'cat-interest',
    TaxRefund: 'cat-tax-refund',
    Transfers: 'cat-transfers',
    InternalTransfer: 'cat-internal-transfer',
    CreditCardPayment: 'cat-credit-card-payment',
    Uncategorized: 'cat-uncategorized',
} as const;

export interface ICategorySeed {
    id: EntityId;
    parentId: EntityId | null;
    name: string;
    description: string | null;
}

/**
 * High-quality default categories and subcategories.
 * These are used to seed the database on initial creation.
 */
export const DEFAULT_CATEGORIES: Array<ICategorySeed> = [
    // --- Housing ---
    { id: KnownCategory.Housing, parentId: null, name: 'Housing', description: 'Primary residence expenses' },
    { id: KnownCategory.RentMortgage, parentId: KnownCategory.Housing, name: 'Rent/Mortgage', description: null },
    { id: KnownCategory.PropertyTax, parentId: KnownCategory.Housing, name: 'Property Tax', description: null },
    { id: KnownCategory.HomeInsurance, parentId: KnownCategory.Housing, name: 'Home Insurance', description: null },
    { id: KnownCategory.Maintenance, parentId: KnownCategory.Housing, name: 'Home Maintenance', description: null },

    // --- Utilities ---
    { id: KnownCategory.Utilities, parentId: null, name: 'Utilities', description: 'Household services' },
    { id: KnownCategory.Electricity, parentId: KnownCategory.Utilities, name: 'Electricity', description: null },
    { id: KnownCategory.Water, parentId: KnownCategory.Utilities, name: 'Water/Sewer', description: null },
    { id: KnownCategory.NaturalGas, parentId: KnownCategory.Utilities, name: 'Natural Gas', description: null },
    { id: KnownCategory.Internet, parentId: KnownCategory.Utilities, name: 'Internet', description: null },
    { id: KnownCategory.Phone, parentId: KnownCategory.Utilities, name: 'Phone', description: null },

    // --- Transportation ---
    { id: KnownCategory.Transportation, parentId: null, name: 'Transportation', description: 'Vehicle and travel expenses' },
    { id: KnownCategory.AutoPayment, parentId: KnownCategory.Transportation, name: 'Auto Payment', description: null },
    { id: KnownCategory.AutoInsurance, parentId: KnownCategory.Transportation, name: 'Auto Insurance', description: null },
    { id: KnownCategory.Fuel, parentId: KnownCategory.Transportation, name: 'Fuel', description: null },
    { id: KnownCategory.AutoMaintenance, parentId: KnownCategory.Transportation, name: 'Auto Maintenance', description: null },
    { id: KnownCategory.PublicTransit, parentId: KnownCategory.Transportation, name: 'Public Transit', description: null },

    // --- Food & Dining ---
    { id: KnownCategory.FoodDining, parentId: null, name: 'Food & Dining', description: 'Groceries and eating out' },
    { id: KnownCategory.Groceries, parentId: KnownCategory.FoodDining, name: 'Groceries', description: null },
    { id: KnownCategory.Restaurants, parentId: KnownCategory.FoodDining, name: 'Restaurants', description: null },
    { id: KnownCategory.CoffeeShops, parentId: KnownCategory.FoodDining, name: 'Coffee Shops', description: null },

    // --- Health ---
    { id: KnownCategory.Health, parentId: null, name: 'Health', description: 'Medical and wellness' },
    { id: KnownCategory.Medical, parentId: KnownCategory.Health, name: 'Medical/Doctor', description: null },
    { id: KnownCategory.Pharmacy, parentId: KnownCategory.Health, name: 'Pharmacy', description: null },
    { id: KnownCategory.Fitness, parentId: KnownCategory.Health, name: 'Fitness/Gym', description: null },

    // --- Income ---
    { id: KnownCategory.Income, parentId: null, name: 'Income', description: 'Money coming in' },
    { id: KnownCategory.Paycheck, parentId: KnownCategory.Income, name: 'Paycheck', description: null },
    { id: KnownCategory.Interest, parentId: KnownCategory.Income, name: 'Interest/Dividends', description: null },
    { id: KnownCategory.TaxRefund, parentId: KnownCategory.Income, name: 'Tax Refund', description: null },

    // --- Transfers ---
    { id: KnownCategory.Transfers, parentId: null, name: 'Transfers', description: 'Movement between accounts' },
    { id: KnownCategory.InternalTransfer, parentId: KnownCategory.Transfers, name: 'Internal Transfer', description: null },
    { id: KnownCategory.CreditCardPayment, parentId: KnownCategory.Transfers, name: 'Credit Card Payment', description: null },

    // --- Miscellaneous ---
    { id: KnownCategory.Uncategorized, parentId: null, name: 'Uncategorized', description: 'Default for new items' },
];
