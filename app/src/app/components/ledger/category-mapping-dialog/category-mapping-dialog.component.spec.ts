import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiAutoCategorizeService } from '../../../services/ai-auto-categorize/ai-auto-categorize.service';
import { GeminiService } from '../../../services/gemini/gemini.service';
import { ImportOrchestrationService } from '../../../services/import/import-orchestration.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { CategoryMappingDialogComponent } from './category-mapping-dialog.component';

describe('CategoryMappingDialogComponent', () => {
    let fixture: ComponentFixture<CategoryMappingDialogComponent>;
    let component: CategoryMappingDialogComponent;
    let mockImportService: {
        unknownCategories: ReturnType<typeof signal<Array<string>>>;
        resolveUnknownCategories: ReturnType<typeof vi.fn<() => Promise<void>>>;
        resolveWithBackgroundCategorization: ReturnType<typeof vi.fn<() => Promise<void>>>;
        cancel: ReturnType<typeof vi.fn<() => void>>;
        reset: ReturnType<typeof vi.fn<() => void>>;
    };
    let mockLedgerStore: {
        categories: ReturnType<typeof signal<Array<any>>>;
        payees: ReturnType<typeof signal<Array<any>>>;
        transactions: ReturnType<typeof signal<Array<any>>>;
    };
    let mockGeminiService: {
        hasKey: ReturnType<typeof vi.fn<() => boolean>>;
        apiKey: ReturnType<typeof vi.fn<() => string>>;
        generateContent: ReturnType<typeof vi.fn<() => Promise<string>>>;
    };
    let mockAiService: {
        startBackgroundCategorization: ReturnType<
            typeof vi.fn<(txs: Array<any>, unknowns: Array<string>) => void>
        >;
        status: ReturnType<typeof signal<string>>;
    };
    let mockRouter: {
        navigate: ReturnType<typeof vi.fn<(commands: Array<any>) => Promise<boolean>>>;
    };

    beforeEach(async () => {
        mockImportService = {
            unknownCategories: signal(['Payee: Trader Joe', 'Fast Food: Burger King']),
            resolveUnknownCategories: vi.fn().mockResolvedValue(undefined),
            resolveWithBackgroundCategorization: vi.fn().mockResolvedValue(undefined),
            cancel: vi.fn(),
            reset: vi.fn()
        };

        mockLedgerStore = {
            categories: signal([
                { id: 'cat-groceries', name: 'Groceries', parentId: null },
                { id: 'cat-restaurants', name: 'Restaurants', parentId: null }
            ]),
            payees: signal([]),
            transactions: signal([])
        };

        mockGeminiService = {
            hasKey: vi.fn().mockReturnValue(true),
            apiKey: vi.fn().mockReturnValue('test-key'),
            generateContent: vi.fn().mockResolvedValue(JSON.stringify({ mappings: [] }))
        };

        mockAiService = {
            startBackgroundCategorization: vi.fn(),
            status: signal('idle')
        };

        mockRouter = {
            navigate: vi.fn().mockResolvedValue(true)
        };

        await TestBed.configureTestingModule({
            imports: [CategoryMappingDialogComponent],
            providers: [
                { provide: ImportOrchestrationService, useValue: mockImportService },
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: GeminiService, useValue: mockGeminiService },
                { provide: AiAutoCategorizeService, useValue: mockAiService },
                { provide: Router, useValue: mockRouter }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(CategoryMappingDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the category mapping dialog component', () => {
        expect(component).toBeTruthy();
    });

    it('should show Run in Background button in the top AI panel only when AI is configured', () => {
        // AI is configured
        expect(mockGeminiService.hasKey()).toBe(true);
        const text = document.body.textContent;
        expect(text).toContain('Run in Background & Open Ledger');
        expect(text).toContain('AI Auto-Map');

        // AI is NOT configured
        mockGeminiService.hasKey.mockReturnValue(false);
        fixture.detectChanges();

        const updatedText = document.body.textContent;
        expect(updatedText).not.toContain('Run in Background & Open Ledger');
        expect(updatedText).not.toContain('AI Auto-Map');
        expect(updatedText).toContain('Automatic AI Category Discovery');
        expect(updatedText).toContain('Configure in Settings');
    });

    it('should call handleCancel and importService.reset() when Cancel Import is clicked', () => {
        component.handleCancel();

        expect(mockImportService.reset).toHaveBeenCalled();
        expect(Object.keys(component.mappings()).length).toBe(0);
    });

    it('should navigate to /settings and reset import when goToSettings is called', () => {
        component.goToSettings();

        expect(mockImportService.reset).toHaveBeenCalled();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/settings']);
    });

    it('should layout AI action buttons in a row beneath the explanation text', () => {
        expect(mockGeminiService.hasKey()).toBe(true);

        const aiPanel = document.body.querySelector('.ai-mapping-panel') as HTMLElement;
        expect(aiPanel).toBeTruthy();

        // The banner container uses flex flex-col so that the buttons row sits beneath the text block
        const container = aiPanel.querySelector('.banner-content-container') as HTMLElement;
        expect(container).toBeTruthy();
        expect(container.className).toContain('flex-col');
        expect(container.className).not.toContain('sm:flex-row');

        const buttonsRow = container.querySelector('.ai-actions-row') as HTMLElement;
        expect(buttonsRow).toBeTruthy();
        expect(buttonsRow.className).toContain('flex');
    });
});
