'use client';

import * as React from 'react';
import {
    type IRecurringSchedule,
    type IAccount,
    type Frequency,
    Money,
    formatLocaleDate,
} from '@path-logic/core';
import { cn } from '@/lib/utils';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, AlertCircle, MoreHorizontal } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface IRecurringSummaryTableProps {
    schedules: Array<IRecurringSchedule>;
    accounts: Array<IAccount>;
    onPost?: (schedule: IRecurringSchedule) => void;
    onEdit?: (schedule: IRecurringSchedule) => void;
    onSkip?: (schedule: IRecurringSchedule) => void;
}

export function RecurringSummaryTable({
    schedules,
    accounts,
    onPost,
    onEdit,
    onSkip,
}: IRecurringSummaryTableProps): React.JSX.Element {
    const today: string = new Date().toISOString().split('T')[0] || '';

    const getAccountName = (id: string): string => {
        return accounts.find(a => a.id === id)?.name || 'Unknown Account';
    };

    const formatFrequency = (freq: Frequency): string => {
        return freq
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const getPaymentMethodIcon = (): React.JSX.Element => {
        // Placeholder for method-specific icons
        return <Calendar className="w-3 h-3 opacity-50" />;
    };

    return (
        <div className="rounded-sm border border-border bg-card overflow-hidden">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow className="hover:bg-transparent border-border">
                        <TableHead className="w-[200px] text-[10px] font-black uppercase tracking-wider">
                            Payee
                        </TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-wider text-right">
                            Amount
                        </TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-wider">
                            Due Date
                        </TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-wider">
                            Frequency
                        </TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-wider">
                            Method
                        </TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-wider">
                            Account
                        </TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {schedules.map(schedule => {
                        const isOverdue = schedule.nextDueDate < today;

                        return (
                            <TableRow
                                key={schedule.id}
                                className={cn(
                                    'border-border transition-colors group',
                                    isOverdue
                                        ? 'bg-destructive/5 hover:bg-destructive/10'
                                        : 'hover:bg-accent/30',
                                )}
                            >
                                <TableCell className="py-2">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-foreground">
                                            {schedule.payee}
                                        </span>
                                        {isOverdue && (
                                            <span className="text-[9px] text-destructive font-black uppercase mt-1 flex items-center gap-1">
                                                <AlertCircle className="w-2.5 h-2.5" /> Overdue
                                            </span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right py-2">
                                    <span
                                        className={cn(
                                            'font-mono font-bold text-xs',
                                            schedule.amount < 0
                                                ? 'text-destructive'
                                                : 'text-emerald-700',
                                        )}
                                    >
                                        {Money.formatCurrency(schedule.amount)}
                                    </span>
                                </TableCell>
                                <TableCell className="py-2">
                                    <span
                                        className={cn(
                                            'text-xs font-mono',
                                            isOverdue
                                                ? 'text-destructive font-bold'
                                                : 'text-muted-foreground',
                                        )}
                                    >
                                        {formatLocaleDate(schedule.nextDueDate)}
                                    </span>
                                </TableCell>
                                <TableCell className="py-2">
                                    <Badge
                                        variant="outline"
                                        className="text-[9px] font-black uppercase tracking-tighter px-1.5 h-4 border-muted-foreground/30 text-foreground"
                                    >
                                        {formatFrequency(schedule.frequency)}
                                    </Badge>
                                </TableCell>
                                <TableCell className="py-2">
                                    <div className="flex items-center gap-1.5">
                                        {getPaymentMethodIcon()}
                                        <span className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-tight">
                                            {schedule.paymentMethod.replace('_', ' ')}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="py-2">
                                    <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest bg-muted/50 px-1.5 py-0.5 rounded-sm">
                                        {getAccountName(schedule.accountId)}
                                    </span>
                                </TableCell>
                                <TableCell className="py-2 text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                className="p-1 rounded-sm hover:bg-accent text-muted-foreground transition-colors"
                                                aria-label="Actions"
                                            >
                                                <MoreHorizontal className="w-4 h-4" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                            align="end"
                                            className="w-40 bg-card border-border"
                                        >
                                            <DropdownMenuItem
                                                onClick={() => onPost?.(schedule)}
                                                className="text-[10px] font-bold uppercase tracking-widest focus:bg-primary focus:text-primary-foreground cursor-pointer"
                                            >
                                                Post Transaction
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => onSkip?.(schedule)}
                                                className="text-[10px] font-bold uppercase tracking-widest focus:bg-accent cursor-pointer"
                                            >
                                                Skip Next
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => onEdit?.(schedule)}
                                                className="text-[10px] font-bold uppercase tracking-widest focus:bg-accent cursor-pointer border-t border-border mt-1 pt-1"
                                            >
                                                Edit Schedule
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
