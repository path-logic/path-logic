import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FLAG_CONFIGS } from '../../../constants/feature-flags';
import { FeatureFlagService } from '../../../services/feature-flag/feature-flag.service';

/**
 * Styled toggle for a feature flag.
 * Provides a UI for enabling/disabling a feature and jumping to its associated route.
 */
@Component({
    selector: 'app-feature-flag-toggle',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './feature-flag-toggle.component.html',
    styleUrls: ['./feature-flag-toggle.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeatureFlagToggleComponent {
    private readonly featureFlags = inject(FeatureFlagService);

    // Inputs
    readonly flag = input.required<string>();
    readonly label = input.required<string>();
    readonly description = input<string>();

    // Computed
    readonly enabled = computed(() => this.featureFlags.isEnabled(this.flag())());

    readonly config = computed(() => {
        const key = this.flag();
        return Object.values(FLAG_CONFIGS).find(c => c.key === key) || null;
    });

    /**
     * Toggles the feature flag state.
     */
    toggle(): void {
        this.featureFlags.toggle(this.flag(), !this.enabled());
    }
}
