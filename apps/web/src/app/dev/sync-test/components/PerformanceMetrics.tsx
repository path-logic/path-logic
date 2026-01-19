'use client';

import React from 'react';

interface MetricsData {
    exportTimeMs: number;
    encryptionTimeMs: number;
    uploadTimeMs: number;
    downloadTimeMs: number;
    decryptionTimeMs: number;
    // Import Metrics
    importLoadTimeMs?: number;
    importParseTimeMs?: number;
    importMapTimeMs?: number;
    importStoreTimeMs?: number;

    rawSize: number;
    encryptedSize: number;
    recordCount: number;
}

interface PerformanceMetricsProps {
    metrics: MetricsData | null;
}

export function PerformanceMetrics({ metrics }: PerformanceMetricsProps): React.JSX.Element {
    if (!metrics) {
        return (
            <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
                <p className="text-sm text-gray-500 italic">No performance data available. Trigger a sync operation to see results.</p>
            </div>
        );
    }

    const formatSize = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    };

    const MetricItem = ({ label, value, unit = 'ms', highlight = false }: { label: string; value: number | string; unit?: string; highlight?: boolean }): React.JSX.Element => (
        <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
            <span className="text-xs font-medium text-gray-600 uppercase tracking-wider">{label}</span>
            <span className={`font-mono text-sm font-bold ${highlight ? 'text-blue-600' : 'text-gray-900'}`}>
                {value}
                {unit && (
                    <span className="text-[10px] ml-1 font-normal text-gray-400 lowercase">
                        {unit}
                    </span>
                )}
            </span>
        </div>
    );

    return (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Performance Metrics</h2>
                <div className="px-2 py-1 bg-blue-50 text-blue-700 text-[10px] font-black uppercase rounded border border-blue-100">
                    Live Telemetry
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Import Section */}
                <div>
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Import Telemetry</h3>
                    <div className="space-y-1">
                        <MetricItem label="File Loading" value={metrics.importLoadTimeMs?.toFixed(2) || '0.00'} />
                        <MetricItem label="QIF Parsing" value={metrics.importParseTimeMs?.toFixed(2) || '0.00'} />
                        <MetricItem label="Domain Mapping" value={metrics.importMapTimeMs?.toFixed(2) || '0.00'} />
                        <MetricItem label="SQLite Store" value={metrics.importStoreTimeMs?.toFixed(2) || '0.00'} highlight />
                    </div>
                </div>

                {/* Latency Section */}
                <div>
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Sync Latency</h3>
                    <div className="space-y-1">
                        <MetricItem label="SQLite Export" value={metrics.exportTimeMs.toFixed(2)} />
                        <MetricItem label="AES-GCM Encrypt" value={metrics.encryptionTimeMs.toFixed(2)} highlight={metrics.encryptionTimeMs > 50} />
                        <MetricItem label="Cloud Upload" value={metrics.uploadTimeMs.toFixed(2)} />
                        <div className="pt-2 mt-2 border-t border-gray-200">
                            <MetricItem label="Cloud Download" value={metrics.downloadTimeMs.toFixed(2)} />
                            <MetricItem label="AES-GCM Decrypt" value={metrics.decryptionTimeMs.toFixed(2)} />
                        </div>
                    </div>
                </div>

                {/* Efficiency Section */}
                <div>
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Size & Efficiency</h3>
                    <div className="space-y-1">
                        <MetricItem label="Record Count" value={metrics.recordCount.toLocaleString()} unit="" />
                        <MetricItem label="Raw DB Size" value={formatSize(metrics.rawSize)} unit="" />
                        <MetricItem label="Encrypted Size" value={formatSize(metrics.encryptedSize)} unit="" highlight />
                        <div className="pt-2 mt-2 border-t border-gray-200 flex flex-col gap-1">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-gray-500 uppercase">Avg per Transaction</span>
                                <span className="text-xs font-mono font-bold text-gray-700">
                                    {(metrics.rawSize / Math.max(1, metrics.recordCount)).toFixed(0)} B
                                </span>
                            </div>
                            <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                                <div
                                    className="bg-blue-500 h-full transition-all duration-500"
                                    style={{ width: `${Math.min(100, (metrics.encryptedSize / (10 * 1024 * 1024)) * 100)}%` }}
                                />
                            </div>
                            <p className="text-[9px] text-gray-400 mt-1 italic text-right">
                                Relative to 10MB Threshold
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <p className="text-[10px] text-gray-500 font-medium">Metrics captured using High-Resolution Performance API</p>
            </div>
        </div>
    );
}
