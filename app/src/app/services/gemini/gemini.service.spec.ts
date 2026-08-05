import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { LlmProvider, LlmService } from '../llm/llm.service';
import { UserSettingsStore } from '../user-settings-store/user-settings.store';
import { GeminiService } from './gemini.service';

describe('GeminiService & LlmService', () => {
    it('should default to Gemini provider and manage API key', () => {
        const mockUserSettingsStore = {
            getSetting: vi.fn((key: string) => {
                if (key === 'aiProvider') return LlmProvider.Gemini;
                if (key === 'geminiApiKey') return 'mock-api-key';
                return null;
            }),
            updateSetting: vi.fn()
        };

        TestBed.configureTestingModule({
            providers: [
                LlmService,
                GeminiService,
                { provide: UserSettingsStore, useValue: mockUserSettingsStore }
            ]
        });

        const service = TestBed.inject(GeminiService);

        expect(service.selectedProvider()).toBe(LlmProvider.Gemini);
        expect(service.apiKey()).toBe('mock-api-key');
        expect(service.hasKey()).toBe(true);
    });

    it('should detect provider from key prefix', () => {
        const mockUserSettingsStore = {
            getSetting: vi.fn().mockReturnValue(''),
            updateSetting: vi.fn()
        };

        TestBed.configureTestingModule({
            providers: [LlmService, { provide: UserSettingsStore, useValue: mockUserSettingsStore }]
        });

        const llmService = TestBed.inject(LlmService);

        expect(llmService.autoDetectProvider('sk-ant-api03...')).toBe(LlmProvider.Anthropic);
        expect(llmService.autoDetectProvider('sk-proj-...')).toBe(LlmProvider.OpenAI);
        expect(llmService.autoDetectProvider('AIzaSy...')).toBe(LlmProvider.Gemini);
    });

    it('should throw error when calling generateContent without an API key', async () => {
        const mockUserSettingsStore = {
            getSetting: vi.fn().mockReturnValue(''),
            updateSetting: vi.fn()
        };

        TestBed.configureTestingModule({
            providers: [
                GeminiService,
                LlmService,
                { provide: UserSettingsStore, useValue: mockUserSettingsStore }
            ]
        });

        const service = TestBed.inject(GeminiService);

        await expect(service.generateContent('hello')).rejects.toThrow(
            'API key is not configured for the active AI provider.'
        );
    });
});
