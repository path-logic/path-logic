import { Injectable, inject } from '@angular/core';
import { UserSettingsStore } from '../user-settings-store/user-settings.store';

/**
 * Service for communicating directly with Google Gemini API
 * using the authenticated user's client-side API key (BYOK model).
 */
@Injectable({ providedIn: 'root' })
export class GeminiService {
    private readonly userSettingsStore = inject(UserSettingsStore);

    /**
     * Gets the user's custom API key from settings.
     */
    apiKey(): string {
        return this.userSettingsStore.getSetting('geminiApiKey') ?? '';
    }

    /**
     * Checks if a Gemini API key is configured.
     */
    hasKey(): boolean {
        return this.apiKey().trim().length > 0;
    }

    /**
     * Generates content using Gemini 2.5 Flash.
     * Utilizes the user's API key and quota client-side.
     */
    async generateContent(prompt: string): Promise<string> {
        const key = this.apiKey().trim();
        if (!key) {
            throw new Error('Gemini API key is not configured in settings.');
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [{ text: prompt }]
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `Gemini API error: ${response.statusText} (${response.status}) - ${errorText}`
            );
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
            throw new Error('Received empty or malformed response from Gemini API.');
        }

        return text;
    }
}
