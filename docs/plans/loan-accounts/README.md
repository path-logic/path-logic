# Loan Account Types Feature

This directory contains all documentation for the Loan Account Types feature, which adds support for Mortgage, Auto Loan, and Personal Loan accounts to the Path Logic welcome wizard.

## Documentation

- **[project-plan.md](project-plan.md)** - Complete project plan with UI mockups, implementation phases, and design specifications
- **[functional-spec.md](functional-spec.md)** - Functional requirements, user stories, and acceptance criteria
- **[technical-spec.md](technical-spec.md)** - Technical architecture, database schema, and implementation details

## UI Mockups

All UI mockups are located in the `mockups/` directory:

- **wizard_primary_types.png** - Primary account type selection (Checking, Savings, Credit, Cash)
- **wizard_expanded_loans.png** - Expanded view showing loan account types (large viewport)
- **mortgage_form.png** - Consumer-friendly mortgage account creation form

## Feature Overview

### Primary Account Types (Always Visible)

- Checking Account
- Savings Account
- Credit Card
- Cash

### Loan Account Types (Expandable)

- Mortgage
- Auto Loan
- Personal Loan

### Key Features

- **Expandable UI**: "More Account Types" button reveals loan options
- **Loan-Specific Settings**: Interest rates, payment schedules, property/vehicle details
- **Consumer-Friendly Design**: Column-oriented forms with excellent whitespace and accessibility
- **Vibrant Visual Design**: Amber/orange accents for loan cards against dark background
- **WCAG 2.1 AA Compliant**: Accessible design with proper contrast and focus states

## Implementation Status

See [project-plan.md](project-plan.md) for detailed implementation phases and checklist.
