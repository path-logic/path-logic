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

    it('should prioritize Gemini 4 Argon as the default model over Gemini 3.8 Flash', async () => {
        const mockUserSettingsStore = {
            getSetting: vi.fn().mockReturnValue(''),
            updateSetting: vi.fn()
        };

        TestBed.configureTestingModule({
            providers: [LlmService, { provide: UserSettingsStore, useValue: mockUserSettingsStore }]
        });

        const llmService = TestBed.inject(LlmService);

        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => ({
                models: [
                    {
                        name: 'models/gemini-3.8-flash',
                        displayName: 'Gemini 3.8 Flash',
                        supportedGenerationMethods: ['generateContent']
                    },
                    {
                        name: 'models/gemini-4-argon',
                        displayName: 'Gemini 4 Argon',
                        supportedGenerationMethods: ['generateContent']
                    }
                ]
            })
        } as Response);

        const models = await llmService.listModels(LlmProvider.Gemini, 'AIzaSyTestKey');
        expect(models[0]?.value).toBe('gemini-4-argon');
        expect(models[0]?.isDefault).toBe(true);
        expect(models[1]?.value).toBe('gemini-3.8-flash');
        expect(models[1]?.isDefault).toBeFalsy();
        expect(
            llmService.isModelNewer(
                'gemini-4-argon',
                'gemini-3.8-flash',
                'Gemini 4 Argon',
                'Gemini 3.8 Flash'
            )
        ).toBe(true);

        fetchSpy.mockRestore();
    });
});
