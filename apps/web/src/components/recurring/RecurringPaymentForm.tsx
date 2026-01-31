'use client';

import * as React from 'react';
import {
    type IRecurringSchedule,
    type IAccount,
    Frequency,
    PaymentMethod,
    KnownCategory,
    ScheduleType,
    type ISplit,
} from '@path-logic/core';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalculatorInput } from '@/components/ui/calculator-input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RecurringSplitEditor } from './RecurringSplitEditor';
import { useLedgerStore } from '@/store/ledgerStore';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon } from 'lucide-react';

interface IRecurringPaymentFormProps {
    accounts: Array<IAccount>;
    initialData?: Partial<IRecurringSchedule>;
    onSubmit: (data: Partial<IRecurringSchedule>) => void;
    onCancel: () => void;
}

export function RecurringPaymentForm({
    accounts,
    initialData,
    onSubmit,
    onCancel,
}: IRecurringPaymentFormProps): React.JSX.Element {
    const [payee, setPayee] = React.useState(initialData?.payee || '');
    const [amount, setAmount] = React.useState(
        initialData?.amount ? (initialData.amount / 100).toString() : '',
    );
    const [type, setType] = React.useState<ScheduleType>(initialData?.type || ScheduleType.Debit);
    const [accountId, setAccountId] = React.useState(
        initialData?.accountId || accounts[0]?.id || '',
    );
    const [frequency, setFrequency] = React.useState<Frequency>(
        (initialData?.frequency as Frequency) || Frequency.Monthly,
    );
    const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>(
        initialData?.paymentMethod || PaymentMethod.DirectDebit,
    );
    const [startDate, setStartDate] = React.useState(
        initialData?.startDate || new Date().toISOString().split('T')[0],
    );
    const [autoPost, setAutoPost] = React.useState(initialData?.autoPost || false);
    const [memo] = React.useState(initialData?.memo || '');
    const [splits, setSplits] = React.useState<Array<ISplit>>(initialData?.splits || []);

    const { categories } = useLedgerStore();

    // Sync total amount with splits if splits exist
    const totalFromSplits = splits.reduce((sum, s) => sum + s.amount, 0);
    const displayAmount = splits.length > 0 ? (totalFromSplits / 100).toString() : amount;

    const handleSubmit = (e: React.FormEvent): void => {
        e.preventDefault();

        const finalAmount =
            splits.length > 0 ? totalFromSplits : Math.round(parseFloat(amount) * 100);
        const finalSplits =
            splits.length > 0
                ? splits
                : [
                      {
                          id: `split-${Date.now()}`,
                          amount: finalAmount,
                          memo: memo,
                          categoryId: KnownCategory.Uncategorized,
                      },
                  ];

        onSubmit({
            payee,
            amount: finalAmount,
            type, // New type field
            accountId,
            frequency,
            paymentMethod,
            startDate: startDate as string,
            autoPost,
            memo,
            splits: finalSplits,
            isActive: true,
        });
    };

    return (
        <Card className="w-full bg-card border-border shadow-2xl">
            <CardHeader className="pb-4 space-y-4">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-black uppercase tracking-widest text-primary">
                        {initialData?.id
                            ? 'Edit Scheduled Transaction'
                            : 'New Scheduled Transaction'}
                    </CardTitle>
                </div>
                <Tabs
                    value={type}
                    onValueChange={v => setType(v as ScheduleType)}
                    className="w-full"
                >
                    <TabsList className="grid w-full grid-cols-3 h-10 bg-muted/30 p-1 rounded-sm border border-border/50">
                        <TabsTrigger
                            value={ScheduleType.Debit}
                            className="text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-destructive data-[state=active]:text-white"
                        >
                            Debit
                        </TabsTrigger>
                        <TabsTrigger
                            value={ScheduleType.Deposit}
                            className="text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
                        >
                            Deposit
                        </TabsTrigger>
                        <TabsTrigger
                            value={ScheduleType.Paycheck}
                            className="text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white"
                        >
                            Paycheck
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label
                                htmlFor="payee"
                                className="text-[10px] font-black uppercase tracking-widest opacity-70"
                            >
                                Payee / Description
                            </Label>
                            <Input
                                id="payee"
                                value={payee}
                                onChange={e => setPayee(e.target.value)}
                                placeholder="e.g. Netflix, Rent, Salary"
                                className="h-10 bg-muted/20 border-border focus:border-primary/50"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest opacity-70">
                                    Total Amount
                                </Label>
                                <CalculatorInput
                                    value={displayAmount}
                                    onChange={val => setAmount(val)}
                                    disabled={splits.length > 0}
                                    className={cn(
                                        'font-mono h-10',
                                        parseFloat(displayAmount) < 0
                                            ? 'text-destructive'
                                            : 'text-emerald-500',
                                    )}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label
                                    htmlFor="account"
                                    className="text-[10px] font-black uppercase tracking-widest opacity-70"
                                >
                                    Post to Account
                                </Label>
                                <Select value={accountId} onValueChange={setAccountId}>
                                    <SelectTrigger className="h-10 bg-muted/20 border-border font-bold text-xs uppercase tracking-tight">
                                        <SelectValue placeholder="Select account" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border">
                                        {accounts.map(acc => (
                                            <SelectItem
                                                key={acc.id}
                                                value={acc.id}
                                                className="text-xs font-bold uppercase tracking-tight"
                                            >
                                                {acc.name}
                                            </SelectItem>
                                        ))}
                                        <SelectItem
                                            value="add-new"
                                            className="text-xs font-black uppercase tracking-widest text-primary border-t border-border mt-1"
                                        >
                                            + Add New Account
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4 pt-2 border-t border-border/30">
                        <RecurringSplitEditor
                            type={type}
                            totalAmount={
                                splits.length > 0
                                    ? totalFromSplits
                                    : Math.round(parseFloat(amount || '0') * 100)
                            }
                            splits={splits}
                            categories={categories}
                            onChange={setSplits}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="space-y-2">
                            <Label
                                htmlFor="frequency"
                                className="text-[10px] font-black uppercase tracking-widest opacity-70"
                            >
                                Frequency
                            </Label>
                            <Select
                                value={frequency}
                                onValueChange={v => setFrequency(v as Frequency)}
                            >
                                <SelectTrigger className="h-10 w-full bg-muted/20 border-border font-bold text-xs uppercase tracking-tight">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border">
                                    {Object.values(Frequency).map(f => (
                                        <SelectItem
                                            key={f}
                                            value={f}
                                            className="text-xs font-bold uppercase tracking-tight"
                                        >
                                            {f
                                                .split('_')
                                                .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                                                .join(' ')}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label
                                htmlFor="startDate"
                                className="text-[10px] font-black uppercase tracking-widest opacity-70"
                            >
                                Next Occurrence
                            </Label>
                            <div className="relative w-full">
                                <CalendarIcon className="absolute left-3 top-3 w-4 h-4 text-muted-foreground opacity-50" />
                                <Input
                                    id="startDate"
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    className="h-10 w-full pl-10 font-mono text-xs uppercase bg-muted/20 border-border focus:border-primary/50"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-border/50">
                        <div className="flex items-center justify-between py-2 border-b border-border/30">
                            <div className="space-y-0.5">
                                <Label className="text-[11px] font-black uppercase tracking-widest text-foreground">
                                    Automatic Entry
                                </Label>
                                <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter">
                                    Post to ledger automatically on due date
                                </p>
                            </div>
                            <Switch
                                checked={autoPost}
                                onCheckedChange={setAutoPost}
                                className="scale-75"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label
                                htmlFor="paymentMethod"
                                className="text-[10px] font-black uppercase tracking-widest opacity-70"
                            >
                                Payment Method / Source
                            </Label>
                            <Select
                                value={paymentMethod}
                                onValueChange={v => setPaymentMethod(v as PaymentMethod)}
                            >
                                <SelectTrigger className="h-10 bg-muted/20 border-border font-bold text-xs uppercase">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border">
                                    {Object.values(PaymentMethod).map(m => (
                                        <SelectItem
                                            key={m}
                                            value={m}
                                            className="text-[11px] font-bold uppercase tracking-tight"
                                        >
                                            {m.split('_').join(' ')}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex gap-3 pt-6 border-t border-border/30">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        className="flex-1 h-11 text-xs font-black uppercase tracking-widest hover:bg-muted/50"
                    >
                        Discard
                    </Button>
                    <Button
                        type="submit"
                        className="flex-1 h-11 text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                    >
                        Save Schedule
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
