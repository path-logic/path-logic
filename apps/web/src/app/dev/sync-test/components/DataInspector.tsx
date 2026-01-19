'use client';

import { useState } from 'react';
import { formatBytes, formatFileSize } from '../utils/devUtils';

interface IDataInspectorProps {
    title: string;
    data: Uint8Array | null;
    description?: string;
}

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
        <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{title}</h3>
                {data && (
                    <button
                        onClick={handleCopy}
                        className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200"
                        type="button"
                    >
                        {copied ? '✓ Copied' : 'Copy Hex'}
                    </button>
                )}
            </div>

            {description && (
                <p className="mb-2 text-sm text-gray-600">{description}</p>
            )}

            {data ? (
                <div className="space-y-2">
                    <div className="text-sm text-gray-600">
                        Size: <span className="font-mono font-semibold">{formatFileSize(data.length)}</span>
                    </div>
                    <div className="max-h-40 overflow-auto rounded bg-gray-50 p-2">
                        <pre className="text-xs font-mono text-gray-700">
                            {formatBytes(data, 200)}
                        </pre>
                    </div>
                </div>
            ) : (
                <div className="text-sm text-gray-400">No data</div>
            )}
        </div>
    );
}
