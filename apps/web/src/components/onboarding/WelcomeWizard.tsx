'use client';

import * as React from 'react';
import { useState } from 'react';
import { AccountType, type IAccount, type ISODateString } from '@path-logic/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Landmark, Banknote, CreditCard, Wallet, ArrowRight, Sparkles } from 'lucide-react';

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

const ACCOUNT_TYPES: Array<IAccountTypeOption> = [
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

export function WelcomeWizard({ onAccountCreated }: IWelcomeWizardProps): React.JSX.Element {
    const [step, setStep] = useState<WizardStep>('select-type');
    const [selectedType, setSelectedType] = useState<AccountType | null>(null);
    const [accountName, setAccountName] = useState<string>('');
    const [initialBalance, setInitialBalance] = useState<string>('');
    const [error, setError] = useState<string>('');

    const handleTypeSelect = (type: AccountType): void => {
        setSelectedType(type);
        setStep('enter-details');

        // Set a default name based on the type
        const defaultNames: Record<AccountType, string> = {
            [AccountType.Checking]: 'Main Checking',
            [AccountType.Savings]: 'Savings',
            [AccountType.Credit]: 'Credit Card',
            [AccountType.Cash]: 'Cash'
        };
        setAccountName(defaultNames[type]);
    };

    const handleCreateAccount = async (): Promise<void> => {
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
            const balanceCents: number = initialBalance ? Math.round(parseFloat(initialBalance) * 100) : 0;

            const newAccount: IAccount = {
                id: `acc-${Date.now()}`,
                name: accountName.trim(),
                type: selectedType,
                institutionName: '', // User can update this later
                clearedBalance: balanceCents,
                pendingBalance: balanceCents,
                isActive: true,
                createdAt: now,
                updatedAt: now
            };

            await onAccountCreated(newAccount);
        } catch (err) {
            setError('Failed to create account. Please try again.');
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

    if (step === 'enter-details' && selectedType) {
        const selectedOption: IAccountTypeOption | undefined = ACCOUNT_TYPES.find((opt: IAccountTypeOption): boolean => opt.type === selectedType);
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
                                Enter your current balance, or leave blank to start at $0.00
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
                            onClick={handleCreateAccount}
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
        <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-4xl">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-2 mb-3">
                        <Sparkles className="w-6 h-6 text-primary" />
                        <h1 className="text-2xl font-black uppercase tracking-tight text-foreground">
                            Welcome to Path Logic
                        </h1>
                    </div>
                    <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                        Let's get started by creating your first account. Choose the type that best fits your needs.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {ACCOUNT_TYPES.map((option: IAccountTypeOption): React.JSX.Element => {
                        const Icon = option.icon;
                        return (
                            <Card
                                key={option.type}
                                onClick={(): void => handleTypeSelect(option.type)}
                                className={cn(
                                    "bg-card border-border rounded-sm p-6 cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5",
                                    "group relative overflow-hidden"
                                )}
                            >
                                <div className="relative z-10">
                                    <div className="w-14 h-14 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                                        <Icon className="w-7 h-7 text-primary" />
                                    </div>
                                    <h3 className="text-base font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                                        {option.label}
                                    </h3>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        {option.description}
                                    </p>
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
