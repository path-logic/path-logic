import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IPayee } from '../../../core/domain/types';
import { AuthService } from '../../../services/auth/auth.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { PayeeFormComponent } from './payee-form.component';

describe('PayeeFormComponent', () => {
    let component: PayeeFormComponent;
    let fixture: ComponentFixture<PayeeFormComponent>;
    let router: Router;
    let mockLedgerStore: any;

    const mockPayees: Array<IPayee> = [
        {
            id: 'payee-1',
            name: 'Target Store',
            defaultCategoryId: 'cat-groceries',
            notes: 'Weekly groceries',
            address: null,
            city: null,
            state: null,
            zipCode: null,
            latitude: null,
            longitude: null,
            website: null,
            phone: null,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z'
        }
    ];

    const mockCategories = [
        { id: 'cat-groceries', name: 'Groceries' },
        { id: 'cat-utilities', name: 'Utilities' }
    ];

    beforeEach(async () => {
        mockLedgerStore = {
            isInitialized: signal(true),
            syncStatus: signal('idle'),
            authError: signal(false),
            hasLocalFallback: signal(true),
            mergeCount: signal(0),
            syncConflicts: signal([]),
            totalClearedBalance: signal(0),
            totalPendingBalance: signal(0),
            transactions: signal([]),
            accounts: signal([]),
            payees: signal<Array<IPayee>>(mockPayees),
            categories: signal(mockCategories),
            updatePayee: vi.fn().mockResolvedValue(undefined),
            getOrCreatePayee: vi.fn().mockResolvedValue({ id: 'payee-new', name: 'New Payee' })
        };

        const mockAuthService = {
            accessToken: signal<string | null>(null),
            currentUser: signal(null),
            isLoggedIn: signal(true),
            isInitializing: signal(false),
            signInWithGoogle: vi.fn()
        };

        await TestBed.configureTestingModule({
            imports: [PayeeFormComponent],
            providers: [
                provideNoopAnimations(),
                provideRouter([]),
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: AuthService, useValue: mockAuthService },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of(convertToParamMap({})),
                        queryParams: of({})
                    }
                }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(PayeeFormComponent);
        component = fixture.componentInstance;
        router = TestBed.inject(Router);
        vi.spyOn(router, 'navigate').mockResolvedValue(true);
        fixture.detectChanges();
    });

    it('should create the payee form component', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize with empty fields for new payee', () => {
        expect(component.isEditMode()).toBe(false);
        expect(component.name()).toBe('');
        expect(component.defaultCategoryId()).toBe('');
        expect(component.notes()).toBe('');
    });

    it('should require a non-empty name to save', async () => {
        component.name.set('');
        await component.handleSave();
        expect(component.errorMessage()).toContain('Name is required');
        expect(mockLedgerStore.getOrCreatePayee).not.toHaveBeenCalled();
    });

    it('should create a new payee and navigate back to /payees', async () => {
        component.name.set('Trader Joe');
        component.defaultCategoryId.set('cat-groceries');
        component.notes.set('Organic groceries');

        await component.handleSave();

        expect(mockLedgerStore.getOrCreatePayee).toHaveBeenCalled();
        expect(router.navigate).toHaveBeenCalledWith(['/payees']);
    });

    it('should update an existing payee and navigate back to /payees', async () => {
        const targetPayee = mockPayees[0]!;
        component.loadPayee(targetPayee);
        expect(component.isEditMode()).toBe(true);
        expect(component.name()).toBe('Target Store');

        component.name.set('Target Supercenter');
        component.notes.set('Updated notes');

        await component.handleSave();

        expect(mockLedgerStore.updatePayee).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'payee-1',
                name: 'Target Supercenter',
                notes: 'Updated notes'
            })
        );
        expect(router.navigate).toHaveBeenCalledWith(['/payees']);
    });

    it('should cancel and navigate back to /payees', () => {
        component.handleCancel();
        expect(router.navigate).toHaveBeenCalledWith(['/payees']);
    });
});
