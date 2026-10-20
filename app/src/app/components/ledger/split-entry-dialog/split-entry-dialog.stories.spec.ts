import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { type ICategory } from '../../../core';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { SplitEntryDialogComponent } from './split-entry-dialog.component';
import { InteractiveAddAndBalance, OpenBalanced } from './split-entry-dialog.component.stories';

describe('SplitEntryDialogComponent (Storybook Interaction Spec Wrapper)', () => {
    let mockLedgerStore: {
        categories: ReturnType<typeof signal>;
    };

    beforeEach(async () => {
        mockLedgerStore = {
            categories: signal<Array<ICategory>>([
                {
                    id: 'cat-1',
                    name: 'Groceries',
                    parentId: null,
                    isActive: true,
                    description: '',
                    createdAt: '2024-01-01',
                    updatedAt: '2024-01-01'
                },
                {
                    id: 'cat-2',
                    name: 'Dining',
                    parentId: null,
                    isActive: true,
                    description: '',
                    createdAt: '2024-01-01',
                    updatedAt: '2024-01-01'
                }
            ] as any)
        };

        await TestBed.configureTestingModule({
            imports: [SplitEntryDialogComponent],
            providers: [{ provide: LedgerStore, useValue: mockLedgerStore }]
        }).compileComponents();
    });

    it('executes OpenBalanced story interaction test', async () => {
        const fixture: ComponentFixture<SplitEntryDialogComponent> =
            TestBed.createComponent(SplitEntryDialogComponent);
        fixture.componentRef.setInput('isOpen', true);
        fixture.componentRef.setInput('totalAmount', 15000);
        fixture.componentRef.setInput('initialSplits', [
            { id: 's1', amount: 10000, categoryId: 'cat-1', memo: 'Target Run' },
            { id: 's2', amount: 5000, categoryId: 'cat-2', memo: 'Starbucks inside Target' }
        ]);
        fixture.detectChanges();

        await OpenBalanced.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(document.body.textContent).toContain('$0.00');
    }, 15000);

    it('executes InteractiveAddAndBalance story interaction test', async () => {
        const fixture: ComponentFixture<SplitEntryDialogComponent> =
            TestBed.createComponent(SplitEntryDialogComponent);
        fixture.componentRef.setInput('isOpen', true);
        fixture.componentRef.setInput('totalAmount', 20000);
        fixture.componentRef.setInput('initialSplits', [
            { id: 's1', amount: 10000, categoryId: 'cat-1', memo: 'Partial' }
        ]);
        fixture.detectChanges();

        await InteractiveAddAndBalance.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(document.body.textContent).toContain('$0.00');
    }, 15000);
});
