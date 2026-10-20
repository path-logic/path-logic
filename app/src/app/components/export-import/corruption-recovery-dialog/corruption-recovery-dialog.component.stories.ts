import { importProvidersFrom } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';
import { CorruptionRecoveryDialogComponent } from './corruption-recovery-dialog.component';

const meta: Meta<CorruptionRecoveryDialogComponent> = {
    title: 'ExportImport/CorruptionRecoveryDialogComponent',
    component: CorruptionRecoveryDialogComponent,
    decorators: [
        applicationConfig({
            providers: [importProvidersFrom()]
        }),
        moduleMetadata({
            imports: [CorruptionRecoveryDialogComponent]
        })
    ],
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
        a11y: {
            config: {
                rules: [{ id: 'color-contrast', enabled: false }]
            }
        }
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
    },
    play: async ({ canvasElement }): Promise<void> => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText(/Data Integrity Mismatch/i)).toBeInTheDocument();
        await expect(canvas.getByText(/20260808/i)).toBeInTheDocument();
        await expect(canvas.getByText(/Checking Account/i)).toBeInTheDocument();
        await expect(canvas.getByText(/\$240\.00/i)).toBeInTheDocument();

        const applyButton = canvas.getByRole('button', {
            name: /Apply Reconciliation & Proceed to Import/i
        });
        await expect(applyButton).toBeInTheDocument();
        await userEvent.click(applyButton);
    }
};
