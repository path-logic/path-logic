import {
    type ApplicationConfig,
    ErrorHandler,
    inject,
    provideAppInitializer,
    provideBrowserGlobalErrorListeners,
    provideZonelessChangeDetection
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import Lara from '@primeuix/themes/lara';
import { providePrimeNG } from 'primeng/config';
import { firstValueFrom } from 'rxjs';
import { filter } from 'rxjs/operators';

import { environment } from '../environments/environment';
import { appRoutes } from './app.routes';
import { AuthService } from './services/auth/auth.service';

import { definePreset } from '@primeuix/themes';

const PremiumPreset = definePreset(Lara, {
    semantic: {
        primary: environment.theme.primary,
        // Override PrimeNG's default emerald success color to use our brand palette instead
        success: environment.theme.success,
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

import { GlobalErrorHandler } from './core/errors/global-error-handler';

export const appConfig: ApplicationConfig = {
    providers: [
        provideAppInitializer(() => {
            const auth = inject(AuthService);
            return firstValueFrom(
                toObservable(auth.isInitializing).pipe(filter(isInit => !isInit))
            );
        }),
        { provide: ErrorHandler, useClass: GlobalErrorHandler },
        provideBrowserGlobalErrorListeners(),
        provideZonelessChangeDetection(),
        provideRouter(appRoutes, withComponentInputBinding()),
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
};
