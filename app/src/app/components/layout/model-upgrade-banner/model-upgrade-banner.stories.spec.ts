import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { INewerModelAlert } from '../../../services/llm/llm.service';
import { LlmProvider, LlmService } from '../../../services/llm/llm.service';
import { ModelUpgradeBannerComponent } from './model-upgrade-banner.component';
import { AnthropicUpgrade, GeminiUpgrade } from './model-upgrade-banner.component.stories';

describe('ModelUpgradeBannerComponent (Storybook Interaction Spec Wrapper)', () => {
    let fixture: ComponentFixture<ModelUpgradeBannerComponent>;

    const mockAlert = signal<INewerModelAlert | null>(null);
    const mockUpgrade = vi.fn().mockResolvedValue(undefined);
    const mockDismiss = vi.fn().mockResolvedValue(undefined);

    const mockLlmService = {
        newerModelAlert: mockAlert,
        checkStartupNewerModel: vi.fn().mockResolvedValue(undefined),
        upgradeToNewestModel: mockUpgrade,
        dismissModelUpgrade: mockDismiss
    };

    beforeEach(async () => {
        mockAlert.set(null);
        mockUpgrade.mockClear();
        mockDismiss.mockClear();

        await TestBed.configureTestingModule({
            imports: [ModelUpgradeBannerComponent],
            providers: [{ provide: LlmService, useValue: mockLlmService }]
        }).compileComponents();

        fixture = TestBed.createComponent(ModelUpgradeBannerComponent);
        fixture.detectChanges();
    });

    it('renders NoAlert story with no visible banner', () => {
        expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    });

    it('executes GeminiUpgrade story interaction test', async () => {
        mockAlert.set({
            currentModel: 'gemini-1.5-flash',
            newestModel: 'gemini-2.0-flash',
            newestLabel: 'Gemini 2.0 Flash',
            provider: LlmProvider.Gemini
        });
        fixture.detectChanges();

        await GeminiUpgrade.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(mockUpgrade).toHaveBeenCalledWith('gemini-2.0-flash');
    });

    it('executes AnthropicUpgrade story interaction test', async () => {
        mockAlert.set({
            currentModel: 'claude-3-haiku',
            newestModel: 'claude-3-5-sonnet',
            newestLabel: 'Claude 3.5 Sonnet',
            provider: LlmProvider.Anthropic
        });
        fixture.detectChanges();

        await AnthropicUpgrade.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(mockDismiss).toHaveBeenCalledWith('claude-3-5-sonnet');
    });
});
