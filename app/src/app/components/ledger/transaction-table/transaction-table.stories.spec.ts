import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { TransactionTableComponent } from './transaction-table.component';
import { Default, Filtered } from './transaction-table.component.stories';

describe('TransactionTableComponent (Storybook Interaction Spec Wrapper)', () => {
    let fixture: ComponentFixture<TransactionTableComponent>;
    const mockLedgerStore = {
        categories: signal<Array<{ id: string; name: string }>>([
            { id: 'cat-groceries', name: 'Groceries' },
            { id: 'cat-salary', name: 'Salary' },
            { id: 'cat-dining', name: 'Dining Out' }
        ]),
        updateTransaction: async (): Promise<void> => {}
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TransactionTableComponent],
            providers: [{ provide: LedgerStore, useValue: mockLedgerStore }]
        }).compileComponents();
    });

    it('executes Default story play function', async () => {
        fixture = TestBed.createComponent(TransactionTableComponent);
        fixture.componentRef.setInput('data', Default.args?.data ?? []);
        fixture.componentRef.setInput('isLoading', Default.args?.isLoading ?? false);
        fixture.detectChanges();

        await Default.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain("Trader Joe's");
    });

    it('executes Filtered story play function', async () => {
        fixture = TestBed.createComponent(TransactionTableComponent);
        fixture.componentRef.setInput('data', Filtered.args?.data ?? []);
        fixture.componentRef.setInput('isLoading', Filtered.args?.isLoading ?? false);
        fixture.detectChanges();

        await Filtered.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain("Trader Joe's");
    });
});
