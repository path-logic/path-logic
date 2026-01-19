'use client';

import type { ISyncStatus } from '@/lib/sync/syncService';
import { formatTimestamp } from '../utils/devUtils';

interface ISyncStatusPanelProps {
    status: ISyncStatus;
    error: string | null;
}

export function SyncStatusPanel({ status, error }: ISyncStatusPanelProps): React.ReactElement {
    return (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-3 font-semibold text-gray-900">Sync Status</h3>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={`rounded px-2 py-1 text-xs font-semibold ${status.inProgress
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                        {status.inProgress ? 'Syncing...' : 'Idle'}
                    </span>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Last Sync:</span>
                    <span className="text-sm font-mono text-gray-900">
                        {formatTimestamp(status.lastSyncTime)}
                    </span>
                </div>

                {error && (
                    <div className="mt-2 rounded bg-red-50 p-2">
                        <p className="text-xs text-red-700">
                            <span className="font-semibold">Error:</span> {error}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
