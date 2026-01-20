'use client';

import { useState } from 'react';
import { formatBytes, formatFileSize } from '../utils/devUtils';

interface IDataInspectorProps {
    title: string;
    data: Uint8Array | null;
    description?: string;
}

import { Card } from '@/components/ui/card';

export function DataInspector({ title, data, description }: IDataInspectorProps): React.ReactElement {
    const [copied, setCopied] = useState<boolean>(false);

    const handleCopy = (): void => {
        if (!data) return;

        const hex: string = formatBytes(data, data.length);
        navigator.clipboard.writeText(hex);
        setCopied(true);
        setTimeout((): void => setCopied(false), 2000);
    };

    return (
        <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground">{title}</h3>
                    {description && (
                        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-40">{description}</p>
                    )}
                </div>
                {data && (
                    <button
                        onClick={handleCopy}
                        className="h-8 px-3 rounded bg-muted/20 border border-border/50 text-[9px] font-black uppercase tracking-widest hover:border-primary transition-colors"
                        type="button"
                    >
                        {copied ? '✓ Copied' : 'Copy Hex'}
                    </button>
                )}
            </div>

            {data ? (
                <div className="space-y-4">
                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                        Binary Magnitude: <span className="font-mono text-primary">{formatFileSize(data.length)}</span>
                    </div>
                    <div className="max-h-40 overflow-auto rounded-lg border border-border/20 bg-muted/5 p-4">
                        <pre className="text-[10px] font-mono text-muted-foreground break-all whitespace-pre-wrap leading-relaxed">
                            {formatBytes(data, 200)}
                        </pre>
                    </div>
                </div>
            ) : (
                <div className="h-40 flex items-center justify-center rounded-lg border border-dashed border-border/30 bg-muted/5">
                    <div className="text-[9px] font-black uppercase tracking-widest opacity-20">Diagnostic Stream Empty</div>
                </div>
            )}
        </Card>
    );
}
