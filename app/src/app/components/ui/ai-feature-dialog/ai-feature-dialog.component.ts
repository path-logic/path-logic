import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, model, output } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

@Component({
    selector: 'ai-feature-dialog',
    standalone: true,
    imports: [CommonModule, DialogModule, ButtonModule],
    templateUrl: './ai-feature-dialog.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AiFeatureDialogComponent {
    private readonly router = inject(Router);

    /** Controls dialog visibility (two-way bindable). */
    readonly visible = model<boolean>(false);

    /** Name of the AI feature being presented (e.g., 'Recurring Pattern Discovery'). */
    readonly featureName = input<string>('AI Feature');

    /** Concise summary of what the AI capability accomplishes. */
    readonly description = input<string>(
        'Path Logic uses AI to automatically analyze your financial data locally with your own API key.'
    );

    /** Icon class for the feature header. Defaults to the standard AI sparkles icon. */
    readonly icon = input<string>('pi pi-sparkles');

    /** Key capability bullet points to display in the feature card. */
    readonly benefits = input<Array<string>>([]);

    /** Whether an offline/deterministic alternative can be run without an AI key. */
    readonly canRunOffline = input<boolean>(false);

    /** Custom label for the offline action button. */
    readonly offlineActionLabel = input<string>('Run Offline Analysis');

    /** Emitted when the user chooses to run the offline fallback instead. */
    readonly runOffline = output();

    goToSettings(): void {
        this.visible.set(false);
        void this.router.navigate(['/settings']);
    }

    handleRunOffline(): void {
        this.visible.set(false);
        this.runOffline.emit();
    }
}
