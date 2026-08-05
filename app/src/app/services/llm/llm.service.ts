import { Injectable, inject, signal } from '@angular/core';
import { UserSettingsStore } from '../user-settings-store/user-settings.store';

export enum LlmProvider {
    Gemini = 'gemini',
    Anthropic = 'anthropic',
    OpenAI = 'openai'
}

export interface ILlmModelOption {
    value: string;
    label: string;
    isDefault?: boolean;
}

export interface INewerModelAlert {
    currentModel: string;
    newestModel: string;
    newestLabel: string;
    provider: LlmProvider;
}

interface IGeminiModelRaw {
    name: string;
    displayName?: string;
    supportedGenerationMethods?: Array<string>;
}

interface IOpenAiModelRaw {
    id: string;
}

/**
 * Multi-Provider LLM Service (BYOK model)
 * Supports Google Gemini, Anthropic Claude, and OpenAI client-side REST APIs.
 */
@Injectable({ providedIn: 'root' })
export class LlmService {
    private readonly userSettingsStore = inject(UserSettingsStore);

    readonly newerModelAlert = signal<INewerModelAlert | null>(null);

    /**
     * Gets the currently selected provider (defaults to Gemini).
     */
    selectedProvider(): LlmProvider {
        const p = this.userSettingsStore.getSetting('aiProvider');
        if (p === LlmProvider.Anthropic) return LlmProvider.Anthropic;
        if (p === LlmProvider.OpenAI) return LlmProvider.OpenAI;
        return LlmProvider.Gemini;
    }

    /**
     * Auto-detects the provider based on API key prefix.
     */
    autoDetectProvider(apiKey: string): LlmProvider {
        const trimmed = apiKey.trim();
        if (trimmed.startsWith('sk-ant-')) return LlmProvider.Anthropic;
        if (trimmed.startsWith('sk-')) return LlmProvider.OpenAI;
        if (trimmed.startsWith('AIzaSy')) return LlmProvider.Gemini;
        return this.selectedProvider();
    }

    /**
     * Gets the API key for the current active provider.
     */
    apiKey(): string {
        const provider = this.selectedProvider();
        if (provider === LlmProvider.Anthropic) {
            return this.userSettingsStore.getSetting('anthropicApiKey') ?? '';
        }
        if (provider === LlmProvider.OpenAI) {
            return this.userSettingsStore.getSetting('openaiApiKey') ?? '';
        }
        return (
            this.userSettingsStore.getSetting('geminiApiKey') ??
            this.userSettingsStore.getSetting('aiApiKey') ??
            ''
        );
    }

    /**
     * Checks if an API key is saved for the active provider.
     */
    hasKey(): boolean {
        return this.apiKey().trim().length > 0;
    }

    /**
     * Gets the selected model for the active provider.
     */
    selectedModel(): string {
        const provider = this.selectedProvider();
        const saved =
            this.userSettingsStore.getSetting('aiModel') ??
            this.userSettingsStore.getSetting('geminiModel');
        if (saved) return saved;

        switch (provider) {
            case LlmProvider.Anthropic:
                return 'claude-5-0-sonnet-latest';
            case LlmProvider.OpenAI:
                return 'gpt-4o-mini';
            case LlmProvider.Gemini:
            default:
                return 'gemini-3.5-flash';
        }
    }

    /**
     * Startup check: Detects if a newer model generation is available than selected.
     */
    async checkStartupNewerModel(): Promise<void> {
        const key = this.apiKey().trim();
        if (!key) {
            this.newerModelAlert.set(null);
            return;
        }

        const provider = this.selectedProvider();
        const models = await this.listModels(provider, key);
        if (models.length === 0) return;

        const defaultOption = models.find(m => m.isDefault) ?? models[0];
        if (!defaultOption) return;

        const newestModel = defaultOption.value;
        const currentSaved = this.selectedModel();

        const dismissed = this.userSettingsStore.getSetting('dismissedModelUpgrade');
        if (dismissed === newestModel) {
            this.newerModelAlert.set(null);
            return;
        }

        // Parse version comparison if currentSaved != newestModel
        if (currentSaved !== newestModel && this.isModelNewer(newestModel, currentSaved)) {
            this.newerModelAlert.set({
                currentModel: currentSaved,
                newestModel,
                newestLabel: defaultOption.label,
                provider
            });
        } else {
            this.newerModelAlert.set(null);
        }
    }

