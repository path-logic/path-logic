import { CommonModule } from '@angular/common';
import type { OnChanges, SimpleChanges } from '@angular/core';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { formatCurrency, type ISplit, KnownCategory, ScheduleType } from '@core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';

import { CalculatorInputComponent } from '../../ui/calculator-input/calculator-input.component';

export interface ICustomPaycheckItem {
    id: string;
    memo: string;
    amount: number;
    categoryId?: string | undefined;
}

export interface IPaycheckLineItem {
    id: string;
    memo: string;
    amount: number;
    categoryId?: string | undefined;
    key?: string | undefined;
}

export interface IPaycheckFormState {
    // Wages
    grossPay: number;
    customWages: Array<ICustomPaycheckItem>;

    // Taxes
    federalTax?: number | undefined;
    stateTax?: number | undefined;
    localTax?: number | undefined;
    socialSecurity?: number | undefined;
    medicare?: number | undefined;
    customTaxes: Array<ICustomPaycheckItem>;

    // Pre-Tax Deductions
    fourOhOneK?: number | undefined;
    medical?: number | undefined;
    dental?: number | undefined;
    vision?: number | undefined;
    hsa?: number | undefined;
    customPreTax: Array<ICustomPaycheckItem>;

    // Post-Tax Deductions
    roth401k?: number | undefined;
    lifeInsurance?: number | undefined;
    disabilityInsurance?: number | undefined;
    customPostTax: Array<ICustomPaycheckItem>;
}

export type PaycheckTab = 'wages' | 'pre-tax' | 'taxes' | 'post-tax';

