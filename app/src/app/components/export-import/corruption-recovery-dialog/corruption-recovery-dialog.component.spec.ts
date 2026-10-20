import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ICorruptionReport, IRecoveryAction } from '../../../core/export-import';
import { CorruptionRecoveryDialogComponent } from './corruption-recovery-dialog.component';

describe('CorruptionRecoveryDialogComponent', () => {
    let component: CorruptionRecoveryDialogComponent;
    let fixture: ComponentFixture<CorruptionRecoveryDialogComponent>;

    const mockReport: ICorruptionReport = {
        hasCorruption: true,
        invalidChecksumFiles: new Array<string>('checking_account.qif.enc'),
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
            },
            {
                accountId: 'acc-2',
                accountName: 'Savings Account',
                filename: 'savings_account.qif.enc',
                expectedBalanceCents: 500000,
                validTransactionsSumCents: 495000,
                discrepancyCents: 5000,
                corruptedTransactions: [
                    {
                        lineNumber: 10,
                        reason: 'Invalid transaction date/amount syntax'
                    }
                ]
            }
        ]
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CorruptionRecoveryDialogComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(CorruptionRecoveryDialogComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('folderName', '20260808_backup');
        fixture.componentRef.setInput('report', mockReport);
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
        expect(component.folderName).toBe('20260808_backup');
        expect(component.report).toEqual(mockReport);
    });

    it('should convert cents to dollars accurately using getDiscrepancyDollars', () => {
        expect(component.getDiscrepancyDollars(24000)).toBe(240);
        expect(component.getDiscrepancyDollars(5000)).toBe(50);
        expect(component.getDiscrepancyDollars(0)).toBe(0);
        expect(component.getDiscrepancyDollars(199)).toBe(1.99);
    });

    it('should emit recoveryResolved with automated discrepancy actions when manual adjustments are not set', () => {
        const emitSpy = vi.spyOn(component.recoveryResolved, 'emit');

        component.applyRecovery();

        expect(emitSpy).toHaveBeenCalledTimes(1);
        const emittedActions: Array<IRecoveryAction> = emitSpy.mock.calls[0]![0]!;
        expect(emittedActions).toHaveLength(2);

        expect(emittedActions[0]).toEqual({
            accountId: 'acc-1',
            dropCorrupted: true,
            reconciliationAdjustmentCents: 24000,
            reconciliationMemo: 'Automated recovery entry for discrepancy of $240.00'
        });

        expect(emittedActions[1]).toEqual({
            accountId: 'acc-2',
            dropCorrupted: true,
            reconciliationAdjustmentCents: 5000,
            reconciliationMemo: 'Automated recovery entry for discrepancy of $50.00'
        });
    });

    it('should use manual adjustment amount when overridden in manualAdjustmentAmounts', () => {
        const emitSpy = vi.spyOn(component.recoveryResolved, 'emit');

        // Override acc-1 to $150.50
        component.manualAdjustmentAmounts['acc-1'] = 150.5;

        component.applyRecovery();

        const emittedActions: Array<IRecoveryAction> = emitSpy.mock.calls[0]![0]!;
        expect(emittedActions[0]).toEqual({
            accountId: 'acc-1',
            dropCorrupted: true,
            reconciliationAdjustmentCents: 15050,
            reconciliationMemo: 'Automated recovery entry for discrepancy of $150.50'
        });
        // acc-2 remains default
        expect(emittedActions[1]?.reconciliationAdjustmentCents).toBe(5000);
    });

    it('should render folderName and data corruption warning banner in template', () => {
        const textContent = fixture.nativeElement.textContent;
        expect(textContent).toContain('Data Integrity Mismatch / Corruption Detected');
        expect(textContent).toContain('20260808_backup');
    });

    it('should render corrupted account names, filenames, discrepancy deltas, and reasons in template', () => {
        const textContent = fixture.nativeElement.textContent;
        expect(textContent).toContain('Checking Account');
        expect(textContent).toContain('File: checking_account.qif.enc');
        expect(textContent).toContain('$240.00');
        expect(textContent).toContain(
            '• Unparseable split line syntax or SHA-256 binary checksum failure'
        );
        expect(textContent).toContain('(Line 42)');

        expect(textContent).toContain('Savings Account');
        expect(textContent).toContain('File: savings_account.qif.enc');
        expect(textContent).toContain('$50.00');
        expect(textContent).toContain('• Invalid transaction date/amount syntax');
        expect(textContent).toContain('(Line 10)');
    });

    it('should trigger applyRecovery when the action button is clicked', () => {
        const applyRecoverySpy = vi.spyOn(component, 'applyRecovery');
        const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

        expect(button).toBeTruthy();
        button.click();

        expect(applyRecoverySpy).toHaveBeenCalled();
    });

    it('should handle report with empty corruptedAccounts gracefully', () => {
        const emptyReport: ICorruptionReport = {
            hasCorruption: false,
            invalidChecksumFiles: new Array<string>(),
            corruptedAccounts: new Array<never>()
        };
        fixture.componentRef.setInput('report', emptyReport);
        fixture.detectChanges();

        const emitSpy = vi.spyOn(component.recoveryResolved, 'emit');
        component.applyRecovery();

        expect(emitSpy).toHaveBeenCalledWith([]);
    });
});
