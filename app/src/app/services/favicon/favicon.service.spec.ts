import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { ThemeService } from '../theme/theme.service';
import { FaviconService } from './favicon.service';

describe('FaviconService', () => {
    it('should be created and set initial favicon', () => {
        const resolvedThemeSignal = signal('dark');
        const mockThemeService = {
            resolvedTheme: resolvedThemeSignal
        };

        TestBed.configureTestingModule({
            providers: [FaviconService, { provide: ThemeService, useValue: mockThemeService }]
        });

        const service = TestBed.inject(FaviconService);
        expect(service).toBeTruthy();
        TestBed.flushEffects();

        const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
        expect(link).toBeTruthy();
        expect(link.type).toBe('image/svg+xml');
        expect(link.href).toContain('data:image/svg+xml;base64,');
    });

    it('should change favicon color when theme changes', () => {
        const resolvedThemeSignal = signal('dark');
        const mockThemeService = {
            resolvedTheme: resolvedThemeSignal
        };

        TestBed.configureTestingModule({
            providers: [FaviconService, { provide: ThemeService, useValue: mockThemeService }]
        });

        TestBed.inject(FaviconService);

        resolvedThemeSignal.set('light');
        TestBed.flushEffects();

        const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
        expect(link).toBeTruthy();
        expect(link.href).toContain('data:image/svg+xml;base64,');
    });
});
