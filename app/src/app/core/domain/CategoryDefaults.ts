import type { EntityId } from './types';

/**
 * Standard IDs for foundational categories.
 * Prevents "magic strings" in the codebase.
 */
export const KnownCategory = {
    Housing: 'cat-housing',
    RentMortgage: 'cat-rent-mortgage',
    MortgagePrincipal: 'cat-mortgage-principal',
    MortgageInterest: 'cat-mortgage-interest',
    MortgagePMI: 'cat-mortgage-pmi',
    Escrow: 'cat-escrow',
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
    HealthInsurance: 'cat-health-insurance',
    VisionInsurance: 'cat-vision-insurance',
    DentalInsurance: 'cat-dental-insurance',
    Taxes: 'cat-taxes',
    FederalTax: 'cat-federal-tax',
    StateTax: 'cat-state-tax',
    LocalTax: 'cat-local-tax',
    SocialSecurity: 'cat-social-security',
    Medicare: 'cat-medicare',
    Income: 'cat-income',
    Paycheck: 'cat-paycheck',
    GrossPay: 'cat-gross-pay',
    Interest: 'cat-interest',
    TaxRefund: 'cat-tax-refund',
    Transfers: 'cat-transfers',
    InternalTransfer: 'cat-internal-transfer',
    CreditCardPayment: 'cat-credit-card-payment',
    Investments: 'cat-investments',
    FourOhOneK: 'cat-401k',
    HSA: 'cat-hsa',
    Uncategorized: 'cat-uncategorized'
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
    {
        id: KnownCategory.Housing,
        parentId: null,
        name: 'Housing',
        description: 'Primary residence expenses'
    },
    {
        id: KnownCategory.RentMortgage,
        parentId: KnownCategory.Housing,
        name: 'Rent/Mortgage',
        description: null
    },
    {
        id: KnownCategory.PropertyTax,
        parentId: KnownCategory.Housing,
        name: 'Property Tax',
        description: null
    },
    {
        id: KnownCategory.HomeInsurance,
        parentId: KnownCategory.Housing,
        name: 'Home Insurance',
        description: null
    },
    {
        id: KnownCategory.Maintenance,
        parentId: KnownCategory.Housing,
        name: 'Home Maintenance',
        description: null
    },
    {
        id: KnownCategory.MortgagePrincipal,
        parentId: KnownCategory.Housing,
        name: 'Mortgage Principal',
        description: null
    },
    {
        id: KnownCategory.MortgageInterest,
        parentId: KnownCategory.Housing,
        name: 'Mortgage Interest',
        description: null
    },
    {
        id: KnownCategory.MortgagePMI,
        parentId: KnownCategory.Housing,
        name: 'Mortgage PMI',
        description: null
    },
    {
        id: KnownCategory.Escrow,
        parentId: KnownCategory.Housing,
        name: 'Escrow',
        description: null
    },

    // --- Utilities ---
    {
        id: KnownCategory.Utilities,
        parentId: null,
        name: 'Utilities',
        description: 'Household services'
    },
    {
        id: KnownCategory.Electricity,
        parentId: KnownCategory.Utilities,
        name: 'Electricity',
        description: null
    },
    {
        id: KnownCategory.Water,
        parentId: KnownCategory.Utilities,
        name: 'Water/Sewer',
        description: null
    },
    {
        id: KnownCategory.NaturalGas,
        parentId: KnownCategory.Utilities,
        name: 'Natural Gas',
        description: null
    },
    {
        id: KnownCategory.Internet,
        parentId: KnownCategory.Utilities,
        name: 'Internet',
        description: null
    },
    {
        id: KnownCategory.Phone,
        parentId: KnownCategory.Utilities,
        name: 'Phone',
        description: null
    },

    // --- Transportation ---
    {
        id: KnownCategory.Transportation,
        parentId: null,
        name: 'Transportation',
        description: 'Vehicle and travel expenses'
    },
    {
        id: KnownCategory.AutoPayment,
        parentId: KnownCategory.Transportation,
        name: 'Auto Payment',
        description: null
    },
    {
        id: KnownCategory.AutoInsurance,
        parentId: KnownCategory.Transportation,
        name: 'Auto Insurance',
        description: null
    },
    {
        id: KnownCategory.Fuel,
        parentId: KnownCategory.Transportation,
        name: 'Fuel',
        description: null
    },
    {
        id: KnownCategory.AutoMaintenance,
        parentId: KnownCategory.Transportation,
        name: 'Auto Maintenance',
        description: null
    },
    {
        id: KnownCategory.PublicTransit,
        parentId: KnownCategory.Transportation,
        name: 'Public Transit',
        description: null
    },

    // --- Food & Dining ---
    {
        id: KnownCategory.FoodDining,
        parentId: null,
        name: 'Food & Dining',
        description: 'Groceries and eating out'
    },
    {
        id: KnownCategory.Groceries,
        parentId: KnownCategory.FoodDining,
        name: 'Groceries',
        description: null
    },
    {
        id: KnownCategory.Restaurants,
        parentId: KnownCategory.FoodDining,
        name: 'Restaurants',
        description: null
    },
    {
        id: KnownCategory.CoffeeShops,
        parentId: KnownCategory.FoodDining,
        name: 'Coffee Shops',
        description: null
    },

    // --- Health ---
    {
        id: KnownCategory.Health,
        parentId: null,
        name: 'Health',
        description: 'Medical and wellness'
    },
    {
        id: KnownCategory.Medical,
        parentId: KnownCategory.Health,
        name: 'Medical/Doctor',
        description: null
    },
    {
        id: KnownCategory.Pharmacy,
        parentId: KnownCategory.Health,
        name: 'Pharmacy',
        description: null
    },
    {
        id: KnownCategory.Fitness,
        parentId: KnownCategory.Health,
        name: 'Fitness/Gym',
        description: null
    },
    {
        id: KnownCategory.HealthInsurance,
        parentId: KnownCategory.Health,
        name: 'Health Insurance',
        description: null
    },
    {
        id: KnownCategory.VisionInsurance,
        parentId: KnownCategory.Health,
        name: 'Vision Insurance',
        description: null
    },
    {
        id: KnownCategory.DentalInsurance,
        parentId: KnownCategory.Health,
        name: 'Dental Insurance',
        description: null
    },

    // --- Income ---
    { id: KnownCategory.Income, parentId: null, name: 'Income', description: 'Money coming in' },
    {
        id: KnownCategory.Paycheck,
        parentId: KnownCategory.Income,
        name: 'Paycheck',
        description: null
    },
    {
        id: KnownCategory.GrossPay,
        parentId: KnownCategory.Income,
        name: 'Gross Pay',
        description: null
    },
    {
        id: KnownCategory.Interest,
        parentId: KnownCategory.Income,
        name: 'Interest/Dividends',
        description: null
    },
    {
        id: KnownCategory.TaxRefund,
        parentId: KnownCategory.Income,
        name: 'Tax Refund',
        description: null
    },

    // --- Transfers ---
    {
        id: KnownCategory.Transfers,
        parentId: null,
        name: 'Transfers',
        description: 'Movement between accounts'
    },
    {
        id: KnownCategory.InternalTransfer,
        parentId: KnownCategory.Transfers,
        name: 'Internal Transfer',
        description: null
    },
    {
        id: KnownCategory.CreditCardPayment,
        parentId: KnownCategory.Transfers,
        name: 'Credit Card Payment',
        description: null
    },

    // --- Taxes ---
    {
        id: KnownCategory.Taxes,
        parentId: null,
        name: 'Taxes',
        description: 'Tax payments and withholdings'
    },
    {
        id: KnownCategory.FederalTax,
        parentId: KnownCategory.Taxes,
        name: 'Federal Tax',
        description: null
    },
    {
        id: KnownCategory.StateTax,
        parentId: KnownCategory.Taxes,
        name: 'State Tax',
        description: null
    },
    {
        id: KnownCategory.LocalTax,
        parentId: KnownCategory.Taxes,
        name: 'Local Tax',
        description: null
    },
    {
        id: KnownCategory.SocialSecurity,
        parentId: KnownCategory.Taxes,
        name: 'Social Security',
        description: null
    },
    {
        id: KnownCategory.Medicare,
        parentId: KnownCategory.Taxes,
        name: 'Medicare',
        description: null
    },

    // --- Investments ---
    {
        id: KnownCategory.Investments,
        parentId: null,
        name: 'Investments',
        description: 'Investment contributions'
    },
    {
        id: KnownCategory.FourOhOneK,
        parentId: KnownCategory.Investments,
        name: '401(k)',
        description: null
    },
    {
        id: KnownCategory.HSA,
        parentId: KnownCategory.Investments,
        name: 'HSA Contribution',
        description: null
    },

    // --- Miscellaneous ---
    {
        id: KnownCategory.Uncategorized,
        parentId: null,
        name: 'Uncategorized',
        description: 'Default for new items'
    }
];

