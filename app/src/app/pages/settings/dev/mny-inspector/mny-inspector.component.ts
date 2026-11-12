import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AppShellComponent } from '../../../../components/layout/app-shell/app-shell.component';
import {
    MNYParser,
    MnyColumnType,
    type IMnyAccount,
    type IMnyCatalogTable,
    type IMnyCategory,
    type IMnyColumnDef,
    type IMnyHeader,
    type IMnyParseResult,
    type IMnyPayee,
    type IMnyRecurringSchedule,
    type IMnyTableDef,
    type MnyCellValue
} from '../../../../core/parsers/MNYParser';
import {
    AiMnyEnhancerService,
    type IReconciledPayeeGroup
} from '../../../../services/import-export/ai-mny-enhancer.service';
import type {
    MnyWorkerInboundMessage,
    MnyWorkerOutboundMessage
} from '../../../../services/import-export/mny-migration.types';

export enum MnyInspectorTab {
    Overview = 'overview',
    Tables = 'tables',
    Payees = 'payees',
    Categories = 'categories',
    Bills = 'bills',
    Accounts = 'accounts'
}

export enum MnyPayeeViewMode {
    Reconciled = 'reconciled',
    Raw = 'raw'
}

export enum MnyPayeeFilter {
    All = 'all',
    PrimaryVisible = 'primary_visible',
    HiddenAliases = 'hidden_aliases',
    StatementUpload = 'statement_upload',
    NumericIgnored = 'numeric_ignored',
    OrphanHidden = 'orphan_hidden'
}

export enum MnyCategoryFilter {
    All = 'all',
    VisibleOnly = 'visible_only',
    HiddenOnly = 'hidden_only',
    Income = 'income',
    Expense = 'expense',
    DuplicateNames = 'duplicate_names'
}

export interface IRawPayeeInspectionRow {
    mnyPayeeId: number;
    name: string;
    isHidden: boolean;
    parentPayeeId: number | null;
    parentPayeeName: string | null;
    canonicalName: string;
    isNumericNoise: boolean;
    transactionCount: number;
    accountNames: Array<string>;
}

export interface ITdefColumnStat extends IMnyColumnDef {
    nonNullCount: number;
    sampleValue: MnyCellValue;
}

const PRIMARY_ENTITY_TABLES: ReadonlySet<string> = new Set([
    'ACCT',
    'ADDR',
    'AUTO',
    'BGT',
    'BILL',
    'CAT',
    'FI',
    'LOT',
    'PAY',
    'SAV_GOAL',
    'SEC',
    'TRN'
]);

/**
 * Developer diagnostic & forensic investigation tool for Microsoft Money databases.
 * Allows inspecting low-level MSISAM tables/schemas (`MSysObjects`, `TDEF`, raw rows)
 * alongside parsed & AI-reconciled Payees, Categories, Recurring Bills, and Accounts.
 */
