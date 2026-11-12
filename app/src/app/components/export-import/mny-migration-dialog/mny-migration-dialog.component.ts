import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    model,
    signal,
    type WritableSignal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ProgressBarModule } from 'primeng/progressbar';
import { AccountType, Frequency, type IAutoLoanMetadata } from '../../../core/domain/types';
import type {
    IMnyAccount,
    IMnyCategory,
    IMnyPayee,
    IMnyRecurringSchedule
} from '../../../core/parsers/MNYParser';
import {
    AccountAugmentationService,
    AccountHealthStatus,
    type IAccountAiAssessment
} from '../../../services/import-export/account-augmentation.service';
import {
    AiMnyEnhancerService,
    type IAiAccountTypeClassification,
    type IReconciledPayeeGroup
} from '../../../services/import-export/ai-mny-enhancer.service';
import { MnyMigrationService } from '../../../services/import-export/mny-migration.service';
import {
    MnyMigrationMode,
    MnyParseStage,
    type IMnyCategoryNode,
    type IMnyMigrationOptions
} from '../../../services/import-export/mny-migration.types';
import { AppShellComponent } from '../../layout/app-shell/app-shell.component';
import { AccountAugmentationBannerComponent } from '../../ledger/account-augmentation-banner/account-augmentation-banner.component';

export type MnyDomainTab = 'accounts' | 'categories' | 'payees' | 'recurring' | 'options';

export interface IMnyAccountTypeGroup {
    accountType: AccountType;
    groupTitle: string;
    groupIcon: string;
    accounts: Array<IMnyAccount>;
    selectedCount: number;
    totalCount: number;
    aiClassifiedCount: number;
}

export interface IMnyCategoryGroup {
    type: 'Income' | 'Expense';
    nodes: Array<IMnyCategoryNode>;
    selectedCount: number;
    totalCount: number;
}

export interface IMnyPayeeAccountGroup {
    groupKey: string;
    groupTitle: string;
    groupSubtitle: string;
    isPrimaryGroup: boolean;
    payees: Array<IReconciledPayeeGroup>;
    selectedCount: number;
    totalCount: number;
}

