'use client';

import * as React from 'react';
import { useState } from 'react';
import { AccountType, type IAccount, type ISODateString, TypeGuards } from '@path-logic/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Landmark, Banknote, CreditCard, Wallet, ArrowRight, Sparkles, Home, Car, Receipt, ChevronDown, ChevronUp } from 'lucide-react';
import { LoanDetailsForm } from './LoanDetailsForm';

interface IWelcomeWizardProps {
    onAccountCreated: (account: IAccount) => Promise<void>;
}

type WizardStep = 'select-type' | 'enter-details' | 'creating';

interface IAccountTypeOption {
    type: AccountType;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    description: string;
}

const PRIMARY_TYPES: Array<IAccountTypeOption> = [
    {
        type: AccountType.Checking,
        icon: Landmark,
        label: 'Checking Account',
        description: 'Track daily spending, bills, and income'
    },
    {
        type: AccountType.Savings,
        icon: Banknote,
        label: 'Savings Account',
        description: 'Monitor long-term savings goals'
    },
    {
        type: AccountType.Credit,
        icon: CreditCard,
        label: 'Credit Card',
        description: 'Track credit card spending and payments'
    },
    {
        type: AccountType.Cash,
        icon: Wallet,
        label: 'Cash',
        description: 'Monitor physical cash transactions'
    }
];

const LOAN_TYPES: Array<IAccountTypeOption> = [
    {
        type: AccountType.Mortgage,
        icon: Home,
        label: 'Mortgage',
        description: 'Track home loan, escrow, and equity'
    },
    {
        type: AccountType.AutoLoan,
        icon: Car,
        label: 'Auto Loan',
        description: 'Track vehicle financing and payoff'
    },
    {
        type: AccountType.PersonalLoan,
        icon: Receipt,
        label: 'Personal Loan',
        description: 'Track unsecured debts and consolidation'
    }
];

