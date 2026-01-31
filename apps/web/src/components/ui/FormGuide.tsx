'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { HelpCircle, X, ChevronRight, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useUserStore } from '@/store/userStore';

interface IFormGuideProps {
    guideId: string;
    targetFieldId: string | null;
    content: Record<string, { title: string; description: string; tips?: Array<string> }>;
    className?: string;
}

export function FormGuide({
    guideId,
    targetFieldId,
    content,
    className,
}: IFormGuideProps): React.JSX.Element | null {
    const { getSetting, updateSetting } = useUserStore();
    const [isVisible, setIsVisible] = useState(true);

    const isDisabled = getSetting(`guide_${guideId}_disabled`) === 'true';
    const activeGuide = targetFieldId ? content[targetFieldId] : null;

    useEffect(() => {
        // Automatically show if a field is focused and and not explicitly disabled
        if (targetFieldId && !isDisabled) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsVisible(true);
        }
    }, [targetFieldId, isDisabled]);

    const handleDisable = (): void => {
        updateSetting(`guide_${guideId}_disabled`, 'true');
        setIsVisible(false);
    };

    const handleEnable = (): void => {
        updateSetting(`guide_${guideId}_disabled`, 'false');
        setIsVisible(true);
    };

    // Trigger button if disabled
    if (isDisabled) {
        return (
            <div className={cn('fixed bottom-6 right-6 z-50', className)}>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEnable}
                    className="rounded-full w-10 h-10 p-0 bg-background/80 backdrop-blur-sm border-primary/20 hover:border-primary shadow-xl shadow-primary/10 transition-all group"
                >
                    <HelpCircle className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                </Button>
            </div>
        );
    }

    if (!isVisible || !activeGuide) return null;

    return (
        <div
            className={cn(
                'fixed bottom-6 right-6 w-80 bg-card border border-border/50 shadow-2xl rounded-sm overflow-hidden animate-in slide-in-from-right-4 duration-300 z-50',
                className,
            )}
        >
            {/* Header */}
            <div className="bg-muted px-4 py-2 border-b border-border/30 flex justify-between items-center bg-primary/5">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                        Intelligence Guide
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleDisable}
                        className="p-1 hover:bg-accent rounded-sm text-muted-foreground/50 hover:text-primary transition-colors hover:cursor-pointer"
                        title="Disable Guide"
                    >
                        <EyeOff className="w-3 h-3" />
                    </button>
                    <button
                        onClick={() => setIsVisible(false)}
                        className="p-1 hover:bg-accent rounded-sm text-muted-foreground/50 hover:text-foreground transition-colors hover:cursor-pointer"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
                <div>
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-foreground mb-1 flex items-center gap-2">
                        <ChevronRight className="w-3 h-3 text-primary" />
                        {activeGuide.title}
                    </h4>
                    <p className="text-[11px] text-muted-foreground font-bold leading-relaxed opacity-80">
                        {activeGuide.description}
                    </p>
                </div>

                {activeGuide.tips && activeGuide.tips.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-border/20">
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary/60">
                            Pro Tips
                        </span>
                        <ul className="space-y-1.5">
                            {activeGuide.tips.map((tip, idx) => (
                                <li
                                    key={idx}
                                    className="flex gap-2 text-[10px] text-muted-foreground leading-snug"
                                >
                                    <span className="text-primary font-black opacity-50">•</span>
                                    <span>{tip}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="bg-muted/30 px-4 py-2 flex justify-between items-center border-t border-border/20">
                <span className="text-[9px] font-bold uppercase text-muted-foreground opacity-40 italic">
                    Serialized Context Engine
                </span>
                <span className="text-[9px] font-black text-primary/60">LVL 4.2</span>
            </div>
        </div>
    );
}
