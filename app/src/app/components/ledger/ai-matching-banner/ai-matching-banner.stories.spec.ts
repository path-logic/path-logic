import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { AiAutoCategorizeService } from '../../../services/ai-auto-categorize/ai-auto-categorize.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { AiMatchingBannerComponent } from './ai-matching-banner.component';
import { CompletedState, ErrorState, RunningState } from './ai-matching-banner.component.stories';

describe('AiMatchingBannerComponent (Storybook Interaction Spec Wrapper)', () => {
    let mockAiService: {
        status: ReturnType<typeof signal>;
        progress: ReturnType<typeof signal>;
        suggestions: ReturnType<typeof signal>;
        error: ReturnType<typeof signal>;
        acceptAll: () => Promise<number>;
        cancel: () => void;
        dismiss: () => void;
    };
    let mockLedgerStore: {
        categories: ReturnType<typeof signal>;
    };

    beforeEach(() => {
        mockAiService = {
            status: signal<'idle' | 'running' | 'completed' | 'error'>('running'),
            progress: signal({
                pct: 45,
                processed: 18,
                total: 40,
                message: 'Analyzing merchants...'
            }),
            suggestions: signal([]),
            error: signal(null),
            acceptAll: async () => 2,
            cancel: () => {},
            dismiss: () => {}
        };

        mockLedgerStore = {
            categories: signal([
                { id: 'cat-groceries', name: 'Groceries' },
                { id: 'cat-coffee', name: 'Coffee Shops' }
            ])
        };
    });

    it('executes RunningState story interaction test', async () => {
        await TestBed.configureTestingModule({
            imports: [AiMatchingBannerComponent],
            providers: [
                { provide: AiAutoCategorizeService, useValue: mockAiService },
                { provide: LedgerStore, useValue: mockLedgerStore }
            ]
        }).compileComponents();

        const fixture: ComponentFixture<AiMatchingBannerComponent> =
            TestBed.createComponent(AiMatchingBannerComponent);
        fixture.detectChanges();

        // Run Storybook play interaction test against fixture element
        await RunningState.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('AI Auto-Categorizing');
    });

    it('executes CompletedState story interaction test', async () => {
        mockAiService.status.set('completed');
        mockAiService.suggestions.set([
            {
                unknownCategory: 'Payee: Trader Joe',
                matchedCategoryId: 'cat-groceries',
                confidence: 'high',
                source: 'heuristic'
            },
            {
                unknownCategory: 'Payee: Peets Coffee',
                matchedCategoryId: 'cat-coffee',
                confidence: 'high',
                source: 'ai'
            }
        ]);

        await TestBed.configureTestingModule({
            imports: [AiMatchingBannerComponent],
            providers: [
                { provide: AiAutoCategorizeService, useValue: mockAiService },
                { provide: LedgerStore, useValue: mockLedgerStore }
            ]
        }).compileComponents();

        const fixture = TestBed.createComponent(AiMatchingBannerComponent);
        fixture.detectChanges();

        await CompletedState.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('AI Auto-Categorization Complete');
    });

    it('executes ErrorState story interaction test', async () => {
        mockAiService.status.set('error');
        mockAiService.error.set({
            message: 'Rate limit exceeded: 429 Resource Exhausted',
            isQuota: true
        });

        await TestBed.configureTestingModule({
            imports: [AiMatchingBannerComponent],
            providers: [
                { provide: AiAutoCategorizeService, useValue: mockAiService },
                { provide: LedgerStore, useValue: mockLedgerStore }
            ]
        }).compileComponents();

        const fixture = TestBed.createComponent(AiMatchingBannerComponent);
        fixture.detectChanges();

        await ErrorState.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Rate limit exceeded');
    }, 15000);
});
