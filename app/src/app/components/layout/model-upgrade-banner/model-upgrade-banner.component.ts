import { CommonModule } from '@angular/common';
import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LlmService } from '../../../services/llm/llm.service';

/**
 * Startup notification banner alerting the user when a newer AI model generation
 * is available than the one currently selected. Provides Upgrade and Dismiss controls.
 */
@Component({
    selector: 'model-upgrade-banner',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './model-upgrade-banner.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModelUpgradeBannerComponent implements OnInit {
    private readonly llmService = inject(LlmService);

    readonly alert = this.llmService.newerModelAlert;

    ngOnInit(): void {
        void this.llmService.checkStartupNewerModel();
    }

    async upgrade(): Promise<void> {
        const info = this.alert();
        if (info) {
            await this.llmService.upgradeToNewestModel(info.newestModel);
        }
    }

    async dismiss(): Promise<void> {
        const info = this.alert();
        if (info) {
            await this.llmService.dismissModelUpgrade(info.newestModel);
        }
    }
}
