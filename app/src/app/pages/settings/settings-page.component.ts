import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    signal
} from '@angular/core';

import { environment } from '../../../environments/environment';
import { AppShellComponent } from '../../components/layout/app-shell/app-shell.component';
import { FeatureFlagToggleComponent } from '../../components/settings/feature-flag-toggle/feature-flag-toggle.component';
import { FLAG_CONFIGS } from '../../constants/feature-flags';
import type { ILlmModelOption } from '../../services/llm/llm.service';
import { LlmProvider, LlmService } from '../../services/llm/llm.service';
import { type ThemePreference, ThemeService } from '../../services/theme/theme.service';
import { UserSettingsStore } from '../../services/user-settings-store/user-settings.store';

import { ExportDialogComponent } from '../../components/export-import/export-dialog/export-dialog.component';
import { ExportManagerDialogComponent } from '../../components/export-import/export-manager-dialog/export-manager-dialog.component';
import { ImportDialogComponent } from '../../components/export-import/import-dialog/import-dialog.component';

/**
 * Main Settings page for configuring the application.
 * Supports Multi-Provider BYOK AI (Google Gemini, Anthropic Claude, OpenAI)
 * with dynamic default model selection.
 */
@Component({
    selector: 'settings-page',
    standalone: true,
    imports: [
        CommonModule,
        AppShellComponent,
        FeatureFlagToggleComponent,
        ExportDialogComponent,
        ImportDialogComponent,
        ExportManagerDialogComponent
    ],
    templateUrl: './settings-page.component.html',
    styleUrls: ['./settings-page.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsPageComponent {
    readonly showExportDialog = signal<boolean>(false);
    readonly showImportDialog = signal<boolean>(false);
    readonly showExportManagerDialog = signal<boolean>(false);
    private readonly themeService = inject(ThemeService);
    private readonly userSettingsStore = inject(UserSettingsStore);
    private readonly llmService = inject(LlmService);

    readonly LlmProvider = LlmProvider;

    readonly providerOptions: Array<{ value: LlmProvider; label: string }> = [
        { value: LlmProvider.Gemini, label: 'Google Gemini' },
        { value: LlmProvider.Anthropic, label: 'Anthropic Claude' },
        { value: LlmProvider.OpenAI, label: 'OpenAI' }
    ];

    readonly selectedProvider = computed(() => this.llmService.selectedProvider());
    readonly apiKey = computed(() => this.llmService.apiKey());
    readonly hasKey = computed(() => this.llmService.hasKey());
    readonly selectedModel = computed(() => this.llmService.selectedModel());

    readonly apiKeyLabel = computed(() => {
        switch (this.selectedProvider()) {
            case LlmProvider.Anthropic:
                return 'Anthropic Claude API Key';
            case LlmProvider.OpenAI:
                return 'OpenAI API Key';
            case LlmProvider.Gemini:
            default:
                return 'Google Gemini API Key';
        }
    });

    readonly apiKeyPlaceholder = computed(() => {
        switch (this.selectedProvider()) {
            case LlmProvider.Anthropic:
                return 'sk-ant-api03...';
            case LlmProvider.OpenAI:
                return 'sk-proj-...';
            case LlmProvider.Gemini:
            default:
                return 'AIzaSy...';
        }
    });

    readonly showGuide = signal(false);

    readonly FLAG_CONFIGS = Object.values(FLAG_CONFIGS);
    readonly currentTheme = this.themeService.preference;

    readonly themeOptions: Array<{ value: ThemePreference; label: string; icon: string }> = [
        { value: 'system', label: 'System', icon: 'pi-desktop' },
        { value: 'light', label: 'Light', icon: 'pi-sun' },
        { value: 'dark', label: 'Dark', icon: 'pi-moon' }
    ];

    readonly dynamicModels = signal<Array<ILlmModelOption>>([]);

    readonly modelOptions = computed(() => {
        if (!this.hasKey()) {
            return [{ value: '', label: 'Save an API key to select a model' }];
        }

        const dyn = this.dynamicModels();
        if (dyn.length > 0) {
            return [...dyn, { value: 'custom', label: 'Custom Model...' }];
        }

        return [{ value: '', label: 'Loading models...' }];
    });

    readonly isCustomModel = computed(() => {
        if (!this.hasKey()) return false;
        const saved = this.selectedModel();
        return !this.modelOptions().some(opt => opt.value === saved && opt.value !== 'custom');
    });

    readonly storybookUrl = environment.production
        ? 'https://storybook.pathlogicfinance.com'
        : 'http://localhost:6006';

    readonly devKeySet = signal<boolean>(this.checkDevKey());
    private versionClickCount = signal<number>(0);

    private checkDevKey(): boolean {
        try {
            return (
                localStorage.getItem('path_logic_dev') === 'true' ||
                localStorage.getItem('path_logic_dev_mode') === 'true' ||
                localStorage.getItem('dev_mode') === 'true' ||
                localStorage.getItem('path-logic-dev') === 'true'
            );
        } catch {
            return false;
        }
    }

    onVersionClick(): void {
        const next = this.versionClickCount() + 1;
        this.versionClickCount.set(next);
        if (next >= 5) {
            try {
                const isSet = this.checkDevKey();
                if (isSet) {
                    localStorage.removeItem('path_logic_dev');
                    localStorage.removeItem('path_logic_dev_mode');
                    localStorage.removeItem('dev_mode');
                    localStorage.removeItem('path-logic-dev');
                } else {
                    localStorage.setItem('path_logic_dev', 'true');
                }
            } catch {
                // ignore storage error
            }
            this.devKeySet.set(this.checkDevKey());
            this.versionClickCount.set(0);
        }
    }

    constructor() {
        effect(() => {
            const key = this.apiKey();
            const provider = this.selectedProvider();
            if (key) {
                void this.loadDynamicModels(provider, key);
            } else {
                this.dynamicModels.set([]);
            }
        });
    }

    async loadDynamicModels(provider: LlmProvider, key: string): Promise<void> {
        try {
            const models = await this.llmService.listModels(provider, key);
            this.dynamicModels.set(models);

            // Auto-select the default model (newest Flash for Gemini, newest Sonnet for Claude, mini for OpenAI)
            const defaultModel = models.find(m => m.isDefault)?.value ?? models[0]?.value;
            const currentSaved = this.userSettingsStore.getSetting('aiModel');

            if (!currentSaved && defaultModel) {
                this.userSettingsStore.updateSetting('aiModel', defaultModel);
            }
        } catch (err) {
            console.error('Failed to load dynamic models:', err);
            this.dynamicModels.set([]);
        }
    }

    setTheme(pref: ThemePreference): void {
        this.themeService.setTheme(pref);
    }

    updateProvider(providerStr: string): void {
        const provider = providerStr as LlmProvider;
        this.userSettingsStore.updateSetting('aiProvider', provider);
        // Reload models for new provider if key exists
        const key = this.apiKey();
        if (key) {
            void this.loadDynamicModels(provider, key);
        } else {
            this.dynamicModels.set([]);
        }
    }

    updateApiKey(key: string): void {
        const trimmed = key.trim();
        const detectedProvider = this.llmService.autoDetectProvider(trimmed);

        if (detectedProvider !== this.selectedProvider()) {
            this.userSettingsStore.updateSetting('aiProvider', detectedProvider);
        }

        if (detectedProvider === LlmProvider.Anthropic) {
            this.userSettingsStore.updateSetting('anthropicApiKey', trimmed);
        } else if (detectedProvider === LlmProvider.OpenAI) {
            this.userSettingsStore.updateSetting('openaiApiKey', trimmed);
        } else {
            this.userSettingsStore.updateSetting('geminiApiKey', trimmed);
        }

        this.userSettingsStore.updateSetting('aiApiKey', trimmed);

        if (trimmed) {
            void this.loadDynamicModels(detectedProvider, trimmed);
        } else {
            this.dynamicModels.set([]);
        }
    }

    updateModel(model: string): void {
        const trimmed = model.trim();
        this.userSettingsStore.updateSetting('aiModel', trimmed);
        if (this.selectedProvider() === LlmProvider.Gemini) {
            this.userSettingsStore.updateSetting('geminiModel', trimmed);
        }
    }

    onModelDropdownChange(value: string): void {
        if (value === 'custom') {
            if (!this.isCustomModel()) {
                this.updateModel('custom-model-id');
            }
        } else if (value) {
            this.updateModel(value);
        }
    }
}
