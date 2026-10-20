import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MermaidService {
    private lastThemeDark: boolean | null = null;
    private idCounter = 0;

    generateId(): string {
        this.idCounter += 1;
        return `mermaid-${Date.now()}-${this.idCounter}`;
    }

    private getThemeVariables(isDark: boolean): Record<string, string> {
        if (isDark) {
            return {
                darkMode: 'true',
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                // Subtle modern financial palette for dark mode
                pie1: '#3b82f6', // Cobalt blue
                pie2: '#06b6d4', // Cyan
                pie3: '#10b981', // Emerald
                pie4: '#8b5cf6', // Violet
                pie5: '#f59e0b', // Amber
                pie6: '#ec4899', // Pink
                pie7: '#6366f1', // Indigo
                pie8: '#14b8a6', // Teal
                pie9: '#f97316', // Orange
                pie10: '#84cc16', // Lime
                pie11: '#a855f7', // Purple
                pie12: '#e11d48', // Rose
                pieTitleTextColor: '#f8fafc',
                pieTitleTextSize: '15px',
                pieSectionTextColor: '#ffffff',
                pieSectionTextSize: '11px',
                pieLegendTextColor: '#cbd5e1',
                pieLegendTextSize: '12px',
                pieStrokeColor: '#1e293b',
                pieStrokeWidth: '1.5px',
                pieOuterStrokeColor: '#334155',
                pieOuterStrokeWidth: '1.5px',
                pieOpacity: '0.9',
                // Flowcharts & General
                primaryColor: '#1e293b',
                primaryTextColor: '#f8fafc',
                primaryBorderColor: '#3b82f6',
                lineColor: '#64748b',
                secondaryColor: '#0f172a',
                tertiaryColor: '#1e1b4b',
                mainBkg: '#1e293b',
                nodeBorder: '#3b82f6',
                plotColorPalette: '#3b82f6,#06b6d4,#10b981,#8b5cf6,#f59e0b,#ec4899'
            };
        }

        return {
            darkMode: 'false',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            // Subtle, elegant financial palette for light mode
            pie1: '#2563eb', // Royal blue
            pie2: '#0284c7', // Sky blue
            pie3: '#059669', // Emerald green
            pie4: '#7c3aed', // Purple
            pie5: '#d97706', // Warm amber
            pie6: '#db2777', // Soft magenta/rose
            pie7: '#4f46e5', // Indigo
            pie8: '#0d9488', // Teal
            pie9: '#ea580c', // Orange
            pie10: '#65a30d', // Lime
            pie11: '#9333ea', // Violet
            pie12: '#e11d48', // Crimson rose
            pieTitleTextColor: '#0f172a',
            pieTitleTextSize: '15px',
            pieSectionTextColor: '#ffffff',
            pieSectionTextSize: '11px',
            pieLegendTextColor: '#334155',
            pieLegendTextSize: '12px',
            pieStrokeColor: '#ffffff',
            pieStrokeWidth: '2px',
            pieOuterStrokeColor: '#cbd5e1',
            pieOuterStrokeWidth: '1.5px',
            pieOpacity: '0.92',
            // Flowcharts & General
            primaryColor: '#eff6ff',
            primaryTextColor: '#1e3a8a',
            primaryBorderColor: '#3b82f6',
            lineColor: '#64748b',
            secondaryColor: '#f0fdf4',
            tertiaryColor: '#faf5ff',
            mainBkg: '#eff6ff',
            nodeBorder: '#3b82f6',
            plotColorPalette: '#2563eb,#0284c7,#059669,#7c3aed,#d97706,#db2777'
        };
    }

    private async initMermaid(): Promise<typeof mermaid> {
        const mermaidModule = await import('mermaid');
        const mermaid = mermaidModule.default;
        const isDark =
            typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

        if (this.lastThemeDark !== isDark) {
            mermaid.initialize({
                startOnLoad: false,
                securityLevel: 'strict',
                theme: 'base',
                themeVariables: this.getThemeVariables(isDark),
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
            });
            this.lastThemeDark = isDark;
        }
        return mermaid;
    }

    async render(id: string, code: string): Promise<string> {
        const mermaid = await this.initMermaid();
        let preparedCode = code.trim();
        const isDark =
            typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

        if (!preparedCode.startsWith('%%{init') && !preparedCode.startsWith('---')) {
            const themeVariables = this.getThemeVariables(isDark);
            const initDirective = `%%{init: {'theme': 'base', 'themeVariables': ${JSON.stringify(themeVariables)}}}%%\n`;
            preparedCode = initDirective + preparedCode;
        }

        const renderResult = await mermaid.render(id, preparedCode);
        return renderResult.svg;
    }
}
