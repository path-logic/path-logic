import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiAutoCategorizeService } from '../../../services/ai-auto-categorize/ai-auto-categorize.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { AiMatchingBannerComponent } from './ai-matching-banner.component';

describe('AiMatchingBannerComponent', () => {
    let component: AiMatchingBannerComponent;
    let fixture: ComponentFixture<AiMatchingBannerComponent>;
    let mockAiService: {
        status: ReturnType<typeof signal>;
        progress: ReturnType<typeof signal>;
        suggestions: ReturnType<typeof signal>;
        error: ReturnType<typeof signal>;
        acceptAll: ReturnType<typeof vi.fn>;
        cancel: ReturnType<typeof vi.fn>;
        dismiss: ReturnType<typeof vi.fn>;
    };
    let mockLedgerStore: {
        categories: ReturnType<typeof signal>;
    };

    beforeEach(async () => {
        mockAiService = {
            status: signal<'idle' | 'running' | 'completed' | 'error'>('idle'),
            progress: signal({ pct: 0, processed: 0, total: 0, message: '' }),
            suggestions: signal([]),
            error: signal(null),
            acceptAll: vi.fn().mockResolvedValue(2),
            cancel: vi.fn(),
            dismiss: vi.fn()
        };

        mockLedgerStore = {
            categories: signal([{ id: 'cat-groceries', name: 'Groceries' }])
        };

        await TestBed.configureTestingModule({
            imports: [AiMatchingBannerComponent],
            providers: [
                { provide: AiAutoCategorizeService, useValue: mockAiService },
                { provide: LedgerStore, useValue: mockLedgerStore }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(AiMatchingBannerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should be hidden when status is idle', () => {
        expect(component.isVisible()).toBe(false);
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.querySelector('[role="status"]')).toBeNull();
    });

    it('should render running state with progress', () => {
        mockAiService.status.set('running');
        mockAiService.progress.set({
            pct: 60,
            processed: 12,
            total: 20,
            message: 'Analyzing merchants...'
        });
        fixture.detectChanges();

        expect(component.isVisible()).toBe(true);
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.textContent).toContain('AI Auto-Categorizing');
        expect(compiled.textContent).toContain('60%');
        expect(compiled.textContent).toContain('12 of 20 processed');

        const cancelBtn = compiled.querySelector(
            'button[aria-label="Cancel AI Auto-Categorization"]'
        );
        expect(cancelBtn).not.toBeNull();
        (cancelBtn as HTMLButtonElement).click();
        expect(mockAiService.cancel).toHaveBeenCalled();
    });

    it('should render completed state and trigger acceptAll', async () => {
        mockAiService.status.set('completed');
        mockAiService.suggestions.set([
            {
                unknownCategory: 'Payee: Trader Joe',
                matchedCategoryId: 'cat-groceries',
                confidence: 'high',
                source: 'heuristic'
            }
        ]);
        fixture.detectChanges();

        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.textContent).toContain('AI Auto-Categorization Complete');
        expect(compiled.textContent).toContain('1 categorized');

        await component.handleAcceptAll();
        expect(mockAiService.acceptAll).toHaveBeenCalled();
    });
});
