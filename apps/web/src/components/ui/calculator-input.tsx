'use client';

import * as React from 'react';
import { evaluate } from 'mathjs';
import { Calculator, Delete, Check } from 'lucide-react';
import { Input } from './input';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { cn } from '@/lib/utils';

interface ICalculatorInputProps extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'onChange'
> {
    value: string;
    onChange: (value: string) => void;
    label?: string;
}

export function CalculatorInput({
    value,
    onChange,
    className,
    ...props
}: ICalculatorInputProps): React.JSX.Element {
    const [displayValue, setDisplayValue] = React.useState(value);
    const [isOpen, setIsOpen] = React.useState(false);
    const [history, setHistory] = React.useState<Array<string>>(new Array<string>());

    React.useEffect(() => {
        setDisplayValue(value);
    }, [value]);

    const handleEvaluate = (expr: string): string => {
        try {
            const result = evaluate(expr);
            if (typeof result === 'number' && isFinite(result)) {
                const rounded = Math.round(result * 100) / 100;
                const finalValue = rounded.toString();
                setHistory(prev => [`${expr} = ${finalValue}`, ...prev].slice(0, 5));
                onChange(finalValue);
                return finalValue;
            }
        } catch (_e) {
            // Ignore parse errors while typing
        }
        return expr;
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleEvaluate(displayValue);
        }
    };

    const addSymbol = (symbol: string): void => {
        setDisplayValue(prev => prev + symbol);
    };

    const clear = (): void => {
        setDisplayValue('');
        onChange('');
    };

    const apply = (): void => {
        const result = handleEvaluate(displayValue);
        setDisplayValue(result);
        setIsOpen(false);
    };

    return (
        <div className="relative flex w-full">
            <span className="absolute left-3 top-2.5 text-muted-foreground font-mono text-sm z-10">
                $
            </span>
            <Input
                {...props}
                value={displayValue}
                onChange={e => {
                    setDisplayValue(e.target.value);
                    // Optional: live evaluate if simple
                }}
                onBlur={() => handleEvaluate(displayValue)}
                onKeyDown={handleKeyDown}
                className={cn(
                    'pl-7 pr-10 font-mono bg-muted/20 border-border focus:border-primary/50 text-sm h-10 w-full',
                    className,
                )}
            />
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        className="absolute right-2 top-2 p-1 rounded-sm hover:bg-accent text-muted-foreground transition-colors"
                    >
                        <Calculator className="w-4 h-4" />
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3 bg-card border-border shadow-2xl" align="end">
                    <div className="space-y-4">
                        <div className="bg-muted/30 p-2 rounded-sm min-h-[40px]">
                            {history.length > 0 ? (
                                <div className="space-y-1">
                                    {history.map((h, i) => (
                                        <div
                                            key={i}
                                            className="text-[10px] font-mono text-muted-foreground opacity-70 truncate"
                                        >
                                            {h}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-[10px] font-mono text-muted-foreground opacity-50 italic">
                                    No history
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                            {['7', '8', '9', '/'].map(s => (
                                <Button
                                    key={s}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addSymbol(s)}
                                    className="h-9 font-mono"
                                >
                                    {s}
                                </Button>
                            ))}
                            {['4', '5', '6', '*'].map(s => (
                                <Button
                                    key={s}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addSymbol(s)}
                                    className="h-9 font-mono"
                                >
                                    {s}
                                </Button>
                            ))}
                            {['1', '2', '3', '-'].map(s => (
                                <Button
                                    key={s}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addSymbol(s)}
                                    className="h-9 font-mono"
                                >
                                    {s}
                                </Button>
                            ))}
                            {['0', '.', '(', ')'].map(s => (
                                <Button
                                    key={s}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addSymbol(s)}
                                    className="h-9 font-mono"
                                >
                                    {s}
                                </Button>
                            ))}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addSymbol('+')}
                                className="h-9 font-mono"
                            >
                                +
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={clear}
                                className="h-9"
                            >
                                <Delete className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                                type="button"
                                variant="default"
                                size="sm"
                                onClick={apply}
                                className="h-9 col-span-2 bg-primary"
                            >
                                <Check className="w-3.5 h-3.5 mr-2" /> Apply
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
