import { DOCUMENT } from '@angular/common';
import { effect, inject, Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';
import { getBrandLogoSvg } from '../../components/ui/brand-logo/brand-logo.component';
import { type ResolvedTheme, ThemeService } from '../theme/theme.service';

/**
 * Service for dynamically updating the browser favicon
 * to represent the Path Logic brand logo emblem,
 * styled dynamically with colors matching the theme and environment.
 */
@Injectable({ providedIn: 'root' })
export class FaviconService {
    private readonly document = inject(DOCUMENT);
    private readonly themeService = inject(ThemeService);

    constructor() {
        // Automatically update the favicon when resolvedTheme changes
        effect(() => {
            const theme = this.themeService.resolvedTheme();
            this.updateFavicon(theme);
        });
    }

    private updateFavicon(theme: ResolvedTheme): void {
        const color = this.getFaviconColor(theme);
        const svg = getBrandLogoSvg(color, 'favicon-pl-cut');

        const base64Svg = btoa(svg);
        const dataUrl = `data:image/svg+xml;base64,${base64Svg}`;

        let link: HTMLLinkElement | null = this.document.querySelector("link[rel*='icon']");
        if (!link) {
            link = this.document.createElement('link');
            link.rel = 'icon';
            link.type = 'image/svg+xml';
            this.document.head.appendChild(link);
        } else {
            link.type = 'image/svg+xml';
        }

        link.href = dataUrl;
    }

    private getFaviconColor(theme: ResolvedTheme): string {
        return theme === 'dark' ? environment.theme.faviconDark : environment.theme.faviconLight;
    }
}
