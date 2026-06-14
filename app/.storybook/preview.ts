import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { definePreset } from '@primeuix/themes';
import Lara from '@primeuix/themes/lara';
import { setCompodocJson } from '@storybook/addon-docs/angular';
import { applicationConfig, type Preview } from '@storybook/angular';
import { providePrimeNG } from 'primeng/config';

import docJson from '../documentation.json';

setCompodocJson(docJson);

const PremiumPreset = definePreset(Lara, {
    semantic: {
        primary: {
            50: '#eff6ff',
            100: '#dbeafe',
            200: '#bfdbfe',
            300: '#93c5fd',
            400: '#60a5fa',
            500: '#3b82f6',
            600: '#2563eb',
            700: '#1d4ed8',
            800: '#1e40af',
            900: '#1e3a8a',
            950: '#172554'
        },
        success: {
            50: '#eff6ff',
            100: '#dbeafe',
            200: '#bfdbfe',
            300: '#93c5fd',
            400: '#60a5fa',
            500: '#3b82f6',
            600: '#2563eb',
            700: '#1d4ed8',
            800: '#1e40af',
            900: '#1e3a8a',
            950: '#172554'
        },
        colorScheme: {
            light: {
                surface: {
                    0: '#ffffff',
                    50: '#f8fafc',
                    100: '#f1f5f9',
                    200: '#e2e8f0',
                    300: '#cbd5e1',
                    400: '#94a3b8',
                    500: '#64748b',
                    600: '#475569',
                    700: '#334155',
                    800: '#1e293b',
                    900: '#0f172a',
                    950: '#020617'
                }
            },
            dark: {
                surface: {
                    0: '#1e293b',
                    50: '#0f172a',
                    100: '#1e293b',
                    200: '#293548',
                    300: '#334155',
                    400: '#475569',
                    500: '#64748b',
                    600: '#94a3b8',
                    700: '#cbd5e1',
                    800: '#e2e8f0',
                    900: '#f1f5f9',
                    950: '#f8fafc'
                }
            }
        }
    }
});

const preview: Preview = {
    decorators: [
        applicationConfig({
            providers: [
                provideRouter([{ path: 'iframe.html', redirectTo: '' }]),
                provideAnimationsAsync(),
                providePrimeNG({
                    theme: {
                        preset: PremiumPreset,
                        options: {
                            darkModeSelector: '[data-theme="dark"]',
                            cssLayer: {
                                name: 'primeng',
                                order: 'tailwind-base, primeng, tailwind-utilities'
                            }
                        }
                    }
                })
            ]
        })
    ],
    parameters: {
        actions: { argTypesRegex: '^on[A-Z].*' },
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/
            }
        },
        // We use tailwind, so applying padding to the body helps give components breathing room
        layout: 'padded',
        // Global a11y configuration
        a11y: {
            test: 'error',
            config: {
                rules: [
                    {
                        // Default to forgiving color contrast for un-themed components during porting,
                        // but generally we want strict compliance.
                        id: 'color-contrast',
                        enabled: true
                    }
                ]
            }
        }
    }
};

export default preview;
