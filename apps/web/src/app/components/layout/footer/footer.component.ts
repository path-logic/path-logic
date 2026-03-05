import { ChangeDetectionStrategy, Component } from '@angular/core';

import { environment } from '../../../../environments/environment';
import { SyncIndicatorComponent } from '../../sync/sync-indicator/sync-indicator.component';

/**
 * Global application footer component showing sync status and environment info.
 */
@Component({
    selector: 'app-footer',
    standalone: true,
    imports: [SyncIndicatorComponent],
    templateUrl: './footer.component.html',
    styleUrl: './footer.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
    /**
     * Current application environment name.
     */
    readonly appEnv: string = environment.appEnv;
}