@Component({
    selector: 'app-mny-migration-dialog',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        DialogModule,
        ButtonModule,
        ProgressBarModule,
        CheckboxModule,
        PasswordModule,
        InputTextModule,
        AppShellComponent,
        AccountAugmentationBannerComponent
    ],
    templateUrl: './mny-migration-dialog.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MnyMigrationDialogComponent {
    /** Two-way Angular 21 Signal Model binding for dialog/page visibility */
    readonly visible = model<boolean>(false);

    readonly migrationService = inject(MnyMigrationService);
    readonly aiEnhancer = inject(AiMnyEnhancerService, { optional: true });
    readonly augmentationService = inject(AccountAugmentationService, { optional: true });
    readonly hasActivatedRoute = Boolean(inject(ActivatedRoute, { optional: true }));
    private readonly router = inject(Router);

    constructor() {
        if (this.hasActivatedRoute && !this.migrationService.isOpen()) {
            this.migrationService.open();
        }
        effect(() => {
            const isServiceOpen = this.migrationService.isOpen();
            if (isServiceOpen !== this.visible()) {
                this.visible.set(isServiceOpen);
            }
        });
    }

    // Dialog / Page state
    readonly activeTab: WritableSignal<MnyDomainTab> = signal<MnyDomainTab>('accounts');
    readonly collapsedAccountTypeGroups: WritableSignal<Set<AccountType>> = signal<
        Set<AccountType>
    >(new Set<AccountType>());
    readonly payeeViewMode: WritableSignal<'grouped' | 'flat'> = signal<'grouped' | 'flat'>(
        'grouped'
    );
    readonly collapsedPayeeGroups: WritableSignal<Set<string>> = signal<Set<string>>(
        new Set<string>()
    );
    readonly expandedStatementPayeeGroups: WritableSignal<Set<string>> = signal<Set<string>>(
        new Set<string>()
    );
    readonly categorySearchQuery: WritableSignal<string> = signal<string>('');
    readonly payeeSearchQuery: WritableSignal<string> = signal<string>('');
    readonly passwordInput: WritableSignal<string> = signal<string>('');
    readonly usernameInput: WritableSignal<string> = signal<string>('');
    readonly isLiveIdMode: WritableSignal<boolean> = signal<boolean>(false);
    readonly isDragging: WritableSignal<boolean> = signal<boolean>(false);
    readonly isVerifyingPassword: WritableSignal<boolean> = signal<boolean>(false);
    readonly isMigrating: WritableSignal<boolean> = signal<boolean>(false);

    // Expose enums to template
    readonly MnyMigrationMode = MnyMigrationMode;
    readonly MnyParseStage = MnyParseStage;
    readonly AccountHealthStatus = AccountHealthStatus;

    // Derived service state
    readonly step = this.migrationService.step;
    readonly isOpen = this.migrationService.isOpen;
    readonly file = this.migrationService.file;
    readonly header = this.migrationService.header;
    readonly parseResult = this.migrationService.parseResult;
    readonly options = this.migrationService.options;
    readonly progressStage = this.migrationService.progressStage;
    readonly progressPercent = this.migrationService.progressPercent;
    readonly currentTable = this.migrationService.currentTable;
    readonly auditReport = this.migrationService.auditReport;
    readonly errorMessage = this.migrationService.errorMessage;

    /**
     * True when the file was inspected and unlocked without requiring a password
     * (i.e. Step 2: Unlock was automatically bypassed / not needed).
     */
    readonly isUnlockSkipped = computed<boolean>(() => {
        const s = this.step();
        if (s === 'drop' || s === 'unlock') {
            return false;
        }
        const pwdRequired = this.migrationService.passwordRequired?.() ?? false;
        return !pwdRequired;
    });

    /**
     * Visible accounts:
     * - When includeClosedAccounts is false: closed accounts are completely removed.
     * - When includeClosedAccounts is true: open accounts appear first sorted asc,
     *   followed by closed accounts also sorted asc.
     */
    readonly visibleAccounts = computed<Array<IMnyAccount>>(() => {
        const accounts = this.parseResult()?.accounts ?? [];
        const includeClosed = this.options().includeClosedAccounts;

        const openAccounts = accounts
            .filter((a: IMnyAccount): boolean => !a.isClosed)
            .sort((a: IMnyAccount, b: IMnyAccount): number =>
                a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
            );

        if (!includeClosed) {
            return openAccounts;
        }

        const closedAccounts = accounts
            .filter((a: IMnyAccount): boolean => a.isClosed)
            .sort((a: IMnyAccount, b: IMnyAccount): number =>
                a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
            );

        return [...openAccounts, ...closedAccounts];
    });

    readonly accountTxCountById = computed<Map<number, number>>(() => {
        const counts = new Map<number, number>();
        for (const tx of this.parseResult()?.transactions ?? []) {
            counts.set(tx.mnyAccountId, (counts.get(tx.mnyAccountId) ?? 0) + 1);
        }
        return counts;
    });

    getAccountTxCount(mnyAccountId: number): number {
        return this.accountTxCountById().get(mnyAccountId) ?? 0;
    }

    getAutoLoanMetadata(acct: IMnyAccount): IAutoLoanMetadata | null {
        const meta = acct.loanDetails?.metadata;
        if (!meta) return null;
        if ('vehicleMake' in meta || 'vehicleModel' in meta || 'vehicleYear' in meta) {
            return meta as IAutoLoanMetadata;
        }
        return null;
    }

    readonly selectedVisibleAccountsCount = computed<number>(() => {
        const selected = new Set<number>(this.options().selectedAccountIds);
        return this.visibleAccounts().filter((a: IMnyAccount): boolean =>
            selected.has(a.mnyAccountId)
        ).length;
    });

    readonly allVisibleAccountsSelected = computed<boolean>(() => {
        const visible = this.visibleAccounts();
        if (visible.length === 0) return false;
        const selected = new Set<number>(this.options().selectedAccountIds);
        return visible.every((a: IMnyAccount): boolean => selected.has(a.mnyAccountId));
    });

    readonly totalAccountsCount = computed<number>(() => {
        return this.parseResult()?.accounts.length ?? 0;
    });

    readonly selectedAccountsCount = computed<number>(() => {
        return this.options().selectedAccountIds.length;
    });

    getAccountAiClassification(acct: IMnyAccount): IAiAccountTypeClassification | undefined {
        if (!this.aiEnhancer) return undefined;
        return this.aiEnhancer.classifyAccountType(acct);
    }

    getEffectiveAccountType(acct: IMnyAccount): AccountType {
        return this.getAccountAiClassification(acct)?.accountType ?? acct.mappedType;
    }

    /**
     * Visible accounts grouped by Path Logic AccountType (`Checking`, `Savings`, `Credit`,
     * `Mortgage`, `AutoLoan`, `PersonalLoan`, `Cash`), using AI account classification
     * when available.
     */
    readonly accountTypeGroups = computed<Array<IMnyAccountTypeGroup>>(() => {
        const accounts = this.visibleAccounts();
        if (accounts.length === 0) return [];

        const selectedSet = new Set<number>(this.options().selectedAccountIds);
        const typeOrder: Array<{
            type: AccountType;
            title: string;
            icon: string;
        }> = [
            {
                type: AccountType.Checking,
                title: 'Checking Accounts',
                icon: 'pi-wallet'
            },
            {
                type: AccountType.Savings,
                title: 'Savings & Investment Accounts',
                icon: 'pi-building-columns'
            },
            {
                type: AccountType.Credit,
                title: 'Credit Cards & Lines of Credit',
                icon: 'pi-credit-card'
            },
            {
                type: AccountType.Mortgage,
                title: 'Mortgages & Real Estate Loans',
                icon: 'pi-home'
            },
            {
                type: AccountType.AutoLoan,
                title: 'Auto & Vehicle Loans',
                icon: 'pi-car'
            },
            {
                type: AccountType.PersonalLoan,
                title: 'Personal & Other Loans',
                icon: 'pi-briefcase'
            },
            {
                type: AccountType.Cash,
                title: 'Cash & Petty Cash Accounts',
                icon: 'pi-money-bill'
            }
        ];

        const buckets = new Map<
            AccountType,
            { accounts: Array<IMnyAccount>; aiClassifiedCount: number }
        >();
        for (const acct of accounts) {
            const classification = this.getAccountAiClassification(acct);
            const effectiveType = classification?.accountType ?? acct.mappedType;
            const existing = buckets.get(effectiveType);
            if (existing) {
                existing.accounts.push(acct);
                if (classification?.aiClassified) {
                    existing.aiClassifiedCount++;
                }
            } else {
                buckets.set(effectiveType, {
                    accounts: [acct],
                    aiClassifiedCount: classification?.aiClassified ? 1 : 0
                });
            }
        }

        const groups: Array<IMnyAccountTypeGroup> = [];
        for (const meta of typeOrder) {
            const bucket = buckets.get(meta.type);
            if (!bucket || bucket.accounts.length === 0) continue;
            groups.push({
                accountType: meta.type,
                groupTitle: meta.title,
                groupIcon: meta.icon,
                accounts: bucket.accounts,
                selectedCount: bucket.accounts.filter((a: IMnyAccount): boolean =>
                    selectedSet.has(a.mnyAccountId)
                ).length,
                totalCount: bucket.accounts.length,
                aiClassifiedCount: bucket.aiClassifiedCount
            });
        }

        return groups;
    });

    isAccountTypeGroupCollapsed(accountType: AccountType): boolean {
        return this.collapsedAccountTypeGroups().has(accountType);
    }

    toggleAccountTypeGroupCollapse(accountType: AccountType): void {
        const next = new Set<AccountType>(this.collapsedAccountTypeGroups());
        if (next.has(accountType)) {
            next.delete(accountType);
        } else {
            next.add(accountType);
        }
        this.collapsedAccountTypeGroups.set(next);
    }

    isAccountTypeGroupAllSelected(accountType: AccountType): boolean {
        const group = this.accountTypeGroups().find(
            (g: IMnyAccountTypeGroup): boolean => g.accountType === accountType
        );
        if (!group || group.accounts.length === 0) return false;
        const selected = new Set<number>(this.options().selectedAccountIds);
        return group.accounts.every((a: IMnyAccount): boolean => selected.has(a.mnyAccountId));
    }

    toggleAccountTypeGroup(accountType: AccountType): void {
        const group = this.accountTypeGroups().find(
            (g: IMnyAccountTypeGroup): boolean => g.accountType === accountType
        );
        if (!group) return;
        const groupIds = group.accounts.map((a: IMnyAccount): number => a.mnyAccountId);
        const groupIdSet = new Set<number>(groupIds);
        const allSelected = this.isAccountTypeGroupAllSelected(accountType);

        this.migrationService.options.update((opt: IMnyMigrationOptions): IMnyMigrationOptions => {
            const updated = allSelected
                ? opt.selectedAccountIds.filter((id: number): boolean => !groupIdSet.has(id))
                : Array.from(new Set<number>([...opt.selectedAccountIds, ...groupIds]));
            return { ...opt, selectedAccountIds: updated };
        });
    }

    readonly hiddenCategoriesCount = computed<number>(() => {
        const categories = this.parseResult()?.categories ?? [];
        return categories.filter((c: IMnyCategory): boolean => Boolean(c.isHidden)).length;
    });

    /**
     * Categories organized into nested hierarchy, grouped into Income and Expense,
     * and sorted in ascending alphabetical order within each level.
     */
    readonly categoryTreeGroups = computed<Array<IMnyCategoryGroup>>(() => {
        const categories = this.parseResult()?.categories ?? [];
        if (categories.length === 0) return [];
        const includeHidden = Boolean(this.options().includeHiddenCategories);

        const catById = new Map<number, IMnyCategory>();
        for (const c of categories) {
            catById.set(c.mnyCategoryId, c);
        }

        // Determine group ('Income' | 'Expense') for every category via ancestor traversal
        const groupOfCat = new Map<number, 'Income' | 'Expense'>();
        const findGroup = (id: number, visited = new Set<number>()): 'Income' | 'Expense' => {
            const cached = groupOfCat.get(id);
            if (cached) return cached;
            if (visited.has(id)) return 'Expense';
            visited.add(id);

            const cat = catById.get(id);
            if (!cat) return 'Expense';

            const upperName = cat.name.toUpperCase();
            if (upperName === 'INCOME' || cat.categoryType === 1 || cat.mnyCategoryId === 130) {
                groupOfCat.set(id, 'Income');
                return 'Income';
            }
            if (upperName === 'EXPENSE' || cat.categoryType === 2 || cat.mnyCategoryId === 131) {
                groupOfCat.set(id, 'Expense');
                return 'Expense';
            }

            if (cat.parentCategoryId !== null && cat.parentCategoryId !== undefined) {
                const parentGrp = findGroup(cat.parentCategoryId, visited);
                groupOfCat.set(id, parentGrp);
                return parentGrp;
            }

            const grp = cat.categoryType === 1 ? 'Income' : 'Expense';
            groupOfCat.set(id, grp);
            return grp;
        };

        for (const c of categories) {
            findGroup(c.mnyCategoryId);
        }

        const isRootContainer = (c: IMnyCategory): boolean => {
            const u = c.name.toUpperCase();
            return (
                (c.parentCategoryId === null || c.parentCategoryId === undefined) &&
                (u === 'INCOME' ||
                    u === 'EXPENSE' ||
                    c.mnyCategoryId === 130 ||
                    c.mnyCategoryId === 131)
            );
        };

        const effectiveParentId = (c: IMnyCategory): number | null => {
            if (c.parentCategoryId === null || c.parentCategoryId === undefined) return null;
            const parent = catById.get(c.parentCategoryId);
            if (!parent || isRootContainer(parent)) return null;
            return c.parentCategoryId;
        };

        const incomeCats: Array<IMnyCategory> = [];
        const expenseCats: Array<IMnyCategory> = [];

        for (const c of categories) {
            if (isRootContainer(c)) continue;
            if (!includeHidden && c.isHidden) continue;
            const grp = groupOfCat.get(c.mnyCategoryId) ?? 'Expense';
            if (grp === 'Income') {
                incomeCats.push(c);
            } else {
                expenseCats.push(c);
            }
        }

        const buildTreeNodes = (
            cats: Array<IMnyCategory>,
            group: 'Income' | 'Expense'
        ): Array<IMnyCategoryNode> => {
            const childrenMap = new Map<number | null, Array<IMnyCategory>>();
            for (const c of cats) {
                const pid = effectiveParentId(c);
                const existingList = childrenMap.get(pid);
                if (existingList) {
                    existingList.push(c);
                } else {
                    childrenMap.set(pid, [c]);
                }
            }

            for (const list of childrenMap.values()) {
                list.sort((a, b) =>
                    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
                );
            }

            const nodes: Array<IMnyCategoryNode> = [];
            const countDescendants = (id: number): number => {
                const sub = childrenMap.get(id) ?? [];
                let total = sub.length;
                for (const s of sub) {
                    total += countDescendants(s.mnyCategoryId);
                }
                return total;
            };

            const traverse = (parentId: number | null, depth: number): void => {
                const children = childrenMap.get(parentId) ?? [];
                for (const child of children) {
                    const immediateChildren = childrenMap.get(child.mnyCategoryId) ?? [];
                    const cleanedName = this.aiEnhancer
                        ? this.aiEnhancer.getEnhancedCategoryName(child.name)
                        : child.name;

                    nodes.push({
                        id: child.mnyCategoryId,
                        name: child.name,
                        fullName: child.fullName,
                        cleanedName: cleanedName !== child.name ? cleanedName : undefined,
                        level: depth,
                        parentCategoryId: child.parentCategoryId,
                        group,
                        hasChildren: immediateChildren.length > 0,
                        childCount: countDescendants(child.mnyCategoryId),
                        isHidden: child.isHidden
                    });

                    traverse(child.mnyCategoryId, depth + 1);
                }
            };

            traverse(null, 0);

            const traversedIds = new Set<number>(nodes.map((n: IMnyCategoryNode): number => n.id));
            const orphans = cats.filter(
                (c: IMnyCategory): boolean => !traversedIds.has(c.mnyCategoryId)
            );
            orphans.sort((a, b) =>
                a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
            );
            for (const orphan of orphans) {
                const cleanedName = this.aiEnhancer
                    ? this.aiEnhancer.getEnhancedCategoryName(orphan.name)
                    : orphan.name;
                nodes.push({
                    id: orphan.mnyCategoryId,
                    name: orphan.name,
                    fullName: orphan.fullName,
                    cleanedName: cleanedName !== orphan.name ? cleanedName : undefined,
                    level: 0,
                    parentCategoryId: orphan.parentCategoryId,
                    group,
                    hasChildren: false,
                    childCount: 0,
                    isHidden: orphan.isHidden
                });
            }

            return nodes;
        };

        const incomeNodes = buildTreeNodes(incomeCats, 'Income');
        const expenseNodes = buildTreeNodes(expenseCats, 'Expense');

        const selectedSet = new Set<number>(this.options().selectedCategoryIds);

        return [
            {
                type: 'Income',
                nodes: incomeNodes,
                selectedCount: incomeNodes.filter((n: IMnyCategoryNode): boolean =>
                    selectedSet.has(n.id)
                ).length,
                totalCount: incomeNodes.length
            },
            {
                type: 'Expense',
                nodes: expenseNodes,
                selectedCount: expenseNodes.filter((n: IMnyCategoryNode): boolean =>
                    selectedSet.has(n.id)
                ).length,
                totalCount: expenseNodes.length
            }
        ];
    });

    readonly selectedCategoriesCount = computed<number>(() => {
        const groups = this.categoryTreeGroups();
        return groups.reduce(
            (acc: number, g: IMnyCategoryGroup): number => acc + g.selectedCount,
            0
        );
    });

    readonly accountAssessments = computed<Map<number, IAccountAiAssessment>>(() => {
        const res = this.parseResult();
        if (!res || !this.augmentationService) {
            return new Map<number, IAccountAiAssessment>();
        }
        return this.augmentationService.analyzeMnyPreview(res);
    });

    readonly totalCategoriesCount = computed<number>(() => {
        const groups = this.categoryTreeGroups();
        return groups.reduce((acc: number, g: IMnyCategoryGroup): number => acc + g.totalCount, 0);
    });

    readonly filteredCategoryTreeGroups = computed<Array<IMnyCategoryGroup>>(() => {
        const q = this.categorySearchQuery().trim().toLowerCase();
        const groups = this.categoryTreeGroups();
        if (!q) return groups;
        return groups
            .map((g: IMnyCategoryGroup): IMnyCategoryGroup => {
                const matchingNodes = g.nodes.filter(
                    (n: IMnyCategoryNode): boolean =>
                        n.name.toLowerCase().includes(q) ||
                        (n.fullName?.toLowerCase().includes(q) ?? false) ||
                        (n.cleanedName?.toLowerCase().includes(q) ?? false)
                );
                return {
                    ...g,
                    nodes: matchingNodes
                };
            })
            .filter((g: IMnyCategoryGroup): boolean => g.nodes.length > 0);
    });

    /**
     * Payees sorted in ascending alphabetical order, with AI-cleaned names and
     * duplicate / near-duplicate reconciliation pre-computed.
     */
    readonly sortedPayees = computed<Array<IReconciledPayeeGroup>>(() => {
        const payees = this.parseResult()?.payees ?? [];
        if (payees.length === 0) return [];

        if (this.options().aiEnhancePayees && this.aiEnhancer) {
            return this.aiEnhancer.reconcilePayees(payees);
        }

        const parentIdsReferenced = new Set<number>(
            payees
                .map((p: IMnyPayee) => p.parentPayeeId)
                .filter((pid): pid is number => pid !== null && pid !== undefined)
        );
        const activePayees = payees.filter((p: IMnyPayee): boolean => {
            if (
                p.isHidden === true &&
                !p.parentPayeeId &&
                (p.transactionCount ?? 0) === 0 &&
                (p.accountIds?.length ?? 0) === 0 &&
                !parentIdsReferenced.has(p.mnyPayeeId)
            ) {
                return false;
            }
            return true;
        });

        const sorted = [...activePayees].sort((a: IMnyPayee, b: IMnyPayee): number =>
            a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        );

        return sorted.map((p: IMnyPayee): IReconciledPayeeGroup => {
            const cleaned = this.aiEnhancer ? this.aiEnhancer.getEnhancedPayeeName(p.name) : p.name;
            return {
                mnyPayeeId: p.mnyPayeeId,
                name: p.name,
                canonicalName: p.name,
                cleanedName: cleaned !== p.name ? cleaned : undefined,
                mergedPayeeIds: [p.mnyPayeeId],
                mergedOriginalNames: [p.name],
                mergedCount: 1,
                isReconciledDuplicate: false,
                accountIds: p.accountIds ?? [],
                accountNames: p.accountNames ?? [],
                hasPrimaryPayee: p.isHidden !== true,
                transactionCount: p.transactionCount ?? 0
            };
        });
    });

    readonly primaryPayeeGroupsCount = computed<number>(() => {
        return this.sortedPayees().filter(
            (p: IReconciledPayeeGroup): boolean => p.hasPrimaryPayee !== false
        ).length;
    });

    readonly filteredFlatPayees = computed<Array<IReconciledPayeeGroup>>(() => {
        const q = this.payeeSearchQuery().trim().toLowerCase();
        const list = this.sortedPayees();
        if (!q) return list;
        return list.filter(
            (p: IReconciledPayeeGroup): boolean =>
                p.canonicalName.toLowerCase().includes(q) ||
                p.name.toLowerCase().includes(q) ||
                (p.cleanedName?.toLowerCase().includes(q) ?? false) ||
                p.mergedOriginalNames.some((orig: string): boolean =>
                    orig.toLowerCase().includes(q)
                ) ||
                (p.accountNames?.some((an: string): boolean => an.toLowerCase().includes(q)) ??
                    false)
        );
    });

    /**
     * Payees grouped into:
     * 1. MS Money Primary Payees (`fHidden === false` — the active canonical payees visible in MS Money's Payees screen)
     * 2. Per-Account Statement-Upload Payees (`fHidden === true` payees grouped by the account they originate from)
     */
    readonly payeeAccountGroups = computed<Array<IMnyPayeeAccountGroup>>(() => {
        const groups = this.sortedPayees();
        if (groups.length === 0) return [];

        const selectedSet = new Set<number>(this.options().selectedPayeeIds);
        const primaryPayees: Array<IReconciledPayeeGroup> = [];
        const byAccount = new Map<string, Array<IReconciledPayeeGroup>>();

        for (const p of groups) {
            if (p.hasPrimaryPayee !== false) {
                primaryPayees.push(p);
            } else {
                const originAccount =
                    p.accountNames && p.accountNames.length > 0
                        ? (p.accountNames[0] ?? 'Other Statement Uploads')
                        : 'Unassigned Statement Payees';
                const list = byAccount.get(originAccount);
                if (list) {
                    list.push(p);
                } else {
                    byAccount.set(originAccount, [p]);
                }
            }
        }

        const result: Array<IMnyPayeeAccountGroup> = [];
        if (primaryPayees.length > 0) {
            result.push({
                groupKey: '__primary__',
                groupTitle: 'MS Money Primary Payees (Active List)',
                groupSubtitle:
                    'Canonical payees shown in Microsoft Money Payees view, reconciled with their child aliases',
                isPrimaryGroup: true,
                payees: primaryPayees,
                selectedCount: primaryPayees.filter((p: IReconciledPayeeGroup): boolean =>
                    selectedSet.has(p.mnyPayeeId)
                ).length,
                totalCount: primaryPayees.length
            });
        }

        const sortedAccountNames = Array.from(byAccount.keys()).sort((a: string, b: string) =>
            a.localeCompare(b, undefined, { sensitivity: 'base' })
        );

        for (const acctName of sortedAccountNames) {
            const acctPayees = byAccount.get(acctName) ?? [];
            result.push({
                groupKey: `acct::${acctName}`,
                groupTitle: `${acctName}`,
                groupSubtitle: 'Statement-upload payees originating from this account',
                isPrimaryGroup: false,
                payees: acctPayees,
                selectedCount: acctPayees.filter((p: IReconciledPayeeGroup): boolean =>
                    selectedSet.has(p.mnyPayeeId)
                ).length,
                totalCount: acctPayees.length
            });
        }

        return result;
    });

    readonly filteredPayeeAccountGroups = computed<Array<IMnyPayeeAccountGroup>>(() => {
        const q = this.payeeSearchQuery().trim().toLowerCase();
        const groups = this.payeeAccountGroups();
        if (!q) return groups;
        return groups
            .map((g: IMnyPayeeAccountGroup): IMnyPayeeAccountGroup => {
                if (g.groupTitle.toLowerCase().includes(q)) return g;
                const matchingPayees = g.payees.filter(
                    (p: IReconciledPayeeGroup): boolean =>
                        p.canonicalName.toLowerCase().includes(q) ||
                        p.name.toLowerCase().includes(q) ||
                        (p.cleanedName?.toLowerCase().includes(q) ?? false) ||
                        p.mergedOriginalNames.some((orig: string): boolean =>
                            orig.toLowerCase().includes(q)
                        )
                );
                return {
                    ...g,
                    payees: matchingPayees
                };
            })
            .filter((g: IMnyPayeeAccountGroup): boolean => g.payees.length > 0);
    });

    /**
     * Number of pure numeric / reference-code payee rows ignored by AI reconciliation.
     */
    readonly ignoredNumericPayeesCount = computed<number>(() => {
        if (!this.options().aiEnhancePayees || !this.aiEnhancer) return 0;
        // Trigger dependency on sortedPayees so signal updates after reconciliation
        void this.sortedPayees();
        return this.aiEnhancer.ignoredNumericPayeeCount();
    });

    /**
     * Number of duplicate / near-duplicate payee records consolidated by AI reconciliation.
     */
    readonly reconciledDuplicatesCount = computed<number>(() => {
        if (!this.options().aiEnhancePayees) return 0;
        const rawTotal = this.parseResult()?.payees.length ?? 0;
        const canonicalTotal = this.sortedPayees().length;
        return Math.max(0, rawTotal - canonicalTotal);
    });

    /**
     * Number of categories standardized by AI harmonization.
     */
    readonly harmonizedCategoriesCount = computed<number>(() => {
        if (!this.options().aiEnhanceCategories) return 0;
        const groups = this.categoryTreeGroups();
        let count = 0;
        for (const g of groups) {
            for (const n of g.nodes) {
                if (n.cleanedName) count++;
            }
        }
        return count;
    });

    /**
     * Number of cross-account augmentation links detected by AI preview analysis.
     */
    readonly previewAugmentableLinksCount = computed<number>(() => {
        let count = 0;
        for (const assessment of this.accountAssessments().values()) {
            count += assessment.canBeAugmentedFromNames.length;
        }
        return count;
    });

    readonly selectedPayeesCount = computed<number>(() => {
        return this.options().selectedPayeeIds.length;
    });

    readonly totalPayeesCount = computed<number>(() => {
        return this.parseResult()?.payees.length ?? 0;
    });

    readonly selectedPayeeGroupsCount = computed<number>(() => {
        const selected = new Set<number>(this.options().selectedPayeeIds);
        return this.sortedPayees().filter((p: IReconciledPayeeGroup): boolean =>
            selected.has(p.mnyPayeeId)
        ).length;
    });

    readonly totalPayeeGroupsCount = computed<number>(() => {
        return this.sortedPayees().length;
    });

    /**
     * Active recurring bills and deposits extracted from MS Money BILL table.
     */
    readonly visibleRecurringSchedules = computed<Array<IMnyRecurringSchedule>>(() => {
        const schedules = this.parseResult()?.recurringSchedules ?? [];
        return [...schedules].sort((a: IMnyRecurringSchedule, b: IMnyRecurringSchedule): number => {
            const cmp = a.nextDueDate.localeCompare(b.nextDueDate);
            if (cmp !== 0) return cmp;
            return a.payee.localeCompare(b.payee, undefined, { sensitivity: 'base' });
        });
    });

    readonly totalRecurringSchedulesCount = computed<number>(() => {
        return this.visibleRecurringSchedules().length;
    });

    readonly selectedRecurringSchedulesCount = computed<number>(() => {
        const selectedIds = this.options().selectedRecurringScheduleIds;
        const visible = this.visibleRecurringSchedules();
        if (selectedIds === undefined) return visible.length;
        const selectedSet = new Set<number>(selectedIds);
        return visible.filter((s: IMnyRecurringSchedule): boolean =>
            selectedSet.has(s.mnyBillHeadId)
        ).length;
    });

    readonly allRecurringSchedulesSelected = computed<boolean>(() => {
        const total = this.totalRecurringSchedulesCount();
        return total > 0 && this.selectedRecurringSchedulesCount() >= total;
    });

    readonly allAccountsSelected = computed<boolean>(() => {
        return this.allVisibleAccountsSelected();
    });

    readonly allCategoriesSelected = computed<boolean>(() => {
        const total = this.totalCategoriesCount();
        return total > 0 && this.selectedCategoriesCount() >= total;
    });

    readonly allPayeesSelected = computed<boolean>(() => {
        const groups = this.sortedPayees();
        if (groups.length === 0) return false;
        const selected = new Set<number>(this.options().selectedPayeeIds);
        return groups.every((g: IReconciledPayeeGroup): boolean => selected.has(g.mnyPayeeId));
    });

    // --- Drag and Drop Handlers ---
    onDragOver(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging.set(true);
    }

    onDragLeave(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging.set(false);
    }

    async onDrop(event: DragEvent): Promise<void> {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging.set(false);

        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
            const firstFile = files[0];
            if (firstFile) {
                await this.handleFile(firstFile);
            }
        }
    }

    async onFileInputChange(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        const files = input.files;
        if (files && files.length > 0) {
            const firstFile = files[0];
            if (firstFile) {
                await this.handleFile(firstFile);
            }
        }
    }

    private async handleFile(file: File): Promise<void> {
        this.passwordInput.set('');
        this.usernameInput.set('');
        await this.migrationService.inspectFile(file);
    }

    // --- Credential Unlock ---
    async submitCredentials(): Promise<void> {
        this.isVerifyingPassword.set(true);
        try {
            const username = this.isLiveIdMode() ? this.usernameInput().trim() : undefined;
            const password = this.passwordInput();
            await this.migrationService.verifyCredentials(password, username);
        } finally {
            this.isVerifyingPassword.set(false);
        }
    }

    // --- Mode & Options Selection ---
    setMode(mode: MnyMigrationMode): void {
        this.migrationService.options.update(
            (opt: IMnyMigrationOptions): IMnyMigrationOptions => ({
                ...opt,
                mode
            })
        );
    }

    goToDomainSelection(): void {
        this.migrationService.step.set('select');
    }

    goToModeSelection(): void {
        this.migrationService.step.set('mode');
    }

    setActiveTab(tab: MnyDomainTab): void {
        this.activeTab.set(tab);
    }

    // --- Account Selection ---
    isAccountSelected(mnyAccountId: number): boolean {
        return this.options().selectedAccountIds.includes(mnyAccountId);
    }

    toggleAccountSelection(mnyAccountId: number): void {
        this.migrationService.options.update((opt: IMnyMigrationOptions): IMnyMigrationOptions => {
            const current = opt.selectedAccountIds;
            const updated = current.includes(mnyAccountId)
                ? current.filter((id: number): boolean => id !== mnyAccountId)
                : [...current, mnyAccountId];
            return { ...opt, selectedAccountIds: updated };
        });
    }

    toggleAllAccounts(): void {
        const visible = this.visibleAccounts();
        if (visible.length === 0) return;
        const visibleIds = visible.map((a: IMnyAccount): number => a.mnyAccountId);

        if (this.allVisibleAccountsSelected()) {
            this.migrationService.options.update(
                (opt: IMnyMigrationOptions): IMnyMigrationOptions => ({
                    ...opt,
                    selectedAccountIds: opt.selectedAccountIds.filter(
                        (id: number): boolean => !visibleIds.includes(id)
                    )
                })
            );
        } else {
            this.migrationService.options.update(
                (opt: IMnyMigrationOptions): IMnyMigrationOptions => {
                    const set = new Set<number>([...opt.selectedAccountIds, ...visibleIds]);
                    return { ...opt, selectedAccountIds: Array.from(set) };
                }
            );
        }
    }

    toggleIncludeClosedAccounts(): void {
        const closedIds = new Set<number>(
            (this.parseResult()?.accounts ?? [])
                .filter((a: IMnyAccount): boolean => a.isClosed)
                .map((a: IMnyAccount): number => a.mnyAccountId)
        );
        this.migrationService.options.update((opt: IMnyMigrationOptions): IMnyMigrationOptions => {
            const nextIncludeClosed = !opt.includeClosedAccounts;
            const nextSelectedAccountIds = nextIncludeClosed
                ? opt.selectedAccountIds
                : opt.selectedAccountIds.filter((id: number): boolean => !closedIds.has(id));
            return {
                ...opt,
                includeClosedAccounts: nextIncludeClosed,
                selectedAccountIds: nextSelectedAccountIds
            };
        });
    }

    // --- Category Selection ---
    isCategorySelected(mnyCategoryId: number): boolean {
        return this.options().selectedCategoryIds.includes(mnyCategoryId);
    }

    toggleCategorySelection(mnyCategoryId: number): void {
        this.migrationService.options.update((opt: IMnyMigrationOptions): IMnyMigrationOptions => {
            const current = opt.selectedCategoryIds;
            const updated = current.includes(mnyCategoryId)
                ? current.filter((id: number): boolean => id !== mnyCategoryId)
                : [...current, mnyCategoryId];
            return { ...opt, selectedCategoryIds: updated };
        });
    }

    isCategoryGroupAllSelected(groupType: 'Income' | 'Expense'): boolean {
        const group = this.categoryTreeGroups().find(
            (g: IMnyCategoryGroup): boolean => g.type === groupType
        );
        if (!group || group.nodes.length === 0) return false;
        const selected = new Set<number>(this.options().selectedCategoryIds);
        return group.nodes.every((n: IMnyCategoryNode): boolean => selected.has(n.id));
    }

    toggleCategoryGroup(groupType: 'Income' | 'Expense'): void {
        const group = this.categoryTreeGroups().find(
            (g: IMnyCategoryGroup): boolean => g.type === groupType
        );
        if (!group) return;
        const groupIds = group.nodes.map((n: IMnyCategoryNode): number => n.id);
        const selected = new Set<number>(this.options().selectedCategoryIds);
        const allGroupSelected = groupIds.every((id: number): boolean => selected.has(id));

        this.migrationService.options.update((opt: IMnyMigrationOptions): IMnyMigrationOptions => {
            let updated: Array<number>;
            if (allGroupSelected) {
                updated = opt.selectedCategoryIds.filter(
                    (id: number): boolean => !groupIds.includes(id)
                );
            } else {
                const newSet = new Set<number>([...opt.selectedCategoryIds, ...groupIds]);
                updated = Array.from(newSet);
            }
            return { ...opt, selectedCategoryIds: updated };
        });
    }

    toggleAllCategories(): void {
        const result = this.parseResult();
        if (!result) return;

        if (this.allCategoriesSelected()) {
            this.migrationService.options.update(
                (opt: IMnyMigrationOptions): IMnyMigrationOptions => ({
                    ...opt,
                    selectedCategoryIds: []
                })
            );
        } else {
            const visibleIds = this.categoryTreeGroups().flatMap((g: IMnyCategoryGroup) =>
                g.nodes.map((n: IMnyCategoryNode): number => n.id)
            );
            this.migrationService.options.update(
                (opt: IMnyMigrationOptions): IMnyMigrationOptions => ({
                    ...opt,
                    selectedCategoryIds:
                        visibleIds.length > 0
                            ? visibleIds
                            : result.categories.map((c: IMnyCategory): number => c.mnyCategoryId)
                })
            );
        }
    }

    toggleIncludeHiddenCategories(): void {
        this.migrationService.options.update(
            (opt: IMnyMigrationOptions): IMnyMigrationOptions => ({
                ...opt,
                includeHiddenCategories: !opt.includeHiddenCategories
            })
        );
    }

    // --- Payee Selection ---
    isPayeeSelected(mnyPayeeId: number): boolean {
        return this.options().selectedPayeeIds.includes(mnyPayeeId);
    }

    togglePayeeSelection(mnyPayeeId: number, mergedIds?: Array<number>): void {
        const groupIds =
            mergedIds && mergedIds.length > 0
                ? mergedIds
                : (this.sortedPayees().find(p => p.mnyPayeeId === mnyPayeeId)?.mergedPayeeIds ?? [
                      mnyPayeeId
                  ]);
        const groupIdSet = new Set<number>(groupIds);

        this.migrationService.options.update((opt: IMnyMigrationOptions): IMnyMigrationOptions => {
            const current = opt.selectedPayeeIds;
            const isSelected = current.includes(mnyPayeeId);
            const updated = isSelected
                ? current.filter((id: number): boolean => !groupIdSet.has(id))
                : Array.from(new Set<number>([...current, ...groupIds]));
            return { ...opt, selectedPayeeIds: updated };
        });
    }

    isPayeeGroupCollapsed(groupKey: string): boolean {
        if (this.payeeSearchQuery().trim().length > 0) {
            return false;
        }
        if (groupKey === '__primary__') {
            return this.collapsedPayeeGroups().has(groupKey);
        }
        // Statement-upload per-account groups default to collapsed so MS Money Primary Payees are front-and-center
        return !this.expandedStatementPayeeGroups().has(groupKey);
    }

    togglePayeeGroupCollapse(groupKey: string): void {
        if (groupKey === '__primary__') {
            const next = new Set<string>(this.collapsedPayeeGroups());
            if (next.has(groupKey)) {
                next.delete(groupKey);
            } else {
                next.add(groupKey);
            }
            this.collapsedPayeeGroups.set(next);
            return;
        }

        const nextExpanded = new Set<string>(this.expandedStatementPayeeGroups());
        if (nextExpanded.has(groupKey)) {
            nextExpanded.delete(groupKey);
        } else {
            nextExpanded.add(groupKey);
        }
        this.expandedStatementPayeeGroups.set(nextExpanded);
    }

    selectPrimaryPayeesOnly(): void {
        const primaryIds = this.sortedPayees()
            .filter((p: IReconciledPayeeGroup): boolean => p.hasPrimaryPayee !== false)
            .flatMap((p: IReconciledPayeeGroup): Array<number> => p.mergedPayeeIds);

        this.migrationService.options.update(
            (opt: IMnyMigrationOptions): IMnyMigrationOptions => ({
                ...opt,
                selectedPayeeIds: Array.from(new Set<number>(primaryIds))
            })
        );
    }

    isPayeeAccountGroupAllSelected(groupKey: string): boolean {
        const group = this.payeeAccountGroups().find(
            (g: IMnyPayeeAccountGroup): boolean => g.groupKey === groupKey
        );
        if (!group || group.payees.length === 0) return false;
        const selected = new Set<number>(this.options().selectedPayeeIds);
        return group.payees.every((p: IReconciledPayeeGroup): boolean =>
            selected.has(p.mnyPayeeId)
        );
    }

    togglePayeeAccountGroup(groupKey: string): void {
        const group = this.payeeAccountGroups().find(
            (g: IMnyPayeeAccountGroup): boolean => g.groupKey === groupKey
        );
        if (!group) return;
        const groupIds = group.payees.flatMap(
            (p: IReconciledPayeeGroup): Array<number> => p.mergedPayeeIds
        );
        const groupIdSet = new Set<number>(groupIds);
        const allSelected = this.isPayeeAccountGroupAllSelected(groupKey);

        this.migrationService.options.update((opt: IMnyMigrationOptions): IMnyMigrationOptions => {
            const updated = allSelected
                ? opt.selectedPayeeIds.filter((id: number): boolean => !groupIdSet.has(id))
                : Array.from(new Set<number>([...opt.selectedPayeeIds, ...groupIds]));
            return { ...opt, selectedPayeeIds: updated };
        });
    }

    toggleAllPayees(): void {
        const result = this.parseResult();
        if (!result) return;

        if (this.allPayeesSelected()) {
            this.migrationService.options.update(
                (opt: IMnyMigrationOptions): IMnyMigrationOptions => ({
                    ...opt,
                    selectedPayeeIds: []
                })
            );
        } else {
            this.migrationService.options.update(
                (opt: IMnyMigrationOptions): IMnyMigrationOptions => ({
                    ...opt,
                    selectedPayeeIds: result.payees.map((p: IMnyPayee): number => p.mnyPayeeId)
                })
            );
        }
    }

    // --- Recurring Schedule Selection ---
    isRecurringScheduleSelected(mnyBillHeadId: number): boolean {
        const selectedIds = this.options().selectedRecurringScheduleIds;
        if (selectedIds === undefined) return true;
        return selectedIds.includes(mnyBillHeadId);
    }

    toggleRecurringScheduleSelection(mnyBillHeadId: number): void {
        const visibleIds = this.visibleRecurringSchedules().map(
            (s: IMnyRecurringSchedule): number => s.mnyBillHeadId
        );
        this.migrationService.options.update((opt: IMnyMigrationOptions): IMnyMigrationOptions => {
            const current = opt.selectedRecurringScheduleIds ?? visibleIds;
            const updated = current.includes(mnyBillHeadId)
                ? current.filter((id: number): boolean => id !== mnyBillHeadId)
                : [...current, mnyBillHeadId];
            return { ...opt, selectedRecurringScheduleIds: updated };
        });
    }

    toggleAllRecurringSchedules(): void {
        const visibleIds = this.visibleRecurringSchedules().map(
            (s: IMnyRecurringSchedule): number => s.mnyBillHeadId
        );
        if (this.allRecurringSchedulesSelected()) {
            this.migrationService.options.update(
                (opt: IMnyMigrationOptions): IMnyMigrationOptions => ({
                    ...opt,
                    selectedRecurringScheduleIds: []
                })
            );
        } else {
            this.migrationService.options.update(
                (opt: IMnyMigrationOptions): IMnyMigrationOptions => ({
                    ...opt,
                    selectedRecurringScheduleIds: visibleIds
                })
            );
        }
    }

    formatRecurringFrequency(freq: Frequency | string): string {
        switch (freq) {
            case Frequency.Daily:
                return 'Daily';
            case Frequency.Weekly:
                return 'Weekly';
            case Frequency.Biweekly:
                return 'Every two weeks';
            case Frequency.EveryFourWeeks:
                return 'Every four weeks';
            case Frequency.Monthly:
                return 'Monthly';
            case Frequency.TwiceAMonth:
                return 'Twice a month';
            case Frequency.Bimonthly:
                return 'Every two months';
            case Frequency.Quarterly:
                return 'Quarterly';
            case Frequency.Yearly:
                return 'Yearly';
            default:
                return String(freq);
        }
    }

    // --- AI Normalization Toggles ---
    toggleAiEnhanceCategories(): void {
        this.migrationService.options.update(
            (opt: IMnyMigrationOptions): IMnyMigrationOptions => ({
                ...opt,
                aiEnhanceCategories: !opt.aiEnhanceCategories
            })
        );
    }

    toggleAiEnhancePayees(): void {
        this.migrationService.options.update(
            (opt: IMnyMigrationOptions): IMnyMigrationOptions => ({
                ...opt,
                aiEnhancePayees: !opt.aiEnhancePayees
            })
        );
    }

    // --- Contextual Options Toggles ---
    togglePreserveClearedStatus(): void {
        this.migrationService.options.update(
            (opt: IMnyMigrationOptions): IMnyMigrationOptions => ({
                ...opt,
                preserveClearedStatus: !opt.preserveClearedStatus
            })
        );
    }

    toggleImportDecryptedAccountNumbers(): void {
        this.migrationService.options.update(
            (opt: IMnyMigrationOptions): IMnyMigrationOptions => ({
                ...opt,
                importDecryptedAccountNumbers: !opt.importDecryptedAccountNumbers
            })
        );
    }

    toggleSynthesizeOpeningBalances(): void {
        this.migrationService.options.update(
            (opt: IMnyMigrationOptions): IMnyMigrationOptions => ({
                ...opt,
                synthesizeOpeningBalances: !opt.synthesizeOpeningBalances
            })
        );
    }

    // --- Execute Migration ---
    async startMigration(): Promise<void> {
        this.isMigrating.set(true);
        this.migrationService.step.set('migrating');
        this.migrationService.progressPercent.set(5);
        this.migrationService.progressStage.set(MnyParseStage.ExtractingAccounts);
        this.migrationService.currentTable.set('Initializing AI Reconciliation & SQLite...');
        // Yield to browser event loop to allow DOM/spinner to paint before sync work starts
        await new Promise(resolve => setTimeout(resolve, 60));
        try {
            await this.migrationService.executeMigration();
        } catch (err: unknown) {
            console.error('Migration failed:', err);
            const msg: string =
                err instanceof Error ? err.message : 'Migration failed unexpectedly';
            this.migrationService.errorMessage.set(msg);
            this.migrationService.step.set('select');
        } finally {
            this.isMigrating.set(false);
        }
    }

    getStageLabel(stage: MnyParseStage): string {
        switch (stage) {
            case MnyParseStage.Inspecting:
                return 'Inspecting File Structure...';
            case MnyParseStage.VerifyingCredentials:
                return 'Verifying Security Credentials...';
            case MnyParseStage.DecryptingPages:
                return 'Decrypting Database Pages...';
            case MnyParseStage.ReadingCatalog:
                return 'Cataloging Database Tables...';
            case MnyParseStage.ExtractingAccounts:
                return 'Ingesting & Mapping Accounts...';
            case MnyParseStage.ExtractingCategories:
                return 'Harmonizing & Mapping Categories...';
            case MnyParseStage.ExtractingPayees:
                return 'AI Reconciling & Deduplicating Payees...';
            case MnyParseStage.ExtractingTransactions:
                return 'Merging & Reconciling Transactions & Splits...';
            case MnyParseStage.AiReconciling:
                return 'AI Reconciling Cross-Account Links & Ledger Health...';
            case MnyParseStage.Complete:
                return 'Migration Complete!';
            default:
                return 'Processing Microsoft Money Data...';
        }
    }

    getFormattedCurrentSubstep(): string | null {
        const raw = this.currentTable()?.trim();
        if (!raw) return null;
        const stageLabel = this.getStageLabel(this.progressStage()).trim();
        if (raw.toLowerCase() === stageLabel.toLowerCase()) {
            return null;
        }
        const redundantTokens = new Set([
            'accounts',
            'categories',
            'payees',
            'transactions & splits'
        ]);
        if (redundantTokens.has(raw.toLowerCase())) {
            return null;
        }
        return raw;
    }

    isShortTableSubstep(): boolean {
        const substep = this.getFormattedCurrentSubstep();
        return Boolean(substep && substep.length <= 16);
    }

    // --- Navigation & Exit ---
    navigateToOverview(): void {
        this.visible.set(false);
        this.migrationService.close();
        void this.router.navigate(['/accounts']);
    }

    openForensicInspector(): void {
        this.visible.set(false);
        this.migrationService.close();
        void this.router.navigate(['/settings/dev/mny-inspector']);
    }

    close(): void {
        this.visible.set(false);
        this.migrationService.close();
        if (this.hasActivatedRoute) {
            void this.router.navigate(['/settings']);
        }
    }

    formatDuration(ms: number | null | undefined): string {
        if (ms === null || ms === undefined || Number.isNaN(ms)) return '—';
        if (ms < 100) return `${ms.toFixed(1)} ms`;
        if (ms < 1000) return `${Math.round(ms)} ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(2)} s`;
        const mins = Math.floor(ms / 60000);
        const remSecs = ((ms % 60000) / 1000).toFixed(1);
        return `${mins}m ${remSecs}s`;
    }

    formatCurrency(cents: number): string {
        const dollars = cents / 100;
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(dollars);
    }

    formatFileSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }

    formatAccountType(type: AccountType | string): string {
        switch (type) {
            case AccountType.Checking:
                return 'Checking';
            case AccountType.Savings:
                return 'Savings';
            case AccountType.Credit:
                return 'Credit Card';
            case AccountType.PersonalLoan:
                return 'Personal Loan';
            case AccountType.AutoLoan:
                return 'Auto Loan';
            case AccountType.Mortgage:
                return 'Mortgage';
            case AccountType.Cash:
                return 'Cash';
            default:
                return String(type)
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, c => c.toUpperCase());
        }
    }

    formatAccountNumber(accountNumber: string | null | undefined): string {
        if (!accountNumber) return '—';
        const cleaned = accountNumber.trim();
        if (!cleaned || !/^[\x20-\x7E]+$/.test(cleaned)) {
            return '—';
        }
        return `•••• ${cleaned.slice(-4)}`;
    }

    getMnyAccountAssessment(mnyAccountId: number): IAccountAiAssessment | undefined {
        return this.accountAssessments().get(mnyAccountId);
    }

    openAiNotificationSummary(): void {
        this.augmentationService?.isNotificationDialogOpen.set(true);
    }
}
