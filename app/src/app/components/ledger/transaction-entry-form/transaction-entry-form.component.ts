import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    input,
    output,
    signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { IAccount, IPayee, ISODateString, ISplit, ITransaction } from '@core';
import { AccountType, TransactionStatus } from '@core';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { PayeeAutocompleteComponent } from '../../payees/payee-autocomplete/payee-autocomplete.component';
import { CalculatorInputComponent } from '../../ui/calculator-input/calculator-input.component';
import { SplitEntryDialogComponent } from '../split-entry-dialog/split-entry-dialog.component';

type EntryMode = 'expense' | 'deposit' | 'transfer';

interface ICategoryOption {
    id?: string;
    name: string;
    parentId?: string | null;
    description?: string | null;
    depth?: number;
    parentName?: string;
    isNew?: boolean;
    isNewParent?: boolean;
    displayName?: string;
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string | null;
}

@Component({
    selector: 'transaction-entry-form',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        CalculatorInputComponent,
        AutoCompleteModule,
        PayeeAutocompleteComponent,
        SplitEntryDialogComponent
    ],
    templateUrl: './transaction-entry-form.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TransactionEntryFormComponent {
    readonly accountId = input.required<string>();
    readonly requestAddAccount = output();

    private ledgerStore = inject(LedgerStore);

    // Context Data
    readonly accounts = this.ledgerStore.accounts;
    readonly payees = this.ledgerStore.payees;
    readonly categories = this.ledgerStore.categories;

    readonly activeAccount = computed<IAccount | null>(() => {
        const id = this.accountId();
        if (!id) return null;
        return this.accounts().find(a => a.id === id) || null;
    });

    // Form State
    mode = signal<EntryMode>('expense');

    entryDate = signal<string>(new Date().toISOString().split('T')[0] || '');
    entryCheckNumber = signal<string>('');
    entryAmount = signal<number | null>(null);
    entryMemo = signal<string>('');

    // Splits state
    manualSplits = signal<Array<ISplit>>([]);
    isSplitDialogOpen = signal<boolean>(false);

    readonly entryPayeeString = computed(() => {
        const val = this.selectedPayee();
        if (!val) return '';
        if (typeof val === 'string') return val;
        return val.name;
    });

    readonly currentEntryAmountCents = computed(() => {
        return this.entryAmount() || 0;
    });

    // Payee
    selectedPayee = signal<string | IPayee | null>(null);

    // Category
    selectedCategory = signal<string | ICategoryOption | null>(null);
    filteredCategories = signal<Array<ICategoryOption>>([]);
    filteredCheckNumbers = signal<Array<string>>([]);

    // Check Number Autocomplete
    openSplitDialog(): void {
        this.isSplitDialogOpen.set(true);
    }

    handleSplitsSaved(event: { splits: Array<ISplit>; newTotal?: number }): void {
        this.manualSplits.set(event.splits);
        if (event.newTotal !== undefined) {
            this.entryAmount.set(event.newTotal);
        }
    }

    readonly nextCheckNumber = computed<string>(() => {
        const txs = this.ledgerStore.transactions();
        const account = this.activeAccount();
        const accountId = account?.id;
        if (!accountId) return '';

        const accountTxs = txs.filter(t => t.accountId === accountId && t.checkNumber);
        if (accountTxs.length === 0) return '1001';

        let max = 0;
        for (const tx of accountTxs) {
            const checkNum = tx.checkNumber;
            if (checkNum) {
                const num = parseInt(checkNum, 10);
                if (!isNaN(num) && num > max) {
                    max = num;
                }
            }
        }
        return max > 0 ? (max + 1).toString() : '1001';
    });

    // Transfer specific
    transferToAccountId = signal<string>('');

    // Validation State
    readonly isFormValid = computed<boolean>(() => {
        const amount = this.entryAmount();
        const date = this.entryDate();

        if (!amount || amount === 0 || !date) return false;

        if (this.mode() === 'transfer') {
            return !!this.transferToAccountId();
        } else {
            return !!this.selectedPayee();
        }
    });

    readonly isFormDirty = computed<boolean>(() => {
        const hasAmount = this.entryAmount() !== null && this.entryAmount() !== 0;
        const hasMemo = !!this.entryMemo();
        const hasCheckNumber = !!this.entryCheckNumber();
        const hasPayee = !!this.selectedPayee();
        const hasCategory = !!this.selectedCategory();
        const hasTransferTo = this.mode() === 'transfer' && !!this.transferToAccountId();
        const isEditing = !!this.editingTransaction();
        const todayStr = new Date().toISOString().split('T')[0] || '';
        const hasDateChanged = this.entryDate() !== todayStr;

        return (
            hasAmount ||
            hasMemo ||
            hasCheckNumber ||
            hasPayee ||
            hasCategory ||
            hasTransferTo ||
            isEditing ||
            hasDateChanged
        );
    });

    // Computed styles
    readonly formThemeClass = computed(() => {
        const type = this.activeAccount()?.type;
        const currentMode = this.mode();

        if (currentMode === 'expense' && type === AccountType.Checking) {
            return 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800 shadow-sm border p-4 rounded-sm relative';
        }
        if (currentMode === 'deposit') {
            return 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800 shadow-sm border p-4 rounded-sm relative';
        }
        if (currentMode === 'transfer') {
            return 'bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-900/20 dark:to-fuchsia-900/20 border-violet-200 dark:border-violet-800 shadow-sm border p-4 rounded-sm relative';
        }
        return 'bg-surface-100 border-surface-200 shadow-sm border p-4 rounded-sm relative';
    });

    // Category Autocomplete Logic
    filterCategories(event: { query: string }): void {
        const query = event.query.toLowerCase();
        const allCats = this.categories();

        // Build indented list
        const treeList: Array<ICategoryOption> = [];
        const topLevel = allCats.filter(c => !c.parentId);

        for (const parent of topLevel) {
            const children = allCats.filter(c => c.parentId === parent.id);
            treeList.push({ ...parent, depth: 0 });
            for (const child of children) {
                treeList.push({ ...child, depth: 1, parentName: parent.name });
            }
        }

        const matches = treeList.filter(
            c =>
                c.name.toLowerCase().includes(query) ||
                (c.parentName && c.parentName.toLowerCase().includes(query))
        );

        // Handle <Parent>:<Subcategory> creation syntax
        if (query.includes(':')) {
            const [parentStr, subStr] = event.query.split(':').map((s: string) => s.trim());
            if (parentStr && subStr) {
                const parentMatch = topLevel.find(
                    c => c.name.toLowerCase() === parentStr.toLowerCase()
                );
                if (parentMatch) {
                    const childExists = allCats.find(
                        c =>
                            c.parentId === parentMatch.id &&
                            c.name.toLowerCase() === subStr.toLowerCase()
                    );
                    if (!childExists) {
                        matches.unshift({
                            id: `new-cat-${Date.now()}`,
                            name: subStr,
                            parentName: parentMatch.name,
                            parentId: parentMatch.id,
                            isNew: true,
                            depth: 1,
                            displayName: `Create '${subStr}' in '${parentMatch.name}'`
                        } as ICategoryOption);
                    }
                } else {
                    // Create new parent AND new subcategory
                    matches.unshift({
                        id: `new-cat-${Date.now()}`,
                        name: subStr,
                        parentName: parentStr,
                        isNewParent: true,
                        isNew: true,
                        depth: 1,
                        displayName: `Create '${parentStr}' -> '${subStr}'`
                    } as ICategoryOption);
                }
            }
        } else if (query.length > 0 && !matches.find(m => m.name.toLowerCase() === query)) {
            // New top-level category
            matches.unshift({
                id: `new-cat-${Date.now()}`,
                name: event.query,
                isNew: true,
                depth: 0,
                displayName: `Create new category '${event.query}'`
            } as ICategoryOption);
        }

        this.filteredCategories.set(matches);
    }

    filterCheckNumbers(event: { query: string }): void {
        const query = (event.query || '').toLowerCase();
        const nextNum = this.nextCheckNumber();
        const defaultOptions = [nextNum, 'ATM', 'Debit', 'Online Payment'].filter(Boolean);

        if (!query) {
            this.filteredCheckNumbers.set(defaultOptions);
            return;
        }

        const matches = defaultOptions.filter(o => o.toLowerCase().includes(query));
        if (query && !matches.find(m => m.toLowerCase() === query)) {
            matches.unshift(event.query);
        }
        this.filteredCheckNumbers.set(matches);
    }

    editingTransaction = signal<ITransaction | null>(null);

    editTransaction(tx: ITransaction): void {
        if (tx.linkedTransferId) {
            // Transfer editing is not fully supported in this form yet
            return;
        }

        this.editingTransaction.set(tx);

        if (tx.totalAmount >= 0) {
            this.mode.set('deposit');
            this.entryAmount.set(tx.totalAmount);
        } else {
            this.mode.set('expense');
            this.entryAmount.set(Math.abs(tx.totalAmount));
        }

        this.entryDate.set(tx.date.split('T')[0] ?? '');
        this.entryMemo.set(tx.memo ?? '');
        this.entryCheckNumber.set(tx.checkNumber ?? '');

        if (tx.payeeId) {
            const payeeObj = this.payees().find(p => p.id === tx.payeeId);
            this.selectedPayee.set(payeeObj ? payeeObj : tx.payee);
        } else {
            this.selectedPayee.set(tx.payee);
        }

        if (tx.splits && tx.splits.length > 0) {
            this.manualSplits.set([...tx.splits]);
            const catId = tx.splits[0]?.categoryId;
            if (catId) {
                const catObj = this.categories().find(c => c.id === catId);
                this.selectedCategory.set(catObj ? catObj : null);
            } else {
                this.selectedCategory.set(null);
            }
        } else {
            this.manualSplits.set([]);
            this.selectedCategory.set(null);
        }
    }

    async submit(): Promise<void> {
        const account = this.activeAccount();
        if (!account) return;

        const date = this.entryDate() as ISODateString;
        const memo = this.entryMemo();
        let centsAmount = this.entryAmount() || 0;

        if (centsAmount === 0) return; // Basic validation

        if (this.mode() === 'transfer') {
            const toAcc = this.transferToAccountId();
            if (!toAcc) return;
            const absoluteAmount = Math.abs(centsAmount);
            await this.ledgerStore.recordTransfer(account.id, toAcc, absoluteAmount, date, memo);

            // Reset form
            this.resetForm();
        } else {
            // Handle Expense/Deposit
            if (this.mode() === 'expense') centsAmount = -Math.abs(centsAmount);
            if (this.mode() === 'deposit') centsAmount = Math.abs(centsAmount);

            // Resolve Payee
            const payeeVal = this.selectedPayee();
            let payeeId = '';
            let payeeName = '';

            if (typeof payeeVal === 'string') {
                const newPayee = await this.ledgerStore.getOrCreatePayee(payeeVal);
                payeeId = newPayee.id;
                payeeName = newPayee.name;
            } else if (payeeVal && 'isNew' in payeeVal && payeeVal.isNew) {
                const newPayee = await this.ledgerStore.getOrCreatePayee(payeeVal.name);
                payeeId = newPayee.id;
                payeeName = newPayee.name;
            } else if (payeeVal && 'id' in payeeVal) {
                payeeId = payeeVal.id;
                payeeName = payeeVal.name;
            } else {
                return; // Payee required
            }

            // Resolve Category
            const catVal = this.selectedCategory();
            let categoryId: string | null = null;

            if (catVal) {
                if (typeof catVal === 'string') {
                    // Lookup category by name
                    const existingCat = this.categories().find(
                        c => c.name.toLowerCase() === catVal.toLowerCase()
                    );
                    if (existingCat) {
                        categoryId = existingCat.id;
                    } else {
                        const newCat = await this.ledgerStore.createCategory(catVal, null);
                        categoryId = newCat.id;
                    }
                } else if (catVal.isNewParent) {
                    const newParent = await this.ledgerStore.createCategory(
                        catVal.parentName || '',
                        null
                    );
                    const newChild = await this.ledgerStore.createCategory(
                        catVal.name,
                        newParent.id
                    );
                    categoryId = newChild.id;
                } else if (catVal.isNew) {
                    const newChild = await this.ledgerStore.createCategory(
                        catVal.name,
                        catVal.parentId || null
                    );
                    categoryId = newChild.id;
                } else if (catVal.id) {
                    categoryId = catVal.id;
                }
            }

            const existingTx = this.editingTransaction();
            const now = new Date().toISOString() as ISODateString;
            const newTxId = existingTx
                ? existingTx.id
                : `tx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

            const splits =
                this.manualSplits().length > 0
                    ? this.manualSplits().map((s, idx) => ({
                          ...s,
                          id: s.id || `split-${newTxId}-${idx}`
                      }))
                    : [
                          {
                              id:
                                  existingTx && existingTx.splits.length > 0
                                      ? existingTx.splits[0]?.id || `split-${newTxId}`
                                      : `split-${newTxId}`,
                              categoryId,
                              memo,
                              amount: centsAmount
                          }
                      ];

            const newTx: ITransaction = {
                ...(existingTx ? existingTx : {}),
                id: newTxId,
                accountId: account.id,
                payeeId,
                date,
                payee: payeeName,
                memo,
                totalAmount: centsAmount,
                status: existingTx ? existingTx.status : TransactionStatus.Cleared,
                splits,
                checkNumber: this.entryCheckNumber() || null,
                importHash: existingTx ? existingTx.importHash : `manual-${newTxId}`,
                createdAt: existingTx ? existingTx.createdAt : now,
                updatedAt: now
            } as ITransaction;

            if (existingTx) {
                await this.ledgerStore.updateTransaction(newTx);
            } else {
                await this.ledgerStore.applyReconciliationBatch([], [newTx], []);
            }

            // Reset form
            this.resetForm();
        }
    }

    resetForm(): void {
        this.editingTransaction.set(null);
        this.entryAmount.set(null);
        this.entryMemo.set('');
        this.entryCheckNumber.set('');
        this.selectedPayee.set(null);
        this.selectedCategory.set(null);
        this.entryDate.set(new Date().toISOString().split('T')[0] || '');
        this.transferToAccountId.set('');
        this.manualSplits.set([]);
    }
}
