# Loan Account Types - Functional Specification

## 1. Feature Overview

Add support for loan account types (Mortgage, Auto Loan, Personal Loan) to Path Logic, enabling users to track debt obligations alongside their assets. Loans are treated as first-class accounts with specialized tracking for principal, interest, payment schedules, and payoff progress.

## 2. User Stories

### US-1: Create Mortgage Account
**As a** homeowner  
**I want to** track my mortgage in Path Logic  
**So that** I can see my complete financial picture including my largest debt obligation

**Acceptance Criteria:**
- User can select "Mortgage" from expanded account types
- User can enter property address, loan amount, interest rate, term
- System calculates monthly payment if not provided
- Account shows as negative balance (debt)

### US-2: Create Auto Loan Account
**As a** car owner with a loan  
**I want to** track my auto loan payments  
**So that** I can monitor payoff progress and include it in my budget

**Acceptance Criteria:**
- User can select "Auto Loan" from expanded account types
- User can enter vehicle details (make, model, year, VIN)
- User can enter loan terms and payment schedule
- System tracks principal vs. interest over time

### US-3: Create Personal Loan Account
**As a** borrower with personal debt  
**I want to** track my personal loan  
**So that** I can manage repayment and avoid missed payments

**Acceptance Criteria:**
- User can select "Personal Loan" from expanded account types
- User can specify if loan is secured/unsecured
- User can enter loan purpose for reference
- System handles variable or fixed rate loans

### US-4: Expandable Account Type Selection
**As a** new user  
**I want to** see primary account types first with option to see more  
**So that** I'm not overwhelmed but still have access to all options

**Acceptance Criteria:**
- Primary types (Checking, Savings, Credit, Cash) always visible
- "More Account Types" button/link clearly visible
- Clicking expands to show loan types
- Expansion is smooth and intuitive
- Can collapse back to primary types

## 3. Functional Requirements

### FR-1: Account Type Expansion
- **FR-1.1**: Display 4 primary account types in 2x2 grid
- **FR-1.2**: Display "More Account Types" expansion control below primary types
- **FR-1.3**: Clicking expansion shows 3 loan types in single row
- **FR-1.4**: Loan types have distinct visual styling (different color/icon treatment)
- **FR-1.5**: Expansion state persists during wizard session

### FR-2: Loan Account Creation
- **FR-2.1**: Selecting loan type advances to loan details form
- **FR-2.2**: Form displays loan-specific fields based on type
- **FR-2.3**: All monetary values stored as cents (integer math)
- **FR-2.4**: Interest rates stored as decimal (e.g., 0.0375 for 3.75%)
- **FR-2.5**: Account balance initialized as negative (debt)

### FR-3: Loan Details Form Fields

**Common Fields (All Loan Types):**
- Account Name (required, text, max 100 chars)
- Institution Name (optional, text, max 100 chars)
- Current Balance (required, currency, negative)
- Original Loan Amount (required, currency, positive)
- Interest Rate (APR) (required, percentage, 0-100)
- Loan Term (required, months, 1-600)
- Monthly Payment (optional, currency, auto-calculated if blank)
- Payment Due Date (required, day 1-31)
- Loan Start Date (required, date)

**Mortgage-Specific Fields:**
- Property Address (optional, text, max 200 chars)
- Property Value (optional, currency)
- Escrow Included (required, boolean)
- Escrow Amount (conditional, currency, required if escrow=true)

**Auto Loan-Specific Fields:**
- Vehicle Make (optional, text, max 50 chars)
- Vehicle Model (optional, text, max 50 chars)
- Vehicle Year (optional, number, 1900-2100)
- VIN (optional, text, 17 chars)

**Personal Loan-Specific Fields:**
- Loan Purpose (optional, text, max 200 chars)
- Secured (required, boolean)

### FR-4: Loan Calculations
- **FR-4.1**: Auto-calculate monthly payment using standard amortization formula
- **FR-4.2**: Display payment breakdown (principal vs. interest)
- **FR-4.3**: Calculate total interest over life of loan
- **FR-4.4**: Show payoff date based on current balance and payment schedule

### FR-5: Validation Rules
- **FR-5.1**: Current balance must be ≤ original loan amount
- **FR-5.2**: Interest rate must be between 0% and 100%
- **FR-5.3**: Loan term must be positive integer
- **FR-5.4**: Payment due day must be 1-31
- **FR-5.5**: Start date cannot be in future
- **FR-5.6**: If monthly payment provided, must be ≥ interest-only payment
- **FR-5.7**: VIN must be exactly 17 characters if provided

## 4. Non-Functional Requirements

### NFR-1: Performance
- Wizard expansion animation completes in <300ms
- Loan calculation completes in <100ms
- Form validation provides immediate feedback (<50ms)

### NFR-2: Accessibility
- All form fields have proper labels
- Keyboard navigation works throughout wizard
- Screen reader announces expansion state
- Error messages are clear and actionable

### NFR-3: Data Integrity
- All loan data persists atomically with account creation
- Failed creation rolls back all changes
- No orphaned loan_details records

### NFR-4: Code Quality
- 100% TypeScript strict mode compliance
- All functions have explicit return types
- All variables have explicit types
- Zero ESLint errors
- Prettier formatting applied

## 5. UI/UX Specifications

### Visual Design
- **Primary Account Cards**: Standard card styling with primary color accents
- **Loan Account Cards**: Amber/orange accent color to distinguish debt accounts
- **Expansion Button**: Subtle, non-intrusive, clear affordance
- **Loan Form**: Multi-step or single long form with clear sections

### Interaction Patterns
- **Expansion**: Smooth height transition, chevron icon rotates
- **Card Selection**: Same hover/click behavior as primary types
- **Form Navigation**: Back button returns to type selection (collapsed state)
- **Auto-calculation**: Real-time update as user types loan details

### Error Handling
- **Validation Errors**: Inline, below field, red text
- **Calculation Errors**: Toast notification with explanation
- **Creation Errors**: Modal dialog with retry option

## 6. Data Model

### Account Record
```typescript
{
  id: "acc-1234567890",
  name: "Home Mortgage",
  type: AccountType.Mortgage,
  institutionName: "Wells Fargo",
  clearedBalance: -250000_00, // $250,000 debt
  pendingBalance: -250000_00,
  isActive: true,
  createdAt: "2026-01-20T08:00:00.000Z",
  updatedAt: "2026-01-20T08:00:00.000Z",
  loanDetails: {
    originalAmount: 300000_00,
    interestRate: 0.0375,
    termMonths: 360,
    monthlyPayment: 1389_35,
    paymentDueDay: 1,
    startDate: "2023-01-01",
    metadata: {
      propertyAddress: "123 Main St, Anytown, CA 12345",
      propertyValue: 400000_00,
      escrowIncluded: true,
      escrowAmount: 350_00
    }
  }
}
```

## 7. Future Enhancements (Out of Scope)

- Amortization schedule visualization
- Refinance tracking
- Extra payment scenarios
- Loan comparison tools
- Integration with property tax/insurance tracking
- Automatic payment scheduling
- Payoff goal tracking