@Component({
    selector: 'app-dev-mny-inspector',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, AppShellComponent],
    templateUrl: './mny-inspector.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DevMnyInspectorComponent {
    readonly aiEnhancer = inject(AiMnyEnhancerService);
    private readonly parser = new MNYParser();

    readonly MnyInspectorTab = MnyInspectorTab;
    readonly MnyPayeeViewMode = MnyPayeeViewMode;
    readonly MnyPayeeFilter = MnyPayeeFilter;
    readonly MnyCategoryFilter = MnyCategoryFilter;

    // --- File & Decryption State ---
    readonly fileName = signal<string>('');
    readonly fileSize = signal<number>(0);
    readonly rawBytes = signal<Uint8Array | null>(null);
    readonly password = signal<string>('');
    readonly username = signal<string>('');
    readonly showPassword = signal<boolean>(false);
    readonly requiresUnlock = signal<boolean>(false);
    readonly unlockError = signal<string | null>(null);
    readonly isParsing = signal<boolean>(false);
    readonly loadProgressPercent = signal<number>(0);
    readonly loadStageLabel = signal<string>('');
    readonly loadCurrentTable = signal<string | null>(null);
    readonly parseDurationMs = signal<number>(0);
    readonly parseResult = signal<IMnyParseResult | null>(null);
    readonly copySuccessMessage = signal<string | null>(null);

    // --- Navigation & Tab State ---
    readonly activeTab = signal<MnyInspectorTab>(MnyInspectorTab.Overview);

    // --- Tab 2: Raw MSISAM Table Explorer State ---
    readonly tableSearchQuery = signal<string>('');
    readonly showProcessingTables = signal<boolean>(false);
    readonly selectedTableName = signal<string>('ACCT');
    readonly tableViewSubMode = signal<'rows' | 'schema'>('rows');
    readonly schemaColumnSearchQuery = signal<string>('');
    readonly hideEmptySchemaColumns = signal<boolean>(false);
    readonly hideEmptyColumns = signal<boolean>(true);
    readonly selectedRowIndex = signal<number | null>(null);
    readonly rawRowSearchQuery = signal<string>('');
    readonly rawRowPage = signal<number>(0);
    readonly rawRowPageSize = 100;

    // --- Tab 3: Payees Inspector State ---
    readonly payeeViewMode = signal<MnyPayeeViewMode>(MnyPayeeViewMode.Reconciled);
    readonly payeeFilter = signal<MnyPayeeFilter>(MnyPayeeFilter.All);
    readonly payeeSearchQuery = signal<string>('');
    readonly payeeAccountFilter = signal<string>('ALL');
    readonly payeePage = signal<number>(0);
    readonly payeePageSize = 100;

    // --- Tab 4: Categories Inspector State ---
    readonly categoryFilter = signal<MnyCategoryFilter>(MnyCategoryFilter.All);
    readonly categorySearchQuery = signal<string>('');

    // --- Tab 5: Recurring Bills Inspector State ---
    readonly billSearchQuery = signal<string>('');
    readonly showRawBillTable = signal<boolean>(false);

    // --- Tab 6: Accounts Inspector State ---
    readonly accountSearchQuery = signal<string>('');
    readonly accountStatusFilter = signal<'all' | 'open' | 'closed'>('all');

    // --- Computed: Overview Metrics ---
    readonly header = computed<IMnyHeader | null>(() => this.parseResult()?.header ?? null);

    readonly overviewStats = computed(() => {
        const res = this.parseResult();
        if (!res) return null;

        const openAccounts = res.accounts.filter(a => !a.isClosed).length;
        const closedAccounts = res.accounts.filter(a => a.isClosed).length;
        const visibleCategories = res.categories.filter(c => !c.isHidden).length;
        const hiddenCategories = res.categories.filter(c => c.isHidden).length;

        const primaryPayees = res.payees.filter(p => p.isHidden === false).length;
        const hiddenAliasPayees = res.payees.filter(
            p => p.isHidden !== false && p.parentPayeeId !== null && p.parentPayeeId !== undefined
        ).length;
        const statementUploadPayees = res.payees.filter(
            p =>
                p.isHidden !== false &&
                (p.parentPayeeId === null || p.parentPayeeId === undefined) &&
                (p.transactionCount ?? 0) > 0
        ).length;
        const orphanHiddenPayees = res.payees.filter(
            p =>
                p.isHidden !== false &&
                (p.parentPayeeId === null || p.parentPayeeId === undefined) &&
                (p.transactionCount ?? 0) === 0
        ).length;

        return {
            totalTables: res.tables.length,
            totalAccounts: res.accounts.length,
            openAccounts,
            closedAccounts,
            totalCategories: res.categories.length,
            visibleCategories,
            hiddenCategories,
            totalPayees: res.payees.length,
            primaryPayees,
            hiddenAliasPayees,
            statementUploadPayees,
            orphanHiddenPayees,
            reconciledPayeeGroups: this.reconciledPayees().length,
            ignoredNumericPayees: this.aiEnhancer.ignoredNumericPayeeCount(),
            totalTransactions: res.transactions.length,
            totalRecurringBills: res.recurringSchedules?.length ?? 0
        };
    });

    // --- Computed: Raw Table Explorer ---
    readonly filteredCatalogTables = computed<Array<IMnyCatalogTable>>(() => {
        const res = this.parseResult();
        if (!res) return [];
        const q = this.tableSearchQuery().trim().toLowerCase();
        const tables = [...res.tables].sort((a, b) => a.name.localeCompare(b.name));
        if (!q) return tables;
        return tables.filter(t => t.name.toLowerCase().includes(q) || String(t.id).includes(q));
    });

    readonly hiddenProcessingTablesCount = computed<number>(() => {
        const res = this.parseResult();
        if (!res) return 0;
        return res.tables.filter(t => this.isProcessingTable(t.name)).length;
    });

    readonly visibleCatalogTables = computed<Array<IMnyCatalogTable>>(() => {
        const allFiltered = this.filteredCatalogTables();
        const hasSearch = this.tableSearchQuery().trim().length > 0;
        if (hasSearch || this.showProcessingTables()) {
            return allFiltered;
        }
        const selected = this.selectedTableName();
        return allFiltered.filter(t => !this.isProcessingTable(t.name) || t.name === selected);
    });

    readonly selectedTableInspection = computed<{
        table: IMnyCatalogTable | null;
        tdef: IMnyTableDef | null;
        rows: Array<Record<string, MnyCellValue>>;
        columns: Array<IMnyColumnDef>;
        error: string | null;
    }>(() => {
        const bytes = this.rawBytes();
        const res = this.parseResult();
        const tableName = this.selectedTableName();
        if (!bytes || !res || !res.header) {
            return { table: null, tdef: null, rows: [], columns: [], error: null };
        }

        const table = res.tables.find(t => t.name === tableName) ?? res.tables[0] ?? null;
        if (!table) {
            return { table: null, tdef: null, rows: [], columns: [], error: 'No table selected' };
        }

        try {
            const tdef = this.parser.readTableDef(bytes, table.id, res.header);
            const rows = this.parser.readTableRows(bytes, tdef, res.header, null, table.name);
            return {
                table,
                tdef,
                rows,
                columns: tdef.columns,
                error: null
            };
        } catch (err: unknown) {
            return {
                table,
                tdef: null,
                rows: [],
                columns: [],
                error: err instanceof Error ? err.message : 'Failed to read table TDEF/rows'
            };
        }
    });

    readonly filteredRawTableRows = computed<Array<Record<string, MnyCellValue>>>(() => {
        const inspection = this.selectedTableInspection();
        const q = this.rawRowSearchQuery().trim().toLowerCase();
        if (!q) return inspection.rows;
        return inspection.rows.filter(row =>
            Object.values(row).some(
                val => val !== null && val !== undefined && String(val).toLowerCase().includes(q)
            )
        );
    });

    readonly pagedRawTableRows = computed<Array<Record<string, MnyCellValue>>>(() => {
        const rows = this.filteredRawTableRows();
        const start = this.rawRowPage() * this.rawRowPageSize;
        return rows.slice(start, start + this.rawRowPageSize);
    });

    readonly columnStats = computed<Array<ITdefColumnStat>>(() => {
        const insp = this.selectedTableInspection();
        const rows = insp.rows;
        return insp.columns.map(col => {
            let nonNullCount = 0;
            let sampleValue: MnyCellValue = null;
            for (const row of rows) {
                const val = row[col.name];
                if (val !== null && val !== undefined && val !== '') {
                    nonNullCount++;
                    if (sampleValue === null) {
                        sampleValue = val;
                    } else if (typeof val === 'boolean' && val === true && sampleValue === false) {
                        sampleValue = true;
                    }
                }
            }
            return {
                ...col,
                nonNullCount,
                sampleValue
            };
        });
    });

    readonly populatedColumnsCount = computed<number>(() => {
        return this.columnStats().filter(c => c.nonNullCount > 0 || c.colId === 0).length;
    });

    readonly filteredSchemaColumns = computed<Array<ITdefColumnStat>>(() => {
        let stats = this.columnStats();
        if (this.hideEmptySchemaColumns()) {
            stats = stats.filter(c => c.nonNullCount > 0 || c.colId === 0);
        }
        const q = this.schemaColumnSearchQuery().trim().toLowerCase();
        if (!q) return stats;
        return stats.filter(
            c =>
                c.name.toLowerCase().includes(q) ||
                this.formatColumnType(c.colType).toLowerCase().includes(q) ||
                String(c.colId) === q
        );
    });

    readonly visibleDataColumns = computed<Array<IMnyColumnDef>>(() => {
        const stats = this.columnStats();
        if (!this.hideEmptyColumns()) {
            return stats;
        }
        const populated = stats.filter(c => c.nonNullCount > 0 || c.colId === 0);
        return populated.length > 0 ? populated : stats;
    });

    readonly selectedRowEntries = computed<Array<{ col: IMnyColumnDef; value: MnyCellValue }>>(
        () => {
            const idx = this.selectedRowIndex();
            const rows = this.pagedRawTableRows();
            const insp = this.selectedTableInspection();
            if (idx === null || idx < 0 || idx >= rows.length) return [];
            const row = rows[idx];
            if (!row) return [];
            return insp.columns
                .map(col => ({ col, value: row[col.name] ?? null }))
                .filter(entry => entry.value !== null && entry.value !== undefined);
        }
    );

    // --- Computed: Payees Inspector ---
    readonly reconciledPayees = computed<Array<IReconciledPayeeGroup>>(() => {
        const res = this.parseResult();
        if (!res) return [];
        return this.aiEnhancer.reconcilePayees(res.payees);
    });

    readonly filteredReconciledPayees = computed<Array<IReconciledPayeeGroup>>(() => {
        const groups = this.reconciledPayees();
        const q = this.payeeSearchQuery().trim().toLowerCase();
        const acct = this.payeeAccountFilter();

        return groups.filter(g => {
            if (acct !== 'ALL') {
                if (acct === 'PRIMARY_VISIBLE') {
                    if (!g.hasPrimaryPayee) return false;
                } else if (!(g.accountNames ?? []).includes(acct)) {
                    return false;
                }
            }
            if (!q) return true;
            return (
                g.canonicalName.toLowerCase().includes(q) ||
                g.name.toLowerCase().includes(q) ||
                g.mergedOriginalNames.some(orig => orig.toLowerCase().includes(q))
            );
        });
    });

    readonly primaryReconciledPayees = computed<Array<IReconciledPayeeGroup>>(() =>
        this.filteredReconciledPayees().filter(g => g.hasPrimaryPayee)
    );

    readonly statementOnlyReconciledPayees = computed<Array<IReconciledPayeeGroup>>(() =>
        this.filteredReconciledPayees().filter(g => !g.hasPrimaryPayee)
    );

    readonly rawPayeeRows = computed<Array<IRawPayeeInspectionRow>>(() => {
        const res = this.parseResult();
        if (!res) return [];

        const nameById = new Map<number, string>();
        for (const p of res.payees) {
            nameById.set(p.mnyPayeeId, p.name);
        }

        return res.payees.map((p: IMnyPayee) => {
            const parentId = p.parentPayeeId ?? null;
            const parentName = parentId !== null ? (nameById.get(parentId) ?? null) : null;
            const cleaned = this.aiEnhancer.cleanPayeeName(p.name);
            return {
                mnyPayeeId: p.mnyPayeeId,
                name: p.name,
                isHidden: p.isHidden !== false,
                parentPayeeId: parentId,
                parentPayeeName: parentName,
                canonicalName: parentName ? this.aiEnhancer.cleanPayeeName(parentName) : cleaned,
                isNumericNoise: this.aiEnhancer.isNumericOrJunkPayee(p.name),
                transactionCount: p.transactionCount ?? 0,
                accountNames: p.accountNames ?? []
            };
        });
    });

    readonly filteredRawPayeeRows = computed<Array<IRawPayeeInspectionRow>>(() => {
        const rows = this.rawPayeeRows();
        const filter = this.payeeFilter();
        const q = this.payeeSearchQuery().trim().toLowerCase();
        const acct = this.payeeAccountFilter();

        return rows.filter(r => {
            if (filter === MnyPayeeFilter.PrimaryVisible && r.isHidden) return false;
            if (
                filter === MnyPayeeFilter.HiddenAliases &&
                (!r.isHidden || r.parentPayeeId === null)
            )
                return false;
            if (
                filter === MnyPayeeFilter.StatementUpload &&
                (!r.isHidden || r.parentPayeeId !== null || r.transactionCount === 0)
            )
                return false;
            if (filter === MnyPayeeFilter.NumericIgnored && !r.isNumericNoise) return false;
            if (
                filter === MnyPayeeFilter.OrphanHidden &&
                (!r.isHidden || r.parentPayeeId !== null || r.transactionCount > 0)
            )
                return false;

            if (acct !== 'ALL' && acct !== 'PRIMARY_VISIBLE') {
                if (!r.accountNames.includes(acct)) return false;
            }
            if (!q) return true;
            return (
                r.name.toLowerCase().includes(q) ||
                r.canonicalName.toLowerCase().includes(q) ||
                (r.parentPayeeName?.toLowerCase().includes(q) ?? false) ||
                String(r.mnyPayeeId).includes(q)
            );
        });
    });

    readonly pagedRawPayeeRows = computed<Array<IRawPayeeInspectionRow>>(() => {
        const rows = this.filteredRawPayeeRows();
        const start = this.payeePage() * this.payeePageSize;
        return rows.slice(start, start + this.payeePageSize);
    });

    readonly availableAccountNames = computed<Array<string>>(() => {
        const res = this.parseResult();
        if (!res) return [];
        return res.accounts.map(a => a.name).sort((a, b) => a.localeCompare(b));
    });

    // --- Computed: Categories Inspector ---
    readonly filteredCategories = computed<
        Array<
            IMnyCategory & {
                parentName: string | null;
                harmonizedName: string;
                isDuplicateLeafName: boolean;
            }
        >
    >(() => {
        const res = this.parseResult();
        if (!res) return [];

        const nameById = new Map<number, string>();
        const leafCounts = new Map<string, number>();
        for (const c of res.categories) {
            nameById.set(c.mnyCategoryId, c.name);
            const key = c.name.trim().toLowerCase();
            leafCounts.set(key, (leafCounts.get(key) ?? 0) + 1);
        }

        const filter = this.categoryFilter();
        const q = this.categorySearchQuery().trim().toLowerCase();

        return res.categories
            .map(c => {
                const parentName =
                    c.parentCategoryId !== null ? (nameById.get(c.parentCategoryId) ?? null) : null;
                const harmonizedName = this.aiEnhancer.cleanCategoryName(c.name);
                const isDuplicateLeafName = (leafCounts.get(c.name.trim().toLowerCase()) ?? 0) > 1;
                return {
                    ...c,
                    parentName,
                    harmonizedName,
                    isDuplicateLeafName
                };
            })
            .filter(c => {
                if (filter === MnyCategoryFilter.VisibleOnly && c.isHidden) return false;
                if (filter === MnyCategoryFilter.HiddenOnly && !c.isHidden) return false;
                if (filter === MnyCategoryFilter.Income && c.categoryType !== 1) return false;
                if (filter === MnyCategoryFilter.Expense && c.categoryType !== 2) return false;
                if (filter === MnyCategoryFilter.DuplicateNames && !c.isDuplicateLeafName)
                    return false;

                if (!q) return true;
                return (
                    c.name.toLowerCase().includes(q) ||
                    (c.fullName?.toLowerCase().includes(q) ?? false) ||
                    (c.parentName?.toLowerCase().includes(q) ?? false) ||
                    String(c.mnyCategoryId).includes(q)
                );
            })
            .sort((a, b) => (a.fullName ?? a.name).localeCompare(b.fullName ?? b.name));
    });

    // --- Computed: Recurring Bills Inspector ---
    readonly filteredRecurringBills = computed<Array<IMnyRecurringSchedule>>(() => {
        const res = this.parseResult();
        if (!res?.recurringSchedules) return [];
        const q = this.billSearchQuery().trim().toLowerCase();
        if (!q) return res.recurringSchedules;
        return res.recurringSchedules.filter(
            b =>
                b.payee.toLowerCase().includes(q) ||
                (b.accountName?.toLowerCase().includes(q) ?? false) ||
                (b.category?.toLowerCase().includes(q) ?? false) ||
                b.frequencyLabel.toLowerCase().includes(q) ||
                b.paymentMethodLabel.toLowerCase().includes(q)
        );
    });

    // --- Computed: Accounts Inspector ---
    readonly filteredAccounts = computed<Array<IMnyAccount & { transactionCount: number }>>(() => {
        const res = this.parseResult();
        if (!res) return [];

        const txnCounts = new Map<number, number>();
        for (const t of res.transactions) {
            txnCounts.set(t.mnyAccountId, (txnCounts.get(t.mnyAccountId) ?? 0) + 1);
        }

        const statusFilter = this.accountStatusFilter();
        const q = this.accountSearchQuery().trim().toLowerCase();

        return res.accounts
            .map(a => ({
                ...a,
                transactionCount: txnCounts.get(a.mnyAccountId) ?? 0
            }))
            .filter(a => {
                if (statusFilter === 'open' && a.isClosed) return false;
                if (statusFilter === 'closed' && !a.isClosed) return false;
                if (!q) return true;
                return (
                    a.name.toLowerCase().includes(q) ||
                    a.mappedType.toLowerCase().includes(q) ||
                    (a.institutionName?.toLowerCase().includes(q) ?? false) ||
                    String(a.mnyAccountId).includes(q)
                );
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    });

    // --- Actions ---
    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        this.loadFile(file);
    }

    loadFile(file: File): void {
        this.fileName.set(file.name);
        this.fileSize.set(file.size);
        this.unlockError.set(null);
        this.isParsing.set(true);
        this.loadProgressPercent.set(4);
        this.loadStageLabel.set('Reading Microsoft Money file from disk...');
        this.loadCurrentTable.set(null);

        const reader = new FileReader();
        reader.onprogress = (ev: ProgressEvent<FileReader>): void => {
            if (ev.lengthComputable && ev.total > 0) {
                const pct = Math.min(20, Math.max(4, Math.round((ev.loaded / ev.total) * 20)));
                this.loadProgressPercent.set(pct);
            }
        };
        reader.onload = (): void => {
            const buffer = reader.result as ArrayBuffer;
            const bytes = new Uint8Array(buffer);
            this.rawBytes.set(bytes);
            this.loadProgressPercent.set(20);
            this.loadStageLabel.set('Decrypting MSISAM Header & Cataloging Tables...');
            this.runWorkerOrInlineParse(buffer, bytes, this.password(), this.username());
        };
        reader.onerror = (): void => {
            this.isParsing.set(false);
            this.loadProgressPercent.set(0);
            this.loadStageLabel.set('');
            this.unlockError.set('Failed to read selected file from disk.');
        };
        reader.readAsArrayBuffer(file);
    }

    /**
     * Directly loads a Uint8Array buffer (used by unit tests & Storybook stories).
     */
    loadBuffer(
        bytes: Uint8Array,
        name: string = 'Sample.mny',
        password: string = '',
        username: string = ''
    ): void {
        this.fileName.set(name);
        this.fileSize.set(bytes.byteLength);
        this.rawBytes.set(bytes);
        this.password.set(password);
        this.username.set(username);
        this.runParse(bytes, password, username);
    }

    unlockAndParse(): void {
        const bytes = this.rawBytes();
        if (!bytes) return;
        const copyBuffer = bytes.buffer.slice(
            bytes.byteOffset,
            bytes.byteOffset + bytes.byteLength
        ) as ArrayBuffer;
        this.runWorkerOrInlineParse(copyBuffer, bytes, this.password(), this.username());
    }

    private runWorkerOrInlineParse(
        buffer: ArrayBuffer,
        bytes: Uint8Array,
        password: string,
        username: string
    ): void {
        const start = performance.now();

        try {
            const header = this.parser.parseHeader(bytes, password, username);
            if (header.encryptAllPages && !header.passwordVerified) {
                this.requiresUnlock.set(true);
                this.isParsing.set(false);
                this.loadProgressPercent.set(0);
                this.loadStageLabel.set('');
                this.loadCurrentTable.set(null);
                if (password.length > 0) {
                    this.unlockError.set(
                        'Password or Windows Live ID verification failed against MSISAM Page 0.'
                    );
                }
                return;
            }
            this.requiresUnlock.set(false);
        } catch (err: unknown) {
            this.isParsing.set(false);
            this.unlockError.set(
                err instanceof Error ? err.message : 'Unexpected MS Money header error'
            );
            return;
        }

        if (typeof Worker !== 'undefined') {
            try {
                const worker = new Worker(
                    new URL('../../../../workers/mny-import.worker', import.meta.url),
                    { type: 'module' }
                );
                const workerBuffer = buffer.slice(0);
                worker.onmessage = (event: MessageEvent<MnyWorkerOutboundMessage>): void => {
                    const msg = event.data;
                    if (msg.type === 'progress') {
                        const mappedPct = Math.min(
                            94,
                            Math.max(20, 15 + Math.round(msg.percent * 0.8))
                        );
                        this.loadProgressPercent.set(mappedPct);
                        this.loadStageLabel.set(this.formatParseStageLabel(msg.stage));
                        this.loadCurrentTable.set(msg.currentTable ?? null);
                    } else if (msg.type === 'parse_complete') {
                        worker.terminate();
                        this.finalizeParseResult(msg.result, start);
                    } else if (msg.type === 'error') {
                        worker.terminate();
                        this.unlockError.set(msg.message);
                        this.isParsing.set(false);
                    }
                };
                worker.onerror = (): void => {
                    worker.terminate();
                    this.runParse(bytes, password, username);
                };
                const req: MnyWorkerInboundMessage = {
                    type: 'parse',
                    buffer: workerBuffer,
                    password,
                    username: username || undefined
                };
                worker.postMessage(req, [workerBuffer]);
                return;
            } catch {
                // Fall back to inline parse if Worker instantiation is unavailable
            }
        }

        this.runParse(bytes, password, username);
    }

    private finalizeParseResult(result: IMnyParseResult, start: number): void {
        this.parseResult.set(result);
        this.loadProgressPercent.set(96);
        this.loadStageLabel.set('AI Reconciling Payees & Categories...');
        this.loadCurrentTable.set('PAY / CAT');
        void this.aiEnhancer.enhanceAll(result.payees, result.categories);

        if (result.tables.length > 0) {
            const defaultTable =
                result.tables.find(t => t.name === 'ACCT')?.name ?? result.tables[0]?.name ?? '';
            this.selectedTableName.set(defaultTable);
        }
        this.loadProgressPercent.set(100);
        this.loadStageLabel.set('Complete');
        this.loadCurrentTable.set(null);
        this.parseDurationMs.set(Math.round((performance.now() - start) * 100) / 100);
        this.isParsing.set(false);
    }

    private runParse(bytes: Uint8Array, password: string, username: string): void {
        this.isParsing.set(true);
        this.unlockError.set(null);
        this.loadProgressPercent.set(Math.max(this.loadProgressPercent(), 10));
        this.loadStageLabel.set('Decrypting MSISAM Header...');
        const start = performance.now();

        try {
            const header = this.parser.parseHeader(bytes, password, username);
            if (header.encryptAllPages && !header.passwordVerified) {
                this.requiresUnlock.set(true);
                this.isParsing.set(false);
                this.loadProgressPercent.set(0);
                this.loadStageLabel.set('');
                this.loadCurrentTable.set(null);
                if (password.length > 0) {
                    this.unlockError.set(
                        'Password or Windows Live ID verification failed against MSISAM Page 0.'
                    );
                }
                return;
            }

            this.requiresUnlock.set(false);
            const result = this.parser.parse(
                bytes,
                password,
                (stage: string, pct: number, table?: string) => {
                    this.loadProgressPercent.set(Math.min(95, Math.max(15, pct)));
                    this.loadStageLabel.set(this.formatParseStageLabel(stage));
                    this.loadCurrentTable.set(table ?? null);
                },
                username
            );
            this.finalizeParseResult(result, start);
        } catch (err: unknown) {
            this.unlockError.set(
                err instanceof Error ? err.message : 'Unexpected MS Money parse error'
            );
            this.isParsing.set(false);
        }
    }

    private formatParseStageLabel(stage: string): string {
        switch (stage) {
            case 'decrypting_header':
                return 'Decrypting MSISAM Header...';
            case 'reading_catalog':
                return 'Scanning MSysObjects Catalog...';
            case 'extracting_categories':
                return 'Extracting Categories...';
            case 'extracting_accounts':
                return 'Extracting Accounts & Loan Metadata...';
            case 'extracting_payees':
                return 'Extracting Payees...';
            case 'extracting_transactions':
                return 'Extracting Transactions, Splits & Recurring Bills...';
            case 'complete':
                return 'Finalizing Inspection...';
            default:
                return 'Parsing Microsoft Money Database...';
        }
    }

    selectTable(tableName: string): void {
        this.selectedTableName.set(tableName);
        this.rawRowPage.set(0);
        this.rawRowSearchQuery.set('');
        this.schemaColumnSearchQuery.set('');
        this.selectedRowIndex.set(null);
    }

    isProcessingTable(tableName: string): boolean {
        return !PRIMARY_ENTITY_TABLES.has(tableName.toUpperCase());
    }

    toggleProcessingTables(): void {
        this.showProcessingTables.update(v => !v);
    }

    jumpToRawTable(tableName: string): void {
        this.selectedTableName.set(tableName);
        this.rawRowPage.set(0);
        this.rawRowSearchQuery.set('');
        this.schemaColumnSearchQuery.set('');
        this.selectedRowIndex.set(null);
        this.activeTab.set(MnyInspectorTab.Tables);
    }

    formatColumnType(colType: MnyColumnType): string {
        return MnyColumnType[colType] ?? `Unknown(${colType})`;
    }

    formatDuration(ms: number): string {
        if (!Number.isFinite(ms) || ms <= 0) return '0 ms';
        if (ms < 1) return '< 1 ms';
        if (ms < 100) return `${Number(ms.toFixed(1))} ms`;
        if (ms < 1000) return `${Math.round(ms)} ms`;
        if (ms < 60_000) {
            return `${(ms / 1000).toFixed(2)} s`;
        }
        const mins = Math.floor(ms / 60_000);
        const remSecs = Number(((ms % 60_000) / 1000).toFixed(1));
        return `${mins}m ${remSecs}s`;
    }

    formatCents(cents: number): string {
        const sign = cents < 0 ? '-' : '';
        const abs = Math.abs(cents) / 100;
        return `${sign}$${abs.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }

    formatCellValue(value: MnyCellValue): string {
        if (value === null || value === undefined) return 'NULL';
        if (typeof value === 'boolean') return value ? 'true' : 'false';
        return String(value);
    }

    generateDiagnosticMarkdown(): string {
        const res = this.parseResult();
        const stats = this.overviewStats();
        if (!res || !stats) return '# MS Money Diagnostic Report\nNo file loaded.';

        let md = `# MS Money Forensic Diagnostic Report\n`;
        md += `**File**: \`${this.fileName()}\` (${(this.fileSize() / 1024).toFixed(1)} KB)\n`;
        md += `**Parse Duration**: ${this.formatDuration(this.parseDurationMs())}\n\n`;

        if (res.header) {
            md += `## 1. MSISAM Header Metadata\n`;
            md += `- **Signature**: \`${res.header.signature}\`\n`;
            md += `- **Format Version**: \`${res.header.formatVersion}\` (Build \`${res.header.buildVersion}\`)\n`;
            md += `- **CodePage / LCID**: \`${res.header.codePage}\` / \`0x${res.header.lcid.toString(16)}\`\n`;
            md += `- **Encryption Mode**: \`${res.header.encryptionMode}\` (SHA1: \`${res.header.isSha1}\`, 128-bit: \`${res.header.is128Bit}\`, EncryptAllPages: \`${res.header.encryptAllPages}\`)\n\n`;
        }

        md += `## 2. Entity & Reconciliation Summary\n`;
        md += `- **MSISAM Catalog Tables**: ${stats.totalTables}\n`;
        md += `- **Accounts**: ${stats.totalAccounts} (${stats.openAccounts} Open, ${stats.closedAccounts} Closed)\n`;
        md += `- **Categories**: ${stats.totalCategories} (${stats.visibleCategories} Visible, ${stats.hiddenCategories} Hidden)\n`;
        md += `- **Payees (Raw ` + '`PAY`' + `)**: ${stats.totalPayees}\n`;
        md += `  - Primary Visible (\`fHidden=false\`): ${stats.primaryPayees}\n`;
        md += `  - Hidden Child Aliases (\`hpayParent\`): ${stats.hiddenAliasPayees}\n`;
        md += `  - Hidden Statement-Upload Payees: ${stats.statementUploadPayees}\n`;
        md += `  - Orphan Hidden Payees (0 txns): ${stats.orphanHiddenPayees}\n`;
        md += `  - Reconciled Canonical Payee Groups: ${stats.reconciledPayeeGroups}\n`;
        md += `  - Ignored Numeric/Noise Payees: ${stats.ignoredNumericPayees}\n`;
        md += `- **Transactions**: ${stats.totalTransactions}\n`;
        md += `- **Active Recurring Bills (\`BILL\`)**: ${stats.totalRecurringBills}\n`;

        return md;
    }

    async copyDiagnosticReport(): Promise<void> {
        const md = this.generateDiagnosticMarkdown();
        await navigator.clipboard.writeText(md);
        this.showCopyToast('Diagnostic Markdown copied to clipboard');
    }

    async copySelectedTableJson(): Promise<void> {
        const inspection = this.selectedTableInspection();
        const payload = {
            table: inspection.table,
            tdef: inspection.tdef,
            rowCount: inspection.rows.length,
            sampleRows: this.filteredRawTableRows().slice(0, 250)
        };
        await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
        this.showCopyToast(`Copied ${inspection.table?.name ?? 'table'} JSON to clipboard`);
    }

    private showCopyToast(msg: string): void {
        this.copySuccessMessage.set(msg);
        setTimeout(() => {
            this.copySuccessMessage.set(null);
        }, 2500);
    }
}
