import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AppShellComponent } from '../../../components/layout/app-shell/app-shell.component';

/**
 * Developer Tools index page.
 * Provides entry points to various system diagnostics and maintenance tools.
 */
@Component({
    selector: 'dev-index',
    standalone: true,
    imports: [CommonModule, RouterLink, AppShellComponent],
    templateUrl: './dev-index.component.html',
    styleUrls: ['./dev-index.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class DevIndexComponent {
    // Lucide Icons
}
