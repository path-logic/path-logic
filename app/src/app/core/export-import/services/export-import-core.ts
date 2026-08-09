import type {
    IAccount,
    ICategory,
    IPayee,
    IRecurringSchedule,
    ITransaction
} from '../../domain/types';
import { QIFExporter } from '../../parsers/QIFExporter';
import { computeSHA256, decryptPayload, encryptPayload } from '../crypto/payload-cipher';
import { AncillarySerializer } from '../serializers/AncillarySerializer';
import type {
    IAncillaryPayload,
    IExportAccountMetadata,
    IExportMetadata
} from '../types/export-import.types';

export interface IExportRawPackage {
    metadata: IExportMetadata;
    files: Array<{
        filename: string;
        encryptedContent: string;
        mimeType: string;
    }>;
}

/**
 * Pure core helper function for generating a complete encrypted export package.
 */
export async function createExportPackage(
    accounts: Array<{ account: IAccount; transactions: Array<ITransaction> }>,
    ancillaryData: {
        categories: Array<ICategory>;
        payees: Array<IPayee>;
        recurringSchedules: Array<IRecurringSchedule>;
        featureFlags: Record<string, boolean>;
        userSettings: Record<string, unknown>;
    },
    passphrase: string,
    appVersion: string = '0.1.0'
): Promise<IExportRawPackage> {
    const exportId = `export-${Date.now()}`;
    const createdAt = new Date().toISOString();
    const files: Array<{ filename: string; encryptedContent: string; mimeType: string }> = [];
    const accountMetas: Array<IExportAccountMetadata> = [];

    let combinedHashes = '';

    // 1. Process Ledgers to QIF + Encrypt
    for (const item of accounts) {
        const snakeName = toSnakeCase(item.account.name);
        const qifFilename = `${snakeName}.qif.enc`;
        const qifText = QIFExporter.exportAccount(item.account, item.transactions);

        const encryptedQif = await encryptPayload(qifText, passphrase);
        const sha256 = await computeSHA256(encryptedQif);
        combinedHashes += sha256;

        files.push({
            filename: qifFilename,
            encryptedContent: encryptedQif,
            mimeType: 'text/plain'
        });

        const totalBalance = item.transactions.reduce((acc, tx) => acc + tx.totalAmount, 0);

        accountMetas.push({
            id: item.account.id,
            name: item.account.name,
            type: item.account.type,
            snakeCaseFilename: qifFilename,
            transactionCount: item.transactions.length,
            balanceCents: totalBalance,
            sha256
        });
    }

    // 2. Process Ancillary Settings (Sanitized & Encrypted)
    const ancillaryText = AncillarySerializer.serialize({
        categories: ancillaryData.categories,
        payees: ancillaryData.payees,
        recurringSchedules: ancillaryData.recurringSchedules,
        featureFlags: ancillaryData.featureFlags,
        userSettings: ancillaryData.userSettings
    });

    const encryptedAncillary = await encryptPayload(ancillaryText, passphrase);
    const ancillarySha256 = await computeSHA256(encryptedAncillary);
    combinedHashes += ancillarySha256;

    const ancillaryFilename = 'ancillary_settings.enc';
    files.push({
        filename: ancillaryFilename,
        encryptedContent: encryptedAncillary,
        mimeType: 'text/plain'
    });

    // 3. Generate Overall Metadata
    const overallChecksum = await computeSHA256(combinedHashes);

    const metadata: IExportMetadata = {
        exportId,
        createdAt,
        appVersion,
        coreVersion: '0.1.0',
        accounts: accountMetas,
        ancillaryFile: {
            filename: ancillaryFilename,
            sha256: ancillarySha256,
            algorithm: 'AES-GCM-256'
        },
        overallChecksum
    };

    files.push({
        filename: 'export_metadata.json',
        encryptedContent: JSON.stringify(metadata, null, 2),
        mimeType: 'application/json'
    });

    return { metadata, files };
}

/**
 * Decrypts ancillary settings file from an export package.
 */
export async function decryptAncillarySettings(
    encryptedBase64: string,
    passphrase: string
): Promise<IAncillaryPayload> {
    const plainText = await decryptPayload(encryptedBase64, passphrase);
    return AncillarySerializer.deserialize(plainText);
}

/**
 * Formats account name into snake_case string
 */
export function toSnakeCase(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}
