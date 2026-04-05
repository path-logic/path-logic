import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AlertTriangle, ArrowLeft, Database, LucideAngularModule } from 'lucide-angular';

import { AppShellComponent } from '../../../../components/layout/app-shell/app-shell.component';

/**
 * Sync Test Suite placeholder.
 * The full implementation of the storage architecture validation suite
 * will be ported in a future phase.
 */
@Component({
    selector: 'app-sync-test',
    standalone: true,
    imports: [CommonModule, LucideAngularModule, RouterLink, AppShellComponent],
    templateUrl: './sync-test.component.html',
    styleUrls: ['./sync-test.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SyncTestComponent {
    // Lucide Icons
    readonly ArrowLeft = ArrowLeft;
    readonly Database = Database;
    readonly AlertTriangle = AlertTriangle;
}
