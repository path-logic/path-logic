import type { Cents, ILoanDetails, ISODateString } from '../domain/types';

/**
 * Calculate monthly payment using standard amortization formula
 * M = P * [r(1+r)^n] / [(1+r)^n - 1]
 */
export function calculateMonthlyPayment(
    principal: Cents,
    annualRate: number,
    termMonths: number,
): Cents {
    if (annualRate === 0) {
        return Math.round(principal / termMonths);
    }

    const monthlyRate: number = annualRate / 12;
    // Using simple number math for rate calculations as they involve exponents
    // but input/output is Cents (integer)
    const numerator: number = monthlyRate * Math.pow(1 + monthlyRate, termMonths);
    const denominator: number = Math.pow(1 + monthlyRate, termMonths) - 1;
    const payment: number = (principal / 100) * (numerator / denominator);

    // Return in Cents
    return Math.round(payment * 100);
}

/**
 * Calculate total interest paid over life of loan
 */
export function calculateTotalInterest(
    monthlyPayment: Cents,
    termMonths: number,
    principal: Cents,
): Cents {
    const totalPaid: Cents = monthlyPayment * termMonths;
    return totalPaid - principal;
}

/**
 * Calculate payoff date from current balance and payment details
 * Note: This is a simplified projection assuming fixed payments
 */
export function calculatePayoffDate(
    currentBalance: Cents,
    monthlyPayment: Cents,
    interestRate: number,
    _startDate: ISODateString,
): ISODateString {
    const balanceNum = Math.abs(currentBalance / 100);
    const paymentNum = monthlyPayment / 100;
    const monthlyRate = interestRate / 12;

    // If no interest, simple division
    if (interestRate === 0) {
        const months = Math.ceil(balanceNum / paymentNum);
        const today = new Date();
        today.setMonth(today.getMonth() + months);
        return today.toISOString() as ISODateString;
    }

    // N = -log(1 - (r * P) / M) / log(1 + r)
    // where P is current balance
    const numerator = -Math.log(1 - (monthlyRate * balanceNum) / paymentNum);
    const denominator = Math.log(1 + monthlyRate);

    // Check for infinite payoff (payment too low to cover interest)
    if (isNaN(numerator) || !isFinite(numerator)) {
        // Return a far future date or handle error?
        // For now, let's max out at 50 years from now
        const maxFuture = new Date();
        maxFuture.setFullYear(maxFuture.getFullYear() + 50);
        return maxFuture.toISOString() as ISODateString;
    }

    const monthsRemaining = Math.ceil(numerator / denominator);

    const payoffDate = new Date();
    payoffDate.setMonth(payoffDate.getMonth() + monthsRemaining);

    return payoffDate.toISOString() as ISODateString;
}

/**
 * Validate loan details
 * Returns array of error messages, empty if valid
 */
export function validateLoanDetails(details: ILoanDetails, currentBalance: Cents): Array<string> {
    const errors: Array<string> = [];

    // Basic range checks
    if (details.originalAmount <= 0) {
        errors.push('Original loan amount must be positive');
    }

    // Current balance (usually negative for liabilities) compared to original amount
    // currentBalance is typically stored as negative for debt accounts in this system
    // check logic: abs(currentBalance) <= originalAmount
    if (Math.abs(currentBalance) > details.originalAmount) {
        errors.push('Current balance cannot exceed original loan amount');
    }

    if (details.interestRate < 0 || details.interestRate > 1) {
        // Allowing up to 100% APR
        errors.push('Interest rate must be between 0% and 100%');
    }

    if (details.termMonths < 1 || details.termMonths > 600) {
        // Max 50 years
        errors.push('Loan term must be between 1 and 600 months');
    }

    if (details.paymentDueDay < 1 || details.paymentDueDay > 31) {
        errors.push('Payment due day must be between 1 and 31');
    }

    // Minimum payment check (must cover interest)
    // Monthly Interest = Balance * (Rate / 12)
    // Using original amount for worst-case interest requirement
    const monthlyRate = details.interestRate / 12;
    const minInterestParam = (details.originalAmount / 100) * monthlyRate;
    // Buffer for rounding issues, convert back to cents
    const minPaymentCents = Math.floor(minInterestParam * 100);

    if (details.monthlyPayment <= minPaymentCents && details.originalAmount > 0) {
        errors.push(
            `Monthly payment must be greater than interest-only amount ($${(minPaymentCents / 100).toFixed(2)})`,
        );
    }

    return errors;
}
