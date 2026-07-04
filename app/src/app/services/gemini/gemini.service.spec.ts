import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { UserSettingsStore } from '../user-settings-store/user-settings.store';
import { GeminiService } from './gemini.service';

describe('GeminiService', () => {
    it('should be created and manage API key', () => {
        const mockUserSettingsStore = {
            getSetting: vi.fn().mockReturnValue('mock-api-key'),
            updateSetting: vi.fn()
        };

        TestBed.configureTestingModule({
            providers: [
                GeminiService,
                { provide: UserSettingsStore, useValue: mockUserSettingsStore }
            ]
        });

        const service = TestBed.inject(GeminiService);

        expect(service.apiKey()).toBe('mock-api-key');
        expect(mockUserSettingsStore.getSetting).toHaveBeenCalledWith('geminiApiKey');
        expect(service.hasKey()).toBe(true);

        mockUserSettingsStore.getSetting.mockReturnValue('');
        expect(service.hasKey()).toBe(false);
    });

    it('should throw if no API key', async () => {
        const mockUserSettingsStore = {
            getSetting: vi.fn().mockReturnValue(''),
            updateSetting: vi.fn()
        };

        TestBed.configureTestingModule({
            providers: [
                GeminiService,
                { provide: UserSettingsStore, useValue: mockUserSettingsStore }
            ]
        });

        const service = TestBed.inject(GeminiService);

        await expect(service.generateContent('hello')).rejects.toThrow(
            'Gemini API key is not configured in settings.'
        );
    });
});
