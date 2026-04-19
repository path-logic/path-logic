import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LucideAngularModule, Shield, Zap } from 'lucide-angular';

import { environment } from '../../../environments/environment';
import { AppShellComponent } from '../../components/layout/app-shell/app-shell.component';
import { FeatureFlagToggleComponent } from '../../components/settings/feature-flag-toggle/feature-flag-toggle.component';
import { FLAG_CONFIGS } from '../../constants/feature-flags';

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
    readonly FLAG_CONFIGS = Object.values(FLAG_CONFIGS);
    readonly environment = environment;

    readonly storybookUrl = environment.production
        ? 'https://storybook.pathlogicfinance.com'
        : 'http://localhost:6006';

    // Lucide Icons
    readonly Shield = Shield;
    readonly Zap = Zap;
}
