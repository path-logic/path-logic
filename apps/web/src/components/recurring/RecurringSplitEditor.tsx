'use client';

import * as React from 'react';
import { type ISplit, type ICategory, Money, ScheduleType, KnownCategory } from '@path-logic/core';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Wallet, Receipt } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { CalculatorInput } from '@/components/ui/calculator-input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface IRecurringSplitEditorProps {
    type: ScheduleType;
    totalAmount: number;
    splits: Array<ISplit>;
    categories: Array<ICategory>;
    onChange: (splits: Array<ISplit>) => void;
}

export function RecurringSplitEditor({
    type,
    totalAmount,
    splits,
    categories,
    onChange,
}: IRecurringSplitEditorProps): React.JSX.Element {
    const remaining = totalAmount - splits.reduce((sum, s) => sum + s.amount, 0);

    const addSplit = (categoryId?: string): void => {
        const newSplit: ISplit = {
            id: `split-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            amount: 0,
            memo: '',
            categoryId: categoryId || KnownCategory.Uncategorized,
        };
        onChange([...splits, newSplit]);
    };

    const updateSplit = (id: string, updates: Partial<ISplit>): void => {
        onChange(splits.map(s => (s.id === id ? { ...s, ...updates } : s)));
    };

    const removeSplit = (id: string): void => {
        onChange(splits.filter(s => s.id !== id));
    };

    const renderSplitRow = (split: ISplit): React.JSX.Element => (
        <div
            key={split.id}
            className="grid grid-cols-12 gap-2 items-center bg-muted/5 p-1.5 rounded-sm border border-border/40 group"
        >
            <div className="col-span-5">
                <Select
                    value={split.categoryId || KnownCategory.Uncategorized}
                    onValueChange={val => updateSplit(split.id, { categoryId: val })}
                >
                    <SelectTrigger
                        aria-label="Category"
                        className="h-8 text-[11px] bg-background border-border font-bold uppercase tracking-tight"
                    >
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                        {categories.map(cat => (
                            <SelectItem
                                key={cat.id}
                                value={cat.id}
                                className="text-[11px] font-bold uppercase tracking-tight"
                            >
                                {cat.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="col-span-4">
                <CalculatorInput
                    aria-label="Amount"
                    value={(split.amount / 100).toString()}
                    onChange={val =>
                        updateSplit(split.id, { amount: Math.round(parseFloat(val || '0') * 100) })
                    }
                    className="h-8 text-[11px] font-mono bg-background"
                />
            </div>
            <div className="col-span-2">
                <input
                    aria-label="Memo"
                    placeholder="Memo"
                    value={split.memo}
                    onChange={e => updateSplit(split.id, { memo: e.target.value })}
                    className="h-8 w-full text-[10px] bg-background border border-border rounded-sm px-2 focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
            </div>
            <div className="col-span-1 flex justify-end">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSplit(split.id)}
                    aria-label="Remove split"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </Button>
            </div>
        </div>
    );

    if (type === ScheduleType.Paycheck) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <Wallet className="w-3.5 h-3.5" /> Paycheck Structure
                    </label>
                    <div
                        className={cn(
                            'text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-sm',
                            remaining === 0
                                ? 'bg-emerald-500/10 text-emerald-700'
                                : 'bg-amber-500/10 text-amber-700',
                        )}
                    >
                        Out of Balance: {Money.formatCurrency(remaining)}
                    </div>
                </div>

                <Tabs defaultValue="wages" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 h-8 bg-muted/20 p-0.5 rounded-sm">
                        <TabsTrigger
                            value="wages"
                            className="text-[9px] font-black uppercase tracking-widest"
                        >
                            Wages
                        </TabsTrigger>
                        <TabsTrigger
                            value="pretax"
                            className="text-[9px] font-black uppercase tracking-widest"
                        >
                            Pre-Tax
                        </TabsTrigger>
                        <TabsTrigger
                            value="taxes"
                            className="text-[9px] font-black uppercase tracking-widest"
                        >
                            Taxes
                        </TabsTrigger>
                        <TabsTrigger
                            value="posttax"
                            className="text-[9px] font-black uppercase tracking-widest"
                        >
                            Other
                        </TabsTrigger>
                    </TabsList>

                    <div className="mt-3 space-y-2 min-h-[120px]">
                        <TabsContent value="wages" className="space-y-2 m-0">
                            {splits.filter(s => s.amount > 0).map(renderSplitRow)}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => addSplit()}
                                className="text-[9px] font-black uppercase tracking-widest h-7 text-muted-foreground hover:text-primary"
                            >
                                + Add Income
                            </Button>
                        </TabsContent>
                        <TabsContent value="pretax" className="space-y-2 m-0">
                            {splits
                                .filter(s => s.amount < 0 && !s.memo.includes('Tax'))
                                .map(renderSplitRow)}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => addSplit()}
                                className="text-[9px] font-black uppercase tracking-widest h-7 text-muted-foreground hover:text-primary"
                            >
                                + Add Pre-Tax Deduct
                            </Button>
                        </TabsContent>
                        <TabsContent value="taxes" className="space-y-2 m-0">
                            {splits
                                .filter(s => s.amount < 0 && s.memo.includes('Tax'))
                                .map(renderSplitRow)}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => addSplit()}
                                className="text-[9px] font-black uppercase tracking-widest h-7 text-muted-foreground hover:text-primary"
                            >
                                + Add Tax Line
                            </Button>
                        </TabsContent>
                        <TabsContent value="posttax" className="space-y-2 m-0">
                            {splits
                                .filter(s => s.amount < 0 && s.memo.includes('Post'))
                                .map(renderSplitRow)}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => addSplit()}
                                className="text-[9px] font-black uppercase tracking-widest h-7 text-muted-foreground hover:text-primary"
                            >
                                + Add Deduction
                            </Button>
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Receipt className="w-3.5 h-3.5" />{' '}
                    {type === ScheduleType.Deposit ? 'Deposit Splits' : 'Transaction Splits'}
                </label>
                <div
                    className={cn(
                        'text-[10px] font-mono px-2 py-0.5 rounded-full border',
                        remaining === 0
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-700',
                    )}
                >
                    Remaining: {Money.formatCurrency(remaining)}
                </div>
            </div>

            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-muted-foreground/20">
                {splits.map(renderSplitRow)}
                {splits.length === 0 && (
                    <div className="text-[10px] text-muted-foreground italic py-4 text-center bg-muted/5 rounded-sm border border-dashed border-border/50">
                        No splits defined. Total amount will be uncategorized.
                    </div>
                )}
            </div>

            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addSplit()}
                className="w-full h-8 text-[10px] font-black uppercase tracking-widest border-dashed border-primary/30 text-primary hover:bg-primary/5 transition-all"
            >
                <Plus className="w-3 h-3 mr-2" /> Add{' '}
                {type === ScheduleType.Deposit ? 'Income' : 'Split'}
            </Button>
        </div>
    );
}
