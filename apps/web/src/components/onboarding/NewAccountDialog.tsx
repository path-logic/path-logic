'use client';

import * as React from 'react';
import { useState } from 'react';
import { AccountType, type IAccount, type ISODateString, TypeGuards } from '@path-logic/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';
import {
    Landmark,
    Banknote,
    CreditCard,
    Wallet,
    Home,
    Car,
    Receipt,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { LoanDetailsForm } from './LoanDetailsForm';

interface INewAccountDialogProps {
    isOpen: boolean;
    onClose: () => void;
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
        label: 'Checking',
        description: 'Daily spending & income'
    },
    {
        type: AccountType.Savings,
        icon: Banknote,
        label: 'Savings',
        description: 'Long-term goals'
    },
    {
        type: AccountType.Credit,
        icon: CreditCard,
        label: 'Credit Card',
        description: 'Track spending & debt'
    },
    {
        type: AccountType.Cash,
        icon: Wallet,
        label: 'Cash',
        description: 'Physical currency'
    }
];

const LOAN_TYPES: Array<IAccountTypeOption> = [
    {
        type: AccountType.Mortgage,
        icon: Home,
        label: 'Mortgage',
        description: 'Home loan & equity'
    },
    {
        type: AccountType.AutoLoan,
        icon: Car,
        label: 'Auto Loan',
        description: 'Vehicle financing'
    },
    {
        type: AccountType.PersonalLoan,
        icon: Receipt,
        label: 'Personal Loan',
        description: 'Unsecured debt'
    }
];

const TYPE_THEMING: Record<string, { accentBg: string; iconText: string; iconBg: string }> = {
    [AccountType.Checking]: { accentBg: 'bg-teal-500', iconText: 'text-teal-500', iconBg: 'bg-teal-500/10' },
    [AccountType.Savings]: { accentBg: 'bg-blue-500', iconText: 'text-blue-500', iconBg: 'bg-blue-500/10' },
    [AccountType.Credit]: { accentBg: 'bg-purple-500', iconText: 'text-purple-500', iconBg: 'bg-purple-500/10' },
    [AccountType.Cash]: { accentBg: 'bg-green-500', iconText: 'text-green-500', iconBg: 'bg-green-500/10' },
    [AccountType.Mortgage]: { accentBg: 'bg-amber-500', iconText: 'text-amber-500', iconBg: 'bg-amber-500/10' },
    [AccountType.AutoLoan]: { accentBg: 'bg-amber-500', iconText: 'text-amber-500', iconBg: 'bg-amber-500/10' },
    [AccountType.PersonalLoan]: { accentBg: 'bg-amber-500', iconText: 'text-amber-500', iconBg: 'bg-amber-500/10' },
};

