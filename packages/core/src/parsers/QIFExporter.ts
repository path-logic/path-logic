import type { IAccount, ITransaction } from '../domain/types';
import { AccountType } from '../domain/types';

/**
 * QIFExporter handles serializing ledger data back into Quicken Interchange Format.
 * Essential for user-owned data portability and backups.
 */
export const QIFExporter = {
    /**
     * Exports an account and its transactions to QIF format.
     */
    exportAccount: (account: IAccount, transactions: Array<ITransaction>): string => {
        const lines: Array<string> = [];

        // 1. Account Header
        lines.push('!Account');
        lines.push(`N${account.name}`);
        lines.push(`T${mapAccountType(account.type)}`);
        lines.push('^');

        // 2. Transaction Header
        lines.push(`!Type:${mapAccountType(account.type)}`);

        // 3. Transactions
        for (const tx of transactions) {
            lines.push(`D${formatDate(tx.date)}`);
            lines.push(`T${(tx.totalAmount / 100).toFixed(2)}`);
            lines.push(`P${tx.payee}`);

            if (tx.memo) {
                lines.push(`M${tx.memo}`);
            }

            if (tx.checkNumber) {
                lines.push(`N${tx.checkNumber}`);
            }

            // Splits
            if (tx.splits.length > 1) {
                for (const split of tx.splits) {
                    lines.push(`S${split.categoryId || ''}`);
                    lines.push(`E${split.memo || ''}`);
                    lines.push(`$${(split.amount / 100).toFixed(2)}`);
                }
            } else if (tx.splits[0]) {
                // Single category
                lines.push(`L${tx.splits[0].categoryId || ''}`);
            }

            lines.push('^');
        }

        return lines.join('\n');
    },
};

/**
 * Maps Path Logic AccountType to QIF !Type
 */
function mapAccountType(type: AccountType): string {
    switch (type) {
        case AccountType.Checking:
        case AccountType.Savings:
            return 'Bank';
        case AccountType.Credit:
            return 'CCard';
        case AccountType.Cash:
            return 'Cash';
        default:
            return 'Bank';
    }
}

/**
 * Formats ISO date to QIF date (M/D/YYYY)
 */
function formatDate(isoDate: string): string {
    const [year, month, day] = isoDate.split('-');
    return `${parseInt(month ?? '1', 10)}/${parseInt(day ?? '1', 10)}/${year}`;
}
