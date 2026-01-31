'use client';

import * as React from 'react';
import { useState } from 'react';
import type { IAccount, ILoanDetails, ISODateString } from '@path-logic/core';
import { AccountType } from '@path-logic/core';
import { LoanCalculations } from '@path-logic/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Home, Car, Receipt } from 'lucide-react';
import { FormGuide } from '@/components/ui/FormGuide';

interface ILoanDetailsFormProps {
    type: AccountType;
    onBack: () => void;
    onSubmit: (account: IAccount) => Promise<void>;
}

export function LoanDetailsForm({
    type,
    onBack,
    onSubmit,
}: ILoanDetailsFormProps): React.JSX.Element {
    // Compute default name based on type
    const getDefaultName = (accountType: AccountType): string => {
        const defaultNames: Record<string, string> = {
            [AccountType.Mortgage]: 'Home Mortgage',
            [AccountType.AutoLoan]: 'Auto Loan',
            [AccountType.PersonalLoan]: 'Personal Loan',
        };
        return defaultNames[accountType] || '';
    };

    // Common Fields
    const [accountName, setAccountName] = useState<string>(getDefaultName(type));
    const [institutionName, setInstitutionName] = useState<string>('');
    const [originalAmount, setOriginalAmount] = useState<string>('');
    const [currentBalance, setCurrentBalance] = useState<string>('');
    const [interestRate, setInterestRate] = useState<string>('');
    const [termMonths, setTermMonths] = useState<string>('');
    const [monthlyPayment, setMonthlyPayment] = useState<string>('');
    const [paymentDueDay, setPaymentDueDay] = useState<string>('1');
    const [startDate, setStartDate] = useState<string>(
        new Date().toISOString().split('T')[0] ?? '',
    );

    // Metadata Fields
    // Mortgage
    const [propertyAddress, setPropertyAddress] = useState<string>('');
    const [propertyValue, setPropertyValue] = useState<string>('');
    const [escrowIncluded, setEscrowIncluded] = useState<boolean>(false);
    const [escrowAmount, setEscrowAmount] = useState<string>('');

    // Auto Loan
    const [vehicleMake, setVehicleMake] = useState<string>('');
    const [vehicleModel, setVehicleModel] = useState<string>('');
    const [vehicleYear, setVehicleYear] = useState<string>('');
    const [vin, setVin] = useState<string>('');

    // Personal Loan
    const [purpose, setPurpose] = useState<string>('');
    const [secured, setSecured] = useState<boolean>(false);

    const [error, setError] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const LOAN_GUIDE_CONTENT = {
        'original-amount': {
            title: 'Initial Principal',
            description: 'The total amount you borrowed at the start of the loan.',
            tips: [
                'Check your opening statement or disclosure.',
                'Excludes future interest payments.',
            ],
        },
        'interest-rate': {
            title: 'Interest Rate (APR)',
            description: 'The annual cost of borrowing, expressed as a percentage.',
            tips: [
                'Enter exactly as seen on your bill (e.g. 5.25 for 5.25%).',
                'Fixed rates stay the same; variable rates change.',
            ],
        },
        'term-months': {
            title: 'Loan Duration',
            description: 'The total length of time given to repay the loan in full.',
            tips: [
                'Standard mortgages are 360 months (30 years).',
                'Auto loans are often 60 or 72 months.',
            ],
        },
        'monthly-payment': {
            title: 'Recurring Payment',
            description: 'The amount you are required to pay each month.',
            tips: [
                'Use the Calculate button to estimate based on principal and rate.',
                'Does not include potential late fees.',
            ],
        },
        escrow: {
            title: 'Escrow Account',
            description: 'Funds held by the lender for property taxes and insurance.',
            tips: [
                'Most mortgages include property tax and insurance in the payment.',
                'Select this if your monthly payment includes these costs.',
            ],
        },
    };

    const handleAutoCalculate = (): void => {
        const principalCents = Math.round(parseFloat(originalAmount || '0') * 100);
        const rateDecimal = parseFloat(interestRate || '0') / 100;
        const term = parseInt(termMonths || '0', 10);

        if (principalCents > 0 && term > 0) {
            const paymentCents = LoanCalculations.calculateMonthlyPayment(
                principalCents,
                rateDecimal,
                term,
            );
            const paymentDollars = (paymentCents / 100).toFixed(2);
            setMonthlyPayment(paymentDollars);
        }
    };

    const handleSubmit = async (): Promise<void> => {
        setError('');

        if (!accountName.trim()) {
            setError('Account name is required');
            return;
        }

        if (!originalAmount || parseFloat(originalAmount) <= 0) {
            setError('Original loan amount is required');
            return;
        }

        if (!currentBalance) {
            // If not provided, assume equal to original (new loan) or require it?
            // Let's require it, but default to original if user wants
        }

        try {
            setIsSubmitting(true);

            const principalCents = Math.round(parseFloat(originalAmount) * 100);

            // Current balance is typically negative for liabilities in this system?
            // The prompt/spec says: "Current Balance: Outstanding principal (negative value)"
            // But user inputs positive number. We convert to negative.
            const currentBalanceInput = currentBalance
                ? parseFloat(currentBalance)
                : parseFloat(originalAmount);
            const currentBalanceCents = Math.round(currentBalanceInput * 100) * -1; // Debt is negative

            const rateDecimal = interestRate ? parseFloat(interestRate) / 100 : 0;
            const term = termMonths ? parseInt(termMonths, 10) : 360;
            const paymentCents = monthlyPayment ? Math.round(parseFloat(monthlyPayment) * 100) : 0;
            const dueDay = parseInt(paymentDueDay, 10);

            const loanDetails: ILoanDetails = {
                originalAmount: principalCents,
                interestRate: rateDecimal,
                termMonths: term,
                monthlyPayment: paymentCents,
                paymentDueDay: dueDay,
                startDate: new Date(startDate).toISOString() as ISODateString,
            };

            // Add metadata
            if (type === AccountType.Mortgage) {
                loanDetails.metadata = {
                    ...(propertyAddress ? { propertyAddress } : {}),
                    ...(propertyValue
                        ? { propertyValue: Math.round(parseFloat(propertyValue) * 100) }
                        : {}),
                    escrowIncluded,
                    ...(escrowAmount
                        ? { escrowAmount: Math.round(parseFloat(escrowAmount) * 100) }
                        : {}),
                };
            } else if (type === AccountType.AutoLoan) {
                loanDetails.metadata = {
                    ...(vehicleMake ? { vehicleMake } : {}),
                    ...(vehicleModel ? { vehicleModel } : {}),
                    ...(vehicleYear ? { vehicleYear: parseInt(vehicleYear, 10) } : {}),
                    ...(vin ? { vin } : {}),
                };
            } else if (type === AccountType.PersonalLoan) {
                loanDetails.metadata = {
                    ...(purpose ? { purpose } : {}),
                    secured,
                };
            }

            // Validation
            const validationErrors = LoanCalculations.validateLoanDetails(
                loanDetails,
                currentBalanceCents,
            );
            if (validationErrors.length > 0) {
                setError(validationErrors[0] ?? 'Invalid details');
                setIsSubmitting(false);
                return;
            }

            const newAccount: IAccount = {
                id: `acc-${Date.now()}`,
                name: accountName.trim(),
                type: type,
                institutionName: institutionName.trim(),
                clearedBalance: currentBalanceCents,
                pendingBalance: currentBalanceCents,
                isActive: true,
                deletedAt: null,
                createdAt: new Date().toISOString() as ISODateString,
                updatedAt: new Date().toISOString() as ISODateString,
                loanDetails: loanDetails,
            };

            await onSubmit(newAccount);
        } catch {
            setError('Failed to create account. Please check your inputs.');
            setIsSubmitting(false);
        }
    };

    const Icon = React.useMemo((): React.ComponentType<{ className?: string }> => {
        switch (type) {
            case AccountType.Mortgage:
                return Home;
            case AccountType.AutoLoan:
                return Car;
            case AccountType.PersonalLoan:
                return Receipt;
            default:
                return Home; // Fallback
        }
    }, [type]);

    return (
        <Card accentColor="bg-amber-500" className="w-full max-w-2xl p-8 border-border/50">
            <div className="flex items-center gap-4 mb-8 pb-4 border-b border-border/30">
                <div className="w-14 h-14 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-inner">
                    <Icon className="w-7 h-7 text-amber-500" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-foreground tracking-tight">
                        Create{' '}
                        {type === AccountType.Mortgage
                            ? 'Mortgage'
                            : type === AccountType.AutoLoan
                              ? 'Auto Loan'
                              : 'Personal Loan'}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Enter your loan details for accurate tracking
                    </p>
                </div>
            </div>

            <div className="space-y-8">
                {/* Section 1: Account Info */}
                <section className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2">
                            <Label htmlFor="account-name">Account Name *</Label>
                            <Input
                                id="account-name"
                                value={accountName}
                                onChange={e => setAccountName(e.target.value)}
                                placeholder="e.g. Home Mortgage"
                            />
                        </div>
                        <div className="col-span-2">
                            <Label htmlFor="institution-name">Institution Name</Label>
                            <Input
                                id="institution-name"
                                value={institutionName}
                                onChange={e => setInstitutionName(e.target.value)}
                                placeholder="e.g. Wells Fargo"
                            />
                        </div>
                    </div>
                </section>

                {/* Section 2: Loan Terms */}
                <section className="space-y-6">
                    <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] border-b border-border/30 pb-3">
                        Loan Terms
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <Label htmlFor="original-amount">Original Loan Amount *</Label>
                            <Input
                                id="original-amount"
                                type="number"
                                value={originalAmount}
                                onChange={e => setOriginalAmount(e.target.value)}
                                onFocus={() => setFocusedField('original-amount')}
                                onBlur={() => setFocusedField(null)}
                                placeholder="0.00"
                                className="font-mono"
                            />
                        </div>
                        <div>
                            <Label htmlFor="current-balance">Current Balance</Label>
                            <Input
                                id="current-balance"
                                type="number"
                                value={currentBalance}
                                onChange={e => setCurrentBalance(e.target.value)}
                                placeholder="0.00"
                                className="font-mono"
                            />
                            <p className="text-[10px] text-muted-foreground mt-2 italic leading-relaxed">
                                Leave blank if same as original
                            </p>
                        </div>
                        <div>
                            <Label htmlFor="interest-rate">Interest Rate (% APR)</Label>
                            <Input
                                id="interest-rate"
                                type="number"
                                step="0.001"
                                value={interestRate}
                                onChange={e => setInterestRate(e.target.value)}
                                onFocus={() => setFocusedField('interest-rate')}
                                onBlur={() => setFocusedField(null)}
                                placeholder="3.5"
                                className="font-mono text-base"
                            />
                        </div>
                        <div>
                            <Label htmlFor="term-months">Term (Months)</Label>
                            <Input
                                id="term-months"
                                type="number"
                                value={termMonths}
                                onChange={e => setTermMonths(e.target.value)}
                                onFocus={() => setFocusedField('term-months')}
                                onBlur={() => setFocusedField(null)}
                                placeholder="360"
                                className="font-mono"
                            />
                        </div>
                        <div className="col-span-2">
                            <Label htmlFor="start-date">Start Date</Label>
                            <Input
                                id="start-date"
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="font-mono text-base"
                            />
                        </div>
                    </div>
                </section>

                {/* Section 3: Payments */}
                <section className="space-y-6">
                    <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] border-b border-border/30 pb-3">
                        Payments
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2">
                            <Label htmlFor="monthly-payment">Monthly Payment *</Label>
                            <div className="flex gap-3">
                                <Input
                                    id="monthly-payment"
                                    type="number"
                                    value={monthlyPayment}
                                    onChange={e => setMonthlyPayment(e.target.value)}
                                    onFocus={() => setFocusedField('monthly-payment')}
                                    onBlur={() => setFocusedField(null)}
                                    placeholder="0.00"
                                    className="font-mono flex-1 text-base"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleAutoCalculate}
                                    className="h-11 px-4 text-[10px] font-bold uppercase tracking-wider"
                                >
                                    Calculate
                                </Button>
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="due-day">Payment Due Day</Label>
                            <Input
                                id="due-day"
                                type="number"
                                min="1"
                                max="31"
                                value={paymentDueDay}
                                onChange={e => setPaymentDueDay(e.target.value)}
                                className="font-mono"
                            />
                        </div>
                    </div>
                </section>

                {/* Section 4: Specific Details */}
                {type === AccountType.Mortgage && (
                    <section className="space-y-6">
                        <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] border-b border-border/30 pb-3">
                            Property Details
                        </h3>
                        <div className="space-y-6">
                            <div>
                                <Label htmlFor="property-address">Property Address</Label>
                                <Input
                                    id="property-address"
                                    value={propertyAddress}
                                    onChange={e => setPropertyAddress(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="property-value">Property Value</Label>
                                    <Input
                                        id="property-value"
                                        type="number"
                                        value={propertyValue}
                                        onChange={e => setPropertyValue(e.target.value)}
                                        className="font-mono text-base"
                                    />
                                </div>
                                <div className="flex items-center gap-3 pt-6">
                                    <input
                                        type="checkbox"
                                        id="escrow"
                                        checked={escrowIncluded}
                                        onChange={e => setEscrowIncluded(e.target.checked)}
                                        onFocus={() => setFocusedField('escrow')}
                                        onBlur={() => setFocusedField(null)}
                                        className="w-4 h-4 rounded border-border/50 bg-muted/30 accent-primary"
                                    />
                                    <label
                                        htmlFor="escrow"
                                        className="text-sm font-medium text-foreground cursor-pointer select-none"
                                    >
                                        Includes Escrow?
                                    </label>
                                </div>
                                {escrowIncluded && (
                                    <div className="col-span-2">
                                        <Label htmlFor="escrow-amount">Escrow Amount</Label>
                                        <Input
                                            id="escrow-amount"
                                            type="number"
                                            value={escrowAmount}
                                            onChange={e => setEscrowAmount(e.target.value)}
                                            className="font-mono text-base"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                )}

                {type === AccountType.AutoLoan && (
                    <section className="space-y-6">
                        <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] border-b border-border/30 pb-3">
                            Vehicle Details
                        </h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <Label htmlFor="vehicle-make">Make</Label>
                                <Input
                                    id="vehicle-make"
                                    value={vehicleMake}
                                    onChange={e => setVehicleMake(e.target.value)}
                                    placeholder="e.g. Toyota"
                                />
                            </div>
                            <div>
                                <Label htmlFor="vehicle-model">Model</Label>
                                <Input
                                    id="vehicle-model"
                                    value={vehicleModel}
                                    onChange={e => setVehicleModel(e.target.value)}
                                    placeholder="e.g. Camry"
                                />
                            </div>
                            <div>
                                <Label htmlFor="vehicle-year">Year</Label>
                                <Input
                                    id="vehicle-year"
                                    type="number"
                                    value={vehicleYear}
                                    onChange={e => setVehicleYear(e.target.value)}
                                    placeholder="2023"
                                    className="font-mono"
                                />
                            </div>
                            <div>
                                <Label htmlFor="vin">VIN</Label>
                                <Input
                                    id="vin"
                                    value={vin}
                                    onChange={e => setVin(e.target.value)}
                                    className="font-mono uppercase text-base"
                                    maxLength={17}
                                />
                            </div>
                        </div>
                    </section>
                )}

                {type === AccountType.PersonalLoan && (
                    <section className="space-y-6">
                        <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] border-b border-border/30 pb-3">
                            Loan Purpose
                        </h3>
                        <div className="space-y-6">
                            <div>
                                <Label htmlFor="purpose">Purpose / Description</Label>
                                <Input
                                    id="purpose"
                                    value={purpose}
                                    onChange={e => setPurpose(e.target.value)}
                                    placeholder="e.g. Debt Consolidation"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="secured"
                                    checked={secured}
                                    onChange={e => setSecured(e.target.checked)}
                                    className="w-4 h-4 rounded border-border/50 bg-muted/30 accent-primary"
                                />
                                <label
                                    htmlFor="secured"
                                    className="text-sm font-medium text-foreground cursor-pointer select-none"
                                >
                                    Secured Loan?
                                </label>
                            </div>
                        </div>
                    </section>
                )}

                {error && (
                    <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-md animate-in slide-in-from-top-2">
                        <p className="text-xs text-destructive font-bold uppercase tracking-widest">
                            {error}
                        </p>
                    </div>
                )}

                <div className="flex gap-4 pt-4">
                    <Button
                        variant="outline"
                        onClick={onBack}
                        disabled={isSubmitting}
                        className="flex-1 h-11 text-xs font-bold uppercase tracking-widest hover:bg-muted"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex-1 h-11 text-xs font-bold uppercase tracking-widest bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-900/20"
                    >
                        {isSubmitting ? 'Creating...' : 'Create Loan Account'}
                        {!isSubmitting && <ArrowRight className="w-4 h-4 ml-2" />}
                    </Button>
                </div>
            </div>

            <FormGuide
                guideId="loan-details"
                targetFieldId={focusedField}
                content={LOAN_GUIDE_CONTENT}
            />
        </Card>
    );
}