export function NewAccountDialog({ isOpen, onClose, onAccountCreated }: INewAccountDialogProps): React.JSX.Element {
    const [step, setStep] = useState<WizardStep>('select-type');
    const [selectedType, setSelectedType] = useState<AccountType | null>(null);
    const [showLoans, setShowLoans] = useState<boolean>(false);

    // Standard Form State
    const [accountName, setAccountName] = useState<string>('');
    const [institutionName, setInstitutionName] = useState<string>('');
    const [initialBalance, setInitialBalance] = useState<string>('');
    const [error, setError] = useState<string>('');

    // Reset state when opening/closing
    React.useEffect(() => {
        if (!isOpen) {
            setStep('select-type');
            setSelectedType(null);
            setAccountName('');
            setInstitutionName('');
            setInitialBalance('');
            setError('');
        }
    }, [isOpen]);

    const handleTypeSelect = (type: AccountType): void => {
        setSelectedType(type);
        setStep('enter-details');
        setError('');

        const defaultNames: Record<string, string> = {
            [AccountType.Checking]: 'Main Checking',
            [AccountType.Savings]: 'Savings',
            [AccountType.Credit]: 'Credit Card',
            [AccountType.Cash]: 'Cash'
        };
        const defaultName = defaultNames[type];
        if (defaultName) {
            setAccountName(defaultName);
        }
    };

    const handleCreate = async (): Promise<void> => {
        if (!accountName.trim()) {
            setError('Account name is required');
            return;
        }

        setError('');
        setStep('creating');

        try {
            const now: ISODateString = new Date().toISOString() as ISODateString;
            let val = parseFloat(initialBalance || '0');

            if (selectedType === AccountType.Credit) {
                val = -Math.abs(val);
            } else {
                val = Math.abs(val);
            }

            const balanceCents: number = Math.round(val * 100);

            const newAccount: IAccount = {
                id: `acc-${Date.now()}`,
                name: accountName.trim(),
                type: selectedType!,
                institutionName: institutionName.trim(),
                clearedBalance: balanceCents,
                pendingBalance: balanceCents,
                isActive: true,
                deletedAt: null,
                createdAt: now,
                updatedAt: now
            };

            await onAccountCreated(newAccount);
            onClose();
        } catch {
            setError('Failed to create account');
            setStep('enter-details');
        }
    };

    const selectedOption = selectedType
        ? [...PRIMARY_TYPES, ...LOAN_TYPES].find(opt => opt.type === selectedType)
        : null;

    const theming = selectedType
        ? TYPE_THEMING[selectedType]
        : { accentBg: 'bg-primary', iconText: 'text-primary', iconBg: 'bg-primary/10' };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-card border-border">
                <div className="p-6 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-5 h-5 bg-primary rounded-sm flex items-center justify-center">
                            <span className="text-primary-foreground font-black text-[10px]">P</span>
                        </div>
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-foreground">
                            Add <span className="text-primary">New Account</span>
                        </h2>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-70">
                        {step === 'select-type' ? 'Select the account classification' : `Configure ${selectedOption?.label}`}
                    </p>
                </div>

                <div className="p-6">
                    {step === 'select-type' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-3">
                                {PRIMARY_TYPES.map((option) => {
                                    const Icon = option.icon;
                                    const optTheme = TYPE_THEMING[option.type] || { accentBg: 'bg-primary', iconText: 'text-primary', iconBg: 'bg-primary/10' };
                                    return (
                                        <button
                                            key={option.type}
                                            onClick={() => handleTypeSelect(option.type)}
                                            className="group flex flex-col items-center p-4 border border-border rounded-sm hover:border-primary/50 hover:bg-primary/5 transition-all text-center"
                                        >
                                            <div className={cn("w-10 h-10 rounded-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform", optTheme.iconBg)}>
                                                <Icon className={cn("w-5 h-5", optTheme.iconText)} />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest mb-1">{option.label}</span>
                                            <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter opacity-60 leading-tight">
                                                {option.description}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="pt-2">
                                <button
                                    onClick={() => setShowLoans(!showLoans)}
                                    className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-sm transition-colors"
                                >
                                    <span>Loan / Liability Types</span>
                                    {showLoans ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>

                                {showLoans && (
                                    <div className="grid grid-cols-1 gap-2 mt-2 animate-in slide-in-from-top-2">
                                        {LOAN_TYPES.map((option) => {
                                            const Icon = option.icon;
                                            return (
                                                <button
                                                    key={option.type}
                                                    onClick={() => handleTypeSelect(option.type)}
                                                    className="flex items-center gap-4 p-3 border border-border rounded-sm hover:border-amber-500/50 hover:bg-amber-500/5 transition-all text-left group"
                                                >
                                                    <div className="w-8 h-8 rounded-sm bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                        <Icon className="w-4 h-4 text-amber-500" />
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-black uppercase tracking-widest block">{option.label}</span>
                                                        <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter opacity-60">
                                                            {option.description}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 'enter-details' && selectedType && !TypeGuards.isLoanAccount(selectedType) && (
                        <div className="space-y-6">
                            <div className="flex gap-4 p-4 bg-muted/30 rounded-sm border border-border">
                                <div className={cn("w-12 h-12 rounded-sm flex items-center justify-center flex-none", theming?.iconBg)}>
                                    {selectedOption && <selectedOption.icon className={cn("w-6 h-6", theming?.iconText)} />}
                                </div>
                                <div>
                                    <h3 className="text-[11px] font-black uppercase tracking-widest mb-0.5">{selectedOption?.label}</h3>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter opacity-60 leading-tight">
                                        {selectedOption?.description}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="dlg-account-name" className="text-[10px] font-black uppercase tracking-widest opacity-70">Account Name *</Label>
                                    <Input
                                        id="dlg-account-name"
                                        value={accountName}
                                        onChange={(e) => setAccountName(e.target.value)}
                                        placeholder="e.g. Chase Checking"
                                        className="h-9 text-sm font-bold uppercase"
                                        autoFocus
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="dlg-institution" className="text-[10px] font-black uppercase tracking-widest opacity-70">Institution (Optional)</Label>
                                    <Input
                                        id="dlg-institution"
                                        value={institutionName}
                                        onChange={(e) => setInstitutionName(e.target.value)}
                                        placeholder="e.g. JPMorgan Chase"
                                        className="h-9 text-sm font-bold uppercase"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="dlg-balance" className="text-[10px] font-black uppercase tracking-widest opacity-70">Starting Balance</Label>
                                    <Input
                                        id="dlg-balance"
                                        type="number"
                                        step="0.01"
                                        value={initialBalance}
                                        onChange={(e) => setInitialBalance(e.target.value)}
                                        placeholder="0.00"
                                        className="h-9 text-sm font-mono font-bold"
                                    />
                                    <p className="text-[9px] text-muted-foreground italic font-bold uppercase tracking-tighter opacity-50">
                                        {selectedType === AccountType.Credit ? "Enter amount owed" : "Current cleared balance"}
                                    </p>
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-sm">
                                    <p className="text-[10px] font-black uppercase text-destructive tracking-widest">{error}</p>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <Button
                                    variant="outline"
                                    className="flex-1 h-10 text-[10px] font-black uppercase tracking-widest"
                                    onClick={() => setStep('select-type')}
                                >
                                    Change Type
                                </Button>
                                <Button
                                    className="flex-1 h-10 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                                    onClick={handleCreate}
                                >
                                    Create Account
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 'enter-details' && selectedType && TypeGuards.isLoanAccount(selectedType) && (
                        <div className="animate-in slide-in-from-bottom-4">
                            <LoanDetailsForm
                                type={selectedType}
                                onBack={() => setStep('select-type')}
                                onSubmit={async (acc: IAccount) => {
                                    setStep('creating');
                                    await onAccountCreated(acc);
                                    onClose();
                                }}
                            />
                        </div>
                    )}

                    {step === 'creating' && (
                        <div className="py-12 flex flex-col items-center justify-center gap-4">
                            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">Initializing Ledger...</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
