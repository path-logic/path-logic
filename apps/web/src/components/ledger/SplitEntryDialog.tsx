'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useLedgerStore } from '@/store/ledgerStore';
import { type ISplit, KnownCategory, Money } from '@path-logic/core';
import { Calculator, Plus, Scale, Trash2 } from 'lucide-react';
import * as React from 'react';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface ISplitEntryDialogProps {
    isOpen: boolean;
    onClose: () => void;
    totalAmount: number; // in cents
    initialSplits: Array<ISplit>;
    onSave: (splits: Array<ISplit>, newTotal?: number) => void;
}

export function SplitEntryDialog({
    isOpen,
    onClose,
    totalAmount,
    initialSplits,
    onSave,
}: ISplitEntryDialogProps): React.JSX.Element {
    const { categories } = useLedgerStore();
    const [splits, setSplits] = React.useState<Array<ISplit>>(() =>
        initialSplits.length > 0
            ? initialSplits
            : [
                  {
                      id: `split-${Date.now()}`,
                      amount: totalAmount,
                      memo: '',
                      categoryId: KnownCategory.Uncategorized,
                  },
              ],
    );

    const sumSplits = splits.reduce((sum, s) => sum + s.amount, 0);
    const difference = totalAmount - sumSplits;
    const isBalanced = difference === 0;

    const handleAddSplit = (): void => {
        setSplits([
            ...splits,
            {
                id: `split-${Date.now()}`,
                amount: 0,
                memo: '',
                categoryId: KnownCategory.Uncategorized,
            },
        ]);
    };

    const handleRemoveSplit = (id: string): void => {
        if (splits.length <= 1) return;
        setSplits(splits.filter(s => s.id !== id));
    };

    const handleUpdateSplit = (id: string, updates: Partial<ISplit>): void => {
        setSplits(splits.map(s => (s.id === id ? { ...s, ...updates } : s)));
    };

    const handleQuickBalance = (): void => {
        if (splits.length === 0) return;
        const lastSplit = splits[splits.length - 1];
        if (!lastSplit) return;
        handleUpdateSplit(lastSplit.id, { amount: lastSplit.amount + difference });
    };

    const handleSave = (): void => {
        onSave(splits);
        onClose();
    };

    const handleAdjustTotal = (): void => {
        onSave(splits, sumSplits);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="text-sm font-black uppercase tracking-widest text-primary">
                        Split Transaction Detail
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    {/* Summary Header */}
                    <div className="flex justify-between items-center bg-accent/30 p-3 rounded-sm border border-border">
                        <div>
                            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter mb-0.5">
                                Target Total
                            </p>
                            <p className="font-mono font-bold text-lg text-primary">
                                {Money.formatCurrency(totalAmount)}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter mb-0.5">
                                Remaining
                            </p>
                            <p
                                className={cn(
                                    'font-mono font-bold text-lg',
                                    isBalanced
                                        ? 'text-emerald-500'
                                        : 'text-destructive animate-pulse',
                                )}
                            >
                                {Money.formatCurrency(difference)}
                            </p>
                        </div>
                    </div>

                    {/* Split Table */}
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                        {splits.map((split, index) => (
                            <div
                                key={split.id}
                                className="flex gap-3 items-center group animate-in slide-in-from-left-2"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="w-[180px]">
                                    <Select
                                        value={split.categoryId || KnownCategory.Uncategorized}
                                        onValueChange={value =>
                                            handleUpdateSplit(split.id, { categoryId: value })
                                        }
                                    >
                                        <SelectTrigger className="h-8 text-[10px] uppercase font-bold bg-background border-border text-muted-foreground focus:ring-1 focus:ring-primary">
                                            <SelectValue placeholder="Category" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-card border-border">
                                            {categories.map(cat => (
                                                <SelectItem
                                                    key={cat.id}
                                                    value={cat.id}
                                                    className="text-[10px] uppercase font-bold"
                                                >
                                                    {cat.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex-1">
                                    <Input
                                        placeholder="Split Memo"
                                        value={split.memo}
                                        onChange={e =>
                                            handleUpdateSplit(split.id, { memo: e.target.value })
                                        }
                                        className="bg-background border-border text-[10px] h-8 focus:ring-1 focus:ring-primary px-2"
                                    />
                                </div>
                                <div className="w-[120px]">
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={split.amount / 100}
                                        onChange={e =>
                                            handleUpdateSplit(split.id, {
                                                amount: Money.dollarsToCents(
                                                    parseFloat(e.target.value) || 0,
                                                ),
                                            })
                                        }
                                        className="bg-background border-border text-[10px] font-mono h-8 text-right focus:ring-1 focus:ring-primary px-2"
                                    />
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(): void => handleRemoveSplit(split.id)}
                                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        ))}
                    </div>

                    <Button
                        variant="outline"
                        onClick={handleAddSplit}
                        className="w-full border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary/50 text-[10px] font-bold uppercase h-9"
                    >
                        <Plus className="w-3.5 h-3.5 mr-2" /> Add Split Line
                    </Button>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    {!isBalanced && (
                        <div className="flex gap-2 mr-auto">
                            <Button
                                variant="outline"
                                onClick={handleAdjustTotal}
                                className="border-primary/30 text-primary text-[9px] font-black uppercase h-8 px-3"
                            >
                                <Scale className="w-3 h-3 mr-2" /> Adjust Total to{' '}
                                {Money.formatCurrency(sumSplits)}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleQuickBalance}
                                className="border-emerald-500/30 text-emerald-500 text-[9px] font-black uppercase h-8 px-3"
                            >
                                <Calculator className="w-3 h-3 mr-2" /> Quick Balance
                            </Button>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            className="text-[10px] font-bold uppercase h-8 text-muted-foreground"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={!isBalanced}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-black uppercase h-8 px-6 disabled:opacity-30"
                        >
                            Confirm Splits
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
