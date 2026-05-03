import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

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
    imports: [CommonModule, AppShellComponent, FeatureFlagToggleComponent],
    templateUrl: './settings-page.component.html',
    styleUrls: ['./settings-page.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsPageComponent {
    private readonly themeService = inject(ThemeService);

    readonly FLAG_CONFIGS = Object.values(FLAG_CONFIGS);
    readonly currentTheme = this.themeService.preference;

     
    readonly themeOptions: Array<{ value: ThemePreference; label: string; icon: string }> = [
        { value: 'system', label: 'System', icon: 'pi-desktop' },
        { value: 'light', label: 'Light', icon: 'pi-sun' },
        { value: 'dark', label: 'Dark', icon: 'pi-moon' }
    ];

    readonly storybookUrl = environment.production
        ? 'https://storybook.pathlogicfinance.com'
        : 'http://localhost:6006';

    // Lucide Icons

    setTheme(pref: ThemePreference): void {
        this.themeService.setTheme(pref);
    }
}