/**
 * High-quality default category aliases.
 * These map common MS Money / Quicken category names directly to our foundational categories.
 */
export const DEFAULT_ALIASES: Record<string, EntityId> = {
    '2005 G35': KnownCategory.AutoPayment,
    '304 Blackhawk': KnownCategory.Uncategorized,
    '401(k)': KnownCategory.FourOhOneK,
    Automobile: KnownCategory.Transportation,
    'Automobile:AC': KnownCategory.Transportation,
    'Automobile:Car Payment': KnownCategory.AutoPayment,
    'Automobile:City Sticker': KnownCategory.Transportation,
    'Automobile:Gasoline': KnownCategory.Fuel,
    'Automobile:Labor': KnownCategory.AutoMaintenance,
    'Automobile:License Renewal': KnownCategory.Transportation,
    'Automobile:Maintenance': KnownCategory.AutoMaintenance,
    'Automobile:Oil Change': KnownCategory.AutoMaintenance,
    'Automobile:Parking': KnownCategory.Transportation,
    'Automobile:Shop Supplies': KnownCategory.AutoMaintenance,
    'Automobile:Speeding Ticket': KnownCategory.Transportation,
    'Automobile:Tires': KnownCategory.AutoMaintenance,
    'Automobile:Title': KnownCategory.Transportation,
    'Bank Charges:Checks': KnownCategory.Uncategorized,
    'Bank Charges:Late Charge': KnownCategory.Uncategorized,
    'Bank Charges:Overdraft Fee': KnownCategory.Uncategorized,
    'Bank Charges:Processing Fee': KnownCategory.Uncategorized,
    'Bank Charges:Service Charge': KnownCategory.Uncategorized,
    'Bills:Cable Television': KnownCategory.Medical,
    'Bills:Cell Phone': KnownCategory.Phone,
    'Bills:Composting': KnownCategory.Uncategorized,
    'Bills:Electricity': KnownCategory.Electricity,
    "Bills:Homeowner's Dues": KnownCategory.Housing,
    'Bills:House Insurance': KnownCategory.Uncategorized,
    'Bills:Mortgage Insurance': KnownCategory.RentMortgage,
    'Bills:Mortgage Interest': KnownCategory.MortgageInterest,
    'Bills:Natural Gas': KnownCategory.NaturalGas,
    'Bills:Special Assessment': KnownCategory.Housing,
    'Bills:Streaming Service': KnownCategory.Uncategorized,
    'Bills:Streaming Television': KnownCategory.Medical,
    'Bills:Telephone': KnownCategory.Phone,
    'Bills:Train Ticket': KnownCategory.PublicTransit,
    'Bills:Transit': KnownCategory.PublicTransit,
    'Bills:Water & Sewer': KnownCategory.Water,
    CTA: KnownCategory.PublicTransit,
    'Cash Withdrawal': KnownCategory.Uncategorized,
    'Charge Card:American Express Gold Rewards': KnownCategory.CreditCardPayment,
    'Charitable Donations': KnownCategory.Uncategorized,
    'Charitable Donations:Christopher House': KnownCategory.Uncategorized,
    'Charitable Donations:Grace Place': KnownCategory.Uncategorized,
    Clothing: KnownCategory.Uncategorized,
    Condo: KnownCategory.Housing,
    Credit: KnownCategory.Uncategorized,
    'Credit Card': KnownCategory.CreditCardPayment,
    'Credit Card:American Express Blue': KnownCategory.CreditCardPayment,
    'Credit Card:Chase MasterCard': KnownCategory.CreditCardPayment,
    'Credit Card:Chase Slate': KnownCategory.CreditCardPayment,
    'Credit Card:Citibank Mastercard': KnownCategory.CreditCardPayment,
    'Credit Card:Discover Card': KnownCategory.CreditCardPayment,
    'Credit Card:HPDirect': KnownCategory.CreditCardPayment,
    'Credit Card:Mastercard': KnownCategory.CreditCardPayment,
    'Credit Card:Visa': KnownCategory.CreditCardPayment,
    'Credit Card:Von Maur': KnownCategory.CreditCardPayment,
    'Debit Card': KnownCategory.Uncategorized,
    'Dining Out': KnownCategory.Restaurants,
    Education: KnownCategory.Uncategorized,
    'Education:Fees': KnownCategory.Uncategorized,
    'Education:Field Trip Fees': KnownCategory.Uncategorized,
    'Education:Lawyer': KnownCategory.Uncategorized,
    'Education:Registration Fee': KnownCategory.Uncategorized,
    'Education:Spanish Class': KnownCategory.Uncategorized,
    'Education:Supplies': KnownCategory.Uncategorized,
    'Education:Tuition': KnownCategory.Uncategorized,
    'Federal Stimulus Package': KnownCategory.Uncategorized,
    'Federal Stimulus Package:COVID-19 Stimulus': KnownCategory.Uncategorized,
    'Federal Stimulus Package:Child Tax Credit': KnownCategory.FederalTax,
    'Flexible Spending Account': KnownCategory.Uncategorized,
    Food: KnownCategory.Uncategorized,
    Gift: KnownCategory.Uncategorized,
    'Gift:Tip': KnownCategory.Uncategorized,
    'Gift:Tpi': KnownCategory.Uncategorized,
    Gifts: KnownCategory.Uncategorized,
    Groceries: KnownCategory.Groceries,
    Healthcare: KnownCategory.Medical,
    'Healthcare:COBRA Dental': KnownCategory.DentalInsurance,
    'Healthcare:COBRA Health': KnownCategory.HealthInsurance,
    'Healthcare:COBRA Medical': KnownCategory.HealthInsurance,
    'Healthcare:COBRA Vision': KnownCategory.VisionInsurance,
    'Healthcare:Copay': KnownCategory.Medical,
    'Healthcare:Counseling': KnownCategory.Medical,
    'Healthcare:Dental': KnownCategory.Medical,
    'Healthcare:ENT': KnownCategory.Medical,
    'Healthcare:Early Intervention': KnownCategory.Medical,
    'Healthcare:Equine Therapy': KnownCategory.Medical,
    'Healthcare:Eyecare': KnownCategory.Medical,
    'Healthcare:Feeding Therapy': KnownCategory.Medical,
    'Healthcare:HSA Contribution': KnownCategory.Medical,
    'Healthcare:Hospital': KnownCategory.Medical,
    'Healthcare:Lactation Consultatnt': KnownCategory.Medical,
    'Healthcare:PDA Consultant': KnownCategory.Medical,
    'Healthcare:Physical Therapy': KnownCategory.Medical,
    'Healthcare:Physician': KnownCategory.Medical,
    'Healthcare:Prescriptions': KnownCategory.Medical,
    'Healthcare:Testing': KnownCategory.Medical,
    'Homda Prologue': KnownCategory.Uncategorized,
    Household: KnownCategory.Housing,
    'Household:Assessments': KnownCategory.Housing,
    'Household:Basement Waterproofing': KnownCategory.Housing,
    'Household:Earnest Money': KnownCategory.Housing,
    'Household:Furnishings': KnownCategory.Housing,
    'Household:Garbage Collection': KnownCategory.Housing,
    'Household:Heating': KnownCategory.Housing,
    'Household:Inspection': KnownCategory.Housing,
    'Household:Interior Design': KnownCategory.Housing,
    'Household:Key Fob Activation': KnownCategory.Housing,
    'Household:Lanscaping': KnownCategory.Housing,
    'Household:Lawn Care': KnownCategory.Housing,
    'Household:Moving Expense': KnownCategory.Housing,
    'Household:Parking Assessments': KnownCategory.Housing,
    'Household:Permit Fee': KnownCategory.Housing,
    'Household:Remodeling': KnownCategory.Housing,
    'Household:Repair': KnownCategory.Maintenance,
    'Household:Security': KnownCategory.Housing,
    'Household:Special Assessment': KnownCategory.Housing,
    'Household:Tree Removal': KnownCategory.Housing,
    'Household:Water Bill': KnownCategory.Water,
    'Income Tax Refund': KnownCategory.TaxRefund,
    Insurance: KnownCategory.Uncategorized,
    'Insurance:Automobile': KnownCategory.AutoInsurance,
    'Insurance:Dental': KnownCategory.DentalInsurance,
    'Insurance:HSA': KnownCategory.HSA,
    'Insurance:Health': KnownCategory.HealthInsurance,
    'Insurance:Life': KnownCategory.Uncategorized,
    'Insurance:Long Term Disability': KnownCategory.Uncategorized,
    'Insurance:Vision': KnownCategory.VisionInsurance,
    'Investment:Financial Advisor': KnownCategory.Uncategorized,
    'Investment:I Savings Bond': KnownCategory.Uncategorized,
    'Investment:Stock Options': KnownCategory.Uncategorized,
    Leisure: KnownCategory.Uncategorized,
    'Leisure:Cub Scout Pack Dues': KnownCategory.Uncategorized,
    'Leisure:Cultural Events': KnownCategory.Uncategorized,
    'Leisure:D&D': KnownCategory.Uncategorized,
    'Leisure:Internet Access': KnownCategory.Internet,
    'Leisure:Internet Video & Music': KnownCategory.Uncategorized,
    'Leisure:Movies & Video Rentals': KnownCategory.RentMortgage,
    'Leisure:Race': KnownCategory.Uncategorized,
    'Leisure:Sporting Events': KnownCategory.Uncategorized,
    'Leisure:Sprots Program': KnownCategory.Uncategorized,
    'Leisure:Streaming Services': KnownCategory.Uncategorized,
    'Leisure:Toys & Games': KnownCategory.Uncategorized,
    Loan: KnownCategory.Uncategorized,
    'Loan:Basement Flood Cleanup': KnownCategory.Housing,
    'Loan:Car Interest': KnownCategory.AutoPayment,
    'Loan:Computer': KnownCategory.Uncategorized,
    'Loan:Escrow Shortage': KnownCategory.Escrow,
    'Loan:Kitchen Window and Rear Door': KnownCategory.Uncategorized,
    'Loan:Late Fee': KnownCategory.Uncategorized,
    'Loan:Loan Interest': KnownCategory.MortgageInterest,
    'Loan:Personal': KnownCategory.Uncategorized,
    'Loan:Security System': KnownCategory.Uncategorized,
    'Loan:Student Loan': KnownCategory.Uncategorized,
    'Loan:Water Softener': KnownCategory.Maintenance,
    Miscellaneous: KnownCategory.Uncategorized,
    'Miscellaneous:Bank Deposit Adjustment': KnownCategory.Uncategorized,
    'Miscellaneous:Court Fees': KnownCategory.Uncategorized,
    'Miscellaneous:Membership Fees': KnownCategory.Uncategorized,
    'Miscellaneous:Parking': KnownCategory.Uncategorized,
    'Other Income': KnownCategory.Income,
    'Other Income:Cash Back': KnownCategory.Income,
    'Other Income:Debit for Reconcilliation': KnownCategory.Income,
    'Other Income:Dependents Unemployment Compensation': KnownCategory.Income,
    'Other Income:Employee Stock Option': KnownCategory.Income,
    'Other Income:Escrow Account Refund': KnownCategory.Income,
    'Other Income:Federal Overpayment Unemployment Compensation': KnownCategory.Income,
    'Other Income:Gifts Received': KnownCategory.Income,
    'Other Income:Home Equity': KnownCategory.Income,
    'Other Income:Insurance Settlement': KnownCategory.Income,
    'Other Income:Jury Duty': KnownCategory.Income,
    'Other Income:Loan Principal Received': KnownCategory.Income,
    'Other Income:Mileage': KnownCategory.Income,
    'Other Income:Net Adjustment': KnownCategory.Income,
    'Other Income:Rebate': KnownCategory.Income,
    'Other Income:Refund': KnownCategory.Income,
    'Other Income:Reimbursement': KnownCategory.Income,
    'Other Income:Sale of Personal Property': KnownCategory.Income,
    'Other Income:State & Local Tax Refund': KnownCategory.TaxRefund,
    'Other Income:Student Loan Overpayment Refund': KnownCategory.Income,
    'Other Income:Unemployment Compensation': KnownCategory.Income,
    'Other Income:Unreimbursed Medical': KnownCategory.Medical,
    'Other Income:Wedding Gifts Received': KnownCategory.Income,
    'Payroll Credit': KnownCategory.Uncategorized,
    'Personal Care': KnownCategory.Uncategorized,
    'Personal Care:Haircut': KnownCategory.Uncategorized,
    'Personal Care:Health Club': KnownCategory.Fitness,
    'Personal Care:Membership Fee': KnownCategory.Uncategorized,
    'Retirement Income:IRA Distributions': KnownCategory.Income,
    'Student Loan': KnownCategory.Uncategorized,
    Taxes: KnownCategory.Taxes,
    'Taxes:Audit Support': KnownCategory.Taxes,
    'Taxes:Discount': KnownCategory.Taxes,
    'Taxes:Early Season Discount': KnownCategory.Taxes,
    'Taxes:Federal Income Tax': KnownCategory.FederalTax,
    'Taxes:Local Income Tax': KnownCategory.StateTax,
    'Taxes:Medicare Tax': KnownCategory.Medicare,
    'Taxes:Preparartion': KnownCategory.Taxes,
    'Taxes:Real Estate Taxes': KnownCategory.PropertyTax,
    'Taxes:Sales Tax': KnownCategory.Taxes,
    'Taxes:Service Fees': KnownCategory.Taxes,
    'Taxes:Social Security Tax': KnownCategory.SocialSecurity,
    'Taxes:State Income Tax': KnownCategory.StateTax,
    'Taxes:State Tire Tax': KnownCategory.StateTax,
    'Taxes:Tax Pro Review': KnownCategory.Taxes,
    'Taxes:Tax Reduction Fee': KnownCategory.Taxes,
    Vacation: KnownCategory.Uncategorized,
    'Vacation:Lodging': KnownCategory.Uncategorized,
    'Wages & Salary': KnownCategory.Income,
    'Wages & Salary:Bonus': KnownCategory.GrossPay,
    'Wages & Salary:CTA Repayment': KnownCategory.Income,
    'Wages & Salary:Gross Pay': KnownCategory.GrossPay,
    'Wages & Salary:Gym Reimbursement': KnownCategory.Fitness,
    'Wages & Salary:Net Pay': KnownCategory.Paycheck,
    'Wages & Salary:Overtime': KnownCategory.Income,
    'Wages & Salary:PTO': KnownCategory.Income,
    'Wages & Salary:Reimbursement': KnownCategory.Income,
    'Wages & Salary:Retro Pay': KnownCategory.Income,
    'Wages & Salary:Severance': KnownCategory.Income,
    'Wages & Salary:Tax Correction': KnownCategory.Taxes,
    'Water Softener': KnownCategory.Maintenance,
    'Wedding:Cocktail Hour Performer': KnownCategory.Uncategorized,
    'Wedding:DJ': KnownCategory.Uncategorized,
    'Wedding:Dress Cleaning and Mounting': KnownCategory.Uncategorized,
    'Wedding:Minister Fee': KnownCategory.Uncategorized,
    'Wedding:Photography': KnownCategory.Uncategorized,
    'Wedding:Premarital Counseling': KnownCategory.Uncategorized,
    'Xfer to Deleted Account': KnownCategory.Uncategorized
};
