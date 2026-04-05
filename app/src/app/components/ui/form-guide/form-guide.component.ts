import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    input,
    signal,
} from '@angular/core';
import { ChevronRight, EyeOff, HelpCircle, LucideAngularModule, X } from 'lucide-angular';

import { UserSettingsStore } from '../../../services/user-settings-store/user-settings.store';

/**
 * A floating guide that provides contextual information based on the currently focused field.
 */
@Component({
    selector: 'app-form-guide',
    standalone: true,
    imports: [CommonModule, LucideAngularModule],
    templateUrl: './form-guide.component.html',
    styleUrls: ['./form-guide.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormGuideComponent {
    private readonly settingsStore = inject(UserSettingsStore);

    // Inputs
    readonly guideId = input.required<string>();
    readonly targetFieldId = input<string | null>(null);
    readonly content =
        input.required<
            Record<string, { title: string; description: string; tips?: Array<string> }>
        >();
    readonly className = input<string>('');

    // State
    readonly isVisible = signal<boolean>(true);

    // Computed
    readonly isDisabled = computed(() => {
        return this.settingsStore.getSetting(`guide_${this.guideId()}_disabled`) === 'true';
    });

    readonly activeGuide = computed(() => {
        const fieldId = this.targetFieldId();
        if (!fieldId) return null;
        return this.content()[fieldId] || null;
    });

    constructor() {
        // Automatically show if a field is focused and and not explicitly disabled
        effect(() => {
            const fieldId = this.targetFieldId();
            const disabled = this.isDisabled();
            if (fieldId && !disabled) {
                this.isVisible.set(true);
            }
        });
    }

    handleDisable(): void {
        this.settingsStore.updateSetting(`guide_${this.guideId()}_disabled`, 'true');
        this.isVisible.set(false);
    }

    handleEnable(): void {
        this.settingsStore.updateSetting(`guide_${this.guideId()}_disabled`, 'false');
        this.isVisible.set(true);
    }

    handleClose(): void {
        this.isVisible.set(false);
    }

    // Lucide Icons
    readonly HelpCircle = HelpCircle;
    readonly X = X;
    readonly ChevronRight = ChevronRight;
    readonly EyeOff = EyeOff;
}
