import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Monitor, Moon, LucideAngularModule, Palette, Shield, Sun, Zap } from 'lucide-angular';

import { environment } from '../../../environments/environment';
import { AppShellComponent } from '../../components/layout/app-shell/app-shell.component';
import { FeatureFlagToggleComponent } from '../../components/settings/feature-flag-toggle/feature-flag-toggle.component';
import { FLAG_CONFIGS } from '../../constants/feature-flags';
import { type ThemePreference, ThemeService } from '../../services/theme/theme.service';

/**
 * Main Settings page for configuring the application.
 * Provides toggles for feature flags and links to developer tools.
 */
@Component({
    selector: 'settings-page',
    standalone: true,
    imports: [CommonModule, LucideAngularModule, AppShellComponent, FeatureFlagToggleComponent],
    templateUrl: './settings-page.component.html',
    styleUrls: ['./settings-page.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsPageComponent {
    private readonly themeService = inject(ThemeService);

    readonly FLAG_CONFIGS = Object.values(FLAG_CONFIGS);
    readonly environment = environment;
    readonly currentTheme = this.themeService.preference;

    readonly themeOptions: Array<{ value: ThemePreference; label: string; icon: object }> = [
        { value: 'system', label: 'System', icon: Monitor },
        { value: 'light',  label: 'Light',  icon: Sun },
        { value: 'dark',   label: 'Dark',   icon: Moon }
    ];

    readonly storybookUrl = environment.production
        ? 'https://storybook.pathlogicfinance.com'
        : 'http://localhost:6006';

    // Lucide Icons
    readonly Shield = Shield;
    readonly Zap = Zap;
    readonly Palette = Palette;

    setTheme(pref: ThemePreference): void {
        this.themeService.setTheme(pref);
    }
}
