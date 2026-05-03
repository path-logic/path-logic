import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AppShellComponent } from '../../../../components/layout/app-shell/app-shell.component';

/**
 * Sync Test Suite placeholder.
 * The full implementation of the storage architecture validation suite
 * will be ported in a future phase.
 */
@Component({
    selector: 'sync-test',
    standalone: true,
    imports: [CommonModule, RouterLink, AppShellComponent],
    templateUrl: './sync-test.component.html',
    styleUrls: ['./sync-test.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class SyncTestComponent {
    // Lucide Icons
}
