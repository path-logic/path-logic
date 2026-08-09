import { importProvidersFrom } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { CorruptionRecoveryDialogComponent } from './corruption-recovery-dialog.component';

const meta: Meta<CorruptionRecoveryDialogComponent> = {
    title: 'ExportImport/CorruptionRecoveryDialogComponent',
    component: CorruptionRecoveryDialogComponent,
    decorators: [
        applicationConfig({
            providers: [importProvidersFrom(BrowserAnimationsModule)]
        }),
        moduleMetadata({
            imports: [CorruptionRecoveryDialogComponent]
        })
    ],
    tags: ['autodocs'],
    parameters: {
        layout: 'centered'
    }
};

export default meta;
type Story = StoryObj<CorruptionRecoveryDialogComponent>;

export const Default: Story = {
    args: {
        folderName: '20260808',
        report: {
            hasCorruption: true,
            invalidChecksumFiles: ['checking_account.qif.enc'],
            corruptedAccounts: [
                {
                    accountId: 'acc-1',
                    accountName: 'Checking Account',
                    filename: 'checking_account.qif.enc',
                    expectedBalanceCents: 154000,
                    validTransactionsSumCents: 130000,
                    discrepancyCents: 24000,
                    corruptedTransactions: [
                        {
                            lineNumber: 42,
                            reason: 'Unparseable split line syntax or SHA-256 binary checksum failure'
                        }
                    ]
                }
            ]
        }
    }
};
