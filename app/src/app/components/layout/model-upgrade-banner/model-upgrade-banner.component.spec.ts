import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { INewerModelAlert } from '../../../services/llm/llm.service';
import { LlmProvider, LlmService } from '../../../services/llm/llm.service';
import { ModelUpgradeBannerComponent } from './model-upgrade-banner.component';

describe('ModelUpgradeBannerComponent', () => {
    let fixture: ComponentFixture<ModelUpgradeBannerComponent>;
    let component: ModelUpgradeBannerComponent;

    const mockAlertSignal = signal<INewerModelAlert | null>(null);
    const mockCheckStartupNewerModel = vi.fn().mockResolvedValue(undefined);
    const mockUpgradeToNewestModel = vi.fn().mockResolvedValue(undefined);
    const mockDismissModelUpgrade = vi.fn().mockResolvedValue(undefined);

    const mockLlmService = {
        newerModelAlert: mockAlertSignal,
        checkStartupNewerModel: mockCheckStartupNewerModel,
        upgradeToNewestModel: mockUpgradeToNewestModel,
        dismissModelUpgrade: mockDismissModelUpgrade
    };

    beforeEach(async () => {
        mockAlertSignal.set(null);
        mockCheckStartupNewerModel.mockClear();
        mockUpgradeToNewestModel.mockClear();
        mockDismissModelUpgrade.mockClear();

        await TestBed.configureTestingModule({
            imports: [ModelUpgradeBannerComponent],
            providers: [{ provide: LlmService, useValue: mockLlmService }]
        }).compileComponents();

        fixture = TestBed.createComponent(ModelUpgradeBannerComponent);
        component = fixture.componentInstance;
    });

    it('creates the component and checks for startup newer model', () => {
        fixture.detectChanges();
        expect(component).toBeTruthy();
        expect(mockCheckStartupNewerModel).toHaveBeenCalledTimes(1);
    });

    it('renders nothing when there is no alert', () => {
        fixture.detectChanges();
        const alertEl = fixture.nativeElement.querySelector('[role="alert"]');
        expect(alertEl).toBeNull();
    });

    it('renders alert banner when a newer model is available', () => {
        mockAlertSignal.set({
            currentModel: 'gemini-1.5-flash',
            newestModel: 'gemini-2.0-flash',
            newestLabel: 'Gemini 2.0 Flash',
            provider: LlmProvider.Gemini
        });
        fixture.detectChanges();

        const alertEl = fixture.nativeElement.querySelector('[role="alert"]');
        expect(alertEl).not.toBeNull();
        expect(alertEl.textContent).toContain('Gemini 2.0 Flash');
        expect(alertEl.textContent).toContain('gemini-1.5-flash');
    });

    it('triggers upgradeToNewestModel when Upgrade Model button is clicked', async () => {
        mockAlertSignal.set({
            currentModel: 'gemini-1.5-flash',
            newestModel: 'gemini-2.0-flash',
            newestLabel: 'Gemini 2.0 Flash',
            provider: LlmProvider.Gemini
        });
        fixture.detectChanges();

        const upgradeBtn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
        expect(upgradeBtn).not.toBeNull();
        expect(upgradeBtn.textContent).toContain('Upgrade Model');

        upgradeBtn.click();
        expect(mockUpgradeToNewestModel).toHaveBeenCalledWith('gemini-2.0-flash');
    });

    it('triggers dismissModelUpgrade when Dismiss button is clicked', async () => {
        mockAlertSignal.set({
            currentModel: 'claude-3-haiku',
            newestModel: 'claude-3-5-sonnet',
            newestLabel: 'Claude 3.5 Sonnet',
            provider: LlmProvider.Anthropic
        });
        fixture.detectChanges();

        const buttons = fixture.nativeElement.querySelectorAll('button');
        const dismissBtn = buttons[1] as HTMLButtonElement;
        expect(dismissBtn).not.toBeNull();
        expect(dismissBtn.textContent).toContain('Dismiss');

        dismissBtn.click();
        expect(mockDismissModelUpgrade).toHaveBeenCalledWith('claude-3-5-sonnet');
    });

    it('does not throw when upgrade or dismiss is invoked with null alert', async () => {
        mockAlertSignal.set(null);
        await expect(component.upgrade()).resolves.toBeUndefined();
        await expect(component.dismiss()).resolves.toBeUndefined();
        expect(mockUpgradeToNewestModel).not.toHaveBeenCalled();
        expect(mockDismissModelUpgrade).not.toHaveBeenCalled();
    });
});
