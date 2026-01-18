#!/usr/bin/env node

/**
 * QIF Parser Validation Script
 * 
 * Usage: node validate-qif.mjs path/to/your/file.qif
 * 
 * This script validates a QIF file against the parser and reports:
 * - Total transactions parsed
 * - Date range
 * - Error/warning count
 * - Performance metrics
 * - Split transaction statistics
 */

import { readFileSync } from 'fs';
import { QIFParser } from '../dist/index.mjs';

const filePath = process.argv[2];

if (!filePath) {
    console.error('Usage: node validate-qif.mjs <path-to-qif-file>');
    process.exit(1);
}

console.log('🔍 Validating QIF file:', filePath);
console.log('');

try {
    const content = readFileSync(filePath, 'utf-8');
    const parser = new QIFParser();

    const startTime = performance.now();
    const result = parser.parse(content);
    const endTime = performance.now();

    const parseTime = (endTime - startTime).toFixed(2);

    console.log('📊 Parsing Results:');
    console.log(`   Transactions: ${result.transactions.length}`);
    console.log(`   Account Type: ${result.accountType}`);
    console.log(`   Parse Time:   ${parseTime}ms`);
    console.log('');

    // Date range
    if (result.transactions.length > 0) {
        const dates = result.transactions.map(t => t.date).sort();
        console.log('📅 Date Range:');
        console.log(`   Earliest: ${dates[0]}`);
        console.log(`   Latest:   ${dates[dates.length - 1]}`);
        console.log('');
    }

    // Split stats
    const withSplits = result.transactions.filter(t => t.splits.length > 0);
    const totalSplits = result.transactions.reduce((sum, t) => sum + t.splits.length, 0);
    const maxSplits = Math.max(...result.transactions.map(t => t.splits.length));

    console.log('🔀 Split Transaction Stats:');
    console.log(`   Transactions with splits: ${withSplits.length} (${((withSplits.length / result.transactions.length) * 100).toFixed(1)}%)`);
    console.log(`   Total splits:             ${totalSplits}`);
    console.log(`   Max splits per txn:       ${maxSplits}`);
    console.log('');

    // Errors and warnings
    if (result.errors.length > 0) {
        console.log('❌ Errors:', result.errors.length);
        result.errors.forEach(err => {
            console.log(`   [Line ${err.line}] ${err.code}: ${err.message}`);
        });
        console.log('');
    }

    if (result.warnings.length > 0) {
        console.log('⚠️  Warnings:', result.warnings.length);
        // Group by code and show first few line numbers
        const warningGroups = result.warnings.reduce((acc, warn) => {
            if (!acc[warn.code]) acc[warn.code] = [];
            acc[warn.code].push(warn.line);
            return acc;
        }, {});

        Object.entries(warningGroups).forEach(([code, lines]) => {
            const lineSummary = lines.length > 5 ? `${lines.slice(0, 5).join(', ')}... (+${lines.length - 5} more)` : lines.join(', ');
            console.log(`   ${code} (${lines.length}): Lines ${lineSummary}`);
        });
        console.log('');
    }

    // Success summary
    if (result.errors.length === 0 && result.warnings.length === 0) {
        console.log('✅ All transactions parsed successfully!');
    } else if (result.errors.length === 0) {
        console.log('✅ All transactions parsed (with warnings)');
    } else {
        console.log('⚠️  Some transactions failed to parse');
    }

    console.log('');
    console.log(`📈 Performance: ${(result.transactions.length / (parseTime / 1000)).toFixed(0)} transactions/second`);

} catch (error) {
    console.error('❌ Failed to parse QIF file:', error.message);
    process.exit(1);
}
