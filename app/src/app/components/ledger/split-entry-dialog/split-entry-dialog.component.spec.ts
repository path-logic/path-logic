import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import type { ICategory, ISplit } from '@core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { PostHogService } from '../../../services/posthog/posthog.service';
import { SplitEntryDialogComponent } from './split-entry-dialog.component';

describe('SplitEntryDialogComponent', () => {
    let component: SplitEntryDialogComponent;
    let fixture: ComponentFixture<SplitEntryDialogComponent>;

    const mockCategories: Array<ICategory> = [
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
    ];

    const mockLedgerStore = {
        categories: signal<Array<ICategory>>(mockCategories)
    };

    const mockPosthogService = {
        posthog: {
            capture: vi.fn()
        }
    };

    beforeEach(async () => {
        vi.clearAllMocks();

        await TestBed.configureTestingModule({
            imports: [SplitEntryDialogComponent, NoopAnimationsModule],
            providers: [
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: PostHogService, useValue: mockPosthogService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(SplitEntryDialogComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('totalAmount', 10000); // $100.00
        fixture.detectChanges();
    });

    it('should create the split entry dialog component', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize with a default split matching total amount if initialSplits is empty', () => {
        expect(component.splits().length).toBe(1);
        expect(component.splits()[0]?.amount).toBe(10000);
        expect(component.isBalanced()).toBe(true);
    });

    it('should calculate difference correctly when splits do not match total amount', () => {
        const splits: Array<ISplit> = [
            { id: 's-1', amount: 6000, memo: 'Split 1', categoryId: 'cat-1' }
        ];
        fixture.componentRef.setInput('initialSplits', splits);
        fixture.detectChanges();

        expect(component.sumSplits()).toBe(6000);
        expect(component.difference()).toBe(4000);
        expect(component.isBalanced()).toBe(false);
    });

    it('should add a new split line and auto-balance remaining amount', () => {
        const splits: Array<ISplit> = [
            { id: 's-1', amount: 6000, memo: 'Split 1', categoryId: 'cat-1' }
        ];
        fixture.componentRef.setInput('initialSplits', splits);
        fixture.detectChanges();

        component.handleAddSplit();
        expect(component.splits().length).toBe(2);

        // Auto balance last split
        component.handleQuickBalance();
        expect(component.isBalanced()).toBe(true);
        expect(component.splits()[1]?.amount).toBe(4000);
    });

    it('should remove a split line when more than 1 exists', () => {
        const splits: Array<ISplit> = [
            { id: 's-1', amount: 5000, memo: 'Split 1', categoryId: 'cat-1' },
            { id: 's-2', amount: 5000, memo: 'Split 2', categoryId: 'cat-2' }
        ];
        fixture.componentRef.setInput('initialSplits', splits);
        fixture.detectChanges();

        expect(component.splits().length).toBe(2);
        component.handleRemoveSplit('s-1');
        expect(component.splits().length).toBe(1);
        expect(component.splits()[0]?.id).toBe('s-2');
    });

    it('should emit saved event when balanced and confirmed', () => {
        const savedSpy = vi.fn();
        component.saved.subscribe(savedSpy);

        component.handleSave();

        expect(savedSpy).toHaveBeenCalledWith({
            splits: expect.arrayContaining([expect.objectContaining({ amount: 10000 })])
        });
        expect(component.isOpen()).toBe(false);
    });

    it('should emit saved event with adjusted total when handleAdjustTotal is called', () => {
        const savedSpy = vi.fn();
        component.saved.subscribe(savedSpy);

        const splits: Array<ISplit> = [
            { id: 's-1', amount: 7500, memo: 'Split 1', categoryId: 'cat-1' }
        ];
        fixture.componentRef.setInput('initialSplits', splits);
        fixture.detectChanges();

        component.handleAdjustTotal();

        expect(savedSpy).toHaveBeenCalledWith({
            splits: splits,
            newTotal: 7500
        });
        expect(component.isOpen()).toBe(false);
    });
});
