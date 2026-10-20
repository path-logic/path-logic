import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import type { IPayee } from '@core';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { PayeeAutocompleteComponent } from './payee-autocomplete.component';
import { DarkMode, Default } from './payee-autocomplete.component.stories';

describe('PayeeAutocompleteComponent (Storybook Stories)', () => {
    let fixture: ComponentFixture<PayeeAutocompleteComponent>;
    let mockLedgerStore: {
        payees: ReturnType<typeof signal<Array<IPayee>>>;
    };

    beforeEach(async () => {
        mockLedgerStore = {
            payees: signal<Array<IPayee>>([
                {
                    id: 'p-1',
                    name: 'Netflix',
                    address: null,
                    city: null,
                    state: null,
                    zipCode: null,
                    latitude: null,
                    longitude: null,
                    phone: null,
                    website: null,
                    notes: null,
                    defaultCategoryId: null,
                    createdAt: '2026-01-01T00:00:00Z',
                    updatedAt: '2026-01-01T00:00:00Z'
                },
                {
                    id: 'p-2',
                    name: "Trader Joe's",
                    address: null,
                    city: null,
                    state: null,
                    zipCode: null,
                    latitude: null,
                    longitude: null,
                    phone: null,
                    website: null,
                    notes: null,
                    defaultCategoryId: null,
                    createdAt: '2026-01-01T00:00:00Z',
                    updatedAt: '2026-01-01T00:00:00Z'
                },
                {
                    id: 'p-3',
                    name: 'Target',
                    address: null,
                    city: null,
                    state: null,
                    zipCode: null,
                    latitude: null,
                    longitude: null,
                    phone: null,
                    website: null,
                    notes: null,
                    defaultCategoryId: null,
                    createdAt: '2026-01-01T00:00:00Z',
                    updatedAt: '2026-01-01T00:00:00Z'
                },
                {
                    id: 'p-4',
                    name: 'Whole Foods',
                    address: null,
                    city: null,
                    state: null,
                    zipCode: null,
                    latitude: null,
                    longitude: null,
                    phone: null,
                    website: null,
                    notes: null,
                    defaultCategoryId: null,
                    createdAt: '2026-01-01T00:00:00Z',
                    updatedAt: '2026-01-01T00:00:00Z'
                }
            ])
        };

        await TestBed.configureTestingModule({
            imports: [PayeeAutocompleteComponent],
            providers: [{ provide: LedgerStore, useValue: mockLedgerStore }]
        }).compileComponents();

        fixture = TestBed.createComponent(PayeeAutocompleteComponent);
        fixture.detectChanges();
    });

    it('executes Default story interaction test', async () => {
        await Default.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Netflix');
    });

    it('renders DarkMode story', () => {
        expect(DarkMode).toBeDefined();
        const input = fixture.nativeElement.querySelector('input[role="combobox"]');
        expect(input).toBeTruthy();
    });
});
