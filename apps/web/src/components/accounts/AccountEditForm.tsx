'use client';

import * as React from 'react';
import {
    type IAccount,
    AccountType,
    type ILoanDetails,
    LoanCalculations,
    type ISODateString,
    TypeGuards,
    type IMortgageMetadata,
    type IAutoLoanMetadata,
    type IPersonalLoanMetadata,
} from '@path-logic/core';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle } from 'lucide-react';

interface IAccountEditFormProps {
    account: IAccount;
    onSubmit: (updatedAccount: IAccount) => Promise<void>;
    onCancel: () => void;
}

export function AccountEditForm({
    account,
    onSubmit,
    onCancel,
}: IAccountEditFormProps): React.JSX.Element {
    const [name, setName] = React.useState(account.name);
    const [institutionName, setInstitutionName] = React.useState(account.institutionName);
    const [type, setType] = React.useState(account.type);
    const isActive = account.isActive;

    // Loan specific state
    const [originalAmount, setOriginalAmount] = React.useState(
        account.loanDetails ? (account.loanDetails.originalAmount / 100).toString() : '',
    );
    const [interestRate, setInterestRate] = React.useState(
        account.loanDetails ? (account.loanDetails.interestRate * 100).toString() : '',
    );
    const [termMonths, setTermMonths] = React.useState(
        account.loanDetails ? account.loanDetails.termMonths.toString() : '',
    );
    const [monthlyPayment, setMonthlyPayment] = React.useState(
        account.loanDetails ? (account.loanDetails.monthlyPayment / 100).toString() : '',
    );
    const paymentDueDay = account.loanDetails?.paymentDueDay ?? 1;
    const startDate = account.loanDetails?.startDate ?? new Date().toISOString().split('T')[0];

    // Metadata state
    const mortgageMetadata = account.loanDetails?.metadata as IMortgageMetadata;
    const [propertyAddress, setPropertyAddress] = React.useState(
        mortgageMetadata?.propertyAddress || '',
    );
    const propertyValue = mortgageMetadata?.propertyValue ?? 0;
    const [escrowIncluded, setEscrowIncluded] = React.useState(
        mortgageMetadata?.escrowIncluded || false,
    );
    const escrowAmount = mortgageMetadata?.escrowAmount ?? 0;

    const autoMetadata = account.loanDetails?.metadata as IAutoLoanMetadata;
    const [vehicleMake, setVehicleMake] = React.useState(autoMetadata?.vehicleMake || '');
    const [vehicleModel, setVehicleModel] = React.useState(autoMetadata?.vehicleModel || '');
    const vehicleYear = autoMetadata?.vehicleYear ?? new Date().getFullYear();
    const vin = autoMetadata?.vin ?? '';

    const personalMetadata = account.loanDetails?.metadata as IPersonalLoanMetadata;
    const purpose = personalMetadata?.purpose ?? '';
    const secured = personalMetadata?.secured ?? false;

    const [error, setError] = React.useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const now = new Date().toISOString() as ISODateString;
            let loanDetails: ILoanDetails | undefined;

            if (TypeGuards.isLoanAccount(type)) {
                const principalCents = Math.round(parseFloat(originalAmount) * 100);
                const rateDecimal = parseFloat(interestRate) / 100;
                const paymentCents = Math.round(parseFloat(monthlyPayment) * 100);

                loanDetails = {
                    originalAmount: principalCents,
                    interestRate: rateDecimal,
                    termMonths: parseInt(termMonths, 10),
                    monthlyPayment: paymentCents,
                    paymentDueDay:
                        typeof paymentDueDay === 'string'
                            ? parseInt(paymentDueDay, 10)
                            : paymentDueDay,
                    startDate: new Date(startDate || '').toISOString() as ISODateString,
                };

                if (type === AccountType.Mortgage) {
                    loanDetails.metadata = {
                        propertyAddress,
                        propertyValue: propertyValue
                            ? typeof propertyValue === 'string'
                                ? Math.round(parseFloat(propertyValue) * 100)
                                : propertyValue
                            : undefined,
                        escrowIncluded,
                        escrowAmount: escrowAmount
                            ? typeof escrowAmount === 'string'
                                ? Math.round(parseFloat(escrowAmount) * 100)
                                : escrowAmount
                            : undefined,
                    } as IMortgageMetadata;
                } else if (type === AccountType.AutoLoan) {
                    loanDetails.metadata = {
                        vehicleMake,
                        vehicleModel,
                        vehicleYear: vehicleYear
                            ? typeof vehicleYear === 'string'
                                ? parseInt(vehicleYear, 10)
                                : vehicleYear
                            : undefined,
                        vin,
                    } as IAutoLoanMetadata;
                } else if (type === AccountType.PersonalLoan) {
                    loanDetails.metadata = {
                        purpose,
                        secured,
                    } as IPersonalLoanMetadata;
                }

                const validationErrors = LoanCalculations.validateLoanDetails(
                    loanDetails,
                    account.clearedBalance,
                );
                if (validationErrors.length > 0) {
                    setError(validationErrors[0] ?? 'Invalid loan details');
                    setIsSubmitting(false);
                    return;
                }
            }

            const updatedAccount: IAccount = {
                ...account,
                name: name.trim(),
                institutionName: institutionName.trim(),
                type,
                isActive,
                updatedAt: now,
            };

            if (loanDetails) {
                updatedAccount.loanDetails = loanDetails;
            } else {
                delete updatedAccount.loanDetails;
            }

            await onSubmit(updatedAccount);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update account');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isLoan = TypeGuards.isLoanAccount(type);

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-[11px] p-3 rounded-sm flex items-start gap-2 uppercase font-bold animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                    <Label
                        htmlFor="name"
                        className="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                    >
                        Account Name
                    </Label>
                    <Input
                        id="name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Main Checking"
                        className="bg-muted/10 border-border focus-visible:ring-primary uppercase font-bold text-xs"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label
                        htmlFor="institution"
                        className="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                    >
                        Institution
                    </Label>
                    <Input
                        id="institution"
                        value={institutionName}
                        onChange={e => setInstitutionName(e.target.value)}
                        placeholder="e.g. Chase"
                        className="bg-muted/10 border-border focus-visible:ring-primary uppercase font-bold text-xs"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label
                        htmlFor="type"
                        className="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                    >
                        Account Type
                    </Label>
                    <Select value={type} onValueChange={value => setType(value as AccountType)}>
                        <SelectTrigger className="w-full bg-muted/10 border-border font-bold text-xs uppercase">
                            <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                            {Object.values(AccountType).map(t => (
                                <SelectItem
                                    key={t}
                                    value={t}
                                    className="text-xs uppercase font-bold focus:bg-primary/20"
                                >
                                    {t.replace('_', ' ')}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {isLoan && (
                <div className="space-y-4 border-t border-border/50 pt-4 animate-in fade-in slide-in-from-top-2">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                        Loan Details
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label
                                htmlFor="originalAmount"
                                className="text-[10px] font-bold uppercase text-muted-foreground"
                            >
                                Original Principal
                            </Label>
                            <Input
                                id="originalAmount"
                                type="number"
                                step="0.01"
                                value={originalAmount}
                                onChange={e => setOriginalAmount(e.target.value)}
                                className="bg-muted/5 border-border font-mono text-xs"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label
                                htmlFor="interestRate"
                                className="text-[10px] font-bold uppercase text-muted-foreground"
                            >
                                Interest Rate (APR %)
                            </Label>
                            <Input
                                id="interestRate"
                                type="number"
                                step="0.001"
                                value={interestRate}
                                onChange={e => setInterestRate(e.target.value)}
                                className="bg-muted/5 border-border font-mono text-xs"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label
                                htmlFor="termMonths"
                                className="text-[10px] font-bold uppercase text-muted-foreground"
                            >
                                Term (Months)
                            </Label>
                            <Input
                                id="termMonths"
                                type="number"
                                value={termMonths}
                                onChange={e => setTermMonths(e.target.value)}
                                className="bg-muted/5 border-border font-mono text-xs"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label
                                htmlFor="monthlyPayment"
                                className="text-[10px] font-bold uppercase text-muted-foreground"
                            >
                                Monthly Payment
                            </Label>
                            <Input
                                id="monthlyPayment"
                                type="number"
                                step="0.01"
                                value={monthlyPayment}
                                onChange={e => setMonthlyPayment(e.target.value)}
                                className="bg-muted/5 border-border font-mono text-xs"
                                required
                            />
                        </div>
                    </div>

                    {/* Metadata section depending on type */}
                    {type === AccountType.Mortgage && (
                        <div className="grid grid-cols-2 gap-4 p-3 bg-muted/20 border border-border rounded-sm">
                            <div className="col-span-2 space-y-2">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                                    Property Address
                                </Label>
                                <Input
                                    value={propertyAddress}
                                    onChange={e => setPropertyAddress(e.target.value)}
                                    className="bg-background text-xs"
                                />
                            </div>
                            <div className="flex items-center gap-2 pt-2 col-span-2">
                                <Checkbox
                                    id="escrow"
                                    checked={escrowIncluded}
                                    onCheckedChange={(val: boolean | 'indeterminate'): void =>
                                        setEscrowIncluded(!!val)
                                    }
                                />
                                <Label htmlFor="escrow" className="text-[10px] uppercase font-bold">
                                    Include Escrow
                                </Label>
                            </div>
                        </div>
                    )}

                    {type === AccountType.AutoLoan && (
                        <div className="grid grid-cols-2 gap-4 p-3 bg-muted/20 border border-border rounded-sm">
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                                    Vehicle Make
                                </Label>
                                <Input
                                    value={vehicleMake}
                                    onChange={e => setVehicleMake(e.target.value)}
                                    className="bg-background text-xs"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                                    Vehicle Model
                                </Label>
                                <Input
                                    value={vehicleModel}
                                    onChange={e => setVehicleModel(e.target.value)}
                                    className="bg-background text-xs"
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={onCancel}
                    className="text-[10px] font-black uppercase tracking-widest hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 text-[10px] font-black uppercase tracking-widest px-8 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>
        </form>
    );
}
