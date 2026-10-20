import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { provideStoryFixtures } from '../../testing/story-fixtures';
import {
    ComboLedgerEntryComponent,
    DefaultLedger,
    InteractiveCreateTransactionFlow,
    InteractiveEditTransactionFlow,
    InteractiveSplitTransactionFlow,
    sharedMockLedgerStore
} from './ledger-entry.combo.stories';

describe('ComboLedgerEntryComponent (Storybook Interaction Spec Wrapper)', () => {
    let fixture: ComponentFixture<ComboLedgerEntryComponent>;
    let detectChangesInterval: ReturnType<typeof setInterval>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ComboLedgerEntryComponent],
            providers: provideStoryFixtures({ customLedger: sharedMockLedgerStore })
        }).compileComponents();

        fixture = TestBed.createComponent(ComboLedgerEntryComponent);
        fixture.detectChanges();

        detectChangesInterval = setInterval((): void => {
            try {
                fixture.detectChanges();
            } catch {
                // Ignore if fixture is destroyed
            }
        }, 50);
    });

    afterEach((): void => {
        clearInterval(detectChangesInterval);
    });

    it('executes DefaultLedger story interaction test', async () => {
        await DefaultLedger.play?.({ canvasElement: fixture.nativeElement } as any);
        const countElem = fixture.nativeElement.querySelector('[data-testid="tx-count"]');
        expect(countElem?.textContent?.trim()).toBe('4');
    }, 15000);

    it('executes InteractiveCreateTransactionFlow story interaction test', async () => {
        await InteractiveCreateTransactionFlow.play?.({
            canvasElement: fixture.nativeElement
        } as any);
        const text = fixture.nativeElement.textContent || '';
        expect(text).toContain('Target Superstore');
    }, 15000);

    it('executes InteractiveEditTransactionFlow story interaction test', async () => {
        await InteractiveEditTransactionFlow.play?.({
            canvasElement: fixture.nativeElement
        } as any);
        const text = fixture.nativeElement.textContent || '';
        expect(text).toContain('Updated Afternoon Coffee Memo');
    }, 15000);

    it('executes InteractiveSplitTransactionFlow story interaction test', async () => {
        await InteractiveSplitTransactionFlow.play?.({
            canvasElement: fixture.nativeElement
        } as any);
        const text = fixture.nativeElement.textContent || '';
        expect(text).toContain('Costco Wholesale');
    }, 15000);
});
