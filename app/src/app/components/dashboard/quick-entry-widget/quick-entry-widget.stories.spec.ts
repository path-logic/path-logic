import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { QuickEntryWidgetComponent } from './quick-entry-widget.component';
import { Default } from './quick-entry-widget.component.stories';

describe('QuickEntryWidgetComponent (Storybook Interaction Spec Wrapper)', () => {
    let mockLedgerStore: any;

    beforeEach(async () => {
        mockLedgerStore = {
            isInitialized: signal(true),
            accounts: signal([
                {
                    id: 'acc-1',
                    name: 'Checking',
                    institutionName: 'Chase',
                    type: 'checking',
                    balance: 1487050,
                    isActive: true
                },
                {
                    id: 'acc-2',
                    name: 'Savings',
                    institutionName: 'Marcus',
                    type: 'savings',
                    balance: 4532110,
                    isActive: true
                }
            ]),
            payees: signal([
                { id: 'p-1', name: 'Netflix' },
                { id: 'p-2', name: "Trader Joe's" }
            ]),
            categories: signal([]),
            addTransaction: async () => {}
        };

        await TestBed.configureTestingModule({
            imports: [QuickEntryWidgetComponent],
            providers: [{ provide: LedgerStore, useValue: mockLedgerStore }]
        }).compileComponents();
    });

    it('executes Default story interaction test', async () => {
        const fixture: ComponentFixture<QuickEntryWidgetComponent> =
            TestBed.createComponent(QuickEntryWidgetComponent);
        fixture.detectChanges();

        await Default.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Quick Entry');
    });
});
