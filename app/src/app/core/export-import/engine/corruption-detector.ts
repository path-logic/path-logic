import { QIFParser } from '../../parsers/QIFParser';
import { computeSHA256 } from '../crypto/payload-cipher';
import type {
    ICorruptedAccountReport,
    ICorruptionReport,
    IExportMetadata
} from '../types/export-import.types';

export interface IDownloadedFilePackage {
    filename: string;
    encryptedContent: string;
    decryptedContent?: string;
}

/**
 * CorruptionDetector evaluates downloaded export package files for binary checksum mismatches,
 * QIF syntax errors, and split math discrepancies. Calculates penny-perfect reconciliation deltas.
 */
export const CorruptionDetector = {
    /**
     * Inspects export files against metadata and validates binary & parse integrity.
     */
    verifyExportIntegrity: async (
        metadata: IExportMetadata,
        files: Array<IDownloadedFilePackage>
    ): Promise<ICorruptionReport> => {
        const invalidChecksumFiles: Array<string> = [];
        const corruptedAccounts: Array<ICorruptedAccountReport> = [];

        const fileMap = new Map<string, IDownloadedFilePackage>();
        for (const file of files) {
            fileMap.set(file.filename, file);
        }

        // 1. Verify Ancillary Payload Checksum
        if (metadata.ancillaryFile) {
            const ancFile = fileMap.get(metadata.ancillaryFile.filename);
            if (!ancFile) {
                invalidChecksumFiles.push(metadata.ancillaryFile.filename);
            } else {
                const computedHash = await computeSHA256(ancFile.encryptedContent);
                if (computedHash.toLowerCase() !== metadata.ancillaryFile.sha256.toLowerCase()) {
                    invalidChecksumFiles.push(metadata.ancillaryFile.filename);
                }
            }
        }

        // 2. Verify Accounts Checksums & QIF Parse Integrity
        const parser = new QIFParser();

        for (const accMeta of metadata.accounts || []) {
            const qifFile = fileMap.get(accMeta.snakeCaseFilename);
            if (!qifFile) {
                invalidChecksumFiles.push(accMeta.snakeCaseFilename);
                corruptedAccounts.push({
                    accountId: accMeta.id,
                    accountName: accMeta.name,
                    filename: accMeta.snakeCaseFilename,
                    expectedBalanceCents: accMeta.balanceCents,
                    validTransactionsSumCents: 0,
                    discrepancyCents: accMeta.balanceCents,
                    corruptedTransactions: [
                        { reason: `File missing from export package: ${accMeta.snakeCaseFilename}` }
                    ]
                });
                continue;
            }

            // Verify Binary SHA-256 Checksum
            const computedHash = await computeSHA256(qifFile.encryptedContent);
            const checksumMatches = computedHash.toLowerCase() === accMeta.sha256.toLowerCase();
            if (!checksumMatches) {
                invalidChecksumFiles.push(accMeta.snakeCaseFilename);
            }

            // Verify Decrypted QIF Parse & Split Math
            if (qifFile.decryptedContent) {
                const parseResult = parser.parse(qifFile.decryptedContent);
                let validSumCents = 0;
                const corruptedTxs: Array<{ reason: string; lineNumber?: number }> = [];

                if (parseResult.errors.length > 0) {
                    for (const err of parseResult.errors) {
                        const corruptedItem: { reason: string; lineNumber?: number } = {
                            reason: err.message
                        };
                        if (err.line !== undefined) {
                            corruptedItem.lineNumber = err.line;
                        }
                        corruptedTxs.push(corruptedItem);
                    }
                }

                for (const tx of parseResult.transactions) {
                    validSumCents += tx.amount;
                }

                const discrepancyCents = accMeta.balanceCents - validSumCents;

                if (!checksumMatches || parseResult.errors.length > 0 || discrepancyCents !== 0) {
                    corruptedAccounts.push({
                        accountId: accMeta.id,
                        accountName: accMeta.name,
                        filename: accMeta.snakeCaseFilename,
                        expectedBalanceCents: accMeta.balanceCents,
                        validTransactionsSumCents: validSumCents,
                        discrepancyCents,
                        corruptedTransactions: corruptedTxs
                    });
                }
            }
        }

        const hasCorruption = invalidChecksumFiles.length > 0 || corruptedAccounts.length > 0;

        return {
            hasCorruption,
            invalidChecksumFiles,
            corruptedAccounts
        };
    }
};