    /**
     * Helper to compare model version numbers.
     */
    private isModelNewer(newestModel: string, currentModel: string): boolean {
        const getVer = (name: string): number => {
            const match = name.match(/(\d+(?:\.\d+)?)/);
            return match && match[1] ? parseFloat(match[1]) : 0;
        };
        const newVer = getVer(newestModel);
        const curVer = getVer(currentModel);
        if (newVer > 0 && curVer > 0) return newVer > curVer;
        return newestModel !== currentModel;
    }

    /**
     * Upgrades the selected model to the newest generation.
     */
    async upgradeToNewestModel(newestModel: string): Promise<void> {
        await this.userSettingsStore.updateSetting('aiModel', newestModel);
        if (this.selectedProvider() === LlmProvider.Gemini) {
            await this.userSettingsStore.updateSetting('geminiModel', newestModel);
        }
        this.newerModelAlert.set(null);
    }

    /**
     * Dismisses the newer model upgrade notification.
     */
    async dismissModelUpgrade(newestModel: string): Promise<void> {
        await this.userSettingsStore.updateSetting('dismissedModelUpgrade', newestModel);
        this.newerModelAlert.set(null);
    }

    /**
     * Dynamic model discovery with smart default rules for all providers.
     */
    async listModels(provider: LlmProvider, key: string): Promise<Array<ILlmModelOption>> {
        const trimmedKey = key.trim();
        if (!trimmedKey) return [];

        switch (provider) {
            case LlmProvider.Gemini:
                return this.listGeminiModels(trimmedKey);
            case LlmProvider.Anthropic:
                return this.listClaudeModels();
            case LlmProvider.OpenAI:
                return this.listOpenAiModels(trimmedKey);
            default:
                return [];
        }
    }