export function WelcomeWizard({ onAccountCreated }: IWelcomeWizardProps): React.JSX.Element {
    const [step, setStep] = useState<WizardStep>('select-type');
    const [selectedType, setSelectedType] = useState<AccountType | null>(null);
    const [showLoans, setShowLoans] = useState<boolean>(false);

    // Standard Form State
    const [accountName, setAccountName] = useState<string>('');
    const [initialBalance, setInitialBalance] = useState<string>('');
    const [error, setError] = useState<string>('');

    const handleTypeSelect = (type: AccountType): void => {
        setSelectedType(type);
        setStep('enter-details');
        setError('');

        // Set a default name based on the type (for standard accounts)
        const defaultNames: Record<string, string> = {
            [AccountType.Checking]: 'Main Checking',
            [AccountType.Savings]: 'Savings',
            [AccountType.Credit]: 'Credit Card',
            [AccountType.Cash]: 'Cash'
        };
        const defaultName = defaultNames[type];
        if (defaultName) {
            setAccountName(defaultName);
            setInitialBalance('');
        }
    };

    const handleStandardAccountCreate = async (): Promise<void> => {
        // Validation
        if (!accountName.trim()) {
            setError('Account name is required');
            return;
        }

        if (!selectedType) {
            setError('Please select an account type');
            return;
        }

        setError('');
        setStep('creating');

        try {
            const now: ISODateString = new Date().toISOString() as ISODateString;
            // For standard accounts (Assets/Liabilities), user enters positive number
            // IF Credit Card, balance is typically liability (negative), but user thinks "Balance: $500"
            // Let's stick to simple: if Credit, negate it? Or assume user enters negative?
            // Convention: Credit card balance of 100 means you owe 100. System stores -100.
            // But for simplicity in wizard, let's treat input as "Amount in account".
            // Checking: 100 -> +100. Credit: 100 -> -100?
            // EXISTING LOGIC was: balanceCents = positive.
            // Let's refine: If Credit, flip sign.

            let val = parseFloat(initialBalance || '0');
            if (selectedType === AccountType.Credit) {
                val = -Math.abs(val); // Always negative for credit card debt
            } else {
                val = Math.abs(val); // Positive for assets
            }

            const balanceCents: number = Math.round(val * 100);

            const newAccount: IAccount = {
                id: `acc-${Date.now()}`,
                name: accountName.trim(),
                type: selectedType,
                institutionName: '',
                clearedBalance: balanceCents,
                pendingBalance: balanceCents,
                isActive: true,
                createdAt: now,
                updatedAt: now
            };

            await onAccountCreated(newAccount);
        } catch {
            setError('Failed to create account');
            setStep('enter-details');
        }
    };

    const handleBack = (): void => {
        setError('');
        setStep('select-type');
    };

    if (step === 'creating') {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-bold text-primary uppercase tracking-[0.2em]">Creating Account...</p>
                </div>
            </div>
        );
    }

    // Creating a Loan Account?
    if (step === 'enter-details' && selectedType && TypeGuards.isLoanAccount(selectedType)) {
        return (
            <div className="flex-1 flex items-center justify-center p-8 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                <LoanDetailsForm
                    type={selectedType}
                    onBack={handleBack}
                    onSubmit={onAccountCreated}
                />
            </div>
        );
    }

    // Creating a Standard Account?
    if (step === 'enter-details' && selectedType) {
        // Find option in either list
        const selectedOption =
            PRIMARY_TYPES.find(opt => opt.type === selectedType) ||
            LOAN_TYPES.find(opt => opt.type === selectedType);

        const Icon = selectedOption?.icon || Landmark;

        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <Card className="w-full max-w-2xl bg-card border-border rounded-sm p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-foreground">{selectedOption?.label}</h2>
                            <p className="text-xs text-muted-foreground">{selectedOption?.description}</p>
                        </div>
                    </div>

                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-2">
                                Account Name *
                            </label>
                            <Input
                                type="text"
                                value={accountName}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setAccountName(e.target.value)}
                                placeholder="e.g., Main Checking, Emergency Fund"
                                className="h-10"
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-2">
                                Initial Balance (Optional)
                            </label>
                            <Input
                                type="number"
                                step="0.01"
                                value={initialBalance}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setInitialBalance(e.target.value)}
                                placeholder="0.00"
                                className="h-10 font-mono"
                            />
                            <p className="text-[10px] text-muted-foreground mt-1">
                                {selectedType === AccountType.Credit
                                    ? "Enter amount owed (as positive number)"
                                    : "Enter current balance"}
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-sm">
                            <p className="text-xs text-destructive font-medium">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={handleBack}
                            className="flex-1 h-10 text-xs font-bold uppercase"
                        >
                            Back
                        </Button>
                        <Button
                            onClick={handleStandardAccountCreate}
                            className="flex-1 h-10 text-xs font-bold uppercase"
                        >
                            Create Account
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    // Select Type Step
    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto w-full">
            <div className="w-full max-w-4xl py-12">
                <div className="text-center mb-10">
                    <div className="flex items-center justify-center gap-2 mb-3">
                        <Sparkles className="w-6 h-6 text-primary" />
                        <h1 className="text-2xl font-black uppercase tracking-tight text-foreground">
                            Welcome to Path Logic
                        </h1>
                    </div>
                    <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                        Let&apos;s get started by creating your first account. Choose the type that best fits your needs.
                    </p>
                </div>

                {/* Primary Types Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8 max-w-[600px] mx-auto">
                    {PRIMARY_TYPES.map((option: IAccountTypeOption): React.JSX.Element => {
                        const Icon = option.icon;

                        // Define accent colors for each account type
                        const accentColors: Record<string, string> = {
                            [AccountType.Checking]: 'group-hover:border-teal-500',
                            [AccountType.Savings]: 'group-hover:border-blue-500',
                            [AccountType.Credit]: 'group-hover:border-purple-500',
                            [AccountType.Cash]: 'group-hover:border-green-500'
                        };

                        const iconColors: Record<string, string> = {
                            [AccountType.Checking]: 'text-teal-500',
                            [AccountType.Savings]: 'text-blue-500',
                            [AccountType.Credit]: 'text-purple-500',
                            [AccountType.Cash]: 'text-green-500'
                        };

                        const hoverColor = accentColors[option.type] ?? 'group-hover:border-primary';
                        const iconColor = iconColors[option.type] ?? 'text-primary';

                        return (
                            <Card
                                key={option.type}
                                onClick={(): void => handleTypeSelect(option.type)}
                                className={cn(
                                    "cursor-pointer transition-all duration-200 group relative overflow-hidden",
                                    "bg-card border border-border/50 rounded-lg p-6",
                                    "shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3),0_2px_4px_-1px_rgba(0,0,0,0.06)]",
                                    "hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.3),0_4px_6px_-2px_rgba(0,0,0,0.05)]",
                                    "hover:-translate-y-0.5",
                                    hoverColor
                                )}
                            >
                                <div className="flex flex-col items-center text-center space-y-4">
                                    {/* Icon */}
                                    <div className="w-14 h-14 rounded-lg bg-muted/50 flex items-center justify-center group-hover:bg-muted transition-colors">
                                        <Icon className={cn("w-7 h-7", iconColor)} />
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-lg font-semibold text-foreground">
                                        {option.label}
                                    </h3>

                                    {/* Description */}
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {option.description}
                                    </p>
                                </div>
                            </Card>
                        );
                    })}
                </div>

                {/* Loan Account Expansion */}
                <div className="flex flex-col items-center">
                    <Button
                        variant="ghost"
                        onClick={() => setShowLoans(!showLoans)}
                        className="text-xs text-muted-foreground hover:text-foreground uppercase tracking-widest mb-6"
                    >
                        {showLoans ? 'Hide Loan Types' : 'More Account Types'}
                        {showLoans ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
                    </Button>

                    {showLoans && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-[600px] mx-auto animate-in slide-in-from-top-4 duration-300 fill-mode-forwards">
                            {LOAN_TYPES.map((option: IAccountTypeOption, idx: number): React.JSX.Element => {
                                const Icon = option.icon;
                                const isLastOdd = idx === LOAN_TYPES.length - 1 && LOAN_TYPES.length % 2 !== 0;

                                return (
                                    <Card
                                        key={option.type}
                                        onClick={(): void => handleTypeSelect(option.type)}
                                        className={cn(
                                            "cursor-pointer transition-all duration-200 group relative overflow-hidden",
                                            "bg-card border border-amber-500/30 rounded-lg p-6",
                                            "shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3),0_2px_4px_-1px_rgba(0,0,0,0.06)]",
                                            "hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.3),0_4px_6px_-2px_rgba(0,0,0,0.05)]",
                                            "hover:-translate-y-0.5 hover:border-amber-500",
                                            isLastOdd ? "md:col-span-2 md:w-1/2 md:mx-auto" : ""
                                        )}
                                    >
                                        <div className="flex flex-col items-center text-center space-y-4">
                                            {/* Icon */}
                                            <div className="w-14 h-14 rounded-lg bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                                                <Icon className="w-7 h-7 text-amber-500" />
                                            </div>

                                            {/* Title */}
                                            <h3 className="text-lg font-semibold text-foreground">
                                                {option.label}
                                            </h3>

                                            {/* Description */}
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                {option.description}
                                            </p>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
