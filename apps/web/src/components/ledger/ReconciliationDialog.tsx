'use client';

import * as React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { X, AlertCircle, ArrowRight, Link as LinkIcon, PlusCircle } from 'lucide-react';
import type { IReconciliationMatch } from '@/lib/sync/ReconciliationEngine';
import { Money } from '@path-logic/core';
import { cn } from '@/lib/utils';

interface IReconciliationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    matches: Array<IReconciliationMatch>;
    onConfirm: (decisions: Record<number, 'import' | 'match' | 'ignore'>) => Promise<void>;
}

/**
 * ReconciliationDialog provides an interface for users to resolve conflicts
 * and matches during QIF statement import.
 */
export function ReconciliationDialog({
    isOpen,
    onClose,
    matches,
    onConfirm,
}: IReconciliationDialogProps): React.JSX.Element {
    const [decisions, setDecisions] = React.useState<Record<number, 'import' | 'match' | 'ignore'>>(
        {},
    );
    const [isProcessing, setIsProcessing] = React.useState(false);

    // Initialize decisions
    React.useEffect(() => {
        const initialDecisions: Record<number, 'import' | 'match' | 'ignore'> = {};
        matches.forEach((match, idx) => {
            if (match.type === 'none') initialDecisions[idx] = 'import';
            else if (match.type === 'fuzzy')
                initialDecisions[idx] = 'match'; // Default to matching
            else if (match.type === 'exact') initialDecisions[idx] = 'ignore';
        });
        setDecisions(initialDecisions);
    }, [matches]);

    const setDecision = (idx: number, decision: 'import' | 'match' | 'ignore'): void => {
        setDecisions(prev => ({ ...prev, [idx]: decision }));
    };

    const handleApply = async (): Promise<void> => {
        setIsProcessing(true);
        try {
            await onConfirm(decisions);
            onClose();
        } catch (error) {
            console.error('Failed to apply reconciliation decisions', error);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 border-border bg-card shadow-2xl overflow-hidden rounded-sm">
                <DialogHeader className="p-6 border-b border-border bg-background/50 backdrop-blur-md sticky top-0 z-20">
                    <DialogTitle className="uppercase font-black tracking-widest text-primary flex items-center gap-3 text-xl">
                        <AlertCircle className="w-6 h-6" />
                        Reconciliation Review
                    </DialogTitle>
                    <DialogDescription className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest opacity-70 mt-1">
                        Reviewing {matches.length} bank statement entries against local ledger
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 bg-muted/10">
                    <div className="p-6 space-y-4">
                        {matches.map((match, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    'p-4 rounded-sm border-2 transition-all relative overflow-hidden',
                                    decisions[idx] === 'import' && 'border-primary/30 bg-primary/5',
                                    decisions[idx] === 'match' &&
                                        'border-amber-500/30 bg-amber-500/5',
                                    decisions[idx] === 'ignore' &&
                                        'border-border/50 bg-muted/20 opacity-60',
                                )}
                            >
                                {/* Status Ribbon */}
                                <div
                                    className={cn(
                                        'absolute top-0 right-0 px-2 py-0.5 text-[8px] font-black uppercase tracking-tighter',
                                        decisions[idx] === 'import' && 'bg-primary text-white',
                                        decisions[idx] === 'match' && 'bg-amber-500 text-white',
                                        decisions[idx] === 'ignore' &&
                                            'bg-muted text-muted-foreground',
                                    )}
                                >
                                    {decisions[idx]}
                                </div>

                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-3">
                                        <Badge
                                            variant={
                                                match.type === 'fuzzy' ? 'secondary' : 'outline'
                                            }
                                            className="rounded-none uppercase font-black text-[9px] h-5"
                                        >
                                            {match.type === 'fuzzy'
                                                ? 'Ambiguous'
                                                : 'New Transaction'}
                                        </Badge>
                                        <span className="text-xs font-mono font-bold text-foreground">
                                            {match.parsedTx.date}
                                        </span>
                                    </div>
                                    <div className="text-lg font-mono font-black text-emerald-500 tabular-nums">
                                        {Money.formatCurrency(match.parsedTx.amount)}
                                    </div>
                                </div>

                                <div className="grid grid-cols-12 gap-6 items-center">
                                    <div className="col-span-5 space-y-1">
                                        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest block mb-2 opacity-50">
                                            Statement Entry
                                        </span>
                                        <div className="text-sm font-black text-foreground uppercase tracking-tight">
                                            {match.parsedTx.payee}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground italic truncate">
                                            {match.parsedTx.memo || 'No memo provided'}
                                        </div>
                                    </div>

                                    <div className="col-span-1 flex justify-center">
                                        <ArrowRight
                                            className={cn(
                                                'w-5 h-5',
                                                match.type === 'fuzzy'
                                                    ? 'text-amber-500'
                                                    : 'text-border',
                                            )}
                                        />
                                    </div>

                                    <div className="col-span-6 space-y-1">
                                        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest block mb-2 opacity-50">
                                            Matched Record
                                        </span>
                                        {match.type === 'fuzzy' ? (
                                            <div className="bg-background/50 border border-amber-500/20 p-2 rounded-sm">
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-amber-500 mb-1">
                                                    <LinkIcon className="w-3 h-3" />
                                                    MATCH FOUND (
                                                    {(match.confidence * 100).toFixed(0)}%)
                                                </div>
                                                <div className="text-[9px] text-muted-foreground truncate">
                                                    ID: {match.existingTxId}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-[10px] text-muted-foreground italic border border-dashed border-border p-2 rounded-sm">
                                                No similar transaction found in the current account
                                                ledger.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-6 flex justify-end gap-2 pt-4 border-t border-border/10">
                                    {match.type === 'fuzzy' && (
                                        <Button
                                            variant={
                                                decisions[idx] === 'match' ? 'default' : 'outline'
                                            }
                                            size="sm"
                                            className="h-7 text-[9px] font-black uppercase rounded-none px-4"
                                            onClick={() => setDecision(idx, 'match')}
                                        >
                                            <LinkIcon className="w-3 h-3 mr-1.5" />
                                            Confirm Match
                                        </Button>
                                    )}
                                    <Button
                                        variant={
                                            decisions[idx] === 'import' ? 'default' : 'outline'
                                        }
                                        size="sm"
                                        className="h-7 text-[9px] font-black uppercase rounded-none px-4"
                                        onClick={() => setDecision(idx, 'import')}
                                    >
                                        <PlusCircle className="w-3 h-3 mr-1.5" />
                                        {match.type === 'fuzzy'
                                            ? 'Add as Separate'
                                            : 'Add to Ledger'}
                                    </Button>
                                    <Button
                                        variant={
                                            decisions[idx] === 'ignore' ? 'secondary' : 'ghost'
                                        }
                                        size="sm"
                                        className="h-7 text-[9px] font-black uppercase rounded-none px-4"
                                        onClick={() => setDecision(idx, 'ignore')}
                                    >
                                        <X className="w-3 h-3 mr-1.5" />
                                        Ignore
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>

                <DialogFooter className="p-6 border-t border-border bg-background/80 backdrop-blur-sm sticky bottom-0 z-20">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={isProcessing}
                        className="text-xs font-bold uppercase h-9 rounded-none"
                    >
                        Abandon Import
                    </Button>
                    <Button
                        onClick={handleApply}
                        disabled={isProcessing}
                        className="text-xs font-black uppercase px-10 h-9 rounded-none shadow-lg shadow-primary/20"
                    >
                        {isProcessing ? 'Synchronizing...' : 'Commit All Decisions'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
