import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { IAccount, IPayee, IRecurringSchedule, ITransaction } from '@core';
import { AccountType, Frequency, PaymentMethod, ScheduleType, TransactionStatus } from '@core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../services/auth/auth.service';
import { GeminiService } from '../../services/gemini/gemini.service';
import { LedgerStore } from '../../services/ledger-store/ledger.store';
import { SidebarContextService } from '../../services/sidebar-context/sidebar-context.service';
import { SyncService } from '../../services/sync/sync.service';
import { RecurringDashboardComponent } from './recurring-dashboard.component';

describe('RecurringDashboardComponent', () => {
    let fixture: ComponentFixture<RecurringDashboardComponent>;
    let component: RecurringDashboardComponent;
    let sidebarContext: SidebarContextService;

    const mockGemini = {
        hasKey: vi.fn().mockReturnValue(true),
        apiKey: vi.fn().mockReturnValue('mock-gemini-key'),
        generateContent: vi.fn()
    };

    const mockSchedules = signal<Array<IRecurringSchedule>>([
        {
            id: 'sched-1',
            accountId: 'acc-1',
            payee: 'Electric Utility',
            amount: 15000,
            type: ScheduleType.Debit,
            frequency: Frequency.Monthly,
            startDate: '2026-08-01',
            nextDueDate: '2026-08-25',
            autoPost: true,
            isActive: true,
            memo: '',
            paymentMethod: PaymentMethod.ElectronicTransfer,
            endDate: null,
            lastOccurredDate: null,
            splits: []
        },
        {
            id: 'sched-2',
            accountId: 'acc-1',
            payee: 'Employer Salary',
            amount: 300000,
            type: ScheduleType.Deposit,
            frequency: Frequency.Biweekly,
            startDate: '2026-08-01',
            nextDueDate: '2026-08-30',
            autoPost: false,
            isActive: true,
            memo: '',
            paymentMethod: PaymentMethod.ElectronicTransfer,
            endDate: null,
            lastOccurredDate: null,
            splits: []
        }
    ]);

    const mockAccounts = signal<Array<IAccount>>([
        {
            id: 'acc-1',
            name: 'Main Checking',
            type: AccountType.Checking,
            institutionName: 'Chase',
            clearedBalance: 500000,
            pendingBalance: 500000,
            isActive: true,
            deletedAt: null,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z'
        }
    ]);

    const mockTransactions = signal<Array<ITransaction>>([
        {
            id: 'tx-1',
            accountId: 'acc-1',
            payeeId: 'p-1',
            date: '2026-08-20',
            payee: 'Electric Utility',
            memo: '',
            totalAmount: -15000,
            status: TransactionStatus.Cleared,
            checkNumber: null,
            importHash: 'hash-tx-1',
            splits: [],
            createdAt: '2026-08-20T00:00:00.000Z',
            updatedAt: '2026-08-20T00:00:00.000Z'
        }
    ]);

    const mockLedgerStore = {
        schedules: mockSchedules,
        accounts: mockAccounts,
        transactions: mockTransactions,
        payees: signal<Array<IPayee>>([]),
        isInitialized: signal(true),
        isLoading: signal(false),
        syncStatus: signal('synced'),
        authError: signal(false),
        hasLocalFallback: signal(true),
        syncConflicts: signal([]),
        mergeCount: signal(0),
        addSchedule: vi.fn(),
        updateSchedule: vi.fn(),
        removeSchedule: vi.fn(),
        deleteRecurringSchedule: vi.fn(),
        addTransaction: vi.fn(),
        getOrCreatePayee: vi.fn().mockResolvedValue({ id: 'p-1', name: 'Electric Utility' })
    };

    const mockAuth = {
        currentUser: signal({
            displayName: 'Alex Mercer',
            email: 'alex@example.com'
        }),
        accessToken: signal(null),
        isGoogleDriveConnected: signal(false)
    };

    const mockSync = {
        isSyncing: signal(false),
        getSyncStatus: () => ({ lastSyncTime: Date.now() })
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [RecurringDashboardComponent],
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: mockAuth },
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: SyncService, useValue: mockSync },
                { provide: GeminiService, useValue: mockGemini }
            ]
        }).compileComponents();

        sidebarContext = TestBed.inject(SidebarContextService);
        fixture = TestBed.createComponent(RecurringDashboardComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the recurring dashboard component', () => {
        expect(component).toBeTruthy();
    });

    it('should register its sidebar tools template with SidebarContextService on init', () => {
        expect(sidebarContext.hasContext()).toBe(true);
        expect(sidebarContext.customTemplate()).toBeTruthy();
    });

    it('should clear sidebar context on destroy', () => {
        expect(sidebarContext.hasContext()).toBe(true);
        fixture.destroy();
        expect(sidebarContext.hasContext()).toBe(false);
        expect(sidebarContext.customTemplate()).toBeNull();
    });

    it('should compute active schedules and auto-post counts correctly', () => {
        expect(component.activeSchedulesCount()).toBe(2);
        expect(component.autoPostCount()).toBe(1);
    });

    it('should update activeFilter signal when filter changes', () => {
        expect(component.activeFilter()).toBe('all');
        component.activeFilter.set('due-soon');
        expect(component.activeFilter()).toBe('due-soon');
    });

    it('should launch AI explanation dialog when AI key is missing', () => {
        mockGemini.hasKey.mockReturnValue(false);
        component.runAnalysis();

        expect(component.isAiExplanationOpen()).toBe(true);
        expect(component.isAnalyzeOpen()).toBe(false);
    });

    it('should transition to offline detection when handleRunOfflinePatterns() is called', () => {
        component.isAiExplanationOpen.set(true);
        component.handleRunOfflinePatterns();

        expect(component.isAiExplanationOpen()).toBe(false);
        expect(component.isAnalyzeOpen()).toBe(true);
    });

    it('should directly run pattern analysis when AI key is configured', () => {
        mockGemini.hasKey.mockReturnValue(true);
        component.runAnalysis();

        expect(component.isAiExplanationOpen()).toBe(false);
        expect(component.isAnalyzeOpen()).toBe(true);
    });

    it('should accept pattern and open edit dialog with prefilled schedule', () => {
        component.isAnalyzeOpen.set(true);
        const mockPattern = {
            payee: 'Netflix',
            accountId: 'acc-1',
            suggestedFrequency: Frequency.Monthly,
            suggestedAmount: -1599,
            confidence: 0.95,
            mostRecentTransaction: {
                id: 'tx-netflix',
                accountId: 'acc-1',
                payeeId: 'p-1',
                date: '2026-08-01',
                totalAmount: -1599,
                status: TransactionStatus.Cleared,
                checkNumber: null,
                importHash: 'hash-netflix',
                splits: [],
                createdAt: '2026-08-01',
                updatedAt: '2026-08-01'
            } as any,
            mostRecentSplits: [],
            sampleDates: ['2026-06-01', '2026-07-01', '2026-08-01']
        };

        component.acceptPattern(mockPattern);

        expect(component.isAnalyzeOpen()).toBe(false);
        expect(component.isDialogVisible()).toBe(true);
        expect(component.selectedSchedule().payee).toBe('Netflix');
        expect(component.selectedSchedule().amount).toBe(-1599);
    });

    it('should skip pattern and remove it from visiblePatterns', () => {
        const mockPattern = {
            payee: 'Skipped Merchant',
            accountId: 'acc-1',
            suggestedFrequency: Frequency.Monthly,
            suggestedAmount: -2000,
            confidence: 0.8,
            mostRecentTransaction: {} as any,
            mostRecentSplits: [],
            sampleDates: []
        };
        component.detectedPatterns.set([mockPattern]);
        expect(component.visiblePatterns.length).toBe(1);

        component.skipPattern(mockPattern);
        expect(component.visiblePatterns.length).toBe(0);
    });

    it('should compute isLoading and display skeleton placeholders while loading', () => {
        mockLedgerStore.isLoading.set(true);
        fixture.detectChanges();

        expect(component.isLoading()).toBe(true);
        const skeletons = fixture.nativeElement.querySelectorAll('app-skeleton');
        expect(skeletons.length).toBeGreaterThan(0);

        // Zero state should NOT be visible while loading
        const text = fixture.nativeElement.textContent;
        expect(text).not.toContain('No scheduled transactions');
    });

    it('should display zero state only after loading completes and schedules are empty', () => {
        mockLedgerStore.isLoading.set(false);
        mockSchedules.set([]);
        fixture.detectChanges();

        expect(component.isLoading()).toBe(false);
        const text = fixture.nativeElement.textContent;
        expect(text).toContain('No scheduled transactions');
    });

    it('should select and toggle a date when selectDate() is called', () => {
        expect(component.selectedDate()).toBeNull();

        component.selectDate('2026-08-25');
        expect(component.selectedDate()).toBe('2026-08-25');

        // Clicking the same date again should deselect (toggle to null)
        component.selectDate('2026-08-25');
        expect(component.selectedDate()).toBeNull();

        // Selecting a new date
        component.selectDate('2026-08-30');
        expect(component.selectedDate()).toBe('2026-08-30');

        component.clearSelectedDate();
        expect(component.selectedDate()).toBeNull();
    });

    it('should filter displayedSchedules when a date is selected', () => {
        // Reset schedules to 2 items
        mockSchedules.set([
            {
                id: 'sched-1',
                accountId: 'acc-1',
                payee: 'Electric Utility',
                amount: 15000,
                type: ScheduleType.Debit,
                frequency: Frequency.Monthly,
                startDate: '2026-08-01',
                nextDueDate: '2026-08-25',
                autoPost: true,
                isActive: true,
                memo: '',
                paymentMethod: PaymentMethod.ElectronicTransfer,
                endDate: null,
                lastOccurredDate: null,
                splits: []
            },
            {
                id: 'sched-2',
                accountId: 'acc-1',
                payee: 'Employer Salary',
                amount: 300000,
                type: ScheduleType.Deposit,
                frequency: Frequency.Biweekly,
                startDate: '2026-08-01',
                nextDueDate: '2026-08-30',
                autoPost: false,
                isActive: true,
                memo: '',
                paymentMethod: PaymentMethod.ElectronicTransfer,
                endDate: null,
                lastOccurredDate: null,
                splits: []
            }
        ]);
        component.clearSelectedDate();
        expect(component.displayedSchedules().length).toBe(2);

        // Select Aug 25
        component.selectDate('2026-08-25');
        expect(component.displayedSchedules().length).toBe(1);
        expect(component.displayedSchedules()[0]?.payee).toBe('Electric Utility');

        // Select Aug 30
        component.selectDate('2026-08-30');
        expect(component.displayedSchedules().length).toBe(1);
        expect(component.displayedSchedules()[0]?.payee).toBe('Employer Salary');

        // Select a date with no schedules (Aug 16)
        component.selectDate('2026-08-16');
        expect(component.displayedSchedules().length).toBe(0);

        // Clear date filter
        component.clearSelectedDate();
        expect(component.displayedSchedules().length).toBe(2);
    });

    it('should open edit dialog with schedule data when editSchedule() is called', () => {
        const schedule = mockSchedules()[0]!;
        component.editSchedule(schedule);

        expect(component.isDialogVisible()).toBe(true);
        expect(component.selectedSchedule().id).toBe('sched-1');
        expect(component.selectedSchedule().payee).toBe('Electric Utility');
    });

    it('should prefill startDate and nextDueDate when openNewForSelectedDate() is called', () => {
        component.selectDate('2026-09-15');
        component.openNewForSelectedDate();

        expect(component.isDialogVisible()).toBe(true);
        expect(component.selectedSchedule().startDate).toBe('2026-09-15');
        expect(component.selectedSchedule().nextDueDate).toBe('2026-09-15');
    });

    it('should call ledgerStore.removeSchedule and close dialog on handleDelete()', () => {
        component.isDialogVisible.set(true);
        component.handleDelete('sched-1');

        expect(mockLedgerStore.removeSchedule).toHaveBeenCalledWith('sched-1');
        expect(component.isDialogVisible()).toBe(false);
    });
});
