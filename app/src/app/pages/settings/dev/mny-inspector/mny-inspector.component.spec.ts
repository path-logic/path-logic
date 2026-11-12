import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    AccountType,
    Frequency,
    PaymentMethod,
    ScheduleType,
    type ISODateString
} from '../../../../core/domain/types';
import type { IMnyHeader, IMnyParseResult } from '../../../../core/parsers/MNYParser';
import { AuthService } from '../../../../services/auth/auth.service';
import { LedgerStore } from '../../../../services/ledger-store/ledger.store';
import { SecurityManagerService } from '../../../../services/security-manager/security-manager.service';
import { SyncService } from '../../../../services/sync/sync.service';
import {
    DevMnyInspectorComponent,
    MnyCategoryFilter,
    MnyInspectorTab,
    MnyPayeeFilter,
    MnyPayeeViewMode
} from './mny-inspector.component';

describe('DevMnyInspectorComponent', () => {
    let component: DevMnyInspectorComponent;
    let fixture: ComponentFixture<DevMnyInspectorComponent>;

    const sampleParseResult: IMnyParseResult = {
        header: {
            signature: 'MSISAM Database',
            formatVersion: 2050,
            codePage: 1252,
            buildVersion: 1700,
            lcid: 0x0409,
            salt8: new Uint8Array(8),
            salt0: 0x12345678,
            cryptoFlags: 0,
            encryptionMode: 0,
            isSha1: false,
            is128Bit: false,
            passwordVerified: true,
            encryptAllPages: false,
            keyPrefix: new Uint8Array(5),
            passwordBuffer: new Uint8Array(40),
            decryptedPage0: new Uint8Array(4096)
        } satisfies IMnyHeader,
        tables: [
            { id: 15, name: 'ACCT', type: 1 },
            { id: 88, name: 'CAT', type: 1 },
            { id: 300, name: 'PAY', type: 1 },
            { id: 502, name: 'TRN', type: 1 },
            { id: 700, name: 'BILL', type: 1 }
        ],
        accounts: [
            {
                mnyAccountId: 1,
                name: 'Chase Checking',
                abbreviation: 'CHK',
                mnyType: 0,
                mappedType: AccountType.Checking,
                openingBalance: 250000,
                accountNumber: '1234',
                isClosed: false,
                isFavorite: true
            },
            {
                mnyAccountId: 2,
                name: 'Old Auto Loan',
                abbreviation: 'LOAN',
                mnyType: 6,
                mappedType: AccountType.AutoLoan,
                openingBalance: 0,
                accountNumber: '9999',
                isClosed: true,
                isFavorite: false
            }
        ],
        categories: [
            {
                mnyCategoryId: 201,
                parentCategoryId: null,
                level: 0,
                name: 'Automobile',
                fullName: 'Automobile',
                categoryType: 2,
                isHidden: false
            },
            {
                mnyCategoryId: 202,
                parentCategoryId: 201,
                level: 1,
                name: 'Insurance',
                fullName: 'Automobile : Insurance',
                categoryType: 2,
                isHidden: false
            },
            {
                mnyCategoryId: 203,
                parentCategoryId: 200,
                level: 1,
                name: 'Insurance',
                fullName: 'Home : Insurance',
                categoryType: 2,
                isHidden: false
            },
            {
                mnyCategoryId: 204,
                parentCategoryId: null,
                level: 0,
                name: 'XferTo',
                fullName: 'XferTo',
                categoryType: 0,
                isHidden: true
            }
        ],
        payees: [
            {
                mnyPayeeId: 10,
                name: 'Amazon',
                isHidden: false,
                parentPayeeId: null,
                transactionCount: 15,
                accountIds: [1],
                accountNames: ['Chase Checking']
            },
            {
                mnyPayeeId: 11,
                name: 'AMAZON MKTPL*2K91A',
                isHidden: true,
                parentPayeeId: 10,
                transactionCount: 4,
                accountIds: [1],
                accountNames: ['Chase Checking']
            },
            {
                mnyPayeeId: 12,
                name: '365 VEND LLC TROY MI',
                isHidden: true,
                parentPayeeId: null,
                transactionCount: 2,
                accountIds: [1],
                accountNames: ['Chase Checking']
            },
            {
                mnyPayeeId: 13,
                name: '101425',
                isHidden: true,
                parentPayeeId: null,
                transactionCount: 1,
                accountIds: [1],
                accountNames: ['Chase Checking']
            },
            {
                mnyPayeeId: 14,
                name: 'Unused Legacy Payee',
                isHidden: true,
                parentPayeeId: null,
                transactionCount: 0,
                accountIds: [],
                accountNames: []
            }
        ],
        transactions: [],
        recurringSchedules: [
            {
                mnyBillHeadId: 50,
                mnyBillId: 55,
                mnyTransactionId: 900,
                mnyAccountId: 1,
                accountName: 'Chase Checking',
                linkedMnyAccountId: null,
                payee: 'Disney+',
                amount: -18999,
                isEstimatedAmount: true,
                type: ScheduleType.Debit,
                frequency: Frequency.Yearly,
                frequencyLabel: 'Yearly',
                paymentMethod: PaymentMethod.DirectDebit,
                paymentMethodLabel: 'Electronic payment (Epay)',
                startDate: '2024-11-11' as ISODateString,
                endDate: null,
                nextDueDate: '2026-11-11' as ISODateString,
                memo: 'Annual streaming subscription',
                category: 'Bills : Cable & Satellite',
                mnyCategoryId: 201,
                splits: []
            }
        ],
        errors: [],
        warnings: []
    };

    beforeEach(async () => {
        const mockAuthService = {
            accessToken: signal<string | null>(null),
            currentUser: signal(null),
            isLoggedIn: signal(false)
        };

        const mockLedgerStore = {
            isInitialized: signal(true),
            initialize: vi.fn(),
            reset: vi.fn(),
            accounts: signal([]),
            payees: signal([]),
            categories: signal([]),
            transactions: signal([]),
            schedules: signal([]),
            syncStatus: signal('idle'),
            authError: signal(false),
            hasLocalFallback: signal(false),
            syncConflicts: signal([]),
            mergeCount: signal(0)
        };

        const mockSecurityManager = {
            isIdle: signal(false),
            startMonitoring: vi.fn(),
            resetTimers: vi.fn()
        };

        const mockSyncService = {
            isSyncing: signal(false),
            getSyncStatus: vi.fn().mockReturnValue('idle')
        };

        await TestBed.configureTestingModule({
            imports: [DevMnyInspectorComponent],
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: mockAuthService },
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: SecurityManagerService, useValue: mockSecurityManager },
                { provide: SyncService, useValue: mockSyncService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(DevMnyInspectorComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('renders the MS Money Investigation Tool header without exposing file extensions and filters file input to .mny', () => {
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.textContent).toContain('MS Money Investigation Tool');
        expect(compiled.textContent).not.toContain('.mny');

        const fileInput = compiled.querySelector(
            '[data-testid="mny-inspector-file-input"]'
        ) as HTMLInputElement | null;
        expect(fileInput).not.toBeNull();
        expect(fileInput?.getAttribute('accept')).toBe('.mny');
    });

    it('computes overview forensic statistics accurately when a parseResult is loaded', async () => {
        component.fileName.set('PeterSample');
        component.fileSize.set(14 * 1024 * 1024);
        component.parseResult.set(sampleParseResult);
        await component.aiEnhancer.enhanceAll(
            sampleParseResult.payees,
            sampleParseResult.categories
        );
        fixture.detectChanges();

        const stats = component.overviewStats();
        expect(stats).not.toBeNull();
        expect(stats?.totalTables).toBe(5);
        expect(stats?.openAccounts).toBe(1);
        expect(stats?.closedAccounts).toBe(1);
        expect(stats?.visibleCategories).toBe(3);
        expect(stats?.hiddenCategories).toBe(1);
        expect(stats?.primaryPayees).toBe(1);
        expect(stats?.hiddenAliasPayees).toBe(1);
        expect(stats?.statementUploadPayees).toBe(2);
        expect(stats?.orphanHiddenPayees).toBe(1);
        expect(stats?.totalRecurringBills).toBe(1);
    });

    it('filters payees in both AI Reconciled mode and Raw PAY Table mode', async () => {
        component.parseResult.set(sampleParseResult);
        await component.aiEnhancer.enhanceAll(
            sampleParseResult.payees,
            sampleParseResult.categories
        );
        component.activeTab.set(MnyInspectorTab.Payees);
        fixture.detectChanges();

        // Reconciled mode merges Amazon + AMAZON MKTPL*2K91A and ignores numeric '101425' & orphan
        const reconciled = component.filteredReconciledPayees();
        expect(reconciled.some(g => g.canonicalName === 'Amazon' && g.mergedCount === 2)).toBe(
            true
        );
        expect(reconciled.some(g => g.canonicalName === '101425')).toBe(false);

        // Switch to Raw mode and filter by PrimaryVisible
        component.payeeViewMode.set(MnyPayeeViewMode.Raw);
        component.payeeFilter.set(MnyPayeeFilter.PrimaryVisible);
        expect(component.filteredRawPayeeRows().map(r => r.name)).toEqual(['Amazon']);

        // Filter by NumericIgnored
        component.payeeFilter.set(MnyPayeeFilter.NumericIgnored);
        expect(component.filteredRawPayeeRows().map(r => r.name)).toEqual(['101425']);
    });

    it('identifies duplicate subcategory names and hidden categories in Categories Inspector', () => {
        component.parseResult.set(sampleParseResult);
        component.activeTab.set(MnyInspectorTab.Categories);

        component.categoryFilter.set(MnyCategoryFilter.DuplicateNames);
        const dupes = component.filteredCategories();
        expect(dupes.map(c => c.fullName)).toEqual(['Automobile : Insurance', 'Home : Insurance']);

        component.categoryFilter.set(MnyCategoryFilter.HiddenOnly);
        expect(component.filteredCategories().map(c => c.name)).toEqual(['XferTo']);
    });

    it('filters recurring bills and formats estimated amounts', () => {
        component.parseResult.set(sampleParseResult);
        component.activeTab.set(MnyInspectorTab.Bills);
        fixture.detectChanges();

        const bills = component.filteredRecurringBills();
        expect(bills).toHaveLength(1);
        expect(bills[0]?.payee).toBe('Disney+');
        expect(component.formatCents(bills[0]?.amount ?? 0)).toBe('-$189.99');
    });

    it('generates a Markdown diagnostic report summarizing MSISAM header and entities', async () => {
        component.fileName.set('InvestigationDatabase');
        component.fileSize.set(204800);
        component.parseResult.set(sampleParseResult);
        await component.aiEnhancer.enhanceAll(
            sampleParseResult.payees,
            sampleParseResult.categories
        );

        const md = component.generateDiagnosticMarkdown();
        expect(md).toContain('# MS Money Forensic Diagnostic Report');
        expect(md).toContain('Primary Visible (`fHidden=false`): 1');
        expect(md).toContain('**Active Recurring Bills (`BILL`)**: 1');
    });

    it('formats parse durations across sub-second, multi-second (>= 1000ms), and multi-minute ranges', () => {
        expect(component.formatDuration(42.5)).toBe('42.5 ms');
        expect(component.formatDuration(385.4)).toBe('385 ms');
        expect(component.formatDuration(1391.7)).toBe('1.39 s');
        expect(component.formatDuration(12450)).toBe('12.45 s');
        expect(component.formatDuration(65400)).toBe('1m 5.4s');

        component.fileName.set('Peter.mny');
        component.fileSize.set(42.2 * 1024 * 1024);
        component.parseDurationMs.set(1391.7);
        fixture.detectChanges();

        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.textContent).toContain('Parsed in 1.39 s');
    });

    it('hides auxiliary processing tables behind the ... toggle until expanded or searched', () => {
        component.parseResult.set({
            ...sampleParseResult,
            tables: [
                ...sampleParseResult.tables,
                { id: 26, name: 'CLI_DAT', type: 1 },
                { id: 7611, name: 'TRN_SPLIT', type: 1 },
                { id: 7679, name: 'TRN_XFER', type: 1 }
            ]
        });
        fixture.detectChanges();

        // By default, processing tables (CLI_DAT, TRN_SPLIT, TRN_XFER) are hidden behind ...
        expect(component.showProcessingTables()).toBe(false);
        expect(component.hiddenProcessingTablesCount()).toBe(3);
        expect(component.visibleCatalogTables().map(t => t.name)).toEqual([
            'ACCT',
            'BILL',
            'CAT',
            'PAY',
            'TRN'
        ]);

        const toggleBtn = (fixture.nativeElement as HTMLElement).querySelector(
            '[data-testid="toggle-processing-tables-btn"]'
        ) as HTMLButtonElement | null;
        expect(toggleBtn).not.toBeNull();
        expect(toggleBtn?.textContent).toContain('...');

        // Expanding reveals the processing tables
        toggleBtn?.click();
        fixture.detectChanges();
        expect(component.showProcessingTables()).toBe(true);
        expect(component.visibleCatalogTables().map(t => t.name)).toContain('CLI_DAT');
        expect(component.visibleCatalogTables().map(t => t.name)).toContain('TRN_SPLIT');
        expect(component.visibleCatalogTables().map(t => t.name)).toContain('TRN_XFER');

        // Collapsing hides them again, unless searched directly
        component.toggleProcessingTables();
        expect(component.showProcessingTables()).toBe(false);
        component.tableSearchQuery.set('TRN_SPLIT');
        expect(component.visibleCatalogTables().map(t => t.name)).toEqual(['TRN_SPLIT']);
    });

    it('renders a progress indicator with stage label, active table, and percentage while file is loading/parsing', () => {
        component.isParsing.set(true);
        component.loadProgressPercent.set(68);
        component.loadStageLabel.set('Extracting Payees...');
        component.loadCurrentTable.set('PAY');
        fixture.detectChanges();

        const compiled = fixture.nativeElement as HTMLElement;
        const progressEl = compiled.querySelector(
            '[data-testid="mny-inspector-progress-bar"]'
        ) as HTMLElement | null;
        expect(progressEl).not.toBeNull();
        expect(progressEl?.getAttribute('role')).toBe('progressbar');
        expect(progressEl?.getAttribute('aria-valuenow')).toBe('68');
        expect(progressEl?.textContent).toContain('Extracting Payees...');
        expect(progressEl?.textContent).toContain('PAY');
        expect(progressEl?.textContent).toContain('68%');
    });

    it('immediately processes and renders the initially selected ACCT table on file load with Data Rows as default and filters empty columns', () => {
        vi.spyOn(component['parser'], 'readTableDef').mockReturnValue({
            startPage: 15,
            rowCount: 2,
            maxCols: 3,
            numVarCols: 1,
            numCols: 3,
            numIndexes: 1,
            numRealIndexes: 1,
            columns: [
                {
                    name: 'hacct',
                    colType: 4,
                    colId: 0,
                    varColNum: 0,
                    colFlags: 1,
                    isFixed: true,
                    fixedOffset: 0,
                    maxLength: 4
                },
                {
                    name: 'szFull',
                    colType: 10,
                    colId: 1,
                    varColNum: 0,
                    colFlags: 0,
                    isFixed: false,
                    fixedOffset: 0,
                    maxLength: 64
                },
                {
                    name: 'mUnused',
                    colType: 10,
                    colId: 2,
                    varColNum: 1,
                    colFlags: 0,
                    isFixed: false,
                    fixedOffset: 0,
                    maxLength: 64
                }
            ]
        });
        vi.spyOn(component['parser'], 'readTableRows').mockReturnValue([
            { hacct: 1, szFull: 'Chase Checking', mUnused: null },
            { hacct: 2, szFull: 'Old Auto Loan', mUnused: null }
        ]);

        component.rawBytes.set(new Uint8Array(8192));
        component.parseResult.set(sampleParseResult);
        fixture.detectChanges();

        expect(component.activeTab()).toBe(MnyInspectorTab.Overview);
        expect(component.selectedTableName()).toBe('ACCT');
        expect(component.tableViewSubMode()).toBe('rows');

        const compiled = fixture.nativeElement as HTMLElement;
        const tableInspector = compiled.querySelector(
            '[data-testid="selected-table-inspector"]'
        ) as HTMLElement | null;
        expect(tableInspector).not.toBeNull();
        expect(tableInspector?.textContent).toContain('ACCT');
        expect(tableInspector?.textContent).toContain('TDEF Page 15');
        expect(tableInspector?.textContent).toContain('2 active rows');
        expect(tableInspector?.textContent).toContain('szFull');
        expect(tableInspector?.textContent).toContain('Chase Checking');

        // In Data Rows mode, all-NULL columns (mUnused) are hidden by default to fit the screen
        expect(component.hideEmptyColumns()).toBe(true);
        expect(component.visibleDataColumns().map(c => c.name)).toEqual(['hacct', 'szFull']);
        component.hideEmptyColumns.set(false);
        expect(component.visibleDataColumns().map(c => c.name)).toEqual([
            'hacct',
            'szFull',
            'mUnused'
        ]);
    });
});
