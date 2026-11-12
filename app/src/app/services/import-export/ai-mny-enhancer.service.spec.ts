import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import type { IMnyCategory, IMnyPayee } from '../../core/parsers/MNYParser';
import { AiMnyEnhancerService } from './ai-mny-enhancer.service';

describe('AiMnyEnhancerService', () => {
    let service: AiMnyEnhancerService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [AiMnyEnhancerService]
        });
        service = TestBed.inject(AiMnyEnhancerService);
    });

    describe('cleanPayeeName', () => {
        it('cleans Amazon transaction descriptions with terminal and marketplace IDs while preserving sub-brands and Affirm/Amazon', () => {
            expect(service.cleanPayeeName('AMZN MKTP US*2X1Y4 SEATTLE WA')).toBe('Amazon');
            expect(service.cleanPayeeName('AMAZON.COM*4A82Z SEATTLE WA')).toBe('Amazon');
            expect(service.cleanPayeeName('AMAZONCOM SEATTLE WA')).toBe('Amazon');
            expect(service.cleanPayeeName('Amazoncom Amzncombill')).toBe('Amazon');
            expect(service.cleanPayeeName('AMAZON MARKEPLACE NA PA')).toBe('Amazon');
            expect(service.cleanPayeeName('Affirm/Amazon')).toBe('Affirm/Amazon');
            expect(service.cleanPayeeName('Amazon Fresh')).toBe('Amazon Fresh');
            expect(service.cleanPayeeName('Amazon Kids+')).toBe('Amazon Kids+');
            expect(service.cleanPayeeName('Amazon Prime Visa')).toBe('Amazon Prime Visa');
        });

        it('cleans grocery and coffee store transactions with store numbers and POS codes', () => {
            expect(service.cleanPayeeName('CHECKCRD 0412 TRADER JOE #541 CHICAGO IL')).toBe(
                "Trader Joe's"
            );
            expect(service.cleanPayeeName('SQ *STARBUCKS COFFEE #104')).toBe('Starbucks');
            expect(service.cleanPayeeName('COSTCO WHSE #1042')).toBe('Costco');
        });

        it('cleans gas station and ride sharing transactions', () => {
            expect(service.cleanPayeeName('SHELL OIL 57441412 CHICAGO IL')).toBe('Shell');
            expect(service.cleanPayeeName('UBER *TRIP 4924A SAN FRANCISCO')).toBe('Uber');
        });

        it('cleans recurring digital services and utilities', () => {
            expect(service.cleanPayeeName('PAYPAL *NETFLIX.COM 402-935-7733 CA')).toBe('Netflix');
            expect(service.cleanPayeeName('COMCAST CABLE COMM')).toBe('Xfinity / Comcast');
        });

        it('converts ALL-CAPS generic merchants into clean Title Case', () => {
            expect(service.cleanPayeeName('DR. JOHN SMITH DDS')).toBe('Dr. John Smith Dds');
            expect(service.cleanPayeeName('LOCAL HARDWARE SUPPLY')).toBe('Local Hardware Supply');
        });

        it('strips leading punctuation, truncated city-state fragments, and normalizes financial acronyms', () => {
            expect(service.cleanPayeeName('.Balance Transfer Fee')).toBe('Balance Transfer Fee');
            expect(service.cleanPayeeName('.American Express Ft Lauderda')).toBe(
                'American Express'
            );
            expect(service.cleanPayeeName('.American Express Ft Lauderdale')).toBe(
                'American Express'
            );
            expect(service.cleanPayeeName('.Hsbc Retail Services City Of In')).toBe(
                'HSBC Retail Services'
            );
        });
    });

    describe('reconcilePayees', () => {
        it('reconciles exact and near-duplicate (almost duplicate) payees into canonical groups', () => {
            const rawPayees: Array<IMnyPayee> = [
                { mnyPayeeId: 1, name: '.American Express Ft Lauderda' },
                { mnyPayeeId: 2, name: '.American Express Ft Lauderdale' },
                { mnyPayeeId: 3, name: 'Suburban Bank & Tr' },
                { mnyPayeeId: 4, name: 'Suburban Bank & Trust' },
                { mnyPayeeId: 5, name: 'Northwest Communit' },
                { mnyPayeeId: 6, name: 'Northwest Community' },
                { mnyPayeeId: 7, name: '.Balance Transfer Fee' }
            ];

            const groups = service.reconcilePayees(rawPayees);
            expect(groups.length).toBe(4);

            const amex = groups.find(g => g.canonicalName === 'American Express');
            expect(amex).toBeDefined();
            expect(amex?.isReconciledDuplicate).toBe(true);
            expect(amex?.mergedCount).toBe(2);
            expect(amex?.mergedPayeeIds).toEqual([1, 2]);

            const suburban = groups.find(g => g.canonicalName.includes('Suburban Bank'));
            expect(suburban).toBeDefined();
            expect(suburban?.isReconciledDuplicate).toBe(true);
            expect(suburban?.mergedCount).toBe(2);
            expect(suburban?.mergedPayeeIds).toEqual([3, 4]);

            const nw = groups.find(g => g.canonicalName === 'Northwest Community');
            expect(nw).toBeDefined();
            expect(nw?.isReconciledDuplicate).toBe(true);
            expect(nw?.mergedCount).toBe(2);
            expect(nw?.mergedPayeeIds).toEqual([5, 6]);
        });

        it('merges all Amazon statement variants into Amazon while keeping Affirm/Amazon and Amazon sub-brands separate, and ignores numeric payees', () => {
            const rawPayees: Array<IMnyPayee> = [
                { mnyPayeeId: 10, name: 'Amazon', isHidden: false, accountNames: ['Chase Bank'] },
                {
                    mnyPayeeId: 11,
                    name: 'AMAZONCOM SEATTLE WA',
                    isHidden: true,
                    accountNames: ['American Express Gold Rewards'],
                    transactionCount: 2
                },
                {
                    mnyPayeeId: 12,
                    name: 'Amazoncom Amzncombill',
                    isHidden: true,
                    accountNames: ['American Express Gold Rewards'],
                    transactionCount: 3
                },
                {
                    mnyPayeeId: 13,
                    name: 'Affirm/Amazon',
                    isHidden: false,
                    accountNames: ['Chase Bank']
                },
                {
                    mnyPayeeId: 14,
                    name: 'Amazon Fresh',
                    isHidden: false,
                    accountNames: ['Amazon Prime Visa']
                },
                {
                    mnyPayeeId: 15,
                    name: '0000001009',
                    isHidden: true,
                    accountNames: ['Chase Checking'],
                    transactionCount: 1
                },
                {
                    mnyPayeeId: 16,
                    name: '11/15/97 - 11/21/97',
                    isHidden: true,
                    accountNames: ['Suburban Bank and Trust Checking'],
                    transactionCount: 1
                }
            ];

            const groups = service.reconcilePayees(rawPayees);
            expect(service.ignoredNumericPayeeCount()).toBe(2);
            expect(groups.map(g => g.canonicalName)).toEqual([
                'Affirm/Amazon',
                'Amazon',
                'Amazon Fresh'
            ]);

            const amazon = groups.find(g => g.canonicalName === 'Amazon');
            expect(amazon?.mergedPayeeIds).toEqual([10, 11, 12]);
            expect(amazon?.hasPrimaryPayee).toBe(true);
            expect(amazon?.accountNames).toEqual(['American Express Gold Rewards', 'Chase Bank']);
        });
    });

    describe('cleanCategoryName', () => {
        it('converts all-caps category names and normalizes subcategory separators', () => {
            expect(service.cleanCategoryName('EXPENSE')).toBe('Expense');
            expect(service.cleanCategoryName('AUTOMOBILE : FUEL')).toBe('Automobile: Fuel');
            expect(service.cleanCategoryName('FOOD / DINING')).toBe('Food / Dining');
        });
    });

    describe('enhanceAll', () => {
        it('processes payees and categories producing non-empty mapping dictionaries', async () => {
            const payees: Array<IMnyPayee> = [
                { mnyPayeeId: 1, name: 'AMZN MKTP US*1234' },
                { mnyPayeeId: 2, name: 'Already Clean Payee' }
            ];
            const categories: Array<IMnyCategory> = [
                {
                    mnyCategoryId: 10,
                    name: 'DINING OUT',
                    parentCategoryId: 131,
                    level: 1,
                    categoryType: 0
                },
                {
                    mnyCategoryId: 11,
                    name: 'Groceries',
                    parentCategoryId: 131,
                    level: 1,
                    categoryType: 0
                }
            ];

            const result = await service.enhanceAll(payees, categories);
            expect(result.payeeMap.get(1)).toBe('Amazon');
            expect(result.payeeMap.has(2)).toBe(false); // already clean
            expect(result.categoryMap.get(10)).toBe('Dining Out');
        });
    });
});
