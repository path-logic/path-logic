import {
    type ApplicationConfig,
    ErrorHandler,
    provideBrowserGlobalErrorListeners,
    provideZonelessChangeDetection
} from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import Lara from '@primeuix/themes/lara';
import * as Sentry from '@sentry/angular';
import { providePrimeNG } from 'primeng/config';

import { appRoutes } from './app.routes';

import { definePreset } from '@primeuix/themes';

const PremiumPreset = definePreset(Lara, {
    semantic: {
        primary: {
            50: '#eff6ff',
            100: '#dbeafe',
            200: '#bfdbfe',
            300: '#93c5fd',
            400: '#60a5fa',
            500: '#3b82f6', // A premium solid blue
            600: '#2563eb',
            700: '#1d4ed8',
            800: '#1e40af',
            900: '#1e3a8a',
            950: '#172554'
        },
        // Override PrimeNG's default emerald success color to use our brand palette instead
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

export const appConfig: ApplicationConfig = {
    providers: [
        {
            provide: ErrorHandler,
            useValue: Sentry.createErrorHandler({
                showDialog: false,
                logErrors: true // Force Sentry to also dump to console so we never lose silent errors!
            })
        },
        {
            provide: Sentry.TraceService,
            deps: [Router]
        },
        provideBrowserGlobalErrorListeners(),
        provideZonelessChangeDetection(),
        provideRouter(appRoutes, withComponentInputBinding()),
        provideAnimationsAsync(),
        providePrimeNG({
            theme: {
                preset: PremiumPreset,
                options: {
                    darkModeSelector: '.dark',
                    cssLayer: {
                        name: 'primeng',
                        order: 'tailwind-base, primeng, tailwind-utilities'
                    }
                }
            }
        })
    ]
};
