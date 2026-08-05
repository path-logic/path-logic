import { Injectable, inject } from '@angular/core';
import type { ILlmModelOption, LlmProvider } from '../llm/llm.service';
import { LlmService } from '../llm/llm.service';

/**
 * Service for communicating with AI LLM APIs (BYOK model).
 * Delegates to LlmService for multi-provider support (Gemini, Anthropic Claude, OpenAI).
 */
@Injectable({ providedIn: 'root' })
export class GeminiService {
    private readonly llmService = inject(LlmService);

    apiKey(): string {
        return this.llmService.apiKey();
    }

    hasKey(): boolean {
        return this.llmService.hasKey();
    }

    selectedModel(): string {
        return this.llmService.selectedModel();
    }

    selectedProvider(): LlmProvider {
        return this.llmService.selectedProvider();
    }

    async listModels(): Promise<Array<{ value: string; label: string; isDefault?: boolean }>> {
        const provider = this.llmService.selectedProvider();
        const key = this.llmService.apiKey();
        const models: Array<ILlmModelOption> = await this.llmService.listModels(provider, key);
        return models.map(m => {
            const opt: { value: string; label: string; isDefault?: boolean } = {
                value: m.value,
                label: m.label
            };
            if (m.isDefault !== undefined) {
                opt.isDefault = m.isDefault;
            }
            return opt;
        });
    }

    async generateContent(prompt: string): Promise<string> {
        return this.llmService.generateContent(prompt);
    }
}