    private async listGeminiModels(key: string): Promise<Array<ILlmModelOption>> {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
            const response = await fetch(url);
            if (!response.ok) return this.fallbackGeminiModels();

            const data = await response.json();
            if (!data || !Array.isArray(data.models)) return this.fallbackGeminiModels();

            // 1. Exclude specialized non-text models (nano, banana, robotics, computer-use, tts, omni)
            const valid = (data.models as Array<IGeminiModelRaw>).filter(m => {
                const nameLower = m.name.toLowerCase();
                const displayNameLower = (m.displayName || '').toLowerCase();
                const supportsGen = m.supportedGenerationMethods?.includes('generateContent');
                if (!supportsGen) return false;
                if (!nameLower.includes('gemini')) return false;

                const isExcluded =
                    nameLower.includes('nano') ||
                    nameLower.includes('banana') ||
                    nameLower.includes('robotics') ||
                    nameLower.includes('computer-use') ||
                    nameLower.includes('computer_use') ||
                    nameLower.includes('tts') ||
                    nameLower.includes('custom-tools') ||
                    nameLower.includes('custom_tools') ||
                    nameLower.includes('omni') ||
                    nameLower.includes('audio') ||
                    nameLower.includes('embedding') ||
                    nameLower.includes('imagen') ||
                    displayNameLower.includes('banana') ||
                    displayNameLower.includes('robotics') ||
                    displayNameLower.includes('tts');

                return !isExcluded;
            });

            if (valid.length === 0) return this.fallbackGeminiModels();

            // 2. Parse versions & filter to latest generation (major >= 3 if available)
            const parseVersion = (name: string): number => {
                const match = name.match(/gemini-(\d+(?:\.\d+)?)/i);
                return match && match[1] ? parseFloat(match[1]) : 0;
            };

            const versions = valid.map(m => parseVersion(m.name));
            const maxVersion = Math.max(...versions, 0);

            const latestGenModels = valid.filter(m => {
                const ver = parseVersion(m.name);
                if (maxVersion >= 3) {
                    return ver >= 3.0;
                }
                return ver >= Math.floor(maxVersion);
            });

            const finalModels = latestGenModels.length > 0 ? latestGenModels : valid;

            // 3. Deduplicate by clean model name
            const seenValues = new Set<string>();
            const deduplicated: Array<IGeminiModelRaw> = [];
            for (const m of finalModels) {
                const val = m.name.replace(/^models\//, '');
                if (!seenValues.has(val)) {
                    seenValues.add(val);
                    deduplicated.push(m);
                }
            }

            // 4. Find newest Flash model for default selection
            const flashModels = deduplicated.filter(m => m.name.toLowerCase().includes('flash'));
            flashModels.sort((a, b) => parseVersion(b.name) - parseVersion(a.name));

            const newestFlashVal = flashModels[0]
                ? flashModels[0].name.replace(/^models\//, '')
                : 'gemini-3.6-flash';

            return deduplicated.map(m => {
                const val = m.name.replace(/^models\//, '');
                const opt: ILlmModelOption = {
                    value: val,
                    label: m.displayName || val
                };
                if (val === newestFlashVal) {
                    opt.isDefault = true;
                }
                return opt;
            });
        } catch {
            return this.fallbackGeminiModels();
        }
    }

    private fallbackGeminiModels(): Array<ILlmModelOption> {
        return [
            { value: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash (Recommended)', isDefault: true },
            { value: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
            { value: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro Preview' },
            { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview' }
        ];
    }

    private listClaudeModels(): Array<ILlmModelOption> {
        return [
            {
                value: 'claude-5-0-sonnet-latest',
                label: 'Claude 5 Sonnet (Recommended)',
                isDefault: true
            },
            { value: 'claude-4-sonnet-latest', label: 'Claude 4 Sonnet' },
            { value: 'claude-3-7-sonnet-latest', label: 'Claude 3.7 Sonnet' },
            { value: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet' },
            { value: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku (Fast)' }
        ];
    }

    private async listOpenAiModels(key: string): Promise<Array<ILlmModelOption>> {
        try {
            const response = await fetch('https://api.openai.com/v1/models', {
                headers: { Authorization: `Bearer ${key}` }
            });
            if (!response.ok) return this.fallbackOpenAiModels();

            const data = await response.json();
            if (!data || !Array.isArray(data.data)) return this.fallbackOpenAiModels();

            const valid = (data.data as Array<IOpenAiModelRaw>).filter(m => {
                const id = m.id.toLowerCase();
                const isText =
                    id.startsWith('gpt-4') ||
                    id.startsWith('gpt-5') ||
                    id.startsWith('o1') ||
                    id.startsWith('o3');
                const isExcluded =
                    id.includes('audio') ||
                    id.includes('realtime') ||
                    id.includes('whisper') ||
                    id.includes('dall-e') ||
                    id.includes('embedding') ||
                    id.includes('tts') ||
                    id.includes('instruct') ||
                    id.includes('search');
                return isText && !isExcluded;
            });

            if (valid.length === 0) return this.fallbackOpenAiModels();

            const seen = new Set<string>();
            const deduplicated: Array<IOpenAiModelRaw> = [];
            for (const m of valid) {
                if (!seen.has(m.id)) {
                    seen.add(m.id);
                    deduplicated.push(m);
                }
            }

            return deduplicated.map(m => {
                const opt: ILlmModelOption = {
                    value: m.id,
                    label: m.id
                };
                if (m.id === 'gpt-4o-mini') {
                    opt.isDefault = true;
                }
                return opt;
            });
        } catch {
            return this.fallbackOpenAiModels();
        }
    }

    private fallbackOpenAiModels(): Array<ILlmModelOption> {
        return [
            { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast - Recommended)', isDefault: true },
            { value: 'gpt-4o', label: 'GPT-4o (Powerful)' },
            { value: 'o3-mini', label: 'o3-mini (Reasoning)' },
            { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' }
        ];
    }

    async generateContent(prompt: string): Promise<string> {
        const key = this.apiKey().trim();
        if (!key) {
            throw new Error('API key is not configured for the active AI provider.');
        }

        const provider = this.selectedProvider();
        const model = this.selectedModel();

        switch (provider) {
            case LlmProvider.Anthropic:
                return this.generateClaudeContent(key, model, prompt);
            case LlmProvider.OpenAI:
                return this.generateOpenAiContent(key, model, prompt);
            case LlmProvider.Gemini:
            default:
                return this.generateGeminiContent(key, model, prompt);
        }
    }

    private async generateGeminiContent(
        key: string,
        model: string,
        prompt: string
    ): Promise<string> {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini API error (${response.status}): ${errText}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('Received empty response from Gemini API.');
        return text;
    }

    private async generateClaudeContent(
        key: string,
        model: string,
        prompt: string
    ): Promise<string> {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': key,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model,
                max_tokens: 2048,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Claude API error (${response.status}): ${errText}`);
        }

        const data = await response.json();
        const text = data.content?.[0]?.text;
        if (!text) throw new Error('Received empty response from Claude API.');
        return text;
    }

    private async generateOpenAiContent(
        key: string,
        model: string,
        prompt: string
    ): Promise<string> {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${key}`
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`OpenAI API error (${response.status}): ${errText}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        if (!text) throw new Error('Received empty response from OpenAI API.');
        return text;
    }
}
