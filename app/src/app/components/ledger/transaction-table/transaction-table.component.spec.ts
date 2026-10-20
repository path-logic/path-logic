import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { TransactionTableComponent } from './transaction-table.component';

describe('TransactionTableComponent', () => {
    let component: TransactionTableComponent;
    let fixture: ComponentFixture<TransactionTableComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TransactionTableComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(TransactionTableComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('data', []);
        fixture.detectChanges();
    });

    it('should create the table component', () => {
        expect(component).toBeTruthy();
    });

    it('should render skeleton loading rows when isLoading is true', () => {
        fixture.componentRef.setInput('isLoading', true);
        fixture.detectChanges();

        const skeletons = fixture.nativeElement.querySelectorAll('app-skeleton');
        expect(skeletons.length).toBeGreaterThan(0);

        // Empty state should NOT be visible while loading
        const emptyStateText = fixture.nativeElement.textContent;
        expect(emptyStateText).not.toContain('Ledger is empty');
    });

    it('should render empty state only after loading finishes and data is empty', () => {
        fixture.componentRef.setInput('isLoading', false);
        fixture.componentRef.setInput('data', []);
        fixture.detectChanges();

        const skeletons = fixture.nativeElement.querySelectorAll('app-skeleton');
        expect(skeletons.length).toBe(0);

        const text = fixture.nativeElement.textContent;
        expect(text).toContain('Ledger is empty');
    });

    it('should calculate dividerRowIndex and display TODAY divider label', () => {
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const mockTransactions: Array<any> = [
            {
                id: 'tx-1',
                accountId: 'acc-1',
                date: yesterday.toISOString().slice(0, 10),
                payee: 'Store 1',
                totalAmount: 1000,
                status: 'cleared',
                splits: []
            },
            {
                id: 'tx-2',
                accountId: 'acc-1',
                date: tomorrow.toISOString().slice(0, 10),
                payee: 'Store 2',
                totalAmount: 2000,
                status: 'pending',
                splits: []
            }
        ];

        Object.defineProperty(component.virtualizer, 'getVirtualItems', {
            value: () => [{ index: 1, start: 44, size: 76, key: 1 }],
            configurable: true,
            writable: true
        });

        fixture.componentRef.setInput('data', mockTransactions);
        fixture.changeDetectorRef.markForCheck();
        fixture.detectChanges();

        expect(component.dividerRowIndex()).toBe(1);
        expect(fixture.nativeElement.innerHTML).toContain('TODAY');
        expect(fixture.nativeElement.innerHTML).not.toContain('End of Today');
    });
});
