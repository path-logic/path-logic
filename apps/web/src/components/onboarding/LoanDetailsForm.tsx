'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import type { IAccount, ILoanDetails, ISODateString } from '@path-logic/core';
import { AccountType } from '@path-logic/core';
import { LoanCalculations } from '@path-logic/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Calculator, Home, Car, Receipt, Calendar } from 'lucide-react';

interface ILoanDetailsFormProps {
    type: AccountType;
    onBack: () => void;
    onSubmit: (account: IAccount) => Promise<void>;
}

export function LoanDetailsForm({ type, onBack, onSubmit }: ILoanDetailsFormProps): React.JSX.Element {
    // Compute default name based on type
    const getDefaultName = (accountType: AccountType): string => {
        const defaultNames: Record<string, string> = {
            [AccountType.Mortgage]: 'Home Mortgage',
            [AccountType.AutoLoan]: 'Auto Loan',
            [AccountType.PersonalLoan]: 'Personal Loan'
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
    const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0] ?? '');

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

    const handleAutoCalculate = (): void => {
        const principalCents = Math.round(parseFloat(originalAmount || '0') * 100);
        const rateDecimal = parseFloat(interestRate || '0') / 100;
        const term = parseInt(termMonths || '0', 10);

        if (principalCents > 0 && term > 0) {
            const paymentCents = LoanCalculations.calculateMonthlyPayment(principalCents, rateDecimal, term);
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
            const currentBalanceInput = currentBalance ? parseFloat(currentBalance) : parseFloat(originalAmount);
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
                    ...(propertyValue ? { propertyValue: Math.round(parseFloat(propertyValue) * 100) } : {}),
                    escrowIncluded,
                    ...(escrowAmount ? { escrowAmount: Math.round(parseFloat(escrowAmount) * 100) } : {})
                };
            } else if (type === AccountType.AutoLoan) {
                loanDetails.metadata = {
                    ...(vehicleMake ? { vehicleMake } : {}),
                    ...(vehicleModel ? { vehicleModel } : {}),
                    ...(vehicleYear ? { vehicleYear: parseInt(vehicleYear, 10) } : {}),
                    ...(vin ? { vin } : {})
                };
            } else if (type === AccountType.PersonalLoan) {
                loanDetails.metadata = {
                    ...(purpose ? { purpose } : {}),
                    secured
                };
            }

            // Validation
            const validationErrors = LoanCalculations.validateLoanDetails(loanDetails, currentBalanceCents);
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
                createdAt: new Date().toISOString() as ISODateString,
                updatedAt: new Date().toISOString() as ISODateString,
                loanDetails: loanDetails
            };

            await onSubmit(newAccount);

        } catch {
            setError('Failed to create account. Please check your inputs.');
            setIsSubmitting(false);
        }
    };

    const Icon = React.useMemo((): React.ComponentType<{ className?: string }> => {
        switch (type) {
            case AccountType.Mortgage: return Home;
            case AccountType.AutoLoan: return Car;
            case AccountType.PersonalLoan: return Receipt;
            default: return Home; // Fallback
        }
    }, [type]);

    return (
        <Card className="w-full max-w-2xl bg-card border-border rounded-sm p-8">
            <div className="flex items-center gap-3 mb-8 pb-4 border-b border-border/50">
                <div className="w-12 h-12 rounded-sm bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-foreground">Create {type === AccountType.Mortgage ? 'Mortgage' : type === AccountType.AutoLoan ? 'Auto Loan' : 'Personal Loan'}</h2>
                    <p className="text-xs text-muted-foreground">Enter your loan details for accurate tracking</p>
                </div>
            </div>

            <div className="space-y-8">
                {/* Section 1: Account Info */}
                <section className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-2">Account Name *</label>
                            <Input
                                value={accountName}
                                onChange={(e) => setAccountName(e.target.value)}
                                placeholder="e.g. Home Mortgage"
                                className="h-10 text-sm"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-2">Institution Name</label>
                            <Input
                                value={institutionName}
                                onChange={(e) => setInstitutionName(e.target.value)}
                                placeholder="e.g. Wells Fargo"
                                className="h-10 text-sm"
                            />
                        </div>
                    </div>
                </section>

                {/* Section 2: Loan Terms */}
                <section className="space-y-4">
                    <h3 className="text-xs font-bold text-primary uppercase tracking-wider border-b border-border/30 pb-2">Loan Terms</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-2">Original Loan Amount *</label>
                            <Input
                                type="number"
                                value={originalAmount}
                                onChange={(e) => setOriginalAmount(e.target.value)}
                                placeholder="0.00"
                                className="h-10 font-mono"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-2">Current Balance</label>
                            <Input
                                type="number"
                                value={currentBalance}
                                onChange={(e) => setCurrentBalance(e.target.value)}
                                placeholder="0.00"
                                className="h-10 font-mono"
                            />
                            <p className="text-[10px] text-muted-foreground mt-1">Leave blank if same as original</p>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-2">Interest Rate (% APR)</label>
                            <Input
                                type="number"
                                step="0.001"
                                value={interestRate}
                                onChange={(e) => setInterestRate(e.target.value)}
                                placeholder="3.5"
                                className="h-10 font-mono"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-2">Term (Months)</label>
                            <Input
                                type="number"
                                value={termMonths}
                                onChange={(e) => setTermMonths(e.target.value)}
                                placeholder="360"
                                className="h-10 font-mono"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-2">Start Date</label>
                            <div className="relative">
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="h-10 font-mono pl-9"
                                />
                                <Calendar className="w-4 h-4 text-muted-foreground absolute left-3 top-3 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section 3: Payment */}
                <section className="space-y-4">
                    <h3 className="text-xs font-bold text-primary uppercase tracking-wider border-b border-border/30 pb-2">Payment Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-2">Monthly Payment</label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    value={monthlyPayment}
                                    onChange={(e) => setMonthlyPayment(e.target.value)}
                                    placeholder="0.00"
                                    className="h-10 font-mono"
                                />
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={handleAutoCalculate}
                                    title="Auto-calculate payment"
                                    className="h-10 w-10 shrink-0"
                                >
                                    <Calculator className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-2">Payment Due Day (1-31)</label>
                            <Input
                                type="number"
                                min="1"
                                max="31"
                                value={paymentDueDay}
                                onChange={(e) => setPaymentDueDay(e.target.value)}
                                placeholder="1"
                                className="h-10 font-mono"
                            />
                        </div>
                    </div>
                </section>

                {/* Section 4: Specific Details */}
                {type === AccountType.Mortgage && (
                    <section className="space-y-4">
                        <h3 className="text-xs font-bold text-primary uppercase tracking-wider border-b border-border/30 pb-2">Property Details</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-2">Property Address</label>
                                <Input
                                    value={propertyAddress}
                                    onChange={(e) => setPropertyAddress(e.target.value)}
                                    className="h-10"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-2">Property Value</label>
                                    <Input
                                        type="number"
                                        value={propertyValue}
                                        onChange={(e) => setPropertyValue(e.target.value)}
                                        className="h-10 font-mono"
                                    />
                                </div>
                                <div className="flex items-center gap-2 pt-6">
                                    <input
                                        type="checkbox"
                                        id="escrow"
                                        checked={escrowIncluded}
                                        onChange={(e) => setEscrowIncluded(e.target.checked)}
                                        className="rounded border-input"
                                    />
                                    <label htmlFor="escrow" className="text-sm">Includes Escrow?</label>
                                </div>
                                {escrowIncluded && (
                                    <div>
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-2">Escrow Amount</label>
                                        <Input
                                            type="number"
                                            value={escrowAmount}
                                            onChange={(e) => setEscrowAmount(e.target.value)}
                                            className="h-10 font-mono"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                )}

                {type === AccountType.AutoLoan && (
                    <section className="space-y-4">
                        <h3 className="text-xs font-bold text-primary uppercase tracking-wider border-b border-border/30 pb-2">Vehicle Details</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-2">Make</label>
                                <Input
                                    value={vehicleMake}
                                    onChange={(e) => setVehicleMake(e.target.value)}
                                    placeholder="e.g. Toyota"
                                    className="h-10"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-2">Model</label>
                                <Input
                                    value={vehicleModel}
                                    onChange={(e) => setVehicleModel(e.target.value)}
                                    placeholder="e.g. Camry"
                                    className="h-10"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-2">Year</label>
                                <Input
                                    type="number"
                                    value={vehicleYear}
                                    onChange={(e) => setVehicleYear(e.target.value)}
                                    placeholder="2023"
                                    className="h-10 font-mono"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-2">VIN</label>
                                <Input
                                    value={vin}
                                    onChange={(e) => setVin(e.target.value)}
                                    className="h-10 font-mono uppercase"
                                    maxLength={17}
                                />
                            </div>
                        </div>
                    </section>
                )}

                {type === AccountType.PersonalLoan && (
                    <section className="space-y-4">
                        <h3 className="text-xs font-bold text-primary uppercase tracking-wider border-b border-border/30 pb-2">Loan Details</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-2">Purpose</label>
                                <Input
                                    value={purpose}
                                    onChange={(e) => setPurpose(e.target.value)}
                                    placeholder="e.g. Debt Consolidation"
                                    className="h-10"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="secured"
                                    checked={secured}
                                    onChange={(e) => setSecured(e.target.checked)}
                                    className="rounded border-input"
                                />
                                <label htmlFor="secured" className="text-sm">Secured Loan?</label>
                            </div>
                        </div>
                    </section>
                )}

                {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-sm">
                        <p className="text-xs text-destructive font-medium">{error}</p>
                    </div>
                )}

                <div className="flex gap-3 pt-4">
                    <Button
                        variant="outline"
                        onClick={onBack}
                        disabled={isSubmitting}
                        className="flex-1 h-12 text-xs font-bold uppercase"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex-1 h-12 text-xs font-bold uppercase bg-amber-600 hover:bg-amber-700 text-white"
                    >
                        {isSubmitting ? 'Creating...' : 'Create Loan Account'}
                        {!isSubmitting && <ArrowRight className="w-4 h-4 ml-2" />}
                    </Button>
                </div>
            </div>
        </Card>
    );
}
