import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiAutoCategorizeService } from '../../../services/ai-auto-categorize/ai-auto-categorize.service';
import { GeminiService } from '../../../services/gemini/gemini.service';
import { ImportOrchestrationService } from '../../../services/import/import-orchestration.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { CategoryMappingDialogComponent } from './category-mapping-dialog.component';
import {
    AiNotConfigured,
    ClickBackgroundCategorize,
    DefaultWithUnknowns
} from './category-mapping-dialog.component.stories';

describe('CategoryMappingDialogComponent (Storybook Interaction Spec Wrapper)', () => {
    let mockImportService: {
        unknownCategories: ReturnType<typeof signal>;
        resolveUnknownCategories: () => Promise<void>;
        resolveWithBackgroundCategorization: () => Promise<void>;
        cancel: () => void;
        reset: () => void;
    };
    let mockLedgerStore: {
        categories: ReturnType<typeof signal>;
        payees: ReturnType<typeof signal>;
        transactions: ReturnType<typeof signal>;
        createCategory: () => Promise<{ id: string; name: string }>;
        bulkUpsertPayeesAndAliases: () => Promise<void>;
    };
    let mockGeminiService: {
        hasKey: () => boolean;
        apiKey: () => string;
        generateContent: () => Promise<string>;
    };
    let mockAiService: {
        startBackgroundCategorization: () => void;
        status: ReturnType<typeof signal>;
    };

    beforeEach(() => {
        mockImportService = {
            unknownCategories: signal(['Payee: Trader Joe', 'Fast Food: Burger King']),
            resolveUnknownCategories: async () => {},
            resolveWithBackgroundCategorization: async () => {},
            cancel: vi.fn(),
            reset: vi.fn()
        };

        mockLedgerStore = {
            categories: signal([
                { id: 'cat-groceries', name: 'Groceries', parentId: null },
                { id: 'cat-restaurants', name: 'Restaurants', parentId: null }
            ]),
            payees: signal([]),
            transactions: signal([]),
            createCategory: async () => ({ id: 'cat-new', name: 'New' }),
            bulkUpsertPayeesAndAliases: async () => {}
        };

        mockGeminiService = {
            hasKey: () => true,
            apiKey: () => 'test-key',
            generateContent: async () => JSON.stringify({ mappings: [] })
        };

        mockAiService = {
            startBackgroundCategorization: () => {},
            status: signal('idle')
        };
    });

    it('executes DefaultWithUnknowns story interaction test', async () => {
        await TestBed.configureTestingModule({
            imports: [CategoryMappingDialogComponent],
            providers: [
                { provide: ImportOrchestrationService, useValue: mockImportService },
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: GeminiService, useValue: mockGeminiService },
                { provide: AiAutoCategorizeService, useValue: mockAiService }
            ]
        }).compileComponents();

        const fixture: ComponentFixture<CategoryMappingDialogComponent> = TestBed.createComponent(
            CategoryMappingDialogComponent
        );
        fixture.detectChanges();

        await DefaultWithUnknowns.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(document.body.textContent).toContain('Unknown Categories & Payees Detected');
    }, 15000);

    it('executes ClickBackgroundCategorize story interaction test', async () => {
        await TestBed.configureTestingModule({
            imports: [CategoryMappingDialogComponent],
            providers: [
                { provide: ImportOrchestrationService, useValue: mockImportService },
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: GeminiService, useValue: mockGeminiService },
                { provide: AiAutoCategorizeService, useValue: mockAiService }
            ]
        }).compileComponents();

        const fixture: ComponentFixture<CategoryMappingDialogComponent> = TestBed.createComponent(
            CategoryMappingDialogComponent
        );
        fixture.detectChanges();

        await ClickBackgroundCategorize.play?.({ canvasElement: fixture.nativeElement } as any);
    });

    it('executes AiNotConfigured story interaction test and displays friendly AI guidance', async () => {
        mockGeminiService.hasKey = () => false;

        await TestBed.configureTestingModule({
            imports: [CategoryMappingDialogComponent],
            providers: [
                { provide: ImportOrchestrationService, useValue: mockImportService },
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: GeminiService, useValue: mockGeminiService },
                { provide: AiAutoCategorizeService, useValue: mockAiService }
            ]
        }).compileComponents();

        const fixture: ComponentFixture<CategoryMappingDialogComponent> = TestBed.createComponent(
            CategoryMappingDialogComponent
        );
        fixture.detectChanges();

        await AiNotConfigured.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(document.body.textContent).toContain('Automatic AI Category Discovery');
        expect(document.body.textContent).toContain('Settings → AI & Intelligence');
    });

    it('should reset import service when Cancel Import is clicked', async () => {
        await TestBed.configureTestingModule({
            imports: [CategoryMappingDialogComponent],
            providers: [
                { provide: ImportOrchestrationService, useValue: mockImportService },
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: GeminiService, useValue: mockGeminiService },
                { provide: AiAutoCategorizeService, useValue: mockAiService }
            ]
        }).compileComponents();

        const fixture: ComponentFixture<CategoryMappingDialogComponent> = TestBed.createComponent(
            CategoryMappingDialogComponent
        );
        fixture.detectChanges();

        const cancelBtn = document.body.querySelector(
            'button[label="Cancel Import"], .p-button-secondary'
        ) as HTMLButtonElement;
        expect(cancelBtn).toBeTruthy();
        cancelBtn.click();

        expect(mockImportService.reset).toHaveBeenCalled();
    });
});
