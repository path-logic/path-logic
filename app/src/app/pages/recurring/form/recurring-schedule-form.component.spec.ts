import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IAccount, ICategory, IPayee, IRecurringSchedule } from '@core';
import { Frequency, PaymentMethod, ScheduleType } from '@core';
import { AuthService } from '../../../services/auth/auth.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { RecurringScheduleFormComponent } from './recurring-schedule-form.component';

describe('RecurringScheduleFormComponent', () => {
    let component: RecurringScheduleFormComponent;
    let fixture: ComponentFixture<RecurringScheduleFormComponent>;
    let router: Router;
    let mockLedgerStore: any;

    const mockAccounts: Array<IAccount> = [
        {
            id: 'acc-1',
            name: 'Checking Account',
            type: 'checking' as any,
            institutionName: 'Chase',
            clearedBalance: 100000,
            pendingBalance: 100000,
            isActive: true,
            deletedAt: null,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z'
        }
    ];

    const mockPayees: Array<IPayee> = [
        {
            id: 'payee-1',
            name: 'Comcast',
            defaultCategoryId: 'cat-utilities',
            notes: null,
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

    const mockCategories: Array<ICategory> = [
        {
            id: 'cat-utilities',
            name: 'Utilities',
            parentId: null,
            description: null,
            isActive: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z'
        }
    ];

    const mockSchedules: Array<IRecurringSchedule> = [
        {
            id: 'sched-1',
            accountId: 'acc-1',
            payee: 'Comcast Internet',
            amount: 8500,
            type: ScheduleType.Debit,
            frequency: Frequency.Monthly,
            paymentMethod: PaymentMethod.ElectronicTransfer,
            startDate: '2026-01-01T00:00:00.000Z',
            endDate: null,
            nextDueDate: '2026-09-01T00:00:00.000Z',
            lastOccurredDate: null,
            splits: [],
            memo: 'High speed internet',
            autoPost: true,
            isActive: true
        }
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
            accounts: signal<Array<IAccount>>(mockAccounts),
            payees: signal<Array<IPayee>>(mockPayees),
            categories: signal<Array<ICategory>>(mockCategories),
            schedules: signal<Array<IRecurringSchedule>>(mockSchedules),
            addSchedule: vi.fn().mockResolvedValue(undefined),
            updateSchedule: vi.fn().mockResolvedValue(undefined)
        };

        const mockAuthService = {
            accessToken: signal<string | null>(null),
            currentUser: signal(null),
            isLoggedIn: signal(true),
            isInitializing: signal(false),
            signInWithGoogle: vi.fn()
        };

        await TestBed.configureTestingModule({
            imports: [RecurringScheduleFormComponent],
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

        fixture = TestBed.createComponent(RecurringScheduleFormComponent);
        component = fixture.componentInstance;
        router = TestBed.inject(Router);
        vi.spyOn(router, 'navigate').mockResolvedValue(true);
        fixture.detectChanges();
    });

    it('should create the recurring schedule form component', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize with default debit schedule values', () => {
        expect(component.isEditMode()).toBe(false);
        expect(component.type()).toBe(ScheduleType.Debit);
        expect(component.frequency()).toBe(Frequency.Monthly);
        expect(component.payee()).toBe('');
    });

    it('should validate payee and amount before saving', async () => {
        component.payee.set('');
        component.amount.set('');
        await component.handleSave();
        expect(component.errorMessage()).toContain('Payee / Name is required');
        expect(mockLedgerStore.addSchedule).not.toHaveBeenCalled();
    });

    it('should create a new recurring schedule and navigate to /recurring', async () => {
        component.payee.set('Electric Bill');
        component.amount.set('120.50');
        component.accountId.set('acc-1');
        component.memo.set('Power utility');
        component.frequency.set(Frequency.Monthly);
        component.autoPost.set(true);

        await component.handleSave();

        expect(mockLedgerStore.addSchedule).toHaveBeenCalledWith(
            expect.objectContaining({
                payee: 'Electric Bill',
                amount: 12050,
                accountId: 'acc-1',
                autoPost: true
            })
        );
        expect(router.navigate).toHaveBeenCalledWith(['/recurring']);
    });

    it('should update an existing schedule in edit mode', async () => {
        component.loadSchedule(mockSchedules[0]!);
        expect(component.isEditMode()).toBe(true);
        expect(component.payee()).toBe('Comcast Internet');

        component.payee.set('Comcast Fiber');
        component.amount.set('95.00');

        await component.handleSave();

        expect(mockLedgerStore.updateSchedule).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'sched-1',
                payee: 'Comcast Fiber',
                amount: 9500
            })
        );
        expect(router.navigate).toHaveBeenCalledWith(['/recurring']);
    });

    it('should cancel and navigate back to /recurring', () => {
        component.handleCancel();
        expect(router.navigate).toHaveBeenCalledWith(['/recurring']);
    });
});