@Component({
    selector: 'recurring-split-editor',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        ButtonModule,
        InputTextModule,
        SelectModule,
        CalculatorInputComponent
    ],
    templateUrl: './split-editor.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecurringSplitEditorComponent implements OnChanges {
    @Input() scheduleType: ScheduleType = ScheduleType.Debit;
    @Input() splits: Array<ISplit> = [];
    @Input() amount: number = 0; // Total parent amount
    @Output() splitsChange = new EventEmitter<Array<ISplit>>();

    ScheduleType = ScheduleType;
    formatCurrency = formatCurrency;

    editingSplits: Array<ISplit> = [];

    // Active Tab
    activePaycheckTab: PaycheckTab = 'wages';

    paycheckItems: Record<PaycheckTab, Array<IPaycheckLineItem>> =
        this.createDefaultPaycheckItems();

    KnownCategory = KnownCategory;

    createDefaultPaycheckItems(): Record<PaycheckTab, Array<IPaycheckLineItem>> {
        return {
            wages: [
                {
                    id: 'wages-gross-pay',
                    key: 'grossPay',
                    memo: 'Gross Pay',
                    amount: 0,
                    categoryId: KnownCategory.GrossPay
                }
            ],
            'pre-tax': [
                {
                    id: 'pretax-401k',
                    key: 'fourOhOneK',
                    memo: '401(k) / Retirement',
                    amount: 0,
                    categoryId: KnownCategory.FourOhOneK
                },
                {
                    id: 'pretax-medical',
                    key: 'medical',
                    memo: 'Medical Insurance',
                    amount: 0,
                    categoryId: KnownCategory.HealthInsurance
                },
                {
                    id: 'pretax-dental',
                    key: 'dental',
                    memo: 'Dental Insurance',
                    amount: 0,
                    categoryId: KnownCategory.DentalInsurance
                },
                {
                    id: 'pretax-vision',
                    key: 'vision',
                    memo: 'Vision Insurance',
                    amount: 0,
                    categoryId: KnownCategory.VisionInsurance
                }
            ],
            taxes: [
                {
                    id: 'tax-fed',
                    key: 'federalTax',
                    memo: 'Federal Income Tax',
                    amount: 0,
                    categoryId: KnownCategory.FederalTax
                },
                {
                    id: 'tax-state',
                    key: 'stateTax',
                    memo: 'State Income Tax',
                    amount: 0,
                    categoryId: KnownCategory.StateTax
                },
                {
                    id: 'tax-socsec',
                    key: 'socialSecurity',
                    memo: 'Social Security',
                    amount: 0,
                    categoryId: KnownCategory.SocialSecurity
                },
                {
                    id: 'tax-medicare',
                    key: 'medicare',
                    memo: 'Medicare',
                    amount: 0,
                    categoryId: KnownCategory.Medicare
                }
            ],
            'post-tax': []
        };
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['splits']) {
            this.editingSplits = [...this.splits];
            if (this.scheduleType === ScheduleType.Paycheck) {
                this.parseSplitsToPaycheckState(this.splits);
            }
        }
    }

    // Standard split methods (for Debit / Deposit)
    addSplit(): void {
        this.editingSplits = [
            ...this.editingSplits,
            { id: `split-${Date.now()}`, categoryId: null, memo: '', amount: 0 }
        ];
        this.emitUpdates();
    }

    removeSplit(id: string): void {
        this.editingSplits = this.editingSplits.filter(s => s.id !== id);
        this.emitUpdates();
    }

    updateSplit(index: number, field: keyof ISplit, value: string | number | null): void {
        const updated = [...this.editingSplits];
        updated[index] = { ...updated[index], [field]: value } as ISplit;
        this.editingSplits = updated;
        this.emitUpdates();
    }

    // Paycheck tab methods
    setTab(tab: PaycheckTab): void {
        this.activePaycheckTab = tab;
    }

    getAddButtonLabel(tab: PaycheckTab): string {
        switch (tab) {
            case 'wages':
                return '+ Add Wage';
            case 'pre-tax':
                return '+ Add Pre-Tax Deduction';
            case 'taxes':
                return '+ Add Tax';
            case 'post-tax':
                return '+ Add Post-Tax Deduction';
        }
    }

    getItemPlaceholder(tab: PaycheckTab): string {
        switch (tab) {
            case 'wages':
                return 'Description (e.g. Bonus, Overtime)';
            case 'taxes':
                return 'Description (e.g. State Disability, SUI)';
            case 'pre-tax':
                return 'Description (e.g. Commuter, Transit)';
            case 'post-tax':
                return 'Description (e.g. ESPP, Union Dues)';
        }
    }

    getItemRemoveLabel(tab: PaycheckTab, item: IPaycheckLineItem): string {
        if (item.memo) {
            return `Remove ${item.memo}`;
        }
        switch (tab) {
            case 'wages':
                return 'Remove wage';
            case 'taxes':
                return 'Remove tax';
            case 'pre-tax':
                return 'Remove pre-tax deduction';
            case 'post-tax':
                return 'Remove post-tax deduction';
        }
    }

    resetSectionDefaults(tab: PaycheckTab): void {
        const defaults = this.createDefaultPaycheckItems();
        this.paycheckItems[tab] = defaults[tab];
        this.emitPaycheckUpdates();
    }

    updatePaycheckField(field: keyof IPaycheckFormState, value: number): void {
        for (const tab of ['wages', 'pre-tax', 'taxes', 'post-tax'] as Array<PaycheckTab>) {
            const item = this.paycheckItems[tab].find(i => i.key === field);
            if (item) {
                item.amount = value;
                this.emitPaycheckUpdates();
                return;
            }
        }

        // If field was not in defaults (e.g. hsa, localTax, roth401k, etc.), add it dynamically
        const fieldMappings: Record<
            string,
            { tab: PaycheckTab; memo: string; categoryId: string }
        > = {
            hsa: { tab: 'pre-tax', memo: 'HSA / FSA', categoryId: KnownCategory.HSA },
            localTax: {
                tab: 'taxes',
                memo: 'Local / City Tax',
                categoryId: KnownCategory.LocalTax
            },
            roth401k: { tab: 'post-tax', memo: 'Roth 401(k)', categoryId: KnownCategory.Roth401k },
            lifeInsurance: {
                tab: 'post-tax',
                memo: 'Life Insurance',
                categoryId: KnownCategory.LifeInsurance
            },
            disabilityInsurance: {
                tab: 'post-tax',
                memo: 'Disability Insurance',
                categoryId: KnownCategory.DisabilityInsurance
            }
        };

        const mapping = fieldMappings[field as string];
        if (mapping && value > 0) {
            this.paycheckItems[mapping.tab].push({
                id: `${mapping.tab}-${field}-${Date.now()}`,
                key: field as string,
                memo: mapping.memo,
                amount: value,
                categoryId: mapping.categoryId
            });
            this.emitPaycheckUpdates();
        }
    }

    addCustomField(section: PaycheckTab): void {
        const newItem: IPaycheckLineItem = {
            id: `custom-${section}-${Date.now()}`,
            memo: '',
            amount: 0
        };
        this.paycheckItems[section] = [...this.paycheckItems[section], newItem];
        this.emitPaycheckUpdates();
    }

    removeLineItem(section: PaycheckTab, id: string): void {
        this.paycheckItems[section] = this.paycheckItems[section].filter(item => item.id !== id);
        this.emitPaycheckUpdates();
    }

    removeCustomField(section: PaycheckTab, id: string): void {
        this.removeLineItem(section, id);
    }

    updateCustomField(
        section: PaycheckTab,
        id: string,
        field: 'memo' | 'amount',
        value: string | number
    ): void {
        this.paycheckItems[section] = this.paycheckItems[section].map(item =>
            item.id === id ? { ...item, [field]: value } : item
        );
        this.emitPaycheckUpdates();
    }

    get paycheckState(): IPaycheckFormState {
        const getAmt = (tab: PaycheckTab, key: string, categoryId?: string): number | undefined =>
            this.paycheckItems[tab].find(
                i => i.key === key || (categoryId && i.categoryId === categoryId)
            )?.amount;
        return {
            grossPay: getAmt('wages', 'grossPay', KnownCategory.GrossPay) || 0,
            federalTax: getAmt('taxes', 'federalTax', KnownCategory.FederalTax),
            stateTax: getAmt('taxes', 'stateTax', KnownCategory.StateTax),
            localTax: getAmt('taxes', 'localTax', KnownCategory.LocalTax),
            socialSecurity: getAmt('taxes', 'socialSecurity', KnownCategory.SocialSecurity),
            medicare: getAmt('taxes', 'medicare', KnownCategory.Medicare),
            fourOhOneK: getAmt('pre-tax', 'fourOhOneK', KnownCategory.FourOhOneK),
            medical: getAmt('pre-tax', 'medical', KnownCategory.HealthInsurance),
            dental: getAmt('pre-tax', 'dental', KnownCategory.DentalInsurance),
            vision: getAmt('pre-tax', 'vision', KnownCategory.VisionInsurance),
            hsa: getAmt('pre-tax', 'hsa', KnownCategory.HSA),
            roth401k: getAmt('post-tax', 'roth401k', KnownCategory.Roth401k),
            lifeInsurance: getAmt('post-tax', 'lifeInsurance', KnownCategory.LifeInsurance),
            disabilityInsurance: getAmt(
                'post-tax',
                'disabilityInsurance',
                KnownCategory.DisabilityInsurance
            ),
            customWages: this.paycheckItems.wages.filter(
                i => !i.key && i.categoryId !== KnownCategory.GrossPay
            ),
            customTaxes: this.paycheckItems.taxes.filter(
                i =>
                    !i.key &&
                    !(
                        [
                            KnownCategory.FederalTax,
                            KnownCategory.StateTax,
                            KnownCategory.LocalTax,
                            KnownCategory.SocialSecurity,
                            KnownCategory.Medicare
                        ] as Array<string | null | undefined>
                    ).includes(i.categoryId)
            ),
            customPreTax: this.paycheckItems['pre-tax'].filter(
                i =>
                    !i.key &&
                    !(
                        [
                            KnownCategory.FourOhOneK,
                            KnownCategory.HealthInsurance,
                            KnownCategory.DentalInsurance,
                            KnownCategory.VisionInsurance,
                            KnownCategory.HSA
                        ] as Array<string | null | undefined>
                    ).includes(i.categoryId)
            ),
            customPostTax: this.paycheckItems['post-tax'].filter(
                i =>
                    !i.key &&
                    !(
                        [
                            KnownCategory.Roth401k,
                            KnownCategory.LifeInsurance,
                            KnownCategory.DisabilityInsurance
                        ] as Array<string | null | undefined>
                    ).includes(i.categoryId)
            )
        };
    }

    set paycheckState(val: IPaycheckFormState) {
        if (!val) return;
        const setVal = (
            tab: PaycheckTab,
            key: string,
            amt?: number,
            categoryId?: string,
            defaultMemo?: string
        ): void => {
            if (amt !== undefined) {
                const item = this.paycheckItems[tab].find(i => i.key === key);
                if (item) {
                    item.amount = amt;
                } else if (amt > 0) {
                    this.paycheckItems[tab].push({
                        id: `${tab}-${key}-${Date.now()}`,
                        key,
                        memo: defaultMemo || key,
                        amount: amt,
                        categoryId
                    });
                }
            }
        };
        setVal('wages', 'grossPay', val.grossPay, KnownCategory.GrossPay, 'Gross Pay');
        setVal(
            'taxes',
            'federalTax',
            val.federalTax,
            KnownCategory.FederalTax,
            'Federal Income Tax'
        );
        setVal('taxes', 'stateTax', val.stateTax, KnownCategory.StateTax, 'State Income Tax');
        setVal('taxes', 'localTax', val.localTax, KnownCategory.LocalTax, 'Local / City Tax');
        setVal(
            'taxes',
            'socialSecurity',
            val.socialSecurity,
            KnownCategory.SocialSecurity,
            'Social Security'
        );
        setVal('taxes', 'medicare', val.medicare, KnownCategory.Medicare, 'Medicare');
        setVal(
            'pre-tax',
            'fourOhOneK',
            val.fourOhOneK,
            KnownCategory.FourOhOneK,
            '401(k) / Retirement'
        );
        setVal(
            'pre-tax',
            'medical',
            val.medical,
            KnownCategory.HealthInsurance,
            'Medical Insurance'
        );
        setVal('pre-tax', 'dental', val.dental, KnownCategory.DentalInsurance, 'Dental Insurance');
        setVal('pre-tax', 'vision', val.vision, KnownCategory.VisionInsurance, 'Vision Insurance');
        setVal('pre-tax', 'hsa', val.hsa, KnownCategory.HSA, 'HSA / FSA');
        setVal('post-tax', 'roth401k', val.roth401k, KnownCategory.Roth401k, 'Roth 401(k)');
        setVal(
            'post-tax',
            'lifeInsurance',
            val.lifeInsurance,
            KnownCategory.LifeInsurance,
            'Life Insurance'
        );
        setVal(
            'post-tax',
            'disabilityInsurance',
            val.disabilityInsurance,
            KnownCategory.DisabilityInsurance,
            'Disability Insurance'
        );

        if (val.customWages) {
            this.paycheckItems.wages = [
                ...this.paycheckItems.wages.filter(i => !!i.key),
                ...val.customWages
            ];
        }
        if (val.customTaxes) {
            this.paycheckItems.taxes = [
                ...this.paycheckItems.taxes.filter(i => !!i.key),
                ...val.customTaxes
            ];
        }
        if (val.customPreTax) {
            this.paycheckItems['pre-tax'] = [
                ...this.paycheckItems['pre-tax'].filter(i => !!i.key),
                ...val.customPreTax
            ];
        }
        if (val.customPostTax) {
            this.paycheckItems['post-tax'] = [
                ...this.paycheckItems['post-tax'].filter(i => !!i.key),
                ...val.customPostTax
            ];
        }
    }

    // Totals
    get totalWages(): number {
        return (this.paycheckItems.wages || []).reduce((sum, item) => sum + (item.amount || 0), 0);
    }

    get totalPreTax(): number {
        return (this.paycheckItems['pre-tax'] || []).reduce(
            (sum, item) => sum + (item.amount || 0),
            0
        );
    }

    get totalTaxes(): number {
        return (this.paycheckItems.taxes || []).reduce((sum, item) => sum + (item.amount || 0), 0);
    }

    get totalPostTax(): number {
        return (this.paycheckItems['post-tax'] || []).reduce(
            (sum, item) => sum + (item.amount || 0),
            0
        );
    }

    get totalDeductions(): number {
        return this.totalPreTax + this.totalTaxes + this.totalPostTax;
    }

    get netPay(): number {
        return this.totalWages - this.totalDeductions;
    }

    private emitUpdates(): void {
        this.splitsChange.emit(this.editingSplits);
    }

    emitPaycheckUpdates(): void {
        const generatedSplits: Array<ISplit> = [];

        // 1. Wages (positive)
        for (const w of this.paycheckItems.wages) {
            if (w.amount && w.amount > 0) {
                generatedSplits.push({
                    id: w.id,
                    categoryId: w.categoryId || KnownCategory.GrossPay,
                    memo: w.memo || 'Wage',
                    amount: Math.abs(w.amount)
                });
            }
        }

        // Helper for deductions (negative)
        const emitDeductions = (tab: PaycheckTab, defaultCat: string): void => {
            for (const item of this.paycheckItems[tab]) {
                if (item.amount && item.amount > 0) {
                    generatedSplits.push({
                        id: item.id,
                        categoryId: item.categoryId || defaultCat,
                        memo: item.memo || 'Deduction',
                        amount: -Math.abs(item.amount)
                    });
                }
            }
        };

        // 2. Pre-Tax Deductions (negative)
        emitDeductions('pre-tax', KnownCategory.Health);

        // 3. Taxes (negative)
        emitDeductions('taxes', KnownCategory.Taxes);

        // 4. Post-Tax Deductions (negative)
        emitDeductions('post-tax', KnownCategory.Uncategorized);

        this.editingSplits = generatedSplits;
        this.emitUpdates();
    }

    private parseSplitsToPaycheckState(splits: Array<ISplit>): void {
        const items = this.createDefaultPaycheckItems();

        for (const s of splits) {
            const amt = Math.abs(s.amount);
            if (s.amount > 0) {
                // Wages
                const existing = items.wages.find(
                    w =>
                        (w.categoryId && w.categoryId === s.categoryId) ||
                        (w.key && s.id === `split-${w.key}`) ||
                        (s.categoryId === KnownCategory.GrossPay && w.key === 'grossPay')
                );
                if (existing) {
                    existing.amount = amt;
                    if (s.memo) existing.memo = s.memo;
                } else {
                    items.wages.push({
                        id: s.id,
                        memo: s.memo || 'Other Wage',
                        amount: amt,
                        categoryId: s.categoryId || KnownCategory.Income
                    });
                }
            } else {
                // Deductions
                const preTaxCategories = [
                    KnownCategory.FourOhOneK,
                    KnownCategory.HealthInsurance,
                    KnownCategory.Medical,
                    KnownCategory.DentalInsurance,
                    KnownCategory.VisionInsurance,
                    KnownCategory.HSA
                ] as Array<string>;

                const taxCategories = [
                    KnownCategory.FederalTax,
                    KnownCategory.StateTax,
                    KnownCategory.LocalTax,
                    KnownCategory.SocialSecurity,
                    KnownCategory.Medicare,
                    KnownCategory.Taxes
                ] as Array<string>;

                if (s.categoryId && preTaxCategories.includes(s.categoryId)) {
                    const existing = items['pre-tax'].find(
                        p =>
                            p.categoryId === s.categoryId ||
                            (p.key && s.id === `split-${p.key}`) ||
                            (s.categoryId === KnownCategory.Medical && p.key === 'medical')
                    );
                    if (existing) {
                        existing.amount = amt;
                        if (s.memo) existing.memo = s.memo;
                    } else {
                        let key: string | undefined;
                        if (s.categoryId === KnownCategory.HSA) key = 'hsa';
                        items['pre-tax'].push({
                            id: s.id,
                            key,
                            memo: s.memo || 'Pre-Tax Deduction',
                            amount: amt,
                            categoryId: s.categoryId
                        });
                    }
                } else if (s.categoryId && taxCategories.includes(s.categoryId)) {
                    const existing = items.taxes.find(
                        t => t.categoryId === s.categoryId || (t.key && s.id === `split-${t.key}`)
                    );
                    if (existing) {
                        existing.amount = amt;
                        if (s.memo) existing.memo = s.memo;
                    } else {
                        let key: string | undefined;
                        if (s.categoryId === KnownCategory.LocalTax) key = 'localTax';
                        items.taxes.push({
                            id: s.id,
                            key,
                            memo: s.memo || 'Tax',
                            amount: amt,
                            categoryId: s.categoryId
                        });
                    }
                } else {
                    // Post-Tax
                    const existing = items['post-tax'].find(
                        pt =>
                            pt.categoryId === s.categoryId || (pt.key && s.id === `split-${pt.key}`)
                    );
                    if (existing) {
                        existing.amount = amt;
                        if (s.memo) existing.memo = s.memo;
                    } else {
                        let key: string | undefined;
                        if (s.categoryId === KnownCategory.Roth401k) key = 'roth401k';
                        else if (s.categoryId === KnownCategory.LifeInsurance)
                            key = 'lifeInsurance';
                        else if (s.categoryId === KnownCategory.DisabilityInsurance)
                            key = 'disabilityInsurance';
                        items['post-tax'].push({
                            id: s.id,
                            key,
                            memo: s.memo || 'Post-Tax Deduction',
                            amount: amt,
                            categoryId: s.categoryId || KnownCategory.Uncategorized
                        });
                    }
                }
            }
        }
        this.paycheckItems = items;
    }
}
